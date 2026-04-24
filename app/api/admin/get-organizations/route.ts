import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { shouldReadOrganizationsTableInsteadOfStatsView } from '@/lib/admin-org-stats-view-fallback';
import { requireSuperAdminFromRequest } from '@/lib/auth/super-admin-server';
import { PANEL_ONLINE_WINDOW_MS } from '@/lib/panel-presence';
import { readPolishMonthlyLimitFromOrgSettings } from '@/lib/org-polish-quota';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

type OrgPanelPresence = {
  panel_online: boolean;
  panel_online_users: number;
  panel_last_seen_at: string | null;
};

async function computeOrgPanelPresence(
  supabaseAdmin: any,
  orgIds: string[]
): Promise<Map<string, OrgPanelPresence>> {
  const defaults = (): OrgPanelPresence => ({
    panel_online: false,
    panel_online_users: 0,
    panel_last_seen_at: null,
  });
  const map = new Map<string, OrgPanelPresence>();
  for (const id of orgIds) map.set(id, defaults());
  if (orgIds.length === 0) return map;

  const { data: members, error: memErr } = await supabaseAdmin
    .from('organization_members')
    .select('organization_id, user_id')
    .in('organization_id', orgIds)
    .eq('is_active', true);

  if (memErr) {
    console.warn('[get-organizations] organization_members (presencia):', memErr.message);
    return map;
  }

  const orgToUsers = new Map<string, string[]>();
  for (const m of members || []) {
    const oid = (m as { organization_id?: string }).organization_id;
    const uid = (m as { user_id?: string }).user_id;
    if (!oid || !uid) continue;
    if (!orgToUsers.has(oid)) orgToUsers.set(oid, []);
    orgToUsers.get(oid)!.push(uid);
  }

  const allUserIds = (members || [])
    .map((m: { user_id: string }) => m.user_id)
    .filter((id: string, idx: number, arr: string[]) => Boolean(id) && arr.indexOf(id) === idx);
  if (allUserIds.length === 0) return map;

  const rows: { user_id: string; last_active_at: string }[] = [];
  const CHUNK = 150;
  for (let i = 0; i < allUserIds.length; i += CHUNK) {
    const slice = allUserIds.slice(i, i + CHUNK);
    const { data: sess, error: sessErr } = await supabaseAdmin
      .from('user_panel_sessions')
      .select('user_id, last_active_at')
      .in('user_id', slice);
    if (sessErr) {
      console.warn('[get-organizations] user_panel_sessions:', sessErr.message);
      continue;
    }
    for (const s of (sess || []) as { user_id: string; last_active_at: string }[]) {
      rows.push(s);
    }
  }

  const userLastSeenMs = new Map<string, number>();
  for (const s of rows) {
    const t = new Date(s.last_active_at).getTime();
    if (Number.isNaN(t)) continue;
    const prev = userLastSeenMs.get(s.user_id) ?? 0;
    if (t > prev) userLastSeenMs.set(s.user_id, t);
  }

  const cutoff = Date.now() - PANEL_ONLINE_WINDOW_MS;

  for (const oid of orgIds) {
    const uids = orgToUsers.get(oid) || [];
    let maxTs = 0;
    let onlineCount = 0;
    for (const uid of uids) {
      const ts = userLastSeenMs.get(uid);
      if (ts == null) continue;
      if (ts > maxTs) maxTs = ts;
      if (ts >= cutoff) onlineCount++;
    }
    map.set(oid, {
      panel_online: onlineCount > 0,
      panel_online_users: onlineCount,
      panel_last_seen_at: maxTs > 0 ? new Date(maxTs).toISOString() : null,
    });
  }

  return map;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdminFromRequest(request);
    if (!auth.ok) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: auth.status, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
    }

    // Crear cliente admin con service_role
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    
    // Prefer view (stats), fallback to table if view missing
    let orgs: any[] | null = null;
    let error: any = null;
    const viewRes = await supabaseAdmin
      .from('admin_organization_stats')
      .select('*')
      .order('created_at', { ascending: false });
    orgs = viewRes.data as any;
    error = viewRes.error;

    if (error && shouldReadOrganizationsTableInsteadOfStatsView(error.message)) {
      const tableRes = await supabaseAdmin
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });
      orgs = tableRes.data as any;
      error = tableRes.error;
    }

    if (error) {
      console.error('❌ Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }


    // Filtrar eliminadas (soft delete)
    const activeOrgs = (orgs || []).filter((org: any) => {
      const isDeleted = org.deleted_at !== null && org.deleted_at !== undefined;
      return !isDeleted;
    });

    const orgIds = activeOrgs.map((o: { id: string }) => o.id).filter(Boolean);
    const presenceByOrg = await computeOrgPanelPresence(supabaseAdmin, orgIds);

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const polishMap = new Map<string, number>();
    try {
      const { data: polishRows, error: polErr } = await supabaseAdmin.rpc('get_polish_counts_by_org_since', {
        p_since: monthStart.toISOString(),
      });
      if (!polErr && Array.isArray(polishRows)) {
        for (const r of polishRows as { organization_id?: string; call_count?: number | string }[]) {
          const oid = r.organization_id ? String(r.organization_id) : '';
          if (!oid) continue;
          polishMap.set(oid, Number(r.call_count ?? 0));
        }
      }
    } catch {
      /* migración / RPC aún no aplicados */
    }

    const enriched = activeOrgs.map((o: { id: string; settings?: unknown }) => {
      const p = presenceByOrg.get(o.id) ?? {
        panel_online: false,
        panel_online_users: 0,
        panel_last_seen_at: null,
      };
      const polish_month_used = polishMap.get(o.id) ?? 0;
      const polish_month_limit = readPolishMonthlyLimitFromOrgSettings(o.settings);
      return { ...o, ...p, polish_month_used, polish_month_limit };
    });

    return NextResponse.json(
      { data: enriched },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error: any) {
    console.error('💥 Error:', error);
    return NextResponse.json({ error: error?.message || 'Error desconocido' }, { status: 500 });
  }
}
