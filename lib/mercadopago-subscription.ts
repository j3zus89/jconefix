import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PRICING_AR } from '@/lib/pricing-config';
import {
  licenseDefaultsForPlan,
  mergeOrgFeatures,
  normalizeBillingCycle,
  type BillingCycle,
} from '@/lib/org-plan';

const MP_API = 'https://api.mercadopago.com';

export const MERCADOPAGO_MONTHLY_ARS = PRICING_AR.PRECIO_MENSUAL;
export const MERCADOPAGO_YEARLY_ARS = PRICING_AR.PRECIO_ANUAL;

function amountMatchesCycle(amount: number, cycle: BillingCycle): boolean {
  const expected = cycle === 'anual' ? MERCADOPAGO_YEARLY_ARS : MERCADOPAGO_MONTHLY_ARS;
  return Math.abs(amount - expected) < 0.05;
}

function inferCycleFromAmount(amount: number): BillingCycle | null {
  if (amountMatchesCycle(amount, 'mensual')) return 'mensual';
  if (amountMatchesCycle(amount, 'anual')) return 'anual';
  return null;
}

function parseLicenseEndMs(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Fin del acceso actual antes de extender: en trial suele mandar trial_ends_at;
 * si license_expires_at va en paralelo, usamos el máximo para no perder días.
 */
function currentPaidOrTrialEndMs(org: {
  subscription_status?: string | null;
  license_expires_at?: string | null;
  trial_ends_at?: string | null;
}): number {
  const licenseEndMs = parseLicenseEndMs(org.license_expires_at);
  const trialEndMs = parseLicenseEndMs(org.trial_ends_at);
  const st = String(org.subscription_status || '');
  if (st === 'trial') {
    return Math.max(licenseEndMs, trialEndMs);
  }
  return licenseEndMs > 0 ? licenseEndMs : trialEndMs;
}

export type MercadoPagoPaymentResource = {
  id?: string | number;
  status?: string;
  external_reference?: string | null;
  transaction_amount?: number;
  currency_id?: string | null;
  date_approved?: string | null;
  date_created?: string | null;
  payment_method_id?: string | null;
  payment_type_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function fetchMercadoPagoPayment(
  accessToken: string,
  paymentId: string
): Promise<MercadoPagoPaymentResource | null> {
  const res = await fetch(`${MP_API}/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    console.error('[mercadopago] fetch payment', res.status, await res.text().catch(() => ''));
    return null;
  }
  return (await res.json()) as MercadoPagoPaymentResource;
}

export type CreatePreferenceParams = {
  accessToken: string;
  /** Debe ser el UUID del titular (organizations.owner_id) para que el webhook extienda la licencia correcta. */
  externalReferenceUserId: string;
  cycle: BillingCycle;
  payerEmail?: string | null;
  publicSiteUrl: string;
};

export type CreatePreferenceResult =
  | { ok: true; init_point: string; preference_id: string }
  | { ok: false; error: string };

export async function createMercadoPagoSubscriptionPreference(
  params: CreatePreferenceParams
): Promise<CreatePreferenceResult> {
  const { accessToken, externalReferenceUserId, cycle, payerEmail, publicSiteUrl } = params;
  const unitPrice = cycle === 'anual' ? MERCADOPAGO_YEARLY_ARS : MERCADOPAGO_MONTHLY_ARS;
  const title =
    cycle === 'anual' ? 'JC ONE FIX — Plan anual (ARS)' : 'JC ONE FIX — Plan mensual (ARS)';

  const base = publicSiteUrl.replace(/\/$/, '');
  const body = {
    items: [
      {
        id: cycle === 'anual' ? 'jconefix-ar-anual' : 'jconefix-ar-mensual',
        title,
        description: 'Suscripción JC ONE FIX',
        quantity: 1,
        currency_id: 'ARS',
        unit_price: unitPrice,
      },
    ],
    external_reference: externalReferenceUserId,
    metadata: { user_id: externalReferenceUserId, cycle },
    payer: payerEmail ? { email: payerEmail } : undefined,
    back_urls: {
      success: `${base}/checkout/success?source=mp`,
      failure: `${base}/checkout/ar?cycle=${cycle}`,
      pending: `${base}/checkout/ar?cycle=${cycle}`,
    },
    auto_return: 'approved',
    statement_descriptor: 'JC ONEFIX',
    binary_mode: false,
  };

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as {
    id?: string;
    init_point?: string;
    error?: string;
    message?: string;
    code?: string;
    cause?: unknown;
  };

  if (!res.ok) {
    const raw = (json.message || json.error || '').trim() || `HTTP ${res.status}`;
    const lower = raw.toLowerCase();
    /** MP PolicyAgent: token inválido, ausente o sin alcance; doc: PA_UNAUTHORIZED_RESULT_FROM_POLICIES */
    const isPolicyUnauthorized =
      lower.includes('policy') && lower.includes('unauthorized');
    const err = isPolicyUnauthorized
      ? 'Mercado Pago rechazó la petición: el Access Token no sirve para la API (suele pasar si pegaste la clave secreta de webhooks o un valor que no es el token de la app). En Credenciales de producción copiá el Access Token que empieza con APP_USR- y pegalo en MERCADOPAGO_ACCESS_TOKEN en Vercel.'
      : raw;
    console.error('[mercadopago] preference', res.status, json.code || '', raw, JSON.stringify(json.cause ?? ''));
    return { ok: false, error: err };
  }

  if (!json.init_point || !json.id) {
    return { ok: false, error: 'Respuesta inválida de Mercado Pago' };
  }

  return { ok: true, init_point: json.init_point, preference_id: json.id };
}

export type ApplyPaymentResult =
  | { ok: true; skipped: true; reason: string }
  | { ok: true; skipped: false; organizationId: string }
  | { ok: false; error: string };

/**
 * Idempotente: si el payment_id ya está en subscription_payments, no vuelve a extender licencia.
 */
export async function applyApprovedMercadoPagoPayment(
  admin: SupabaseClient,
  payment: MercadoPagoPaymentResource
): Promise<ApplyPaymentResult> {
  const status = String(payment.status || '').toLowerCase();
  if (status !== 'approved') {
    return { ok: true, skipped: true, reason: `status=${payment.status}` };
  }

  const paymentId = payment.id != null ? String(payment.id) : '';
  if (!paymentId) {
    return { ok: false, error: 'payment sin id' };
  }

  const externalRef = (payment.external_reference || '').trim();
  const userId =
    externalRef ||
    (typeof payment.metadata?.user_id === 'string' ? payment.metadata.user_id.trim() : '');
  if (!userId) {
    return { ok: false, error: 'external_reference vacío (se requiere user_id de Supabase)' };
  }

  const amount = Number(payment.transaction_amount);
  if (!Number.isFinite(amount)) {
    return { ok: false, error: 'transaction_amount inválido' };
  }

  const currency = String(payment.currency_id || '').toUpperCase();
  if (currency && currency !== 'ARS') {
    return { ok: true, skipped: true, reason: `currency=${currency}` };
  }

  let cycle: BillingCycle | null = null;
  const metaCycle = payment.metadata?.cycle;
  if (metaCycle === 'anual' || metaCycle === 'mensual') {
    cycle = normalizeBillingCycle(String(metaCycle));
    if (!amountMatchesCycle(amount, cycle)) {
      cycle = inferCycleFromAmount(amount);
    }
  } else {
    cycle = inferCycleFromAmount(amount);
  }

  if (!cycle) {
    return {
      ok: false,
      error: `Monto ${amount} ARS no coincide con mensual (${MERCADOPAGO_MONTHLY_ARS}) ni anual (${MERCADOPAGO_YEARLY_ARS})`,
    };
  }

  const { data: existing } = await admin
    .from('subscription_payments')
    .select('id')
    .eq('mercado_pago_payment_id', paymentId)
    .maybeSingle();

  if (existing) {
    return { ok: true, skipped: true, reason: 'already_processed' };
  }

  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .select('id, license_expires_at, trial_ends_at, subscription_status, features, owner_id')
    .eq('owner_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (orgErr || !org?.id) {
    return { ok: false, error: 'No se encontró organización para este usuario (owner_id)' };
  }

  const approvedAtRaw = payment.date_approved || payment.date_created;
  const approvedAt = approvedAtRaw ? new Date(approvedAtRaw) : new Date();
  if (Number.isNaN(approvedAt.getTime())) {
    return { ok: false, error: 'Fecha de pago inválida' };
  }

  const license = licenseDefaultsForPlan('profesional');
  const features = mergeOrgFeatures(org.features as Record<string, unknown>, license.features);

  const periodEndMs = currentPaidOrTrialEndMs(org);
  const baseStartMs = Math.max(approvedAt.getTime(), periodEndMs);
  const addMs =
    (cycle === 'anual' ? 365 : 30) * 24 * 60 * 60 * 1000;
  const newLicenseEnd = new Date(baseStartMs + addMs).toISOString();

  const { error: payInsErr } = await admin.from('subscription_payments').insert({
    user_id: userId,
    organization_id: org.id,
    mercado_pago_payment_id: paymentId,
    transaction_amount: amount,
    currency_id: payment.currency_id ?? 'ARS',
    payment_method_id: payment.payment_method_id ?? null,
    payment_type_id: payment.payment_type_id ?? null,
    status: 'approved',
    billing_cycle: cycle,
    date_approved: approvedAt.toISOString(),
    raw_payment: payment as unknown as Record<string, unknown>,
  });

  if (payInsErr) {
    if (payInsErr.code === '23505') {
      return { ok: true, skipped: true, reason: 'duplicate_payment_race' };
    }
    console.error('[mercadopago] insert subscription_payments', payInsErr);
    return { ok: false, error: payInsErr.message };
  }

  const { error: updErr } = await admin
    .from('organizations')
    .update({
      subscription_status: 'active',
      plan_type: license.plan_type,
      subscription_plan: license.subscription_plan,
      billing_cycle: cycle,
      license_expires_at: newLicenseEnd,
      trial_ends_at: newLicenseEnd,
      max_users: license.max_users,
      features,
    })
    .eq('id', org.id);

  if (updErr) {
    console.error('[mercadopago] update organization', updErr);
    return { ok: false, error: updErr.message };
  }

  return { ok: true, skipped: false, organizationId: org.id };
}

export function getMercadoPagoAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
