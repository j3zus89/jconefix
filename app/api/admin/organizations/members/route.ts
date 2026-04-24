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

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const [membersResult, techniciansResult] = await Promise.all([
    supabaseAdmin
      .from('organization_members')
      .select('id, user_id, organization_id, role, is_active, created_at')
      .eq('organization_id', id)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('technicians')
      .select('id, name, email, phone, role, is_active, color, organization_id, created_at')
      .eq('organization_id', id)
      .order('created_at', { ascending: false }),
  ]);

  if (membersResult.error)
    return NextResponse.json({ error: membersResult.error.message }, { status: 500 });

  // Enrich organization_members: email from auth.users + profile (name, avatar)
  const memberRows = membersResult.data || [];
  const techRows = techniciansResult.data || [];

  const memberUserIds = Array.from(new Set(memberRows.map((m: any) => m.user_id))).filter(Boolean);

  let emailByUserId: Record<string, string> = {};
  let profileByUserId: Record<string, { first_name: string | null; last_name: string | null; avatar_url: string | null }> = {};

  if (memberUserIds.length > 0) {
    const [authUsersRes, profilesRes] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', memberUserIds),
    ]);

    const users = (authUsersRes.data as any)?.users || [];
    for (const u of users) {
      if (memberUserIds.includes(u.id) && u.email) emailByUserId[u.id] = u.email;
    }
    for (const p of (profilesRes.data || []) as any[]) {
      profileByUserId[p.id] = { first_name: p.first_name, last_name: p.last_name, avatar_url: p.avatar_url };
    }
  }

  const enrichedMembers = memberRows.map((m: any) => {
    const profile = profileByUserId[m.user_id] ?? {};
    const nameParts = [profile.first_name, profile.last_name].filter(Boolean);
    return {
      source: 'member' as const,
      id: m.id,
      user_id: m.user_id,
      name: nameParts.length ? nameParts.join(' ') : null,
      email: emailByUserId[m.user_id] || null,
      role: m.role,
      is_active: m.is_active,
      avatar_url: profile.avatar_url ?? null,
      created_at: m.created_at,
    };
  });

  const enrichedTechnicians = techRows.map((t: any) => ({
    source: 'technician' as const,
    id: t.id,
    user_id: null,
    name: t.name,
    email: t.email,
    role: t.role,
    is_active: t.is_active,
    avatar_url: null,
    color: t.color,
    phone: t.phone,
    created_at: t.created_at,
  }));

  return NextResponse.json(
    { data: [...enrichedMembers, ...enrichedTechnicians] },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}

/** Activa o desactiva acceso al panel de un miembro (no técnicos). */
export async function PATCH(req: NextRequest) {
  const auth = await requireSuperAdminFromRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
  }

  const body = (await req.json().catch(() => null)) as {
    memberRowId?: string;
    is_active?: boolean;
  } | null;
  const memberRowId = body?.memberRowId?.trim();
  const isActive = body?.is_active;
  if (!memberRowId || typeof isActive !== 'boolean') {
    return NextResponse.json({ error: 'memberRowId e is_active requeridos' }, { status: 400 });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: row, error: fetchErr } = await supabaseAdmin
    .from('organization_members')
    .select('id, role, organization_id')
    .eq('id', memberRowId)
    .maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ error: fetchErr?.message || 'Miembro no encontrado' }, { status: 404 });
  }
  if (row.role === 'owner') {
    return NextResponse.json({ error: 'No se puede desactivar al titular (owner) desde aquí.' }, { status: 400 });
  }

  const { error: updErr } = await supabaseAdmin
    .from('organization_members')
    .update({ is_active: isActive })
    .eq('id', memberRowId);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  await supabaseAdmin.rpc('log_super_admin_action', {
    p_action: 'toggle_organization_member_active',
    p_target_org_id: row.organization_id,
    p_target_user_id: null,
    p_details: { member_row_id: memberRowId, is_active: isActive },
  });

  return NextResponse.json({ success: true });
}
