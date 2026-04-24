import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSuperAdminFromRequest } from '@/lib/auth/super-admin-server';
import { PRICING_AR } from '@/lib/pricing-config';

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

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json(
      { error: 'Configuración incompleta' },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: orgs, error: orgErr }, { data: ticketCount7d, error: t7Err }] =
    await Promise.all([
      supabaseAdmin
        .from('organizations')
        .select(
          'id, subscription_status, trial_ends_at, deleted_at, created_at, billing_cycle, license_unlimited'
        ),
      supabaseAdmin
        .from('repair_tickets')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo),
    ]);

  if (orgErr) {
    return NextResponse.json(
      { error: orgErr.message },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }
  if (t7Err) {
    return NextResponse.json(
      { error: t7Err.message },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }

  const activeOrgs = (orgs || []).filter((o: any) => !o.deleted_at);
  const orgs_total = activeOrgs.length;
  const orgs_active = activeOrgs.filter((o: any) => o.subscription_status === 'active').length;
  const orgs_trial = activeOrgs.filter((o: any) => o.subscription_status === 'trial').length;
  const orgs_suspended = activeOrgs.filter((o: any) => o.subscription_status === 'suspended').length;

  const trials_expiring_7d = activeOrgs.filter((o: any) => {
    if (o.subscription_status !== 'trial' || !o.trial_ends_at) return false;
    return o.trial_ends_at >= now.toISOString() && o.trial_ends_at <= sevenDaysAhead;
  }).length;

  /** Días UTC (YYYY-MM-DD) de los últimos 7 días, del más antiguo al más reciente. */
  const dayKeys: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dayKeys.push(d.toISOString().slice(0, 10));
  }
  const countsByDay: Record<string, number> = Object.fromEntries(dayKeys.map((k) => [k, 0]));
  for (const o of activeOrgs as any[]) {
    if (!o.created_at) continue;
    const k = String(o.created_at).slice(0, 10);
    if (countsByDay[k] !== undefined) countsByDay[k] += 1;
  }
  const orgs_registered_last_7d = dayKeys.map((day) => ({ day, count: countsByDay[day] ?? 0 }));

  function monthlyRecurringArs(row: { billing_cycle: string | null; license_unlimited: boolean | null }): number {
    if (row.license_unlimited) return 0;
    const c = String(row.billing_cycle || 'mensual').toLowerCase();
    if (c === 'anual' || c === 'annual' || c === 'yearly') {
      return PRICING_AR.PRECIO_ANUAL / 12;
    }
    return PRICING_AR.PRECIO_MENSUAL;
  }

  const payingActive = activeOrgs.filter(
    (o: any) => o.subscription_status === 'active' && !o.license_unlimited
  );
  const mrr_estimate_ars_monthly = payingActive.reduce((sum: number, o: any) => sum + monthlyRecurringArs(o), 0);
  const mrr_active_paying_orgs = payingActive.length;
  const mrr_active_unlimited_orgs = activeOrgs.filter(
    (o: any) => o.subscription_status === 'active' && o.license_unlimited
  ).length;

  const [{ count: tickets_total }, { data: userList, error: usersErr }] = await Promise.all([
    supabaseAdmin.from('repair_tickets').select('id', { count: 'exact', head: true }),
    supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 }),
  ]);

  if (usersErr) {
    return NextResponse.json(
      { error: usersErr.message },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }

  const users_total = (userList as any)?.total ?? 0;

  return NextResponse.json(
    {
      data: {
        orgs_total,
        orgs_active,
        orgs_trial,
        orgs_suspended,
        users_total,
        tickets_total: tickets_total ?? 0,
        tickets_7d: (ticketCount7d as any)?.count ?? 0,
        trials_expiring_7d,
        orgs_registered_last_7d,
        mrr_estimate_ars_monthly,
        mrr_active_paying_orgs,
        mrr_active_unlimited_orgs,
        last_updated: new Date().toISOString(),
      },
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}

