import { createClient } from '@supabase/supabase-js';
import { parsePaypalCustomId } from '@/lib/paypal-order-meta';
import {
  computeStackedLicenseExpiresAt,
  licenseDefaultsForPlan,
  mergeOrgFeatures,
} from '@/lib/org-plan';
import { checkoutAmountUsd, type CheckoutCycle } from '@/lib/checkout-pricing';
import { getLocationConfig } from '@/lib/location-config';
import { notifyAdminNewUser } from '@/lib/notifications/admin-alert';

type CaptureUnit = {
  custom_id?: string;
  payments?: {
    captures?: Array<{
      id?: string;
      status?: string;
      amount?: { currency_code?: string; value?: string };
    }>;
  };
};

type CaptureBody = {
  id?: string;
  status?: string;
  purchase_units?: CaptureUnit[];
};

/** Margen de ±0.05 USD para variaciones de redondeo en la API de PayPal */
const AMOUNT_TOLERANCE = 0.05;

function amountMatchesCycle(captured: number, cycle: CheckoutCycle): boolean {
  const expected = Number(checkoutAmountUsd('profesional', cycle));
  return Math.abs(captured - expected) <= AMOUNT_TOLERANCE;
}

/**
 * Tras captura COMPLETED de una org existente (custom_id `jc1x|…`):
 *  1. Valida estado y monto USD
 *  2. Idempotencia: rechaza si paypal_order_id ya está en subscription_payments
 *  3. Actualiza licencia de la org (stacking)
 *  4. Registra en subscription_payments
 *  5. Notifica Super Admin
 */
export async function activateOrganizationFromPaypalCapture(captureBody: unknown): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  const body = captureBody as CaptureBody;
  if (body.status !== 'COMPLETED') return;

  const pu = body.purchase_units?.[0] as CaptureUnit | undefined;
  const cap = pu?.payments?.captures?.[0];
  if (!cap || cap.status !== 'COMPLETED') return;

  const parsed = parsePaypalCustomId(pu?.custom_id);
  if (!parsed) return;

  // ── 1. Validar monto ──────────────────────────────────────────────────────
  const capturedCurrency = String(cap.amount?.currency_code ?? '').toUpperCase();
  const capturedAmount = Number(cap.amount?.value ?? 0);

  if (capturedCurrency !== 'USD') {
    console.error('[paypal-sync-org] moneda inesperada', capturedCurrency);
    return;
  }
  if (!amountMatchesCycle(capturedAmount, parsed.cycle)) {
    const expected = checkoutAmountUsd('profesional', parsed.cycle);
    console.error(
      `[paypal-sync-org] monto inválido: capturado ${capturedAmount} USD, esperado ${expected} USD para ciclo ${parsed.cycle}`
    );
    return;
  }

  const paypalOrderId = body.id ?? '';
  const captureId = cap.id ?? '';

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── 2. Idempotencia: ¿ya procesamos este order? ──────────────────────────
  if (paypalOrderId) {
    const { data: existing } = await admin
      .from('subscription_payments')
      .select('id')
      .eq('paypal_order_id', paypalOrderId)
      .maybeSingle();

    if (existing) {
      console.log('[paypal-sync-org] order ya procesado, skip', paypalOrderId);
      return;
    }
  }

  // ── 3. Cargar org ─────────────────────────────────────────────────────────
  const { data: orgRow, error: fetchErr } = await admin
    .from('organizations')
    .select('id, owner_id, name, country, features, license_expires_at, trial_ends_at, subscription_status')
    .eq('id', parsed.organizationId)
    .maybeSingle();

  if (fetchErr || !orgRow) {
    console.error('[paypal-sync-org] org fetch', fetchErr);
    return;
  }

  const license = licenseDefaultsForPlan(parsed.plan);
  const approvedAt = new Date();
  const licenseExpiresAt = computeStackedLicenseExpiresAt(
    parsed.cycle,
    {
      subscription_status: orgRow.subscription_status,
      license_expires_at: orgRow.license_expires_at,
      trial_ends_at: orgRow.trial_ends_at,
    },
    approvedAt
  );
  const features = mergeOrgFeatures(orgRow.features as Record<string, unknown>, license.features);

  // ── 4. Registrar en subscription_payments (idempotencia por constraint único) ──
  const { error: payInsErr } = await admin.from('subscription_payments').insert({
    user_id: orgRow.owner_id,
    organization_id: orgRow.id,
    platform: 'paypal',
    paypal_order_id: paypalOrderId || null,
    transaction_amount: capturedAmount,
    currency_id: 'USD',
    status: 'COMPLETED',
    billing_cycle: parsed.cycle,
    date_approved: approvedAt.toISOString(),
    raw_payment: body as unknown as Record<string, unknown>,
    ...(captureId ? { payment_method_id: captureId } : {}),
  });

  if (payInsErr) {
    if (payInsErr.code === '23505') {
      console.log('[paypal-sync-org] duplicate payment race, skip', paypalOrderId);
      return;
    }
    console.error('[paypal-sync-org] insert subscription_payments', payInsErr);
    // Continuamos igualmente: activar licencia aunque falle el registro contable
  }

  // ── 5. Actualizar org ────────────────────────────────────────────────────
  const { error } = await admin
    .from('organizations')
    .update({
      subscription_status: 'active',
      plan_type: license.plan_type,
      subscription_plan: license.subscription_plan,
      billing_cycle: parsed.cycle,
      license_expires_at: licenseExpiresAt,
      trial_ends_at: licenseExpiresAt,
      max_users: license.max_users,
      features,
    })
    .eq('id', parsed.organizationId);

  if (error) {
    console.error('[paypal-sync-org] update org', error);
    return;
  }

  // ── 6. Notificar Super Admin ──────────────────────────────────────────────
  const { data: profileDetail } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', orgRow.owner_id)
    .maybeSingle();

  const { data: userData } = await admin.auth.admin.getUserById(orgRow.owner_id);

  const cycleLabel = parsed.cycle === 'anual' ? 'Anual' : 'Mensual';
  const planLabel = parsed.plan === 'profesional' ? 'Profesional' : parsed.plan;

  try {
    await notifyAdminNewUser({
      shopName: orgRow.name ?? 'Taller desconocido',
      userName: profileDetail?.full_name ?? 'Sin nombre',
      email: userData?.user?.email ?? 'Sin email',
      country: getLocationConfig(orgRow.country).defaultCountryName,
      planType: `${planLabel} - ${cycleLabel} (PayPal USD ${capturedAmount})`,
    });
  } catch (e) {
    console.error('[paypal-sync-org] notifyAdminNewUser', e);
  }
}
