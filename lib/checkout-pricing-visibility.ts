import type { OrgBillingSnapshot } from '@/lib/billing-expiry-warning';

/** Membresía + país del taller (para routing AR / ES). */
export type OrgBillingCountrySnapshot = OrgBillingSnapshot & {
  country?: string | null;
};

/**
 * Mientras el taller sigue en ventana de trial (subscription_status trial y antes de trial_ends_at),
 * no mostramos precios ni cobro (gancho de familiarización).
 * Tras esa fecha, o si ya está activo/suspendido, se muestra el flujo comercial.
 */
export function resolveCheckoutPricingMode(
  orgs: OrgBillingCountrySnapshot[],
  nowMs: number = Date.now()
): 'trial_only' | 'commercial' {
  if (!orgs.length) return 'trial_only';

  for (const org of orgs) {
    if (org.license_unlimited === true) return 'commercial';

    const st = org.subscription_status || '';
    if (st === 'suspended' || st === 'cancelled' || st === 'active') return 'commercial';

    if (st === 'trial' && org.trial_ends_at) {
      const end = new Date(org.trial_ends_at).getTime();
      if (!Number.isNaN(end) && nowMs < end) return 'trial_only';
    }
  }

  return 'commercial';
}

export function billingCountryFromOrg(
  _orgs: OrgBillingCountrySnapshot[],
  _regionCookie: string | null | undefined
): 'AR' {
  return 'AR';
}
