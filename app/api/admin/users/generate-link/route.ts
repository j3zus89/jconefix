import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSuperAdminFromRequest } from '@/lib/auth/super-admin-server';
import { isUserRecordSuperAdmin } from '@/lib/auth/super-admin-allowlist';
import { getSiteCanonicalUrl } from '@/lib/site-canonical';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdminFromRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const orgId = typeof body.orgId === 'string' ? body.orgId.trim() : '';
  const userId = typeof body.userId === 'string' ? body.userId.trim() : '';

  if ((orgId && userId) || (!orgId && !userId)) {
    return NextResponse.json({ error: 'Indica orgId (dueño) o userId (usuario concreto), no ambos' }, { status: 400 });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let targetUserId: string;
  let email: string;
  let logAction: string;
  let logOrgId: string | null = null;

  if (userId) {
    if (auth.user?.id && userId === auth.user.id) {
      return NextResponse.json({ error: 'No podés suplantar tu propia sesión desde aquí' }, { status: 400 });
    }
    const { data: ures, error: uErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
    const u = ures?.user;
    if (!u) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    if (isUserRecordSuperAdmin(u)) {
      return NextResponse.json({ error: 'No se puede generar enlace para otra cuenta de super admin' }, { status: 403 });
    }
    const em = u.email?.trim();
    if (!em) {
      return NextResponse.json(
        {
          error:
            'Este usuario no tiene email en Supabase Auth; no se puede magic link. Usá reset de contraseña u otro método.',
        },
        { status: 400 }
      );
    }
    targetUserId = userId;
    email = em;
    logAction = 'impersonation_magiclink';
  } else {
    const { data: org, error: orgErr } = await supabaseAdmin
      .from('organizations')
      .select('owner_id')
      .eq('id', orgId)
      .single();

    if (orgErr) return NextResponse.json({ error: orgErr.message }, { status: 500 });
    if (!org?.owner_id) return NextResponse.json({ error: 'Organization has no owner' }, { status: 400 });

    const { data: ures, error: uErr } = await supabaseAdmin.auth.admin.getUserById(org.owner_id);
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
    const u = ures?.user;
    if (!u) return NextResponse.json({ error: 'Dueño no encontrado' }, { status: 404 });
    if (isUserRecordSuperAdmin(u)) {
      return NextResponse.json({ error: 'No se puede generar enlace para otra cuenta de super admin' }, { status: 403 });
    }
    const em = u.email?.trim();
    if (!em) return NextResponse.json({ error: 'Owner email not found' }, { status: 400 });
    targetUserId = org.owner_id;
    email = em;
    logAction = 'generate_owner_magiclink';
    logOrgId = orgId;
  }

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: `${getSiteCanonicalUrl()}/dashboard?jc_support_session=1`,
    },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const action_link = data?.properties?.action_link ?? null;

  await supabaseAdmin.rpc('log_super_admin_action', {
    p_action: logAction,
    p_target_org_id: logOrgId,
    p_target_user_id: targetUserId,
    p_details: { email },
  });

  return NextResponse.json({ success: true, data, action_link });
}
