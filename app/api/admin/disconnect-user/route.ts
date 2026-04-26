import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSuperAdminFromRequest } from '@/lib/auth/super-admin-server';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdminFromRequest(req);
  if (!auth.ok) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: auth.status }
    );
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
  }

  let body: { user_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const userId = body?.user_id?.trim();
  if (!userId) {
    return NextResponse.json({ error: 'user_id requerido' }, { status: 400 });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Borrar todas las sesiones del usuario de user_panel_sessions
  const { error } = await supabaseAdmin
    .from('user_panel_sessions')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('[disconnect-user] Error borrando sesiones:', error);
    return NextResponse.json(
      { error: 'Error al desconectar usuario' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
