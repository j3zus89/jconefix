import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requireSuperAdminFromRequest } from '@/lib/auth/super-admin-server';
import { humanizeSupportChatDbError } from '@/lib/supabase-setup-hints';
import { disableBotForUser, enableBotForUser } from '@/lib/support-bot';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

type Row = {
  id: string;
  user_id: string;
  organization_id: string | null;
  sender: string;
  body: string;
  created_at: string;
  attachment_url?: string | null;
};

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

function buildName(p: ProfileRow | null, email?: string | null): string {
  if (p) {
    const n = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
    if (n) return n;
  }
  const em = (email || '').trim();
  if (em && em.includes('@')) {
    const local = em.split('@')[0]?.trim();
    if (local) return local;
  }
  return 'Usuario';
}

const ADMIN_SENDER_NAME_MAX = 120;

async function adminSenderSnapshotForInsert(
  admin: SupabaseClient,
  adminUserId: string,
  email?: string | null,
): Promise<{ admin_sender_avatar_url: string | null; admin_sender_display_name: string }> {
  const { data } = await admin
    .from('profiles')
    .select('first_name, last_name, avatar_url')
    .eq('id', adminUserId)
    .maybeSingle();
  const p = data as Pick<ProfileRow, 'first_name' | 'last_name' | 'avatar_url'> | null;
  const rawName = buildName(
    p ? { id: adminUserId, first_name: p.first_name, last_name: p.last_name, avatar_url: p.avatar_url } : null,
    email ?? null,
  );
  const displayName =
    rawName.length > ADMIN_SENDER_NAME_MAX ? `${rawName.slice(0, ADMIN_SENDER_NAME_MAX - 1)}…` : rawName;
  const url = (p?.avatar_url ?? '').trim();
  return {
    admin_sender_avatar_url: url.length > 0 ? url.slice(0, 2000) : null,
    admin_sender_display_name: displayName,
  };
}

async function fetchUserEmailsByIds(
  admin: SupabaseClient,
  ids: string[],
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id))));
  const map: Record<string, string> = {};
  await Promise.all(
    unique.map(async (id) => {
      const { data, error } = await admin.auth.admin.getUserById(id);
      if (!error && data.user?.email) map[id] = data.user.email;
    }),
  );
  return map;
}

function formatOrgPlanLabel(o: {
  subscription_status?: string | null;
  plan_type?: string | null;
  subscription_plan?: string | null;
} | null): string {
  if (!o) return '—';
  const st = String(o.subscription_status || '').toLowerCase();
  if (st === 'trial' || st === 'trialing') return 'Trial';
  const pt = String(o.plan_type || o.subscription_plan || '').toLowerCase();
  if (pt.includes('profesional') || pt.includes('professional') || pt === 'pro') return 'Pro';
  if (pt.includes('basic') || pt.includes('basico') || pt.includes('básico')) return 'Básico';
  if (o.plan_type) return String(o.plan_type);
  if (o.subscription_plan) return String(o.subscription_plan);
  if (st) return st.charAt(0).toUpperCase() + st.slice(1);
  return 'Activo';
}

/** Sin query: resumen de hilos. ?userId= : mensajes de ese usuario (asc). */
export async function GET(request: NextRequest) {
  const auth = await requireSuperAdminFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const userIdFilter = request.nextUrl.searchParams.get('userId')?.trim();

  if (userIdFilter) {
    const [msgResult, profileResult, threadReadResult, authUserRes] = await Promise.all([
      admin
        .from('support_chat_messages')
        .select(
          'id, user_id, organization_id, sender, body, created_at, attachment_url, is_bot_message, admin_sender_avatar_url, admin_sender_display_name',
        )
        .eq('user_id', userIdFilter)
        .order('created_at', { ascending: true })
        .limit(500),
      admin
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .eq('id', userIdFilter)
        .maybeSingle(),
      admin
        .from('support_chat_threads')
        .select('user_last_read_message_id')
        .eq('user_id', userIdFilter)
        .maybeSingle(),
      admin.auth.admin.getUserById(userIdFilter),
    ]);

    if (msgResult.error) {
      return NextResponse.json({ error: humanizeSupportChatDbError(msgResult.error.message) }, { status: 500 });
    }

    const profile = profileResult.data as ProfileRow | null;
    const userEmail =
      !authUserRes.error && authUserRes.data.user?.email ? authUserRes.data.user.email : null;
    let userLastReadMessageId: string | null = null;
    if (!threadReadResult.error && threadReadResult.data) {
      const rr = threadReadResult.data as { user_last_read_message_id?: string | null };
      userLastReadMessageId = rr.user_last_read_message_id ?? null;
    } else if (threadReadResult.error) {
      console.warn('[admin support-chat] user_last_read_message_id:', threadReadResult.error.message);
    }
    return NextResponse.json({
      messages: msgResult.data ?? [],
      userProfile: {
        name: buildName(profile, userEmail),
        avatar_url: profile?.avatar_url ?? null,
      },
      userLastReadMessageId,
    });
  }

  const { data: messages, error } = await admin
    .from('support_chat_messages')
    .select(
      'id, user_id, organization_id, sender, body, created_at, attachment_url, is_bot_message, admin_sender_avatar_url, admin_sender_display_name',
    )
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: humanizeSupportChatDbError(error.message) }, { status: 500 });
  }

  const list = (messages || []) as Row[];
  const threadMap = new Map<string, { user_id: string; organization_id: string | null; latest: Row }>();

  for (const m of list) {
    if (!threadMap.has(m.user_id)) {
      threadMap.set(m.user_id, {
        user_id: m.user_id,
        organization_id: m.organization_id,
        latest: m,
      });
    }
  }

  const threads = Array.from(threadMap.values()).sort((a, b) =>
    b.latest.created_at.localeCompare(a.latest.created_at)
  );

  const orgIds: string[] = [];
  const userIds: string[] = [];
  const seenOrg = new Set<string>();
  for (const t of threads) {
    const oid = t.organization_id;
    if (oid && !seenOrg.has(oid)) { seenOrg.add(oid); orgIds.push(oid); }
    userIds.push(t.user_id);
  }

  const [orgResult, profilesResult, threadStatesResult, emailMap] = await Promise.all([
    orgIds.length
      ? admin
          .from('organizations')
          .select('id, name, country, subscription_status, plan_type, subscription_plan')
          .in('id', orgIds)
      : Promise.resolve({ data: [] }),
    userIds.length
      ? admin.from('profiles').select('id, first_name, last_name, avatar_url').in('id', userIds)
      : Promise.resolve({ data: [] }),
    userIds.length
      ? admin
          .from('support_chat_threads')
          .select('user_id, bot_active, priority, status')
          .in('user_id', userIds)
      : Promise.resolve({ data: [] }),
    userIds.length ? fetchUserEmailsByIds(admin, userIds) : Promise.resolve({} as Record<string, string>),
  ]);

  type OrgLite = {
    id: string;
    name: string;
    country?: string | null;
    subscription_status?: string | null;
    plan_type?: string | null;
    subscription_plan?: string | null;
  };
  const orgNames: Record<string, string> = {};
  const orgMeta: Record<string, OrgLite> = {};
  for (const o of (orgResult.data || []) as OrgLite[]) {
    orgNames[o.id] = o.name;
    orgMeta[o.id] = o;
  }

  const profileMap: Record<string, ProfileRow> = {};
  for (const p of (profilesResult.data || []) as ProfileRow[]) {
    profileMap[p.id] = p;
  }

  type ThreadState = { user_id: string; bot_active: boolean; priority: string; status: string };
  const threadStateMap: Record<string, ThreadState> = {};
  for (const ts of (threadStatesResult.data || []) as ThreadState[]) {
    threadStateMap[ts.user_id] = ts;
  }

  const enriched = threads.map((t) => {
    const oid = t.organization_id;
    const om = oid ? orgMeta[oid] : null;
    const ts = threadStateMap[t.user_id];
    return {
      user_id: t.user_id,
      organization_id: oid,
      organization_name: oid ? orgNames[oid] ?? null : null,
      organization_country: om?.country?.trim() || null,
      organization_plan_label: formatOrgPlanLabel(om ?? null),
      last_at: t.latest.created_at,
      last_preview: t.latest.body.slice(0, 140),
      last_sender: t.latest.sender,
      esperando_respuesta: t.latest.sender === 'user' || ts?.priority === 'high',
      user_name: buildName(profileMap[t.user_id] ?? null, emailMap[t.user_id] ?? null),
      user_avatar: profileMap[t.user_id]?.avatar_url ?? null,
      bot_active: ts?.bot_active ?? true,
      thread_priority: ts?.priority ?? 'normal',
      thread_status: ts?.status ?? 'open',
    };
  });

  return NextResponse.json({ threads: enriched });
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdminFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
  }

  let body: {
    userId?: string;
    body?: string;
    organizationId?: string | null;
    attachmentUrl?: string | null;
    /** Acción especial: 'enable_bot' | 'disable_bot' en lugar de enviar mensaje */
    action?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const userId = String(body.userId || '').trim();
  if (!userId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 });

  // ── Acciones de control del bot ──────────────────────────────────────────
  if (body.action === 'enable_bot') {
    await enableBotForUser(userId);
    return NextResponse.json({ ok: true, bot_active: true });
  }
  if (body.action === 'disable_bot') {
    await disableBotForUser(userId);
    return NextResponse.json({ ok: true, bot_active: false });
  }

  // ── Enviar mensaje manual ────────────────────────────────────────────────
  const text = String(body.body || '').trim();
  const attachmentUrl =
    typeof body.attachmentUrl === 'string' && body.attachmentUrl.trim().length > 0
      ? body.attachmentUrl.trim().slice(0, 2000)
      : null;
  if (!text && !attachmentUrl) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }
  if (text.length > 8000) {
    return NextResponse.json({ error: 'Mensaje demasiado largo' }, { status: 400 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let organizationId: string | null =
    typeof body.organizationId === 'string' && body.organizationId.trim().length > 0
      ? body.organizationId.trim()
      : null;

  if (!organizationId) {
    const { data: mem } = await admin
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('organization_id', { ascending: true })
      .limit(1)
      .maybeSingle();
    organizationId =
      (mem as { organization_id?: string } | null | undefined)?.organization_id ?? null;
  }

  const snap = await adminSenderSnapshotForInsert(admin, auth.user.id, auth.user.email);

  const row: Record<string, unknown> = {
    user_id: userId,
    organization_id: organizationId,
    sender: 'admin',
    body: text || '📎 Archivo adjunto',
    is_bot_message: false,
    admin_sender_avatar_url: snap.admin_sender_avatar_url,
    admin_sender_display_name: snap.admin_sender_display_name,
  };
  if (attachmentUrl) row.attachment_url = attachmentUrl;

  const { error } = await admin.from('support_chat_messages').insert(row);

  if (error) {
    return NextResponse.json({ error: humanizeSupportChatDbError(error.message) }, { status: 500 });
  }

  // Al responder manualmente, desactivar el bot para este hilo
  void disableBotForUser(userId);

  return NextResponse.json({ ok: true, organizationId });
}

/** Elimina todo el hilo de soporte de un usuario (mensajes en support_chat_messages). Solo SUPER_ADMIN. */
export async function DELETE(request: NextRequest) {
  const auth = await requireSuperAdminFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
  }

  const userId =
    request.nextUrl.searchParams.get('userId')?.trim() ||
    (await request.json().catch(() => null) as { userId?: string } | null)?.userId?.trim();
  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
    return NextResponse.json({ error: 'userId inválido' }, { status: 400 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error, count } = await admin.from('support_chat_messages').delete({ count: 'exact' }).eq('user_id', userId);

  if (error) {
    return NextResponse.json({ error: humanizeSupportChatDbError(error.message) }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: count ?? 0 });
}
