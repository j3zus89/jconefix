import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdminFromRequest } from '@/lib/auth/super-admin-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Endpoint de diagnóstico — sólo accesible para super-admins
  const auth = await requireSuperAdminFromRequest(request);
  if (!auth.ok) {
    // Respuesta genérica para no confirmar que el endpoint existe
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }

  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasAnon = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasService = !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const allOk = hasUrl && hasAnon && hasService;

  return NextResponse.json({
    status: allOk ? 'ok' : 'error',
    serverReady: allOk,
    hint: allOk
      ? null
      : 'Revisá variables de entorno del despliegue (URL pública Supabase, anon key y clave de servicio).',
  });
}
