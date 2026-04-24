import { getAfipCbteFchToday } from '@/lib/arca-argentina-date';
import { parseAfipReceptorDoc } from '@/lib/arca-receptor-doc';
import { round2 } from '@/lib/arca-afip-qr';

export type EmitterIvaCondition = 'monotributo' | 'responsable_inscripto' | 'otro';

export function classifyEmitterIvaCondition(ivaCondition: string | null | undefined): EmitterIvaCondition {
  const v = (ivaCondition || '').trim().toLowerCase();
  if (v === 'monotributo') return 'monotributo';
  if (v === 'responsable inscripto') return 'responsable_inscripto';
  return 'otro';
}

/** Responsable inscripto + cliente RI con CUIT → Factura A; si no → B. Monotributo emisor → siempre C. */
export function resolveCbteTipo(params: {
  emitter: EmitterIvaCondition;
  customerIvaCondition: string | null | undefined;
  customerHasCuit: boolean;
}): 1 | 6 | 11 {
  if (params.emitter === 'monotributo') {
    return 11;
  }
  if (params.emitter === 'responsable_inscripto') {
    const c = (params.customerIvaCondition || '').trim();
    if (c === 'Responsable Inscripto' && params.customerHasCuit) {
      return 1;
    }
    return 6;
  }
  /** Otro régimen: por seguridad fiscal emitimos Factura C (sin IVA discriminado en comprobante). */
  return 11;
}

export type InvoiceAmountsInput = {
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
};

/**
 * Arma el objeto base para comprobante AFIP.
 * Sin CbteDesde/Hasta → usar con createNextVoucher (legacy).
 * Con explicitNumber → usar con createVoucher (control estricto).
 */
export function buildCreateNextVoucherData(params: {
  puntoVenta: number;
  cbteTipo: 1 | 6 | 11;
  customerTaxId: string | null | undefined;
  amounts: InvoiceAmountsInput;
  /** Si true, usa fechas de servicio (reparación). */
  conceptoServicios: boolean;
  /** Si se indica, agrega CbteDesde y CbteHasta (control estricto de numeración). */
  explicitNumber?: number;
}): Record<string, string | number | null | object[]> {
  const { DocTipo, DocNro } = parseAfipReceptorDoc(params.customerTaxId);
  const baseImp = round2(Math.max(0, params.amounts.subtotal - params.amounts.discount_amount));
  const impIva = round2(Math.max(0, params.amounts.tax_amount));
  const impTotal = round2(Math.max(0, params.amounts.total_amount));
  const cbteFch = getAfipCbteFchToday();

  const concepto = params.conceptoServicios ? 2 : 1;
  const common: Record<string, string | number | null | object[]> = {
    PtoVta: params.puntoVenta,
    CbteTipo: params.cbteTipo,
    Concepto: concepto,
    DocTipo,
    DocNro: DocNro,
    CbteFch: cbteFch,
    // Número explícito cuando se usa createVoucher (control estricto de numeración)
    ...(params.explicitNumber != null
      ? { CbteDesde: params.explicitNumber, CbteHasta: params.explicitNumber }
      : {}),
    ImpTotal: impTotal,
    ImpTotConc: 0,
    ImpOpEx: 0,
    ImpTrib: 0,
    MonId: 'PES',
    MonCotiz: 1,
  };

  if (concepto === 2) {
    common.FchServDesde = cbteFch;
    common.FchServHasta = cbteFch;
    common.FchVtoPago = cbteFch;
  }

  if (params.cbteTipo === 11) {
    /** Factura C — importe neto igual al total; sin IVA discriminado. */
    common.ImpNeto = impTotal;
    common.ImpIVA = 0;
    return common;
  }

  /** Factura A o B — discriminar IVA cuando hay alícuota. */
  if (impIva > 0.005 && baseImp > 0) {
    common.ImpNeto = baseImp;
    common.ImpIVA = impIva;
    common.Iva = [{ Id: 5, BaseImp: baseImp, Importe: impIva }];
    return common;
  }

  common.ImpNeto = impTotal;
  common.ImpIVA = 0;
  return common;
}
