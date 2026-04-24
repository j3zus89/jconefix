import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireOrganizationAdminFromRequest } from '@/lib/auth/org-admin-server';

export const dynamic = 'force-dynamic';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function admin() {
  return createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function assertArgentinaOrg(orgId: string): Promise<boolean> {
  const { data } = await admin().from('organizations').select('country').eq('id', orgId).maybeSingle();
  return String(data?.country || '').toUpperCase() === 'AR';
}

/** GET: estado de credenciales ARCA (sin secretos). */
export async function GET(req: NextRequest) {
  const auth = await requireOrganizationAdminFromRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });
  }
  if (!(await assertArgentinaOrg(auth.organizationId))) {
    return NextResponse.json({ error: 'Solo disponible para organizaciones en Argentina.' }, { status: 403 });
  }

  const db = admin();
  const { data, error } = await db
    .from('organization_arca_credentials')
    .select('production, updated_at, punto_venta')
    .eq('organization_id', auth.organizationId)
    .maybeSingle();

  if (error) {
    console.error('[arca-settings] GET failed');
    return NextResponse.json({ error: 'No se pudo leer la configuración ARCA.' }, { status: 500 });
  }

  return NextResponse.json({
    hasCredentials: !!data,
    production: data?.production === true,
    puntoVenta: typeof data?.punto_venta === 'number' ? data.punto_venta : null,
    updatedAt: data?.updated_at ?? null,
    afipSdkConfigured: Boolean(process.env.AFIP_SDK_ACCESS_TOKEN?.trim()),
    masterKeyConfigured: Boolean(process.env.ARCA_CREDENTIALS_MASTER_KEY?.trim()),
  });
}

/** PATCH: alternar homologación / producción. */
export async function PATCH(req: NextRequest) {
  const auth = await requireOrganizationAdminFromRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });
  }
  if (!(await assertArgentinaOrg(auth.organizationId))) {
    return NextResponse.json({ error: 'Solo disponible para organizaciones en Argentina.' }, { status: 403 });
  }

  let body: { production?: boolean; puntoVenta?: number | null };
  try {
    body = (await req.json()) as { production?: boolean; puntoVenta?: number | null };
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.production === 'boolean') {
    patch.production = body.production;
  }
  if (body.puntoVenta !== undefined) {
    if (body.puntoVenta === null) {
      patch.punto_venta = null;
    } else {
      const pv = Number(body.puntoVenta);
      if (!Number.isInteger(pv) || pv < 1 || pv > 9999) {
        return NextResponse.json({ error: 'puntoVenta debe ser un entero entre 1 y 9999 (o null).' }, { status: 400 });
      }
      patch.punto_venta = pv;
    }
  }

  const hasProduction = typeof body.production === 'boolean';
  const hasPv = body.puntoVenta !== undefined;
  if (!hasProduction && !hasPv) {
    return NextResponse.json(
      { error: 'Enviá production y/o puntoVenta en el cuerpo JSON.' },
      { status: 400 }
    );
  }

  const db = admin();
  const { data: existing } = await db
    .from('organization_arca_credentials')
    .select('organization_id')
    .eq('organization_id', auth.organizationId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'Primero subí certificado y clave ARCA.' }, { status: 400 });
  }

  const { error } = await db
    .from('organization_arca_credentials')
    .update(patch)
    .eq('organization_id', auth.organizationId);

  if (error) {
    console.error('[arca-settings] PATCH failed');
    return NextResponse.json({ error: 'No se pudo actualizar.' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    production: typeof body.production === 'boolean' ? body.production : undefined,
    puntoVenta: body.puntoVenta,
  });
}
