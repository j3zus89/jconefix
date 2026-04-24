import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  allOrganizationsAdminClosedForSelfService,
  PAYMENT_BLOCKED_ADMIN_SUSPENSION_ES,
} from '@/lib/billing-expiry-warning';
import {
  normalizeCheckoutCycle,
  normalizeCheckoutPlan,
} from '@/lib/checkout-pricing';
import { fetchOrgBillingSnapshotsForUser } from '@/lib/fetch-org-billing-snapshots-admin';
import { paypalCreateOrder } from '@/lib/paypal-server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const plan = normalizeCheckoutPlan(typeof body.plan === 'string' ? body.plan : null);
    const cycle = normalizeCheckoutCycle(typeof body.cycle === 'string' ? body.cycle : null);
    if (!cycle) {
      return NextResponse.json({ error: 'cycle inválido (mensual o anual)' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (user && supabaseUrl && serviceKey) {
      const admin = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const billingSnapshots = await fetchOrgBillingSnapshotsForUser(admin, user.id);
      if (allOrganizationsAdminClosedForSelfService(billingSnapshots)) {
        return NextResponse.json({ error: PAYMENT_BLOCKED_ADMIN_SUSPENSION_ES }, { status: 403 });
      }
    }

    let organizationId: string | null = null;
    if (user) {
      const { data: members } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('joined_at', { ascending: true });
      const rows = members ?? [];
      const owner = rows.find((r: { role: string }) => r.role === 'owner');
      organizationId = owner?.organization_id ?? rows[0]?.organization_id ?? null;
    }

    const { id } = await paypalCreateOrder(plan, cycle, organizationId);
    return NextResponse.json({ id });
  } catch (e: any) {
    console.error('[paypal/create-order]', e);
    return NextResponse.json(
      { error: e?.message || 'No se pudo crear el pago' },
      { status: 500 }
    );
  }
}
