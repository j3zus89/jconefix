import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireOrganizationMemberFromRequest } from '@/lib/auth/org-admin-server';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function adminDb() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * POST /api/dashboard/repair-labor-catalog/seed-from-master
 * Body: { skipExisting?: boolean }
 * Importa el catálogo maestro desde la base de datos (service_catalog_master)
 * a la organización del usuario. Cada organización tiene su copia independiente.
 */
export async function POST(req: NextRequest) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json(
      {
        error:
          'El servidor no tiene configurada SUPABASE_SERVICE_ROLE_KEY (o URL).',
      },
      { status: 503 }
    );
  }

  const auth = await requireOrganizationMemberFromRequest(req);
  if (!auth.ok) {
    return NextResponse.json(
      {
        error:
          auth.status === 401
            ? 'Sesión no válida. Cierra sesión y vuelve a entrar.'
            : auth.status === 403
              ? 'Tu usuario no pertenece a una organización activa.'
              : 'No autorizado',
      },
      { status: auth.status }
    );
  }

  let body: { skipExisting?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // Body opcional
  }

  const db = adminDb();
  const orgId = auth.organizationId;
  const userId = auth.user.id;

  if (!orgId) {
    return NextResponse.json(
      { error: 'Se requiere una organización para importar el catálogo.' },
      { status: 400 }
    );
  }

  try {
    // Llamar a la función de la base de datos que copia el catálogo maestro
    const { data: inserted, error } = await db.rpc('seed_organization_services', {
      p_organization_id: orgId,
      p_user_id: userId,
    });

    if (error) {
      console.error('[seed-from-master] RPC error:', error);
      return NextResponse.json(
        { error: error.message, hint: '¿Aplicaste la migración 202604241800?' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      inserted,
      message: `Se importaron ${inserted} servicios del catálogo maestro.`,
    });
  } catch (e: any) {
    console.error('[seed-from-master] Exception:', e);
    return NextResponse.json(
      { error: e?.message || 'Error al importar catálogo' },
      { status: 500 }
    );
  }
}
