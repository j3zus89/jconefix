import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireOrganizationMemberFromRequest } from '@/lib/auth/org-admin-server';
import { buildRepairLaborCatalogSeedRows, type LaborCountryCode } from '@/lib/repair-labor-tariffs-2026';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function adminDb() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const CHUNK = 350;

/**
 * POST /api/dashboard/repair-labor-seed
 * Body: { replace?: boolean } (siempre Argentina / ARS)
 * Importa tarifario de referencia 2026 (catálogo marcas × tipos de reparación).
 */
export async function POST(req: NextRequest) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json(
      {
        error:
          'El servidor no tiene configurada SUPABASE_SERVICE_ROLE_KEY (o URL). La importación masiva la necesita en .env.local / Vercel.',
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
            ? 'Sesión no válida. Cierra sesión y vuelve a entrar, o el token no llegó (Authorization: Bearer).'
            : auth.status === 403
              ? 'Tu usuario no pertenece a una organización activa. Solo miembros con organización pueden importar.'
              : 'No autorizado',
      },
      { status: auth.status }
    );
  }

  let body: { country?: string; replace?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const country: LaborCountryCode = 'AR';

  const replace = body.replace === true;
  const db = adminDb();
  const orgId = auth.organizationId;
  const userId = auth.user.id;

  if (replace) {
    let del = db.from('repair_labor_services').delete().eq('source', 'catalog_seed').eq('country_code', country);
    del = orgId ? del.eq('organization_id', orgId) : del.eq('user_id', userId).is('organization_id', null);
    const { error: delErr } = await del;
    if (delErr) {
      console.error('[repair-labor-seed] delete', delErr);
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }
  }

  const rows = buildRepairLaborCatalogSeedRows({ userId, organizationId: orgId, country });

  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { error } = await db.from('repair_labor_services').insert(slice);
    if (error) {
      console.error('[repair-labor-seed] insert', error);
      return NextResponse.json(
        {
          error: error.message,
          hint: '¿Aplicaste la migración 202604071200_repair_labor_services_region.sql?',
          inserted,
        },
        { status: 500 }
      );
    }
    inserted += slice.length;
  }

  return NextResponse.json({ ok: true, inserted, country });
}
