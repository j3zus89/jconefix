import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireOrganizationAdminFromRequest } from '@/lib/auth/org-admin-server';
import {
  countBlocksNewUser,
  effectiveEntitlements,
  entitlementsPlanLabel,
  isUnlimitedUsers,
} from '@/lib/org-plan';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPER_ADMIN_EMAILS = new Set([
  'sr.gonzalezcala@gmail.com',
  'sr.gonzalezcala89@gmail.com',
]);

function getAdminClient() {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function listAllAuthUsers(supabaseAdmin: any) {
  const users: any[] = [];
  let page = 1;
  const perPage = 200;

  for (;;) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const current = (data as any)?.users || [];
    users.push(...current);
    if (current.length < perPage) break;
    page += 1;
    if (page > 30) break;
  }

  return users;
}

export async function GET(req: NextRequest) {
  const auth = await requireOrganizationAdminFromRequest(req);
  if (!auth.ok) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: auth.status, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }

  const supabaseAdmin = getAdminClient();
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
  }

  const { data: orgRow } = await supabaseAdmin
    .from('organizations')
    .select('plan_type, subscription_plan, max_users, features, license_unlimited')
    .eq('id', auth.organizationId)
    .maybeSingle();

  const licenseUnlimited = !!orgRow?.license_unlimited;
  const ent = effectiveEntitlements({
    plan_type: orgRow?.plan_type,
    subscription_plan: orgRow?.subscription_plan,
    max_users: licenseUnlimited ? null : orgRow?.max_users,
    features: orgRow?.features as Record<string, unknown>,
  });

  const { data: memberships, error: membersError } = await supabaseAdmin
    .from('organization_members')
    .select('user_id, role, is_active, created_at')
    .eq('organization_id', auth.organizationId)
    .order('created_at', { ascending: false });

  if (membersError) {
    return NextResponse.json({ error: membersError.message }, { status: 500 });
  }

  const authUsers = await listAllAuthUsers(supabaseAdmin);
  const mapById = new Map(authUsers.map((u) => [u.id, u]));

  const memberIds = (memberships || []).map((m: { user_id: string }) => m.user_id).filter(Boolean);
  const profileById = new Map<
    string,
    { full_name?: string | null; first_name?: string | null; last_name?: string | null }
  >();
  if (memberIds.length > 0) {
    const { data: profRows } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, first_name, last_name')
      .in('id', memberIds);
    for (const row of profRows || []) {
      const id = (row as { id: string }).id;
      if (id) profileById.set(id, row as { full_name?: string | null; first_name?: string | null; last_name?: string | null });
    }
  }

  function displayNameForUser(
    userId: string,
    authUser: { email?: string | null; user_metadata?: Record<string, unknown> } | undefined
  ): string {
    const prof = profileById.get(userId);
    const fn = (prof?.first_name as string | undefined)?.trim() || '';
    const ln = (prof?.last_name as string | undefined)?.trim() || '';
    const combined = [fn, ln].filter(Boolean).join(' ').trim();
    const fromProfileFull = (prof?.full_name as string | undefined)?.trim() || '';
    const fromMeta = (authUser?.user_metadata?.full_name as string | undefined)?.trim() || '';
    const fromEmail = (authUser?.email || '').split('@')[0] || '';
    return combined || fromProfileFull || fromMeta || fromEmail || '';
  }

  const users = (memberships || []).map((m: any) => {
    const u = mapById.get(m.user_id);
    return {
      id: m.user_id,
      email: u?.email || '',
      full_name: displayNameForUser(m.user_id, u),
      role: m.role || 'technician',
      is_active: !!m.is_active,
      created_at: m.created_at || u?.created_at || new Date().toISOString(),
    };
  });

  const activeCount = users.filter((u) => u.is_active).length;
  const maxU = licenseUnlimited ? null : (orgRow?.max_users ?? null);
  const canAddUser =
    licenseUnlimited || !countBlocksNewUser(activeCount, orgRow?.max_users ?? null);

  return NextResponse.json(
    {
      data: {
        users,
        canManage: true,
        organizationId: auth.organizationId,
        actorRole: auth.role,
        entitlements: {
          planType: ent.planType,
          planLabel: entitlementsPlanLabel(ent.planType),
          maxUsers: maxU,
          unlimitedUsers: licenseUnlimited || isUnlimitedUsers(maxU),
          activeUsers: activeCount,
          canAddUser,
          advancedReports: ent.advancedReports,
          smsAutomation: ent.smsAutomation,
          integrations: ent.integrations,
        },
      },
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}

export async function POST(req: NextRequest) {
  const auth = await requireOrganizationAdminFromRequest(req);
  if (!auth.ok) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: auth.status, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }

  const supabaseAdmin = getAdminClient();
  if (!supabaseAdmin) return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });

  const { data: orgLicense } = await supabaseAdmin
    .from('organizations')
    .select('max_users, plan_type, subscription_plan, features, license_unlimited')
    .eq('id', auth.organizationId)
    .maybeSingle();

  const { count: activeCount, error: countErr } = await supabaseAdmin
    .from('organization_members')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', auth.organizationId)
    .eq('is_active', true);

  if (countErr) {
    return NextResponse.json({ error: countErr.message }, { status: 500 });
  }

  if (
    !orgLicense?.license_unlimited &&
    countBlocksNewUser(activeCount ?? 0, orgLicense?.max_users)
  ) {
    return NextResponse.json(
      {
        error:
          'Límite de usuarios alcanzado. El plan JC ONE FIX incluye usuarios ilimitados; contacta al administrador.',
      },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '');
  const full_name = String(body?.full_name || '').trim();
  const role = String(body?.role || 'technician');
  const is_active = body?.is_active !== false;

  if (!email || !password || !full_name) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
  }

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role },
  });
  if (createError || !created?.user) {
    return NextResponse.json({ error: createError?.message || 'No se pudo crear el usuario' }, { status: 400 });
  }

  const createdUser = created.user;

  const { error: linkError } = await supabaseAdmin.from('organization_members').insert([
    {
      organization_id: auth.organizationId,
      user_id: createdUser.id,
      role,
      is_active,
      invited_by: auth.user.id,
    },
  ]);

  if (linkError) {
    await supabaseAdmin.auth.admin.deleteUser(createdUser.id);
    return NextResponse.json({ error: linkError.message }, { status: 400 });
  }

  return NextResponse.json({ data: { id: createdUser.id } }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireOrganizationAdminFromRequest(req);
  if (!auth.ok) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: auth.status, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }

  const supabaseAdmin = getAdminClient();
  if (!supabaseAdmin) return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });

  const body = await req.json().catch(() => null);
  const userId = String(body?.id || '');
  const email = String(body?.email || '').trim().toLowerCase();
  const full_name = String(body?.full_name || '').trim();
  const role = String(body?.role || 'technician');
  const is_active = body?.is_active !== false;

  if (!userId || !email || !full_name) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
  }

  const { data: membership } = await supabaseAdmin
    .from('organization_members')
    .select('organization_id')
    .eq('organization_id', auth.organizationId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: 'Usuario no pertenece a esta organización' }, { status: 404 });
  }

  const { data: targetUserData, error: targetErr } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (targetErr || !targetUserData?.user) {
    return NextResponse.json({ error: targetErr?.message || 'Usuario no encontrado' }, { status: 404 });
  }
  const targetEmail = String(targetUserData.user.email || '').toLowerCase();
  if (SUPER_ADMIN_EMAILS.has(targetEmail)) {
    return NextResponse.json({ error: 'No se puede modificar esta cuenta protegida' }, { status: 403 });
  }

  const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    email,
    user_metadata: { ...(targetUserData.user.user_metadata || {}), full_name, role },
  });
  if (updateAuthError) {
    return NextResponse.json({ error: updateAuthError.message }, { status: 400 });
  }

  const { error: updateMemberError } = await supabaseAdmin
    .from('organization_members')
    .update({ role, is_active })
    .eq('organization_id', auth.organizationId)
    .eq('user_id', userId);
  if (updateMemberError) {
    return NextResponse.json({ error: updateMemberError.message }, { status: 400 });
  }

  return NextResponse.json({ data: { ok: true } });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireOrganizationAdminFromRequest(req);
  if (!auth.ok) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: auth.status, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }

  const supabaseAdmin = getAdminClient();
  if (!supabaseAdmin) return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });

  const body = await req.json().catch(() => null);
  const userId = String(body?.id || '');
  if (!userId) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
  if (userId === auth.user.id) {
    return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta' }, { status: 400 });
  }

  const { data: targetUserData } = await supabaseAdmin.auth.admin.getUserById(userId);
  const targetEmail = String(targetUserData?.user?.email || '').toLowerCase();
  if (SUPER_ADMIN_EMAILS.has(targetEmail)) {
    return NextResponse.json({ error: 'No se puede eliminar esta cuenta protegida' }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from('organization_members')
    .delete()
    .eq('organization_id', auth.organizationId)
    .eq('user_id', userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data: { ok: true } });
}

