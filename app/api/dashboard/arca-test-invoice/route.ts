/**
 * Emite una factura de prueba mínima en homologación (NUNCA en producción).
 * - Tipo 11 (Factura C, monotributo o régimen no especificado): válida para cualquier condición.
 * - CUIT receptor: consumidor final (DocTipo=99, DocNro=0).
 * - Importe: $1 ARS.
 *
 * En modo simulación (AFIP_MOCK_MODE=true) devuelve un CAE ficticio sin llamar a AFIP.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireOrganizationAdminFromRequest } from '@/lib/auth/org-admin-server';
import { buildConfiguredAfip, mapAfipSdkError, type ArcaStoredCredentials } from '@/lib/server/arca-afip-client';
import { getAfipCbteFchToday } from '@/lib/arca-argentina-date';
import { AFIP_MOCK_MODE, mockAuthorizeInvoice } from '@/lib/server/arca-mock';

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

type AfipEb = {
  createNextVoucher: (
    data: Record<string, string | number | null | object[]>
  ) => Promise<{ CAE: string; CAEFchVto: string; voucherNumber: number }>;
};

export async function POST(_req: NextRequest) {
  const auth = await requireOrganizationAdminFromRequest(_req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });
  }
  if (!(await assertArgentinaOrg(auth.organizationId))) {
    return NextResponse.json({ error: 'Solo disponible para organizaciones en Argentina.' }, { status: 403 });
  }

  const db = admin();

  const { data: cred } = await db
    .from('organization_arca_credentials')
    .select('cert_pem_enc, key_pem_enc, production, punto_venta')
    .eq('organization_id', auth.organizationId)
    .maybeSingle();

  if (!cred) {
    return NextResponse.json({ ok: false, message: 'No hay certificado ARCA guardado. Subilo en el paso 1.' }, { status: 422 });
  }

  if (cred.production === true) {
    return NextResponse.json(
      { ok: false, message: 'La factura de prueba solo está disponible en modo homologación. Cambiá a "Pruebas" en el paso 3 antes de usar esta función.' },
      { status: 400 }
    );
  }

  const pvNum =
    cred.punto_venta != null && Number.isFinite(Number(cred.punto_venta))
      ? Math.floor(Number(cred.punto_venta))
      : null;

  if (!pvNum || pvNum < 1 || pvNum > 9999) {
    return NextResponse.json(
      { ok: false, message: 'Guardá el punto de venta (paso 2) antes de emitir la factura de prueba.' },
      { status: 422 }
    );
  }

  const { data: org } = await db.from('organizations').select('owner_id').eq('id', auth.organizationId).maybeSingle();
  const { data: shop } = await db
    .from('shop_settings')
    .select('registration_number')
    .eq('user_id', org?.owner_id as string)
    .maybeSingle();

  const registrationNumber = (shop?.registration_number as string | null) ?? null;

  // ── MODO SIMULACIÓN ──────────────────────────────────────────────────────────
  if (AFIP_MOCK_MODE) {
    console.log('[AFIP MOCK] POST /api/dashboard/arca-test-invoice → modo simulación');
    const mock = mockAuthorizeInvoice();
    return NextResponse.json({
      ok: true,
      isMock: true,
      cae: mock.CAE,
      caeFchVto: mock.CAEFchVto,
      voucherNumber: mock.voucherNumber,
      puntoVenta: pvNum,
      cbteTipo: 11,
      message: `[SIMULACIÓN] Factura C nro. ${mock.voucherNumber} autorizada. CAE: ${mock.CAE} (vence ${mock.CAEFchVto}).`,
    });
  }

  // ── MODO REAL (HOMOLOGACIÓN) ─────────────────────────────────────────────────
  const credRow: ArcaStoredCredentials = {
    cert_pem_enc: cred.cert_pem_enc as string,
    key_pem_enc: cred.key_pem_enc as string,
    production: false, // siempre homologación aquí
    punto_venta: pvNum,
  };

  const built = await buildConfiguredAfip({ organizationId: auth.organizationId, registrationNumber, row: credRow });
  if (!built.ok) {
    return NextResponse.json({ ok: false, message: built.message }, { status: 422 });
  }

  const eb = built.afip.ElectronicBilling as unknown as AfipEb;
  const cbteFch = getAfipCbteFchToday();

  const voucherData: Record<string, string | number | null | object[]> = {
    PtoVta: pvNum,
    CbteTipo: 11, // Factura C — válida para monotributo y régimen no especificado
    Concepto: 2,  // Servicios
    DocTipo: 99,  // Consumidor Final (sin CUIT)
    DocNro: 0,
    CbteFch: cbteFch,
    FchServDesde: cbteFch,
    FchServHasta: cbteFch,
    FchVtoPago: cbteFch,
    ImpTotal: 1.00,
    ImpTotConc: 0,
    ImpNeto: 1.00,
    ImpOpEx: 0,
    ImpTrib: 0,
    ImpIVA: 0,
    MonId: 'PES',
    MonCotiz: 1,
  };

  let res: { CAE: string; CAEFchVto: string; voucherNumber: number };
  try {
    res = await eb.createNextVoucher(voucherData);
  } catch (e) {
    return NextResponse.json({ ok: false, message: mapAfipSdkError(e) }, { status: 422 });
  }

  const cae = String(res.CAE ?? '').trim();
  if (!cae) {
    return NextResponse.json({ ok: false, message: 'AFIP respondió pero no devolvió CAE. Revisá los datos del taller.' }, { status: 422 });
  }

  return NextResponse.json({
    ok: true,
    isMock: false,
    cae,
    caeFchVto: res.CAEFchVto,
    voucherNumber: res.voucherNumber,
    puntoVenta: pvNum,
    cbteTipo: 11,
    message: `Factura C nro. ${res.voucherNumber} autorizada en homologación. CAE: ${cae} (vence ${res.CAEFchVto}).`,
  });
}
