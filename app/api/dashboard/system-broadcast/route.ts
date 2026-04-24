import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const MAX_MESSAGE = 2000;

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('panel_global_broadcast')
      .select('message, updated_at')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const raw = typeof data?.message === 'string' ? data.message : '';
    const message = raw.trim().slice(0, MAX_MESSAGE);
    const updated_at = typeof data?.updated_at === 'string' ? data.updated_at : null;

    return NextResponse.json({
      message: message.length > 0 ? message : null,
      updated_at,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
