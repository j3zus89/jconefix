import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
  }

  const q = (req.nextUrl.searchParams.get('q') || '').trim().toLowerCase();
  const page = Math.max(parseInt(req.nextUrl.searchParams.get('page') || '1', 10), 1);
  const perPage = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get('perPage') || '50', 10), 1), 200);

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const users = (data as any)?.users || [];
  const filtered =
    q.length < 2
      ? users
      : users.filter((u: any) =>
          [u.email || '', u.id || '', u.phone || ''].some((v) => String(v).toLowerCase().includes(q))
        );

  const ids: string[] = filtered.map((u: { id?: string }) => String(u.id || '')).filter(Boolean);
  const lastPanelByUser = new Map<string, string>();

  if (ids.length > 0) {
    try {
      const { data: sessionRows, error: sessErr } = await supabaseAdmin
        .from('user_panel_sessions')
        .select('user_id, last_active_at')
        .in('user_id', ids);

      if (!sessErr && Array.isArray(sessionRows)) {
        for (const row of sessionRows as { user_id: string; last_active_at: string }[]) {
          const uid = row.user_id;
          const ts = row.last_active_at;
          const prev = lastPanelByUser.get(uid);
          if (!prev || new Date(ts).getTime() > new Date(prev).getTime()) {
            lastPanelByUser.set(uid, ts);
          }
        }
      }
    } catch {
      /* tabla ausente u otro error: lista usuarios sin presencia */
    }
  }

  const usersWithPresence = filtered.map((u: any) => ({
    ...u,
    panel_last_active_at: lastPanelByUser.get(u.id) ?? null,
  }));

  return NextResponse.json(
    {
      data: {
        users: usersWithPresence,
        pagination: {
          page,
          perPage,
          total: (data as any)?.total ?? null,
          nextPage: (data as any)?.nextPage ?? null,
          lastPage: (data as any)?.lastPage ?? null,
        },
      },
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}

