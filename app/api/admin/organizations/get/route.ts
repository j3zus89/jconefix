import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { shouldReadOrganizationsTableInsteadOfStatsView } from '@/lib/admin-org-stats-view-fallback';
import { requireSuperAdminFromRequest } from '@/lib/auth/super-admin-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdminFromRequest(req);
  if (!auth.ok) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: auth.status, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Prefer view (stats), fallback to organizations table
  let data: any = null;
  let error: any = null;
  const viewRes = await supabaseAdmin
    .from('admin_organization_stats')
    .select('*')
    .eq('id', id)
    .single();
  data = viewRes.data;
  error = viewRes.error;

  if (error && shouldReadOrganizationsTableInsteadOfStatsView(error.message)) {
    const tableRes = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();
    data = tableRes.data;
    error = tableRes.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Enriquecer con settings/features reales desde organizations (la vista ya trae muchas columnas)
  const { data: orgRow } = await supabaseAdmin
    .from('organizations')
    .select(
      'settings, features, subscription_status, subscription_plan, plan_type, billing_cycle, license_expires_at, license_unlimited, max_users, max_tickets'
    )
    .eq('id', id)
    .maybeSingle();

  return NextResponse.json(
    {
      data: {
        ...data,
        settings: orgRow?.settings ?? null,
        features: orgRow?.features ?? null,
        subscription_status: orgRow?.subscription_status ?? data.subscription_status,
        subscription_plan: orgRow?.subscription_plan ?? data.subscription_plan,
        plan_type: orgRow?.plan_type ?? data.plan_type,
        billing_cycle: orgRow?.billing_cycle ?? data.billing_cycle,
        license_expires_at: orgRow?.license_expires_at ?? data.license_expires_at,
        license_unlimited: orgRow?.license_unlimited ?? data.license_unlimited ?? false,
        max_users: orgRow?.max_users ?? data.max_users,
        max_tickets: orgRow?.max_tickets ?? data.max_tickets,
      },
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}

