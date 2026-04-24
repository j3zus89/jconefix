import type { SupabaseClient } from '@supabase/supabase-js';
import { parseCuitNumber } from '@/lib/arca-cuit';
import {
  buildConfiguredAfip,
  mapAfipSdkError,
  markTokenObtained,
  invalidateToken,
  type ArcaStoredCredentials,
} from '@/lib/server/arca-afip-client';
import {
  buildCreateNextVoucherData,
  classifyEmitterIvaCondition,
  resolveCbteTipo,
} from '@/lib/arca-wsfe-voucher';
import { callAfipResilient } from '@/lib/server/arca-resilient';
import { logAfipOperation, afipLogOk, afipLogFail } from '@/lib/server/arca-logger';
import { arcaPreflightCheck } from '@/lib/server/arca-preflight';
import { AFIP_MOCK_MODE, mockAuthorizeInvoice } from '@/lib/server/arca-mock';

export type ArcaAuthorizeInvoiceOk = {
  ok: true;
  skipped: boolean;
  cae: string | null;
  caeFchVto: string | null;
  voucherNumber: number | null;
  cbteTipo: number | null;
  ptoVta: number | null;
  cuitEmisor: number | null;
};

export type ArcaAuthorizeInvoiceResult = ArcaAuthorizeInvoiceOk | { ok: false; message: string };

/**
 * Extensión del tipo Afip SDK para las operaciones WSFE que necesitamos.
 * createVoucher devuelve { CAE, CAEFchVto } — el número de comprobante
 * lo conocemos nosotros (nextVoucherNumber) ya que lo pasamos explícitamente.
 */
type EbExtended = {
  getLastVoucher: (salesPoint: number, type: number) => Promise<unknown>;
  createVoucher: (data: Record<string, string | number | null | object[]>) => Promise<{ CAE: string; CAEFchVto: string }>;
};

/** Parsea la respuesta de getLastVoucher (puede devolver number o string). */
function parseLastVoucherNumber(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.floor(raw);
  const n = Number(raw);
  return Number.isFinite(n) ? Math.floor(n) : 0;
}

export async function authorizeInvoiceWithArcaIfConfigured(
  admin: SupabaseClient,
  organizationId: string,
  invoiceId: string
): Promise<ArcaAuthorizeInvoiceResult> {
  // ── 1. Cargar factura ────────────────────────────────────────────────────────
  const { data: inv, error: invErr } = await admin
    .from('invoices')
    .select(
      'id, organization_id, billing_jurisdiction, ar_internal_only, ar_cae, ar_cae_expires_at, ar_cbte_tipo, ar_punto_venta, ar_numero_cbte, ar_cuit_emisor, ar_status, customer_tax_id, customer_iva_condition_ar, subtotal, discount_amount, tax_amount, total_amount'
    )
    .eq('id', invoiceId)
    .maybeSingle();

  if (invErr || !inv) {
    return { ok: false, message: 'Factura no encontrada.' };
  }
  if (String(inv.organization_id || '') !== organizationId) {
    return { ok: false, message: 'La factura no pertenece a tu organización.' };
  }
  if (String(inv.billing_jurisdiction || '').toUpperCase() !== 'AR') {
    return { ok: true, skipped: true, cae: null, caeFchVto: null, voucherNumber: null, cbteTipo: null, ptoVta: null, cuitEmisor: null };
  }

  // ── AISLAMIENTO: facturas internas nunca usan numeración AFIP ────────────────
  if (inv.ar_internal_only === true) {
    return { ok: true, skipped: true, cae: null, caeFchVto: null, voucherNumber: null, cbteTipo: null, ptoVta: null, cuitEmisor: null };
  }

  // ── ANTI-DUPLICADO (1ª verificación) ─────────────────────────────────────────
  // Si ya tiene CAE → devolver sin llamar a AFIP
  const existingCae = String(inv.ar_cae || '').trim();
  if (existingCae) {
    const cuitNum = parseCuitNumber(inv.ar_cuit_emisor as string | null);
    return {
      ok: true,
      skipped: false,
      cae: existingCae,
      caeFchVto: inv.ar_cae_expires_at ? String(inv.ar_cae_expires_at) : null,
      voucherNumber: inv.ar_numero_cbte != null ? Number(inv.ar_numero_cbte) : null,
      cbteTipo: inv.ar_cbte_tipo != null ? Number(inv.ar_cbte_tipo) : null,
      ptoVta: inv.ar_punto_venta != null ? Number(inv.ar_punto_venta) : null,
      cuitEmisor: cuitNum,
    };
  }

  // Si está en pending → podría haber un envío en curso; proteger contra doble envío
  if (inv.ar_status === 'pending') {
    return {
      ok: false,
      message: 'Esta factura ya está en proceso de autorización con AFIP. Esperá unos segundos y revisá si ya tiene CAE, o usá la reconciliación automática.',
    };
  }

  // ── Cargar credenciales y datos del taller ────────────────────────────────────
  const { data: cred } = await admin
    .from('organization_arca_credentials')
    .select('cert_pem_enc, key_pem_enc, production, punto_venta')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (!cred) {
    return { ok: true, skipped: true, cae: null, caeFchVto: null, voucherNumber: null, cbteTipo: null, ptoVta: null, cuitEmisor: null };
  }

  const { data: org } = await admin
    .from('organizations')
    .select('owner_id')
    .eq('id', organizationId)
    .maybeSingle();
  const ownerId = org?.owner_id as string | null | undefined;
  if (!ownerId) {
    return { ok: false, message: 'No se encontró el titular de la organización.' };
  }

  const { data: shop } = await admin
    .from('shop_settings')
    .select('registration_number, iva_condition')
    .eq('user_id', ownerId)
    .maybeSingle();

  const registrationNumber = (shop?.registration_number as string | null) ?? null;
  const emitterClass = classifyEmitterIvaCondition(shop?.iva_condition as string | null);
  const cuitEmisor = parseCuitNumber(registrationNumber);

  const customerHasCuit = parseCuitNumber(inv.customer_tax_id as string | null) != null;
  const cbteTipo = resolveCbteTipo({
    emitter: emitterClass,
    customerIvaCondition: inv.customer_iva_condition_ar as string | null,
    customerHasCuit,
  });

  const pv = cred.punto_venta;
  if (pv == null || !Number.isFinite(Number(pv)) || Number(pv) < 1 || Number(pv) > 9999) {
    return { ok: false, message: 'Configurá el punto de venta AFIP en Ajustes → Certificados y entorno ARCA.' };
  }
  const ptoVta = Math.floor(Number(pv));

  const credRow: ArcaStoredCredentials = {
    cert_pem_enc: cred.cert_pem_enc as string,
    key_pem_enc: cred.key_pem_enc as string,
    production: cred.production === true,
    punto_venta: ptoVta,
  };

  // ── PRE-FLIGHT ───────────────────────────────────────────────────────────────
  const preflight = await arcaPreflightCheck(admin, organizationId);
  if (!preflight.ok) {
    await logAfipOperation(admin, afipLogFail(
      { organization_id: organizationId, cuit: registrationNumber, endpoint: 'wsfe.preflight', detail: { invoiceId, field: preflight.field } },
      new Error(preflight.message)
    ));
    return { ok: false, message: preflight.message };
  }

  // ── MODO SIMULACIÓN ──────────────────────────────────────────────────────────
  if (AFIP_MOCK_MODE) {
    console.log('[AFIP MOCK] authorizeInvoiceWithArcaIfConfigured → modo simulación');
    const mock = mockAuthorizeInvoice();
    const cae = mock.CAE;
    const vto = mock.CAEFchVto;
    const nro = mock.voucherNumber;
    await admin.from('invoices').update({
      ar_cae: cae, ar_cae_expires_at: vto || null,
      ar_cbte_tipo: cbteTipo, ar_punto_venta: ptoVta,
      ar_numero_cbte: nro, ar_cuit_emisor: cuitEmisor ? String(cuitEmisor) : null,
      ar_status: 'afip_approved',
    }).eq('id', invoiceId);
    await logAfipOperation(admin, afipLogOk({
      organization_id: organizationId, cuit: registrationNumber, endpoint: 'wsfe.voucher',
      detail: { invoiceId, mock: true, cae, nro, ptoVta, cbteTipo },
    }));
    return { ok: true, skipped: false, cae, caeFchVto: vto, voucherNumber: nro, cbteTipo, ptoVta, cuitEmisor };
  }

  // ── MODO REAL ────────────────────────────────────────────────────────────────
  const built = await buildConfiguredAfip({ organizationId, registrationNumber, row: credRow });
  if (!built.ok) {
    await logAfipOperation(admin, afipLogFail(
      { organization_id: organizationId, cuit: registrationNumber, endpoint: 'wsfe.build', detail: { invoiceId } },
      new Error(built.message)
    ));
    return { ok: false, message: built.message };
  }

  const eb = built.afip.ElectronicBilling as unknown as EbExtended;

  // ── NUMERACIÓN ESTRICTA: consultar último número antes de emitir ──────────────
  let nextVoucherNumber: number;
  try {
    const lastRaw = await callAfipResilient(
      () => eb.getLastVoucher(ptoVta, cbteTipo),
      { timeoutMs: 15_000, maxRetries: 2, label: 'getLastVoucher (pre-emit)' }
    );
    const lastNumber = parseLastVoucherNumber(lastRaw);
    nextVoucherNumber = lastNumber + 1;
    console.log(`[AFIP] Próximo comprobante PV ${ptoVta} tipo ${cbteTipo}: ${nextVoucherNumber} (último AFIP: ${lastNumber})`);
  } catch (e) {
    const msg = mapAfipSdkError(e);
    await logAfipOperation(admin, afipLogFail(
      { organization_id: organizationId, cuit: registrationNumber, endpoint: 'wsfe.getLastVoucher', detail: { invoiceId, ptoVta, cbteTipo } },
      new Error(msg)
    ));
    return { ok: false, message: `No se pudo obtener el último número de comprobante en AFIP antes de emitir. ${msg}` };
  }

  // ── SET PENDING + reservar número ANTES de llamar a AFIP ─────────────────────
  // Si el proceso muere aquí, la reconciliación recuperará el CAE de AFIP.
  const { error: pendingErr } = await admin
    .from('invoices')
    .update({
      ar_status: 'pending',
      ar_numero_cbte: nextVoucherNumber,
      ar_cbte_tipo: cbteTipo,
      ar_punto_venta: ptoVta,
      ar_cuit_emisor: cuitEmisor ? String(cuitEmisor) : null,
    })
    .eq('id', invoiceId)
    .is('ar_cae', null); // Solo si aún no tiene CAE (guard contra race condition)

  if (pendingErr) {
    return { ok: false, message: 'No se pudo reservar el número de comprobante. Reintentá.' };
  }

  // ── CONSTRUIR PAYLOAD CON NÚMERO EXPLÍCITO ────────────────────────────────────
  const voucherData = buildCreateNextVoucherData({
    puntoVenta: ptoVta,
    cbteTipo,
    customerTaxId: inv.customer_tax_id as string | null,
    amounts: {
      subtotal: Number(inv.subtotal ?? 0),
      discount_amount: Number(inv.discount_amount ?? 0),
      tax_amount: Number(inv.tax_amount ?? 0),
      total_amount: Number(inv.total_amount ?? 0),
    },
    conceptoServicios: true,
    explicitNumber: nextVoucherNumber,
  });

  // ── LLAMADA A AFIP con createVoucher (número explícito) ──────────────────────
  let res: { CAE: string; CAEFchVto: string };
  try {
    res = await callAfipResilient(
      () => eb.createVoucher(voucherData),
      { timeoutMs: 15_000, maxRetries: 1, label: 'createVoucher' }
    );
    markTokenObtained(organizationId, credRow.production);
  } catch (e) {
    const mapped = mapAfipSdkError(e);
    if (mapped.toLowerCase().includes('autenticación') || mapped.toLowerCase().includes('certificado')) {
      invalidateToken(organizationId, credRow.production);
    }
    // Marcar como failed para que reconciliación pueda revisarlo
    await admin.from('invoices').update({ ar_status: 'failed' }).eq('id', invoiceId);
    await logAfipOperation(admin, afipLogFail(
      { organization_id: organizationId, cuit: registrationNumber, endpoint: 'wsfe.voucher', detail: { invoiceId, ptoVta, cbteTipo, nextVoucherNumber } },
      new Error(mapped)
    ));
    return { ok: false, message: mapped };
  }

  if (cuitEmisor == null) {
    await admin.from('invoices').update({ ar_status: 'failed' }).eq('id', invoiceId);
    return { ok: false, message: 'CUIT del emisor inválido en ajustes del taller.' };
  }

  const cae = String(res.CAE ?? '').trim();
  const vto = String(res.CAEFchVto ?? '').trim();
  // Usamos el número que reservamos antes de llamar a AFIP (nextVoucherNumber).
  // El SDK no devuelve CbteDesde en createVoucher, pero es el mismo que pasamos.
  const nro = nextVoucherNumber;

  // ── ANTI-DUPLICADO (2ª verificación antes de guardar) ────────────────────────
  const { data: freshInv } = await admin
    .from('invoices')
    .select('ar_cae, ar_numero_cbte, ar_cbte_tipo, ar_punto_venta, ar_cuit_emisor, ar_cae_expires_at')
    .eq('id', invoiceId)
    .maybeSingle();
  const freshCae = String(freshInv?.ar_cae || '').trim();
  if (freshCae) {
    await logAfipOperation(admin, {
      organization_id: organizationId, cuit: registrationNumber, endpoint: 'wsfe.voucher',
      result: 'skip',
      detail: { invoiceId, reason: 'duplicate-race-condition', existingCae: freshCae, ourCae: cae },
    });
    return {
      ok: true, skipped: false,
      cae: freshCae,
      caeFchVto: freshInv?.ar_cae_expires_at ? String(freshInv.ar_cae_expires_at) : null,
      voucherNumber: freshInv?.ar_numero_cbte != null ? Number(freshInv.ar_numero_cbte) : null,
      cbteTipo: freshInv?.ar_cbte_tipo != null ? Number(freshInv.ar_cbte_tipo) : null,
      ptoVta: freshInv?.ar_punto_venta != null ? Number(freshInv.ar_punto_venta) : null,
      cuitEmisor,
    };
  }

  // ── GUARDAR CAE + marcar approved ────────────────────────────────────────────
  const { error: upErr } = await admin
    .from('invoices')
    .update({
      ar_cae: cae,
      ar_cae_expires_at: vto || null,
      ar_cbte_tipo: cbteTipo,
      ar_punto_venta: ptoVta,
      ar_numero_cbte: nro,
      ar_cuit_emisor: String(cuitEmisor),
      ar_status: 'afip_approved',
    })
    .eq('id', invoiceId);

  if (upErr) {
    // CRÍTICO: AFIP autorizó pero no pudimos guardar. El número ya está en AFIP.
    // Loguear con todos los datos para recuperación manual / reconciliación.
    await logAfipOperation(admin, afipLogFail(
      {
        organization_id: organizationId, cuit: registrationNumber, endpoint: 'wsfe.save',
        detail: { invoiceId, cae, nro, ptoVta, cbteTipo, CRITICAL: 'CAE_NOT_SAVED' },
      },
      new Error('No se pudo guardar el CAE en la BD')
    ));
    return { ok: false, message: 'ARCA autorizó el comprobante pero no se pudo guardar el CAE. Contactá soporte urgente: el número ya fue emitido en AFIP.' };
  }

  await logAfipOperation(admin, afipLogOk({
    organization_id: organizationId, cuit: registrationNumber, endpoint: 'wsfe.voucher',
    detail: { invoiceId, cae, nro, ptoVta, cbteTipo, production: credRow.production },
  }));

  return { ok: true, skipped: false, cae, caeFchVto: vto || null, voucherNumber: nro, cbteTipo, ptoVta, cuitEmisor };
}
