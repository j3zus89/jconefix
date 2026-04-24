import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSuperAdminFromRequest } from '@/lib/auth/super-admin-server';
import { PANEL_ONLINE_WINDOW_MS, PANEL_REALTIME_WINDOW_MS } from '@/lib/panel-presence';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

type SessionRow = {
  user_id: string;
  client_key: string;
  last_active_at: string;
  user_agent: string | null;
  location_label: string | null;
  ip_address: string | null;
};

type PanelOnlineUserApi = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  organizations: { id: string; name: string }[];
  last_active_at: string;
  session_count: number;
  sessions: {
    client_key: string;
    last_active_at: string;
    user_agent: string | null;
    location_label: string | null;
    ip_address: string | null;
  }[];
};

function displayNameFromProfile(p: {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
} | null): string | null {
  if (!p) return null;
  const full = p.full_name?.trim();
  if (full) return full;
  const parts = [p.first_name, p.last_name].filter((x) => x && String(x).trim()).map((x) => String(x).trim());
  return parts.length ? parts.join(' ') : null;
}

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdminFromRequest(req);
  if (!auth.ok) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: auth.status, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Usar ventana de tiempo real (30s) si se solicita, de lo contrario usar la ventana estándar (3min)
  const isRealtime = req.nextUrl.searchParams.get('realtime') === 'true';
  const windowMs = isRealtime ? PANEL_REALTIME_WINDOW_MS : PANEL_ONLINE_WINDOW_MS;
  const cutoffIso = new Date(Date.now() - windowMs).toISOString();

  const { data: sessionRows, error: sessErr } = await supabaseAdmin
    .from('user_panel_sessions')
    .select('user_id, client_key, last_active_at, user_agent, location_label, ip_address')
    .gte('last_active_at', cutoffIso)
    .order('last_active_at', { ascending: false });

  if (sessErr) {
    console.warn('[panel-online-users] user_panel_sessions:', sessErr.message);
    return NextResponse.json(
      {
        error: sessErr.message,
        hint:
          'Si la tabla no existe, aplica la migración supabase/migrations/202604033900_user_panel_sessions.sql',
      },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }

  const rows = (sessionRows || []) as SessionRow[];
  if (rows.length === 0) {
    return NextResponse.json(
      {
        data: {
          window_ms: windowMs,
          generated_at: new Date().toISOString(),
          users: [] as PanelOnlineUserApi[],
        },
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }

  const byUser = new Map<string, SessionRow[]>();
  for (const r of rows) {
    if (!r.user_id) continue;
    if (!byUser.has(r.user_id)) byUser.set(r.user_id, []);
    byUser.get(r.user_id)!.push(r);
  }

  const userIds = Array.from(byUser.keys());

  const [{ data: profiles }, { data: members }] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, full_name, first_name, last_name')
      .in('id', userIds),
    supabaseAdmin
      .from('organization_members')
      .select('user_id, organization_id')
      .in('user_id', userIds)
      .eq('is_active', true),
  ]);

  const profileById = new Map(
    (profiles || []).map((p: { id: string }) => [p.id, p as { full_name?: string | null; first_name?: string | null; last_name?: string | null }])
  );

  const orgIds = new Set<string>();
  const userToOrgIds = new Map<string, string[]>();
  for (const m of members || []) {
    const uid = (m as { user_id?: string }).user_id;
    const oid = (m as { organization_id?: string }).organization_id;
    if (!uid || !oid) continue;
    orgIds.add(oid);
    if (!userToOrgIds.has(uid)) userToOrgIds.set(uid, []);
    userToOrgIds.get(uid)!.push(oid);
  }

  let orgNameById = new Map<string, string>();
  if (orgIds.size > 0) {
    const { data: orgRows } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .in('id', Array.from(orgIds));
    orgNameById = new Map((orgRows || []).map((o: { id: string; name: string }) => [o.id, o.name]));
  }

  const emailById = new Map<string, string | null>();
  const CHUNK = 12;
  for (let i = 0; i < userIds.length; i += CHUNK) {
    const slice = userIds.slice(i, i + CHUNK);
    await Promise.all(
      slice.map(async (uid) => {
        try {
          const { data, error } = await supabaseAdmin.auth.admin.getUserById(uid);
          if (error) {
            emailById.set(uid, null);
            return;
          }
          emailById.set(uid, data.user?.email ?? null);
        } catch {
          emailById.set(uid, null);
        }
      })
    );
  }

  const users: PanelOnlineUserApi[] = [];

  for (const userId of userIds) {
    const sess = byUser.get(userId) || [];
    const lastMs = Math.max(...sess.map((s) => new Date(s.last_active_at).getTime()));
    const orgIdList = userToOrgIds.get(userId) || [];
    const orgUnique = Array.from(new Set(orgIdList));
    const organizations = orgUnique
      .map((id) => ({ id, name: orgNameById.get(id) || '—' }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));

    users.push({
      user_id: userId,
      email: emailById.get(userId) ?? null,
      display_name: displayNameFromProfile(profileById.get(userId) ?? null),
      organizations,
      last_active_at: new Date(lastMs).toISOString(),
      session_count: sess.length,
      sessions: sess.map((s) => ({
        client_key: s.client_key,
        last_active_at: s.last_active_at,
        user_agent: s.user_agent,
        location_label: s.location_label,
        ip_address: s.ip_address,
      })),
    });
  }

  users.sort((a, b) => new Date(b.last_active_at).getTime() - new Date(a.last_active_at).getTime());

  return NextResponse.json(
    {
      data: {
        window_ms: windowMs,
        generated_at: new Date().toISOString(),
        users,
      },
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
