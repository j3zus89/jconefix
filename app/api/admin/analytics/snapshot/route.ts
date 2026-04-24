import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
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
    return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const now = new Date();
  const d14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const d7ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const d30ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Prefer view, fallback to organizations table
  let orgs: any[] | null = null;
  let orgErr: any = null;
  const viewRes = await supabaseAdmin
    .from('admin_organization_stats')
    .select('id, subscription_plan, effective_status, subscription_status, trial_ends_at, deleted_at');
  orgs = viewRes.data as any;
  orgErr = viewRes.error;

  if (orgErr && shouldReadOrganizationsTableInsteadOfStatsView(orgErr.message)) {
    const tableRes = await supabaseAdmin
      .from('organizations')
      .select('id, subscription_plan, subscription_status, trial_ends_at, deleted_at');
    orgs = tableRes.data as any;
    orgErr = tableRes.error;
    if (orgs) {
      orgs = orgs.map((o: any) => ({
        ...o,
        effective_status: o.subscription_status,
      }));
    }
  }

  if (orgErr) return NextResponse.json({ error: orgErr.message }, { status: 500 });

  const active = (orgs || []).filter((o: any) => !o.deleted_at);
  const by_plan: Record<string, number> = {};
  const by_status: Record<string, number> = {};
  for (const o of active) {
    const plan = o.subscription_plan || 'unknown';
    const st = o.effective_status || o.subscription_status || 'unknown';
    by_plan[plan] = (by_plan[plan] || 0) + 1;
    by_status[st] = (by_status[st] || 0) + 1;
  }

  const trials_expiring_14d = active.filter((o: any) => {
    if ((o.effective_status || o.subscription_status) !== 'trial') return false;
    if (!o.trial_ends_at) return false;
    return o.trial_ends_at <= d14 && o.trial_ends_at >= now.toISOString();
  }).length;

  const [{ count: tickets_7d, error: t7Err }, { count: tickets_30d, error: t30Err }] =
    await Promise.all([
      supabaseAdmin.from('repair_tickets').select('id', { count: 'exact', head: true }).gte('created_at', d7ago),
      supabaseAdmin.from('repair_tickets').select('id', { count: 'exact', head: true }).gte('created_at', d30ago),
    ]);
  if (t7Err) return NextResponse.json({ error: t7Err.message }, { status: 500 });
  if (t30Err) return NextResponse.json({ error: t30Err.message }, { status: 500 });

  return NextResponse.json(
    {
      data: {
        by_status,
        by_plan,
        trials_expiring_14d,
        tickets_7d: tickets_7d ?? 0,
        tickets_30d: tickets_30d ?? 0,
        orgs_total: active.length,
      },
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}

