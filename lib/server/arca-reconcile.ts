/**
 * Reconciliación automática AFIP.
 *
 * Problema que resuelve:
 *   - Se envió factura a AFIP → timeout o error de red antes de recibir respuesta
 *   - La factura queda en `ar_status = 'pending'` con número ya reservado
 *   - AFIP puede o NO haber emitido el CAE
 *
 * Solución:
 *   1. Buscar facturas `pending` más viejas de AFIP_RECONCILE_MIN_AGE_MIN minutos
 *   2. Para cada una, consultar AFIP con `getVoucherInfo(pv, tipo, nro)`
 *   3. Si existe → recuperar CAE y marcar `afip_approved`
 *   4. Si no existe → dejar pending si es reciente; marcar `failed` si supera umbral
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildConfiguredAfip,
  mapAfipSdkError,
  markTokenObtained,
  type ArcaStoredCredentials,
} from '@/lib/server/arca-afip-client';
import { callAfipResilient } from '@/lib/server/arca-resilient';
import { logAfipOperation, afipLogOk, afipLogFail } from '@/lib/server/arca-logger';
import { parseCuitNumber } from '@/lib/arca-cuit';

/** Minutos mínimos en pending antes de intentar reconciliar. Evita colisión con requests en curso. */
const RECONCILE_MIN_AGE_MIN = 3;

/** Horas máximas en pending antes de marcar definitivamente como failed. */
const RECONCILE_FAIL_AFTER_HOURS = 4;

/** Máximo de facturas a procesar por ejecución (evita timeouts en Vercel). */
const RECONCILE_BATCH_SIZE = 10;

type VoucherInfoRaw = {
  CAE?: string;
  CAEFchVto?: string;
  CbteDesde?: number;
  [key: string]: unknown;
};

// Firma real del SDK: getVoucherInfo(number, salesPoint, type)
type EbReconcile = {
  getVoucherInfo: (number: number, salesPoint: number, type: number) => Promise<VoucherInfoRaw | null>;
};

export type ReconcileResult = {
  processed: number;
  recovered: number;
  failed: number;
  skipped: number;
  errors: string[];
};

export async function reconcileAfipPendingInvoices(
  admin: SupabaseClient
): Promise<ReconcileResult> {
  const result: ReconcileResult = { processed: 0, recovered: 0, failed: 0, skipped: 0, errors: [] };

  const minAgeTime = new Date(Date.now() - RECONCILE_MIN_AGE_MIN * 60 * 1000).toISOString();
  const failThresholdTime = new Date(Date.now() - RECONCILE_FAIL_AFTER_HOURS * 60 * 60 * 1000).toISOString();

  // Buscar facturas pendientes con número reservado, suficientemente viejas
  const { data: pending, error } = await admin
    .from('invoices')
    .select('id, organization_id, ar_numero_cbte, ar_cbte_tipo, ar_punto_venta, ar_cuit_emisor, updated_at')
    .eq('ar_status', 'pending')
    .not('ar_numero_cbte', 'is', null)
    .lt('updated_at', minAgeTime)
    .limit(RECONCILE_BATCH_SIZE);

  if (error || !pending?.length) {
    return result;
  }

  for (const inv of pending) {
    result.processed++;
    const nro = Number(inv.ar_numero_cbte);
    const tipo = Number(inv.ar_cbte_tipo);
    const pv = Number(inv.ar_punto_venta);
    const orgId = String(inv.organization_id);
    const updatedAt = new Date(inv.updated_at as string);
    const isPastFailThreshold = updatedAt < new Date(failThresholdTime);

    if (!Number.isFinite(nro) || !Number.isFinite(tipo) || !Number.isFinite(pv) || pv < 1) {
      result.skipped++;
      continue;
    }

    // Cargar credenciales de la org
    const { data: cred } = await admin
      .from('organization_arca_credentials')
      .select('cert_pem_enc, key_pem_enc, production')
      .eq('organization_id', orgId)
      .maybeSingle();

    if (!cred) {
      result.skipped++;
      continue;
    }

    // Cargar CUIT del taller
    const { data: org } = await admin.from('organizations').select('owner_id').eq('id', orgId).maybeSingle();
    const { data: shop } = org?.owner_id
      ? await admin.from('shop_settings').select('registration_number').eq('user_id', org.owner_id as string).maybeSingle()
      : { data: null };
    const cuit = (shop?.registration_number as string | null) ?? null;
    const cuitEmisor = parseCuitNumber(inv.ar_cuit_emisor as string | null) ?? parseCuitNumber(cuit);

    const credRow: ArcaStoredCredentials = {
      cert_pem_enc: cred.cert_pem_enc as string,
      key_pem_enc: cred.key_pem_enc as string,
      production: cred.production === true,
      punto_venta: pv,
    };

    const built = await buildConfiguredAfip({ organizationId: orgId, registrationNumber: cuit, row: credRow });
    if (!built.ok) {
      result.skipped++;
      continue;
    }

    const eb = built.afip.ElectronicBilling as unknown as EbReconcile;

    try {
      // Firma SDK: getVoucherInfo(number, salesPoint, type)
      const info = await callAfipResilient(
        () => eb.getVoucherInfo(nro, pv, tipo),
        { timeoutMs: 15_000, maxRetries: 2, label: `reconcile.getVoucherInfo inv=${inv.id}` }
      );

      markTokenObtained(orgId, credRow.production);

      const cae = String(info?.CAE ?? '').trim();
      const vto = String(info?.CAEFchVto ?? '').trim();

      if (cae) {
        // AFIP sí emitió el CAE → recuperar
        await admin.from('invoices').update({
          ar_cae: cae,
          ar_cae_expires_at: vto || null,
          ar_status: 'afip_approved',
        }).eq('id', inv.id);

        await logAfipOperation(admin, afipLogOk({
          organization_id: orgId, cuit,
          endpoint: 'wsfe.reconcile',
          detail: { invoiceId: inv.id, cae, nro, pv, tipo, action: 'recovered' },
        }));

        console.log(`[AFIP RECONCILE] ✅ Factura ${inv.id} recuperada: CAE=${cae} nro=${nro}`);
        result.recovered++;
      } else if (isPastFailThreshold) {
        // AFIP no tiene el voucher y pasó demasiado tiempo → marcar failed
        await admin.from('invoices').update({ ar_status: 'failed' }).eq('id', inv.id);
        await logAfipOperation(admin, afipLogFail(
          { organization_id: orgId, cuit, endpoint: 'wsfe.reconcile', detail: { invoiceId: inv.id, nro, pv, tipo, action: 'failed-threshold' } },
          new Error('AFIP no tiene registro del comprobante después de 4 horas')
        ));
        console.log(`[AFIP RECONCILE] ❌ Factura ${inv.id} marcada failed (sin CAE en AFIP tras ${RECONCILE_FAIL_AFTER_HOURS}h)`);
        result.failed++;
      } else {
        // Aún joven → dejar pending, el próximo ciclo volverá a revisarla
        result.skipped++;
      }
    } catch (e) {
      const msg = mapAfipSdkError(e);
      result.errors.push(`inv=${inv.id}: ${msg}`);
      await logAfipOperation(admin, afipLogFail(
        { organization_id: orgId, cuit, endpoint: 'wsfe.reconcile', detail: { invoiceId: inv.id, nro, pv, tipo } },
        e instanceof Error ? e : new Error(msg)
      ));
      console.error(`[AFIP RECONCILE] Error en factura ${inv.id}: ${msg}`);
    }
  }

  return result;
}
