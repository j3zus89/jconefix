import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** El panel del taller no puede adjuntar archivos; solo el super admin puede enviar imágenes. */
export async function POST(_request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  return NextResponse.json(
    { error: 'Los adjuntos no están disponibles desde el panel del taller.' },
    { status: 403 },
  );
}
