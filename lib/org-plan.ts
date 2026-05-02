/**
 * Plan comercial único de venta: todo ilimitado (internamente `profesional`).
 * `basico` solo por filas históricas en BD; nuevas altas usan `profesional`.
 */

export type PlanType = 'basico' | 'profesional';
export type BillingCycle = 'mensual' | 'anual';

export type OrgPlanFeatures = {
  advanced_reports: boolean;
  sms_automation: boolean;
  priority_support: boolean;
  multi_location: boolean;
  api_access: boolean;
  custom_branding: boolean;
  integrations: boolean;
};

/** Prueba gratuita pública (días). Debe coincidir con middleware y alta automática. */
export const PUBLIC_TRIAL_DAYS = 15;

/** Fin de prueba desde `from` (misma hora + N días en ms). */
export function computePublicTrialEndsAt(from: Date = new Date()): string {
  const ms = PUBLIC_TRIAL_DAYS * 24 * 60 * 60 * 1000;
  return new Date(from.getTime() + ms).toISOString();
}

/** Caducidad desde el instante `from`: +30 o +365 días naturales (24h). */
export function computeLicenseExpiresAt(cycle: BillingCycle, from: Date = new Date()): string {
  const days = cycle === 'anual' ? 365 : 30;
  const ms = days * 24 * 60 * 60 * 1000;
  return new Date(from.getTime() + ms).toISOString();
}

const GIFT_PREMIUM_DAYS = 30;

/**
 * Registro Premium directo (PayPal): 30 días de regalo + periodo pagado.
 */
export function computePremiumDirectLicenseEnd(
  cycle: BillingCycle,
  from: Date = new Date()
): string {
  const giftMs = GIFT_PREMIUM_DAYS * 24 * 60 * 60 * 1000;
  if (cycle === 'mensual') {
    const paidMs = 30 * 24 * 60 * 60 * 1000;
    return new Date(from.getTime() + paidMs + giftMs).toISOString();
  }
  const paidMs = 365 * 24 * 60 * 60 * 1000;
  return new Date(from.getTime() + paidMs + giftMs).toISOString();
}

function parseLicenseEndMs(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** Fin del acceso vigente antes de sumar un nuevo periodo (webhooks / captura). */
export function currentPaidOrTrialEndMs(org: {
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

/**
 * Tras pago aprobado: max(fecha de aprobación, fin de periodo actual) + 30 o 365 días.
 */
export function computeStackedLicenseExpiresAt(
  cycle: BillingCycle,
  org: {
    subscription_status?: string | null;
    license_expires_at?: string | null;
    trial_ends_at?: string | null;
  },
  approvedAt: Date = new Date()
): string {
  const periodEndMs = currentPaidOrTrialEndMs(org);
  const baseStartMs = Math.max(approvedAt.getTime(), periodEndMs);
  const addMs = (cycle === 'anual' ? 365 : 30) * 24 * 60 * 60 * 1000;
  return new Date(baseStartMs + addMs).toISOString();
}

export function planTypeLabel(t: PlanType): string {
  return t === 'profesional' ? 'JC ONE FIX' : 'Cuenta con límites (histórico)';
}

export function billingCycleLabel(c: BillingCycle): string {
  return c === 'anual' ? 'Anual' : 'Mensual';
}

/** Etiqueta admin / listados */
export function formatPlanPeriodLabel(planType: string | null | undefined, billingCycle: string | null | undefined): string {
  const pt = normalizePlanType(planType);
  const bc = normalizeBillingCycle(billingCycle);
  const pShort = pt === 'profesional' ? 'JC ONE FIX' : 'Histórico';
  const cShort = bc === 'anual' ? 'Anual' : 'Mensual';
  return `${pShort} — ${cShort}`;
}

export function normalizePlanType(raw: string | null | undefined): PlanType {
  const p = (raw || 'basico').toLowerCase();
  if (p === 'profesional' || p === 'pro' || p === 'growth' || p === 'enterprise') return 'profesional';
  return 'basico';
}

export function normalizeBillingCycle(raw: string | null | undefined): BillingCycle {
  const c = (raw || 'mensual').toLowerCase();
  return c === 'anual' ? 'anual' : 'mensual';
}

export function adminPlanSelectValue(planType: string | null | undefined, subscriptionFallback?: string | null): PlanType {
  return normalizePlanType(planType || subscriptionFallback);
}

export function defaultFeaturesForPlanType(plan: PlanType): OrgPlanFeatures {
  if (plan === 'profesional') {
    return {
      advanced_reports: true,
      sms_automation: true,
      priority_support: true,
      multi_location: true,
      api_access: false,
      custom_branding: false,
      integrations: true,
    };
  }
  return {
    advanced_reports: false,
    sms_automation: false,
    priority_support: false,
    multi_location: false,
    api_access: false,
    custom_branding: false,
    integrations: false,
  };
}

export function licenseDefaultsForPlan(plan: PlanType): {
  plan_type: PlanType;
  subscription_plan: PlanType;
  max_users: number | null;
  max_tickets: number | null;
  features: OrgPlanFeatures;
} {
  if (plan === 'profesional') {
    return {
      plan_type: 'profesional',
      subscription_plan: 'profesional',
      max_users: null,
      max_tickets: null,
      features: defaultFeaturesForPlanType('profesional'),
    };
  }
  return {
    plan_type: 'basico',
    subscription_plan: 'basico',
    max_users: 3,
    max_tickets: 50,
    features: defaultFeaturesForPlanType('basico'),
  };
}

export function mergeOrgFeatures(
  existing: Record<string, unknown> | null | undefined,
  preset: OrgPlanFeatures
): Record<string, boolean> {
  const base = existing && typeof existing === 'object' ? { ...existing } : {};
  return {
    ...base,
    ...preset,
  } as Record<string, boolean>;
}

export type OrgEntitlements = {
  planType: PlanType;
  advancedReports: boolean;
  smsAutomation: boolean;
  integrations: boolean;
  maxUsers: number | null;
};

export function effectiveEntitlements(org: {
  plan_type?: string | null;
  subscription_plan?: string | null;
  max_users?: number | null;
  features?: Record<string, unknown> | null;
}): OrgEntitlements {
  const plan = normalizePlanType(org.plan_type || org.subscription_plan);
  const defaults = defaultFeaturesForPlanType(plan);
  const f = org.features && typeof org.features === 'object' ? org.features : {};
  const bool = (k: keyof OrgPlanFeatures) =>
    typeof f[k] === 'boolean' ? (f[k] as boolean) : defaults[k];

  return {
    planType: plan,
    advancedReports: bool('advanced_reports'),
    smsAutomation: bool('sms_automation'),
    integrations: bool('integrations'),
    maxUsers: org.max_users ?? null,
  };
}

export function isUnlimitedUsers(maxUsers: number | null | undefined): boolean {
  if (maxUsers == null) return true;
  return maxUsers >= 9999;
}

export function countBlocksNewUser(activeMemberCount: number, maxUsers: number | null | undefined): boolean {
  if (isUnlimitedUsers(maxUsers)) return false;
  return activeMemberCount >= (maxUsers as number);
}

export function entitlementsPlanLabel(planType: PlanType): string {
  return planType === 'profesional' ? 'JC ONE FIX' : 'Histórico';
}

/** Fecha y hora corta (panel admin, listados). */
export function formatOrgDateTimeShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function formatOrgDateLong(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

/** Texto de tiempo restante de trial (null si no hay fecha). */
export function trialRemainingHint(trialEndsAt: string | null | undefined): string | null {
  if (!trialEndsAt) return null;
  const end = new Date(trialEndsAt).getTime();
  if (Number.isNaN(end)) return null;
  const ms = end - Date.now();
  if (ms <= 0) return 'Prueba vencida';
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  if (days > 1) return `Quedan ${days} días`;
  if (days === 1) return 'Queda 1 día';
  const hours = Math.max(1, Math.ceil(ms / (60 * 60 * 1000)));
  return `Quedan menos de ${hours} h`;
}
