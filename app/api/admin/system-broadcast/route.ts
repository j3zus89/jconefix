import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSuperAdminFromRequest } from '@/lib/auth/super-admin-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAX_MESSAGE = 2000;

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdminFromRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status, headers: { 'Cache-Control': 'no-store' } });
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
  }
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin.from('panel_global_broadcast').select('message, updated_at').eq('id', 1).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const raw = typeof data?.message === 'string' ? data.message : '';
  return NextResponse.json({
    data: {
      message: raw,
      updated_at: data?.updated_at ?? null,
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdminFromRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const raw = typeof body.message === 'string' ? body.message : '';
  const message = raw.trim().slice(0, MAX_MESSAGE);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin
    .from('panel_global_broadcast')
    .upsert(
      {
        id: 1,
        message,
        updated_at: new Date().toISOString(),
        updated_by: auth.user?.id ?? null,
      },
      { onConflict: 'id' }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.rpc('log_super_admin_action', {
    p_action: 'update_global_panel_broadcast',
    p_target_org_id: null,
    p_target_user_id: null,
    p_details: { length: message.length, cleared: message.length === 0 },
  });

  return NextResponse.json({ success: true, data: { message, updated_at: new Date().toISOString() } });
}
