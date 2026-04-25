import { createClient as createSupabaseClient } from '@supabase/supabase-js';

type OrgAdminAuthResult =
  | {
      ok: true;
      status: 200;
      user: any;
      organizationId: string;
      role: string;
    }
  | {
      ok: false;
      status: 401 | 403 | 500;
      user: null;
      organizationId: null;
      role: null;
    };

export async function requireOrganizationAdminFromRequest(req: Request): Promise<OrgAdminAuthResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anon || !service) {
    return { ok: false, status: 500, user: null, organizationId: null, role: null };
  }

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : null;
  if (!token) {
    return { ok: false, status: 401, user: null, organizationId: null, role: null };
  }

  const authClient = createSupabaseClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData?.user) {
    return { ok: false, status: 401, user: null, organizationId: null, role: null };
  }

  const user = authData.user;
  const adminClient = createSupabaseClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: adminMemberRows } = await adminClient
    .from('organization_members')
    .select('organization_id, role, is_active')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .in('role', ['owner', 'admin'])
    .order('joined_at', { ascending: true })
    .limit(1);
  const member = adminMemberRows?.[0];

  if (member?.organization_id) {
    return {
      ok: true,
      status: 200,
      user,
      organizationId: member.organization_id,
      role: member.role || 'admin',
    };
  }

  const { data: ownedOrg } = await adminClient
    .from('organizations')
    .select('id')
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (ownedOrg?.id) {
    return {
      ok: true,
      status: 200,
      user,
      organizationId: ownedOrg.id,
      role: 'owner',
    };
  }

  return { ok: false, status: 403, user: null, organizationId: null, role: null };
}

type OrgMemberAuthResult =
  | {
      ok: true;
      status: 200;
      user: any;
      organizationId: string;
      role: string | null;
    }
  | {
      ok: false;
      status: 401 | 403 | 500;
      user: null;
      organizationId: null;
      role: null;
    };

/** Cualquier miembro activo de la organización (o dueño directo). Para rutas que no requieren admin. */
export async function requireOrganizationMemberFromRequest(req: Request): Promise<OrgMemberAuthResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anon || !service) {
    return { ok: false, status: 500, user: null, organizationId: null, role: null };
  }

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : null;
  if (!token) {
    return { ok: false, status: 401, user: null, organizationId: null, role: null };
  }

  const authClient = createSupabaseClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData?.user) {
    return { ok: false, status: 401, user: null, organizationId: null, role: null };
  }

  const user = authData.user;
  const adminClient = createSupabaseClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: memberRows } = await adminClient
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('joined_at', { ascending: true })
    .limit(1);
  const member = memberRows?.[0];

  if (member?.organization_id) {
    return {
      ok: true,
      status: 200,
      user,
      organizationId: member.organization_id,
      role: member.role ?? null,
    };
  }

  const { data: ownedOrg } = await adminClient
    .from('organizations')
    .select('id')
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (ownedOrg?.id) {
    return {
      ok: true,
      status: 200,
      user,
      organizationId: ownedOrg.id,
      role: 'owner',
    };
  }

  return { ok: false, status: 403, user: null, organizationId: null, role: null };
}

