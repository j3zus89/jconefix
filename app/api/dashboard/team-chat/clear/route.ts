import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getActiveOrganizationId } from '@/lib/dashboard-org';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Borra todos los mensajes del chat interno de la organización activa del usuario.
 * Requiere service role (RLS solo permite borrar mensajes propios desde el cliente).
 */
export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const orgId = await getActiveOrganizationId(supabase);
    if (!orgId) {
      return NextResponse.json({ error: 'Sin organización activa' }, { status: 400 });
    }

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await admin.from('chat_messages').delete().eq('organization_id', orgId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
