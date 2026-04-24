import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSuperAdminFromRequest } from '@/lib/auth/super-admin-server';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdminFromRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
  }

  const { userId } = await req.json().catch(() => ({}));
  if (!userId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 });

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Pregunta a information_schema qué tablas del schema 'public'
  // tienen FK hacia auth.users (referenced_table_schema=auth, referenced_table_name=users)
  const { data: fkRows, error: fkErr } = await sb.rpc('get_auth_user_fk_tables');
  if (fkErr) {
    // Si la función no existe, intentamos desde information_schema via tabla especial
    return NextResponse.json({ error: fkErr.message, hint: 'Crea la función get_auth_user_fk_tables en Supabase SQL Editor (ver body)' }, { status: 500 });
  }

  // Para cada tabla, buscar si tiene filas que referencien a este userId
  const blocking: Array<{ table: string; column: string; count: number }> = [];
  if (Array.isArray(fkRows)) {
    for (const row of fkRows as Array<{ table_name: string; column_name: string }>) {
      try {
        const { count } = await (sb as any)
          .from(row.table_name)
          .select('*', { count: 'exact', head: true })
          .eq(row.column_name, userId);
        if ((count ?? 0) > 0) {
          blocking.push({ table: row.table_name, column: row.column_name, count: count ?? 0 });
        }
      } catch { /* ignorar tablas sin acceso */ }
    }
  }

  return NextResponse.json({ fkRows, blocking, userId });
}
