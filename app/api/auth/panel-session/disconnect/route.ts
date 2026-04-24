import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: NextRequest) {
  try {
    // Obtener client_key del body (sendBeacon o fetch)
    let body: { client_key?: string } = {};
    try {
      body = await req.json();
    } catch {
      // Si no hay body JSON, intentar obtener de query params
      const url = new URL(req.url);
      const key = url.searchParams.get('client_key');
      if (key) body.client_key = key;
    }

    const clientKey = body.client_key;
    if (!clientKey) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Eliminar la sesión del panel inmediatamente
    const { error } = await supabaseAdmin
      .from('user_panel_sessions')
      .delete()
      .eq('client_key', clientKey);

    if (error) {
      console.warn('[panel-session-disconnect] Error al eliminar sesión:', error.message);
      // No devolvemos error al cliente para no bloquear el cierre de pestaña
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error('[panel-session-disconnect] Error:', e);
    // Siempre devolvemos 200 para no bloquear el beforeunload
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
