import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { humanizeSupportChatDbError } from '@/lib/supabase-setup-hints';

export const dynamic = 'force-dynamic';

/** Nueva sesión visible para el cliente; el historial completo sigue en BD para super admin. */
export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { error } = await supabase.rpc('support_chat_client_finalize_session');
    if (error) {
      return NextResponse.json(
        { error: humanizeSupportChatDbError(error.message) },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
