import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildConfiguredAfip,
  mapAfipSdkError,
  markTokenObtained,
  type ArcaStoredCredentials,
} from '@/lib/server/arca-afip-client';
import { classifyEmitterIvaCondition, resolveCbteTipo } from '@/lib/arca-wsfe-voucher';
import { AFIP_MOCK_MODE, mockTestConnection } from '@/lib/server/arca-mock';
import { callAfipResilient } from '@/lib/server/arca-resilient';
import { logAfipOperation, afipLogOk, afipLogFail } from '@/lib/server/arca-logger';

type Eb = {
  getServerStatus: () => Promise<unknown>;
  getSalesPoints: () => Promise<unknown>;
  getLastVoucher: (salesPoint: number, type: number) => Promise<unknown>;
};

export type TestStep = {
  name: string;
  status: 'ok' | 'fail' | 'skip';
  detail: string;
};

export type ArcaTestConnectionResult =
  | {
      ok: true;
      isMock: boolean;
      environment: 'homologacion' | 'produccion' | 'mock';
      steps: TestStep[];
      salesPoints: number[];
      lastVoucherNumber?: number;
      cbteTipoProbed?: number;
      puntoVentaProbed?: number;
      puntoVentaMismatch?: boolean;
      message: string;
    }
  | { ok: false; message: string; steps: TestStep[] };

function extractSalesPointNumbers(raw: unknown): number[] {
  if (raw == null) return [];
  const out: number[] = [];
  const pushNro = (item: unknown) => {
    if (typeof item === 'number' && Number.isFinite(item)) out.push(Math.floor(item));
    else if (item && typeof item === 'object' && 'Nro' in item) {
      const n = Number((item as { Nro: unknown }).Nro);
      if (Number.isFinite(n)) out.push(Math.floor(n));
    }
  };
  if (Array.isArray(raw)) {
    for (const item of raw) pushNro(item);
  } else {
    pushNro(raw);
  }
  return Array.from(new Set(out)).sort((a, b) => a - b);
}

/**
 * Prueba la conexión con ARCA/AFIP en 3-4 pasos explícitos:
 *  1. Estado del servidor WSFE (FEDummy)
 *  2. Autenticación con WSAA (GetServiceTA via getSalesPoints)
 *  3. Puntos de venta habilitados
 *  4. Último comprobante (solo si hay punto de venta guardado)
 */
export async function testArcaAfipConnection(
  admin: SupabaseClient,
  organizationId: string
): Promise<ArcaTestConnectionResult> {
  const steps: TestStep[] = [];

  const { data: cred, error: credErr } = await admin
    .from('organization_arca_credentials')
    .select('cert_pem_enc, key_pem_enc, production, punto_venta')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (credErr || !cred) {
    return {
      ok: false,
      message: 'No hay certificado ARCA guardado. Subilo en el paso 1.',
      steps: [{ name: 'Certificado', status: 'fail', detail: 'No hay certificado guardado para esta organización.' }],
    };
  }

  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .select('owner_id')
    .eq('id', organizationId)
    .maybeSingle();

  if (orgErr || !org?.owner_id) {
    return {
      ok: false,
      message: 'No se encontró el titular de la organización.',
      steps: [{ name: 'Organización', status: 'fail', detail: 'No se pudo obtener el owner_id de la organización.' }],
    };
  }

  const { data: shop } = await admin
    .from('shop_settings')
    .select('registration_number, iva_condition')
    .eq('user_id', org.owner_id as string)
    .maybeSingle();

  const registrationNumber = (shop?.registration_number as string | null) ?? null;
  const emitterClass = classifyEmitterIvaCondition(shop?.iva_condition as string | null);
  const cbteTipo = resolveCbteTipo({ emitter: emitterClass, customerIvaCondition: null, customerHasCuit: false });

  const credRow: ArcaStoredCredentials = {
    cert_pem_enc: cred.cert_pem_enc as string,
    key_pem_enc: cred.key_pem_enc as string,
    production: cred.production === true,
    punto_venta:
      cred.punto_venta != null && Number.isFinite(Number(cred.punto_venta))
        ? Math.floor(Number(cred.punto_venta))
        : null,
  };

  const env: 'homologacion' | 'produccion' = credRow.production ? 'produccion' : 'homologacion';

  // ── MODO SIMULACIÓN ──────────────────────────────────────────────────────────
  if (AFIP_MOCK_MODE) {
    console.log('[AFIP MOCK] testArcaAfipConnection → modo simulación activo');
    const mock = mockTestConnection();
    const pvSaved = credRow.punto_venta;
    const ptsLabel = mock.salesPoints.join(', ');
    return {
      ok: true,
      isMock: true,
      environment: 'mock',
      steps: mock.steps,
      salesPoints: mock.salesPoints,
      lastVoucherNumber: mock.lastVoucherNumber,
      cbteTipoProbed: pvSaved != null ? cbteTipo : undefined,
      puntoVentaProbed: pvSaved ?? undefined,
      puntoVentaMismatch: false,
      message: `[SIMULACIÓN] Todo OK. Puntos de venta: ${ptsLabel}. Último comprobante: ${mock.lastVoucherNumber}.`,
    };
  }

  // ── MODO REAL ────────────────────────────────────────────────────────────────
  const built = await buildConfiguredAfip({ organizationId, registrationNumber, row: credRow });

  if (!built.ok) {
    return {
      ok: false,
      message: built.message,
      steps: [{ name: 'Configuración del servidor', status: 'fail', detail: built.message }],
    };
  }

  const eb = built.afip.ElectronicBilling as unknown as Eb;

  // Paso 1: Estado WSFE
  try {
    await callAfipResilient(() => eb.getServerStatus(), { timeoutMs: 15_000, maxRetries: 2, label: 'getServerStatus' });
    steps.push({ name: 'Servidor WSFE', status: 'ok', detail: `Servicio WSFE accesible en ${env}.` });
  } catch (e) {
    const msg = mapAfipSdkError(e);
    steps.push({ name: 'Servidor WSFE', status: 'fail', detail: msg });
    await logAfipOperation(admin, afipLogFail({ organization_id: organizationId, cuit: registrationNumber, endpoint: 'wsfe.test' }, new Error(msg)));
    return { ok: false, message: msg, steps };
  }

  // Paso 2 + 3: Autenticación y puntos de venta (getSalesPoints requiere token)
  let salesPoints: number[] = [];
  try {
    const rawPts = await callAfipResilient(() => eb.getSalesPoints(), { timeoutMs: 15_000, maxRetries: 3, label: 'getSalesPoints' });
    salesPoints = extractSalesPointNumbers(rawPts);
    // Auth exitosa → marcar token en cache
    markTokenObtained(organizationId, credRow.production);
    steps.push({
      name: 'Autenticación WSAA',
      status: 'ok',
      detail: 'Token de acceso obtenido correctamente con el certificado y CUIT del taller.',
    });
    const ptsLabel = salesPoints.length ? salesPoints.join(', ') : 'ninguno devuelto por AFIP';
    steps.push({
      name: 'Puntos de venta',
      status: salesPoints.length > 0 ? 'ok' : 'fail',
      detail: salesPoints.length
        ? `Habilitados en AFIP: ${ptsLabel}.`
        : 'AFIP no devolvió puntos de venta. Verificá que hayas dado de alta el punto de venta en AFIP.',
    });
    if (!salesPoints.length) {
      await logAfipOperation(admin, afipLogFail({ organization_id: organizationId, cuit: registrationNumber, endpoint: 'wsfe.auth' }, new Error('Sin puntos de venta')));
      return {
        ok: false,
        message: 'AFIP no devolvió puntos de venta. Verificá que hayas dado de alta el punto de venta en AFIP.',
        steps,
      };
    }
  } catch (e) {
    const msg = mapAfipSdkError(e);
    steps.push({ name: 'Autenticación WSAA', status: 'fail', detail: msg });
    steps.push({ name: 'Puntos de venta', status: 'skip', detail: 'No se pudo autenticar con AFIP.' });
    await logAfipOperation(admin, afipLogFail({ organization_id: organizationId, cuit: registrationNumber, endpoint: 'wsfe.auth' }, new Error(msg)));
    return { ok: false, message: msg, steps };
  }

  // Paso 4: Último comprobante (solo si hay PV guardado)
  const pvSaved = credRow.punto_venta;
  let lastVoucherNumber: number | undefined;
  let puntoVentaMismatch = false;

  if (pvSaved != null && pvSaved >= 1 && pvSaved <= 9999) {
    if (salesPoints.length > 0 && !salesPoints.includes(pvSaved)) {
      puntoVentaMismatch = true;
    }
    try {
      const n = await callAfipResilient(
        () => eb.getLastVoucher(pvSaved, cbteTipo),
        { timeoutMs: 15_000, maxRetries: 2, label: 'getLastVoucher' }
      );
      const num = typeof n === 'number' ? n : Number(n);
      if (Number.isFinite(num)) lastVoucherNumber = num;
      steps.push({
        name: 'Último comprobante',
        status: puntoVentaMismatch ? 'fail' : 'ok',
        detail: puntoVentaMismatch
          ? `El punto de venta ${pvSaved} configurado en ajustes no figura entre los habilitados (${salesPoints.join(', ')}). Corregí el número en AFIP o en ajustes.`
          : `Último comprobante tipo ${cbteTipo} en PV ${pvSaved}: nro. ${lastVoucherNumber ?? 0}.`,
      });
    } catch (e) {
      const msg = mapAfipSdkError(e);
      steps.push({ name: 'Último comprobante', status: 'fail', detail: msg });
      await logAfipOperation(admin, afipLogFail({ organization_id: organizationId, cuit: registrationNumber, endpoint: 'wsfe.lastVoucher', detail: { pvSaved, cbteTipo } }, new Error(msg)));
      return { ok: false, message: msg, steps };
    }
  } else {
    steps.push({
      name: 'Último comprobante',
      status: 'skip',
      detail: 'Guardá el punto de venta en el paso 2 para verificar el último número de comprobante.',
    });
  }

  const overallOk = !puntoVentaMismatch;
  const ptsLabel = salesPoints.join(', ');
  let message = overallOk
    ? `Todo correcto (${env}). Puntos de venta: ${ptsLabel}.`
    : `Conexión OK pero el punto de venta ${pvSaved} no coincide. Habilitados: ${ptsLabel}.`;
  if (lastVoucherNumber !== undefined && !puntoVentaMismatch) {
    message += ` Último comprobante tipo ${cbteTipo}: nro. ${lastVoucherNumber}.`;
  }

  await logAfipOperation(admin, overallOk
    ? afipLogOk({ organization_id: organizationId, cuit: registrationNumber, endpoint: 'wsfe.testConnection', detail: { salesPoints, lastVoucherNumber, pvSaved, env } })
    : afipLogFail({ organization_id: organizationId, cuit: registrationNumber, endpoint: 'wsfe.testConnection', detail: { pvSaved, env } }, new Error(message))
  );

  return {
    ok: overallOk,
    isMock: false,
    environment: env,
    steps,
    salesPoints,
    lastVoucherNumber,
    cbteTipoProbed: pvSaved != null ? cbteTipo : undefined,
    puntoVentaProbed: pvSaved ?? undefined,
    puntoVentaMismatch: puntoVentaMismatch || undefined,
    message,
  };
}
