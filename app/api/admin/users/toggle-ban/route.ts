import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSuperAdminFromRequest } from '@/lib/auth/super-admin-server';

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

  const { userId, banned } = await req.json();
  if (!userId || typeof banned !== 'boolean') {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: banned ? '876000h' : 'none',
  } as any);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.rpc('log_super_admin_action', {
    p_action: banned ? 'ban_user' : 'unban_user',
    p_target_org_id: null,
    p_target_user_id: userId,
    p_details: { via: 'admin_console' },
  });

  return NextResponse.json({ success: true, data });
}

