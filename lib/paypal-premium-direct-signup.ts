import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { checkoutAmountUsd, normalizeCheckoutCycle, normalizeCheckoutPlan } from '@/lib/checkout-pricing';
import { getLocationConfig, listConfiguredCountryCodes } from '@/lib/location-config';
import { notifyAdminNewUser, countryFromGeoHeader } from '@/lib/notifications/admin-alert';
import {
  computePremiumDirectLicenseEnd,
  licenseDefaultsForPlan,
  mergeOrgFeatures,
  normalizeBillingCycle,
  normalizePlanType,
} from '@/lib/org-plan';
import { parsePaypalCustomIdPremiumDirect, buildPaypalCustomIdPremiumDirect } from '@/lib/paypal-order-meta';
import { paypalCreateUsdOrderWithCustomId } from '@/lib/paypal-server';
import {
  decryptPremiumDirectPayload,
  encryptPremiumDirectPayload,
  type PremiumDirectEncryptedPayload,
} from '@/lib/premium-direct-crypto';
import { registerLocaleFromRequest } from '@/lib/register-locale-defaults';

const ALLOWED_REGISTER_ISO = new Set(listConfiguredCountryCodes());

const OWNER_PERMISSIONS = {
  can_create_tickets: true,
  can_edit_tickets: true,
  can_delete_tickets: true,
  can_view_reports: true,
  can_manage_inventory: true,
  can_manage_customers: true,
  can_manage_settings: true,
  can_manage_users: true,
};

export const PREMIUM_DIRECT_COOKIE = 'jcpd_reg';

const PremiumDirectBodySchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre es demasiado largo')
    .regex(/^[\p{L}\p{M}\s'\-\.]+$/u, 'El nombre contiene caracteres no permitidos'),
  email: z.string().trim().toLowerCase().email('Email no válido').max(254, 'Email demasiado largo'),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .max(128, 'La contraseña es demasiado larga'),
  shop_name: z
    .string()
    .trim()
    .min(2, 'El nombre del taller debe tener al menos 2 caracteres')
    .max(120, 'El nombre del taller es demasiado largo')
    .regex(/^[^\<\>\{\}\[\]\\\/\`]+$/, 'El nombre contiene caracteres no permitidos'),
  country_iso: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() ? v.trim().toUpperCase() : undefined),
    z.string().length(2, 'País no válido')
  ),
  fiscal_id: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((s) => (s ? s : undefined)),
  cycle: z.enum(['mensual', 'anual']),
});

function slugFromShop(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 48);
  return `${base || 'taller'}-${Math.floor(Math.random() * 10000)}`;
}

type CapturePu = {
  custom_id?: string;
  payments?: { captures?: Array<{ status?: string; amount?: { currency_code?: string; value?: string } }> };
};

function extractCaptureUsdAmount(captureBody: unknown): { currency: string; value: string } | null {
  const b = captureBody as { purchase_units?: CapturePu[] };
  const pu = b.purchase_units?.[0];
  const cap = pu?.payments?.captures?.[0];
  const currency = String(cap?.amount?.currency_code ?? '').toUpperCase();
  const value = cap?.amount?.value;
  if (!currency || value === undefined || value === null) return null;
  return { currency, value: String(value) };
}

export async function createPremiumDirectPayPalOrder(req: NextRequest, rawBody: unknown) {
  const parsed = PremiumDirectBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]?.message ?? 'Datos no válidos';
    return { ok: false as const, status: 400, error: firstError };
  }

  const { full_name, email, password, shop_name, country_iso, fiscal_id, cycle } = parsed.data;
  if (country_iso === 'AR') {
    return {
      ok: false as const,
      status: 400,
      error: 'Para talleres en Argentina usá el registro gratuito y Mercado Pago en el panel o /checkout/ar.',
    };
  }
  if (!ALLOWED_REGISTER_ISO.has(country_iso)) {
    return { ok: false as const, status: 400, error: 'País no válido' };
  }

  const plan = normalizeCheckoutPlan('profesional');
  const c = normalizeCheckoutCycle(cycle);
  if (!c) {
    return { ok: false as const, status: 400, error: 'Periodo inválido' };
  }

  const token = randomBytes(16).toString('hex');
  const payload: PremiumDirectEncryptedPayload = {
    v: 1,
    token,
    full_name,
    email,
    password,
    shop_name,
    country_iso,
    fiscal_id,
  };
  const encrypted = encryptPremiumDirectPayload(payload);
  const customId = buildPaypalCustomIdPremiumDirect(token, plan, c);

  try {
    const { id } = await paypalCreateUsdOrderWithCustomId(plan, c, customId);
    return { ok: true as const, orderId: id, cookieValue: encrypted };
  } catch (e: unknown) {
    console.error('[premium-direct] create order', e);
    return {
      ok: false as const,
      status: 500,
      error: e instanceof Error ? e.message : 'No se pudo crear el pago',
    };
  }
}

export type PremiumDirectProvisionResult =
  | { handled: false }
  | { handled: true; success: true }
  | { handled: true; success: false; status: number; message: string };

/**
 * Tras captura PayPal: si `custom_id` es registro Premium directo, crea usuario + org + licencia.
 */
export async function tryProvisionPremiumDirectSignup(
  req: NextRequest,
  captureBody: unknown
): Promise<PremiumDirectProvisionResult> {
  const body = captureBody as { status?: string; purchase_units?: CapturePu[] };
  if (body.status !== 'COMPLETED') return { handled: false };

  const pu = body.purchase_units?.[0];
  const customId = pu?.custom_id;
  const parsedMeta = parsePaypalCustomIdPremiumDirect(customId);
  if (!parsedMeta) return { handled: false };

  const cap = pu?.payments?.captures?.[0];
  if (cap?.status && cap.status !== 'COMPLETED') {
    return { handled: true, success: false, status: 400, message: 'Captura no completada' };
  }

  const amt = extractCaptureUsdAmount(captureBody);
  const plan = normalizeCheckoutPlan('profesional');
  const cycleNorm = normalizeBillingCycle(parsedMeta.cycle);
  const expectedVal = checkoutAmountUsd(plan, cycleNorm === 'anual' ? 'anual' : 'mensual');
  if (!amt || amt.currency !== 'USD' || Number.parseFloat(amt.value) !== Number.parseFloat(expectedVal)) {
    console.error('[premium-direct] amount mismatch', amt, expectedVal);
    return { handled: true, success: false, status: 400, message: 'Importe de pago no válido' };
  }

  if (normalizePlanType(parsedMeta.plan) !== 'profesional') {
    return { handled: true, success: false, status: 400, message: 'Plan no válido' };
  }

  const cookieRaw = req.cookies.get(PREMIUM_DIRECT_COOKIE)?.value;
  if (!cookieRaw) {
    return {
      handled: true,
      success: false,
      status: 400,
      message: 'Sesión de registro expirada. Volvé a completar el formulario e iniciá el pago de nuevo.',
    };
  }

  const payload = decryptPremiumDirectPayload(cookieRaw);
  if (!payload || payload.token !== parsedMeta.token) {
    return { handled: true, success: false, status: 400, message: 'Datos de registro no válidos o expirados.' };
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return { handled: true, success: false, status: 500, message: 'Servicio no configurado' };
  }

  const locale = registerLocaleFromRequest(req, { overrideCountryIso: payload.country_iso });
  const license = licenseDefaultsForPlan('profesional');
  const slug = slugFromShop(payload.shop_name);
  const approvedAt = new Date();
  const licenseEnd = computePremiumDirectLicenseEnd(cycleNorm, approvedAt);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    user_metadata: { full_name: payload.full_name, shop_name: payload.shop_name },
  });

  if (authError) {
    const msg = authError.message.toLowerCase();
    if (msg.includes('already') || msg.includes('registered')) {
      return {
        handled: true,
        success: false,
        status: 409,
        message:
          'Ya existe una cuenta con este email. Iniciá sesión; si se cobró el pago, escribinos con tu ID de orden PayPal.',
      };
    }
    return { handled: true, success: false, status: 400, message: authError.message };
  }

  const userId = authData.user?.id;
  if (!userId) {
    return { handled: true, success: false, status: 500, message: 'No se pudo crear el usuario' };
  }

  const { data: orgData, error: orgError } = await admin
    .from('organizations')
    .insert({
      name: payload.shop_name,
      slug,
      owner_id: userId,
      subscription_status: 'active',
      plan_type: license.plan_type,
      billing_cycle: cycleNorm,
      subscription_plan: license.subscription_plan,
      license_expires_at: licenseEnd,
      trial_ends_at: licenseEnd,
      max_users: license.max_users,
      max_tickets: license.max_tickets,
      features: mergeOrgFeatures({}, license.features),
      country: locale.orgCountry,
      currency: locale.currency,
      settings: {
        currency: locale.currency,
        language: 'es',
        timezone: locale.timezone,
      },
    })
    .select()
    .single();

  if (orgError) {
    await admin.auth.admin.deleteUser(userId);
    console.error('[premium-direct] org', orgError);
    return { handled: true, success: false, status: 500, message: orgError.message };
  }

  const { error: memError } = await admin.from('organization_members').upsert(
    {
      organization_id: orgData.id,
      user_id: userId,
      role: 'owner',
      is_active: true,
      permissions: OWNER_PERMISSIONS,
    },
    { onConflict: 'organization_id,user_id' }
  );

  if (memError) {
    await admin.from('organizations').delete().eq('id', orgData.id);
    await admin.auth.admin.deleteUser(userId);
    console.error('[premium-direct] member', memError);
    return { handled: true, success: false, status: 500, message: memError.message };
  }

  await admin.from('profiles').upsert(
    {
      id: userId,
      full_name: payload.full_name,
      shop_name: payload.shop_name,
      organization_id: orgData.id,
    },
    { onConflict: 'id' }
  );

  const fiscal = payload.fiscal_id?.trim() ?? '';

  const { error: shopErr } = await admin.from('shop_settings').insert({
    user_id: userId,
    organization_id: orgData.id,
    shop_name: payload.shop_name,
    alt_name: '',
    email: payload.email,
    phone: '',
    phone2: '',
    fax: '',
    address: '',
    city: '',
    postal_code: '',
    state: '',
    country: locale.countryName,
    website: '',
    registration_number: fiscal,
    footer_text: '',
    currency: locale.currency,
    currency_symbol: locale.currencySymbol,
    tax_rate: locale.taxRate,
    tax_included: true,
    accounting_method: 'accrual',
    time_format: '24',
    language: locale.language,
    start_time: '10:00:00',
    end_time: '20:00:00',
    invoice_prefix: locale.invoicePrefix,
    ticket_prefix: locale.ticketPrefix,
    default_warranty: 'Sin garantía',
    receive_emails: true,
    restocking_fee: false,
    deposit_repairs: false,
    screen_timeout: 'Never',
    decimal_places: '2',
    price_format: 'Decimal',
  });
  if (shopErr) {
    console.error('[premium-direct] shop_settings', shopErr);
  }

  try {
    const { error: seedErr } = await admin.rpc('seed_organization_services', {
      p_organization_id: orgData.id,
      p_user_id: userId,
    });
    if (seedErr) console.error('[premium-direct] seed_services', seedErr);
  } catch (e) {
    console.error('[premium-direct] seed_services exception', e);
  }

  const geoCountry = countryFromGeoHeader(req.headers.get('x-vercel-ip-country'));
  const countryCfg = getLocationConfig(payload.country_iso);
  try {
    await notifyAdminNewUser({
      shopName: payload.shop_name,
      userName: payload.full_name,
      email: payload.email,
      country: `${countryCfg.defaultCountryName} (ISO ${payload.country_iso}) · IP: ${geoCountry}`,
      planType: `Premium Direct PayPal USD (${cycleNorm === 'anual' ? 'Anual' : 'Mensual'} + 30 días regalo)`,
    });
  } catch (e) {
    console.error('[premium-direct] notifyAdminNewUser', e);
  }

  // Registrar pago en subscription_payments
  const paypalOrderId = (captureBody as { id?: string }).id ?? '';
  const capAmt = extractCaptureUsdAmount(captureBody);
  if (paypalOrderId && capAmt) {
    await admin.from('subscription_payments').insert({
      user_id: userId,
      organization_id: orgData.id,
      platform: 'paypal',
      paypal_order_id: paypalOrderId,
      transaction_amount: Number.parseFloat(capAmt.value),
      currency_id: capAmt.currency,
      status: 'COMPLETED',
      billing_cycle: cycleNorm,
      date_approved: new Date().toISOString(),
      raw_payment: captureBody as unknown as Record<string, unknown>,
    }).then(({ error: pErr }) => {
      if (pErr && pErr.code !== '23505') console.error('[premium-direct] subscription_payments', pErr);
    });
  }

  return { handled: true, success: true };
}

/**
 * Variante del webhook: sin cookie (el navegador del cliente ya se cerró).
 * Para funcionar desde el webhook, el custom_id premium-direct requiere que
 * el payload cifrado se haya guardado previamente en la tabla `paypal_pending_orders`
 * durante `createPremiumDirectPayPalOrder`. Si esa tabla no existe, devuelve
 * handled: false y el webhook simplemente no actúa sobre órdenes premium-direct
 * (el flujo capture desde el cliente sigue siendo el camino principal).
 */
export async function tryProvisionPremiumDirectSignupFromWebhook(
  captureBody: unknown
): Promise<PremiumDirectProvisionResult> {
  const body = captureBody as { status?: string; purchase_units?: CapturePu[] };

  // Solo actuar si la orden está COMPLETED
  if (body.status !== 'COMPLETED') return { handled: false };

  const pu = body.purchase_units?.[0];
  const customId = pu?.custom_id;
  const parsedMeta = parsePaypalCustomIdPremiumDirect(customId);
  if (!parsedMeta) return { handled: false };

  const cap = pu?.payments?.captures?.[0];
  if (!cap || cap.status !== 'COMPLETED') return { handled: false };

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) return { handled: false };

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Idempotencia: ¿ya provisionamos esta orden?
  const paypalOrderId = (captureBody as { id?: string }).id ?? '';
  if (paypalOrderId) {
    const { data: existing } = await admin
      .from('subscription_payments')
      .select('id')
      .eq('paypal_order_id', paypalOrderId)
      .maybeSingle();
    if (existing) {
      return { handled: true, success: true }; // ya procesado por el cliente
    }
  }

  // Intentar recuperar payload desde `paypal_pending_orders` (tabla opcional)
  const { data: pendingRow } = await admin
    .from('paypal_pending_orders')
    .select('encrypted_payload, token')
    .eq('token', parsedMeta.token)
    .maybeSingle();

  if (!pendingRow) {
    // Sin tabla o sin fila: no podemos provisionar desde el webhook sin cookie.
    // El flujo cliente es el principal; esto es el respaldo.
    console.warn('[webhook paypal] premium-direct: no pending order found for token', parsedMeta.token);
    return { handled: false };
  }

  const payload = decryptPremiumDirectPayload(pendingRow.encrypted_payload);
  if (!payload || payload.token !== parsedMeta.token) {
    return { handled: true, success: false, status: 400, message: 'Token de orden no válido' };
  }

  // Validar monto
  const amt = extractCaptureUsdAmount(captureBody);
  const plan = normalizeCheckoutPlan('profesional');
  const cycleNorm = normalizeBillingCycle(parsedMeta.cycle);
  const expectedVal = checkoutAmountUsd(plan, cycleNorm === 'anual' ? 'anual' : 'mensual');
  if (!amt || amt.currency !== 'USD' || Number.parseFloat(amt.value) !== Number.parseFloat(expectedVal)) {
    return { handled: true, success: false, status: 400, message: 'Importe de pago no válido (webhook)' };
  }

  // Verificar que no exista ya el usuario
  const { data: existingUser } = await admin.auth.admin.listUsers();
  const alreadyExists = existingUser?.users?.some(u => u.email === payload.email);
  if (alreadyExists) {
    return { handled: true, success: false, status: 409, message: 'Usuario ya existe (webhook)' };
  }

  // Reutilizamos la ruta normal pasando un Request sintético sin cookie
  // pero con los datos del payload descifrado embebidos:
  const syntheticReq = new Request('https://internal/webhook-provision', {
    method: 'POST',
    headers: { 'x-vercel-ip-country': '' },
  }) as unknown as import('next/server').NextRequest;

  // Inyectar cookie sintética para reutilizar tryProvisionPremiumDirectSignup
  Object.defineProperty(syntheticReq, 'cookies', {
    value: {
      get: (name: string) =>
        name === PREMIUM_DIRECT_COOKIE ? { value: pendingRow.encrypted_payload } : undefined,
    },
  });

  const result = await tryProvisionPremiumDirectSignup(syntheticReq, captureBody);

  // Limpiar fila de pendientes si se provisionó correctamente
  if (result.handled && result.success) {
    await admin.from('paypal_pending_orders').delete().eq('token', parsedMeta.token);
  }

  return result;
}
