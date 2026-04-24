/**
 * Email y banner preventivo: ventana de 3 días ANTES del vencimiento (trial o licencia).
 * Al llegar la fecha/hora de vencimiento (según Supabase): el middleware bloquea el panel → /suspended
 * (sin días de gracia posteriores; los datos se conservan ≥12 meses).
 */

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

/** @deprecated Ya no hay gracia post-vencimiento; se mantiene por compatibilidad con imports (0). */
export const BILLING_GRACE_PERIOD_MS = 0;

/** Tres días antes del vencimiento: recordatorio por email y banner en el panel */
export const BILLING_PRE_EXPIRY_REMINDER_MS = THREE_DAYS_MS;

/** @deprecated */
export const BILLING_WARNING_WINDOW_MS = BILLING_PRE_EXPIRY_REMINDER_MS;

export type OrgBillingSnapshot = {
  subscription_status?: string | null;
  trial_ends_at?: string | null;
  license_expires_at?: string | null;
  license_unlimited?: boolean | null;
  country?: string | null;
  currency?: string | null;
};

/**
 * Todas las organizaciones del usuario están suspendidas o canceladas por administración:
 * no debe ofrecerse autopago (solo contacto con soporte).
 */
export function allOrganizationsAdminClosedForSelfService(orgs: OrgBillingSnapshot[]): boolean {
  if (orgs.length === 0) return false;
  return orgs.every((o) => {
    const st = String(o.subscription_status ?? '').toLowerCase();
    return st === 'suspended' || st === 'cancelled';
  });
}

/** Mensaje unificado para APIs de pago cuando el usuario solo tiene cuentas suspendidas/canceladas. */
export const PAYMENT_BLOCKED_ADMIN_SUSPENSION_ES =
  'Tu taller está suspendido o dado de baja por administración. Para regularizar la situación, escribí a soporte técnico desde tu correo.';

/** Checkout con precios ARS vs EUR según organizaciones del usuario. */
export function resolveCheckoutHrefForOrgs(orgs: OrgBillingSnapshot[]): string {
  const ar = orgs.some(
    (o) =>
      String(o.currency ?? '').toUpperCase() === 'ARS' ||
      String(o.country ?? '').toUpperCase() === 'AR'
  );
  return ar ? '/checkout/ar?cycle=mensual' : '/checkout/plan?cycle=mensual';
}

export type BillingWarningPayload = {
  kind: 'trial' | 'license';
  /** Fin del margen (cuando se cortará el acceso si no renueva) */
  graceEndsAt: string;
  message: string;
  ctaHref: string;
};

export type BillingEmailReminderPayload = {
  kind: 'trial' | 'license';
  /** Instantáneo de vencimiento del periodo (trial_ends_at o license_expires_at) */
  periodEndsAt: string;
  ctaHref: string;
};

export type BillingPreventiveBannerPayload = {
  kind: 'trial' | 'license';
  periodEndsAt: string;
  message: string;
  ctaHref: string;
};

function parseEnd(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * @deprecated Sin gracia post-vencimiento: el middleware envía a /suspended.
 */
export function pickBillingExpiryWarning(
  _orgs: OrgBillingSnapshot[],
  _nowMs: number = Date.now()
): BillingWarningPayload | null {
  return null;
}

/**
 * Banner en el panel: solo en los 3 días previos al vencimiento (aún con acceso completo).
 */
export function pickBillingPreventiveBanner(
  orgs: OrgBillingSnapshot[],
  nowMs: number = Date.now()
): BillingPreventiveBannerPayload | null {
  const emailPayload = pickBillingPreExpiryEmailReminder(orgs, nowMs);
  if (!emailPayload) return null;

  const end = parseEnd(emailPayload.periodEndsAt);
  if (end === null) return null;
  const msLeft = end - nowMs;
  const days = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
  const hours = Math.max(1, Math.ceil(msLeft / (60 * 60 * 1000)));

  const timeLeft =
    days >= 2
      ? `quedan ${days} días`
      : days === 1
        ? 'queda 1 día'
        : `quedan menos de ${hours} h`;

  const base =
    emailPayload.kind === 'trial'
      ? `Tu prueba gratuita termina pronto: ${timeLeft}.`
      : `Tu licencia vence pronto: ${timeLeft}.`;

  const sep = emailPayload.ctaHref.includes('?') ? '&' : '?';
  const ctaHref = `${emailPayload.ctaHref}${sep}renew=1`;

  return {
    kind: emailPayload.kind,
    periodEndsAt: emailPayload.periodEndsAt,
    message: `${base} Renová con Mercado Pago — el panel sigue activo y tus datos se conservan al vencer el plazo.`,
    ctaHref,
  };
}

/**
 * Para el middleware: ¿el acceso debe estar bloqueado por trial o licencia?
 * Bloquea en el instante de vencimiento (fecha/hora en Supabase), sin gracia posterior.
 */
export function orgBillingAccessBlocked(org: OrgBillingSnapshot, nowMs: number = Date.now()): boolean {
  const status = org.subscription_status || '';
  if (status === 'suspended' || status === 'cancelled') return true;
  if (org.license_unlimited === true) return false;

  if (status === 'trial' && org.trial_ends_at) {
    const periodEnd = parseEnd(org.trial_ends_at);
    if (periodEnd !== null && nowMs >= periodEnd) return true;
  }

  if ((status === 'active' || status === 'trial') && org.license_expires_at) {
    const periodEnd = parseEnd(org.license_expires_at);
    if (periodEnd !== null && nowMs >= periodEnd) return true;
  }

  return false;
}

/**
 * ¿Debemos enviar el email de recordatorio? Solo en los 3 días previos al vencimiento (aún no vencido).
 * Si hay varios plazos aplicables, elige el que venza antes.
 */
export function pickBillingPreExpiryEmailReminder(
  orgs: OrgBillingSnapshot[],
  nowMs: number = Date.now()
): BillingEmailReminderPayload | null {
  let best: { periodEnd: number; kind: 'trial' | 'license' } | null = null;

  for (const org of orgs) {
    if (org.license_unlimited === true) continue;
    const st = org.subscription_status || '';
    if (st === 'suspended' || st === 'cancelled') continue;

    if (st === 'trial' && org.trial_ends_at) {
      const periodEnd = parseEnd(org.trial_ends_at);
      if (periodEnd === null) continue;
      const windowStart = periodEnd - BILLING_PRE_EXPIRY_REMINDER_MS;
      if (nowMs >= windowStart && nowMs < periodEnd) {
        if (!best || periodEnd < best.periodEnd) best = { periodEnd, kind: 'trial' };
      }
    }

    if ((st === 'active' || st === 'trial') && org.license_expires_at) {
      const periodEnd = parseEnd(org.license_expires_at);
      if (periodEnd === null) continue;
      const windowStart = periodEnd - BILLING_PRE_EXPIRY_REMINDER_MS;
      if (nowMs >= windowStart && nowMs < periodEnd) {
        if (!best || periodEnd < best.periodEnd) best = { periodEnd, kind: 'license' };
      }
    }
  }

  if (!best) return null;

  return {
    kind: best.kind,
    periodEndsAt: new Date(best.periodEnd).toISOString(),
    ctaHref: resolveCheckoutHrefForOrgs(orgs),
  };
}
