import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { pickBillingPreventiveBanner, type OrgBillingSnapshot } from '@/lib/billing-expiry-warning';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: rows, error } = await supabase
      .from('organization_members')
      .select(
        'organizations!inner(subscription_status, trial_ends_at, license_expires_at, license_unlimited, country, currency)'
      )
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const orgs: OrgBillingSnapshot[] = (rows ?? []).map((row: { organizations: unknown }) => {
      const raw = row.organizations;
      const o = (Array.isArray(raw) ? raw[0] : raw) as OrgBillingSnapshot | undefined;
      return {
        subscription_status: o?.subscription_status ?? null,
        trial_ends_at: o?.trial_ends_at ?? null,
        license_expires_at: o?.license_expires_at ?? null,
        license_unlimited: o?.license_unlimited ?? null,
        country: o?.country ?? null,
        currency: o?.currency ?? null,
      };
    });

    const preventiveBanner = pickBillingPreventiveBanner(orgs);

    return NextResponse.json({ preventiveBanner, warning: null });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
