import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  billingCountryFromOrg,
  resolveCheckoutPricingMode,
  type OrgBillingCountrySnapshot,
} from '@/lib/checkout-pricing-visibility';

export type CheckoutPricingClientState = {
  mode: 'trial_only' | 'commercial';
  billingCountry: 'AR';
};

function mapOrgRows(
  rows: { organizations: unknown }[] | null
): OrgBillingCountrySnapshot[] {
  if (!rows?.length) return [];
  return rows.map((row) => {
    const raw = row.organizations;
    const o = (Array.isArray(raw) ? raw[0] : raw) as Record<string, unknown> | undefined;
    return {
      subscription_status: (o?.subscription_status as string) ?? null,
      trial_ends_at: (o?.trial_ends_at as string) ?? null,
      license_expires_at: (o?.license_expires_at as string) ?? null,
      license_unlimited: (o?.license_unlimited as boolean) ?? null,
      country: (o?.country as string) ?? null,
    };
  });
}

/** Estado para checkout / landings: modo visual y país de facturación (org o cookie). */
export async function getCheckoutPricingClientState(options?: {
  /** Desde banner «Ir a pago»: mostrar cobro aunque el trial siga vigente (sigue acumulando días al pagar). */
  forceCommercial?: boolean;
}): Promise<CheckoutPricingClientState> {
  const cookieStore = await cookies();
  const regionCookie = cookieStore.get('jc_region')?.value ?? null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      mode: options?.forceCommercial ? 'commercial' : 'trial_only',
      billingCountry: billingCountryFromOrg([], regionCookie),
    };
  }

  const { data: rows, error } = await supabase
    .from('organization_members')
    .select(
      'organizations!inner(subscription_status, trial_ends_at, license_expires_at, license_unlimited, country)'
    )
    .eq('user_id', user.id)
    .eq('is_active', true);

  if (error || !rows?.length) {
    return {
      mode: options?.forceCommercial ? 'commercial' : 'trial_only',
      billingCountry: billingCountryFromOrg([], regionCookie),
    };
  }

  const orgs = mapOrgRows(rows);
  return {
    mode: options?.forceCommercial ? 'commercial' : resolveCheckoutPricingMode(orgs),
    billingCountry: billingCountryFromOrg(orgs, regionCookie),
  };
}
