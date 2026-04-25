/**
 * HTML de factura para vista /impresión en navegador y envío pixel/HTML a QZ Tray.
 */

import {
  buildAfipComprobanteQrUrl,
  formatArCbteNumero,
  invoiceIsoToCbteFch,
} from '@/lib/arca-afip-qr';
import { parseAfipReceptorDoc } from '@/lib/arca-receptor-doc';

export type InvoicePrintLine = {
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

export type InvoicePrintPayload = {
  invoice: {
    invoice_number: string;
    created_at: string;
    customer_name: string;
    customer_email?: string | null;
    customer_phone?: string | null;
    customer_tax_id?: string | null;
    /** Solo AR: condición IVA del receptor (p. ej. Monotributo). */
    customer_iva_condition_ar?: string | null;
    customer_billing_address?: string | null;
    subtotal: number;
    discount_amount: number;
    tax_amount: number;
    total_amount: number;
    /** Suma de cobros registrados (parciales acumulados). Si no se envía, solo se infiere del método de pago. */
    paid_amount?: number | null;
    notes?: string | null;
    due_date?: string | null;
    payment_method?: string | null;
    external_reference?: string | null;
    /** ES | AR | OTHER */
    billing_jurisdiction?: string | null;
    organization_name?: string | null;
    organization_country?: string | null;
    ar_cae?: string | null;
    ar_cae_expires_at?: string | null;
    ar_cbte_tipo?: number | null;
    ar_punto_venta?: number | null;
    ar_numero_cbte?: number | null;
    ar_cuit_emisor?: string | null;
    /** AR: comprobante interno del taller (sin CAE AFIP). */
    ar_internal_only?: boolean | null;
    es_verifactu_uuid?: string | null;
    ticket_tracking_url?: string | null;
    /** @deprecated — usar shop.footer_text en su lugar. */
    warranty_days?: number | null;
    /** Garantía de la reparación (ticket vinculado), visible en el impreso para el cliente. */
    ticket_warranty_summary?: string | null;
    /** Seña en ingreso + cobros registrados (tabla «Detalle de cobros» en el impreso). */
    payment_ledger?: {
      label: string;
      amount: number;
      method_display?: string | null;
      date_display?: string | null;
    }[];
  };
  lines: InvoicePrintLine[];
  shop: {
    shop_name: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    registration_number?: string | null;
    currency_symbol?: string | null;
    iva_condition?: string | null;
    logo_url?: string | null;
    /** Texto libre del pie de factura (configurado en Ajustes del taller). */
    footer_text?: string | null;
    /** Términos y condiciones para España. */
    terms_text_es?: string | null;
    /** Términos y condiciones para Argentina. */
    terms_text_ar?: string | null;
    /** Si true, muestra los términos y condiciones al pie de la factura. */
    invoice_show_terms?: boolean | null;
  };
};

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtNum(n: number): string {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function paymentMethodLabel(m: string | null | undefined): string {
  const x = (m || '').toLowerCase();
  if (x === 'cash') return 'Efectivo';
  if (x === 'card') return 'Tarjeta';
  if (x === 'transfer') return 'Transferencia';
  if (x === 'combined') return 'Pago combinado';
  return m ? esc(m) : '—';
}

/**
 * «Forma de pago» en el encabezado y pastillas: usa la columna de la factura o,
 * si viene vacía (p. ej. reimpresión tras activar garantía), infiere desde el detalle de cobros.
 */
function paymentMethodDisplayForPrint(inv: InvoicePrintPayload['invoice']): string {
  const raw = String(inv.payment_method ?? '').trim();
  if (raw) return paymentMethodLabel(raw);

  const ledger = inv.payment_ledger ?? [];
  const fromMethods = ledger
    .map((r) => String(r.method_display ?? '').trim())
    .filter(Boolean);
  const uniq = Array.from(new Set(fromMethods));
  if (uniq.length === 1) return esc(uniq[0]);
  if (uniq.length > 1) return esc(uniq.join(' · '));

  const hadLedgerMovement = ledger.some((r) => r.amount > 0.005);
  if (hadLedgerMovement && fromMethods.length === 0) {
    return esc('Seña / adelanto (ingreso)');
  }

  return '—';
}

function docTitle(j: string | null | undefined): string {
  const jn = (j || 'ES').toUpperCase();
  if (jn === 'AR') return 'COMPROBANTE';
  return 'FACTURA';
}

function docTitleArFromCbteTipo(cbteTipo: number | null | undefined): string | null {
  if (cbteTipo == null || !Number.isFinite(cbteTipo)) return null;
  if (cbteTipo === 1) return 'FACTURA A';
  if (cbteTipo === 6) return 'FACTURA B';
  if (cbteTipo === 11) return 'FACTURA C';
  return null;
}

function idClienteLabel(j: string | null | undefined): string {
  const jn = (j || 'ES').toUpperCase();
  if (jn === 'AR') return 'CUIT / CUIL / DNI';
  return 'NIF / CIF / DNI';
}

export function buildInvoicePrintParts(payload: InvoicePrintPayload): { styles: string; body: string } {
  const sym = payload.shop.currency_symbol?.trim() || '€';
  const inv = payload.invoice;
  const shop = payload.shop;
  const j = (inv.billing_jurisdiction || (inv.organization_country === 'AR' ? 'AR' : 'ES') || 'ES').toUpperCase();

  const created = (() => {
    try {
      return new Date(inv.created_at).toLocaleDateString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });
    } catch { return esc(inv.created_at); }
  })();

  const due = inv.due_date && (() => {
    try { return new Date(inv.due_date!).toLocaleDateString('es-ES'); }
    catch { return null; }
  })();

  const baseImponible = Math.max(0, inv.subtotal - inv.discount_amount);

  const arTipoLabel = (() => {
    const t = inv.ar_cbte_tipo;
    if (t === 1) return 'A';
    if (t === 6) return 'B';
    if (t === 11) return 'C';
    return t != null ? String(t) : '';
  })();

  /* ── Bloque ARCA / AFIP ─────────────────────────────────────── */
  const arcaBlock = j === 'AR' && (inv.ar_cae || inv.ar_numero_cbte != null || inv.ar_punto_venta != null || inv.ar_cuit_emisor)
    ? `<div class="aux-block">
        <div class="aux-title">Comprobante electrónico ARCA / AFIP</div>
        ${inv.ar_punto_venta != null && inv.ar_numero_cbte != null ? `<div class="aux-row"><span>Punto de venta / N° oficial</span><span>${esc(formatArCbteNumero(Number(inv.ar_punto_venta), Number(inv.ar_numero_cbte)))}</span></div>` : ''}
        ${inv.ar_cbte_tipo != null ? `<div class="aux-row"><span>Tipo comprobante</span><span>${arTipoLabel ? `Factura ${esc(arTipoLabel)}` : esc(String(inv.ar_cbte_tipo))} (${esc(String(inv.ar_cbte_tipo))})</span></div>` : ''}
        ${inv.ar_cae?.trim() ? `<div class="aux-row"><span>CAE</span><span>${esc(inv.ar_cae.trim())}</span></div>` : ''}
        ${inv.ar_cae_expires_at ? `<div class="aux-row"><span>Vto. CAE</span><span>${esc(inv.ar_cae_expires_at)}</span></div>` : ''}
        ${inv.ar_cuit_emisor?.trim() ? `<div class="aux-row"><span>CUIT emisor</span><span>${esc(inv.ar_cuit_emisor.trim())}</span></div>` : ''}
      </div>` : '';

  const esBlock = j === 'ES' && inv.es_verifactu_uuid?.trim()
    ? `<div class="aux-block"><div class="aux-title">Verifactu (reservado)</div><div class="aux-row"><span>UUID</span><span>${esc(inv.es_verifactu_uuid.trim())}</span></div></div>`
    : '';

  const internalArBlock =
    j === 'AR' && inv.ar_internal_only === true && !inv.ar_cae?.trim()
      ? `<div class="internal-ar-banner">Este documento es un <strong>comprobante interno del taller</strong> (registro de venta). <strong>No</strong> tiene CAE ni validez fiscal ante ARCA/AFIP.</div>`
      : '';

  /* ═══════════════════════════════════════════════════════════════
     ESTILOS — diseño clásico tipo factura de taller profesional
  ═══════════════════════════════════════════════════════════════ */
  const styles = `<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; color: #1a1a1a; font-size: 13px; line-height: 1.5; background: #fff; }
    .page { max-width: 820px; margin: 0 auto; padding: 44px 52px; background: #fff; }

    /* ── 1. CABECERA: logo+datos taller a la izq, tipo+número a la der ── */
    .hd { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .hd-left { display: flex; align-items: flex-start; gap: 18px; max-width: 60%; }
    .hd-logo { flex-shrink: 0; }
    .hd-logo img { max-height: 64px; max-width: 140px; object-fit: contain; display: block; }
    .hd-logo .shop-initials { width: 56px; height: 56px; background: #111; color: #fff; font-size: 20px; font-weight: 900; display: flex; align-items: center; justify-content: center; border-radius: 4px; letter-spacing: -1px; }
    .hd-info {}
    .hd-shopname { font-size: 15px; font-weight: 800; color: #111; line-height: 1.2; margin-bottom: 4px; }
    .hd-contact { font-size: 11px; color: #555; line-height: 1.85; }
    .hd-right { text-align: right; }
    .hd-doctype { font-size: 28px; font-weight: 900; color: #111; letter-spacing: -0.5px; text-transform: uppercase; line-height: 1; }
    .hd-num { font-size: 13px; font-weight: 600; color: #444; margin-top: 6px; }

    /* ── 2. LÍNEA SEPARADORA ── */
    .sep { border: none; border-top: 2px solid #111; margin: 0 0 20px; }
    .sep-light { border: none; border-top: 1px solid #ddd; margin: 0 0 20px; }

    /* ── 3. FILA DE DOS CAJAS: cliente | detalles factura ── */
    .info-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0; margin-bottom: 24px; border: 1px solid #bbb; }
    .info-box { padding: 12px 16px; }
    .info-box + .info-box { border-left: 1px solid #bbb; }
    .info-box-hd { background: #e8e8e8; font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: #333; padding: 5px 16px; border-bottom: 1px solid #bbb; }
    .info-box-hd + .info-box-hd { border-left: 1px solid #bbb; }
    .client-name { font-size: 14px; font-weight: 700; color: #111; margin-bottom: 3px; }
    .client-detail { font-size: 11px; color: #555; line-height: 1.8; }
    .detail-row { display: flex; justify-content: space-between; font-size: 11.5px; padding: 4px 0; border-bottom: 1px solid #ebebeb; color: #333; }
    .detail-row:last-child { border-bottom: none; }
    .detail-row span:first-child { color: #666; }
    .detail-row span:last-child { font-weight: 600; color: #111; text-align: right; }
    .paid-pill { display: inline-block; border: 1.5px solid #111; padding: 1px 9px; border-radius: 3px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: #111; margin-top: 2px; }

    /* ── 4. TABLA DE LÍNEAS ── */
    table.lines { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-bottom: 0; }
    table.lines thead tr { border-top: 2px solid #111; border-bottom: 2px solid #111; }
    table.lines th { padding: 8px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #111; text-align: left; background: #fff; }
    table.lines th.r { text-align: right; }
    table.lines tbody tr { border-bottom: 1px solid #e0e0e0; }
    table.lines tbody tr:last-child { border-bottom: 2px solid #111; }
    table.lines td { padding: 10px 10px; vertical-align: top; color: #333; }
    table.lines td.r { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    table.lines td.main { font-weight: 500; color: #111; }

    /* ── 5. BLOQUE DE TOTALES ── */
    .totals-wrap { display: flex; justify-content: flex-end; margin: 16px 0 28px; }
    .totals { width: 270px; }
    .t-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px; color: #555; border-bottom: 1px solid #ebebeb; }
    .t-row:last-child { border-bottom: none; }
    .t-row.red span:last-child { color: #cc0000; }
    .t-grand { display: flex; justify-content: space-between; align-items: center; border: 2px solid #111; padding: 10px 14px; margin-top: 10px; font-size: 15px; font-weight: 800; color: #111; }

    /* ── 6. NOTAS / FISCAL ── */
    .warranty-summary-box { border: 1.5px solid #0d9488; background: #f0fdfa; padding: 10px 14px; font-size: 11.5px; color: #134e4a; margin-bottom: 16px; border-radius: 4px; line-height: 1.5; }
    .warranty-summary-box strong { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #0f766e; margin-bottom: 4px; }
    .notes-box { border-left: 3px solid #ccc; padding: 8px 14px; font-size: 11.5px; color: #555; margin-bottom: 20px; }
    .notes-box strong { color: #111; }
    .aux-block { border: 1px solid #ddd; border-radius: 3px; padding: 10px 14px; margin-bottom: 16px; }
    .aux-title { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #888; margin-bottom: 6px; }
    .aux-row { display: flex; justify-content: space-between; font-size: 11px; color: #444; padding: 2px 0; border-bottom: 1px solid #f5f5f5; }
    .aux-row:last-child { border-bottom: none; }
    .internal-ar-banner { border: 1px solid #d97706; background: #fffbeb; color: #78350f; padding: 12px 14px; border-radius: 4px; font-size: 11.5px; margin-bottom: 16px; line-height: 1.45; }

    /* ── 7. PIE ── */
    .footer { display: flex; align-items: flex-start; gap: 22px; border-top: 2px solid #111; padding-top: 18px; margin-top: 8px; background: #fff; }
    .footer-qrs { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 22px; }
    .footer-qr { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 5px; }
    .footer-qr img { width: 70px; height: 70px; border: 1px solid #ccc; padding: 3px; display: block; }
    .footer-qr-cap { font-size: 8px; color: #999; text-align: center; max-width: 70px; line-height: 1.4; }
    .footer-text { flex: 1; font-size: 10.5px; color: #555; line-height: 1.8; }
    .footer-legal { margin-bottom: 8px; }
    .footer-terms { border-top: 1px dashed #ddd; padding-top: 8px; margin-top: 4px; font-size: 9.5px; color: #666; line-height: 1.7; }
    .footer-terms-title { font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #999; margin-bottom: 4px; }
    .footer-copy { font-size: 9px; color: #aaa; margin-top: 8px; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 28px 36px; }
    }
  </style>`;

  /* ── Filas de la tabla ── */
  const lineRows = payload.lines.map(line => `
    <tr>
      <td class="main">${esc(line.description)}</td>
      <td class="r">${line.quantity}</td>
      <td class="r">${sym}&nbsp;${fmtNum(line.unit_price)}</td>
      <td class="r">${sym}&nbsp;${fmtNum(line.total_price)}</td>
    </tr>`).join('');

  const ledgerRows = inv.payment_ledger?.filter((r) => r.amount > 0.005) ?? [];
  const ledgerSum = ledgerRows.reduce((a, r) => a + r.amount, 0);
  const ledgerBlock =
    ledgerRows.length > 0
      ? `<div style="margin:20px 0 10px">
        <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#333;margin-bottom:8px">Detalle de cobros</div>
        <table class="lines" style="margin-bottom:6px">
          <thead>
            <tr>
              <th style="width:72%">Concepto</th>
              <th class="r" style="width:28%">Importe</th>
            </tr>
          </thead>
          <tbody>
            ${ledgerRows
              .map(
                (r) => `<tr>
              <td class="main">${esc(r.label)}
                ${r.date_display ? `<span style="color:#888;font-size:10px"> · ${esc(r.date_display)}</span>` : ''}
                ${r.method_display ? `<br/><span style="color:#666;font-size:10px">${esc(r.method_display)}</span>` : ''}
              </td>
              <td class="r">${sym}&nbsp;${fmtNum(r.amount)}</td>
            </tr>`
              )
              .join('')}
            <tr style="font-weight:700">
              <td class="main">Suma seña + cobros</td>
              <td class="r">${sym}&nbsp;${fmtNum(ledgerSum)}</td>
            </tr>
          </tbody>
        </table>
      </div>`
      : '';

  /* ── QR AFIP (obligatorio en comprobantes electrónicos AR) ── */
  let afipQrBlock = '';
  if (
    j === 'AR' &&
    inv.ar_cae?.trim() &&
    inv.ar_punto_venta != null &&
    inv.ar_numero_cbte != null &&
    inv.ar_cbte_tipo != null &&
    inv.ar_cuit_emisor?.trim()
  ) {
    const cuitEm = parseInt(String(inv.ar_cuit_emisor).replace(/\D/g, ''), 10);
    const fecha = invoiceIsoToCbteFch(inv.created_at);
    const rec = parseAfipReceptorDoc(inv.customer_tax_id);
    if (fecha > 0 && Number.isFinite(cuitEm) && cuitEm > 0) {
      const qrUrl = buildAfipComprobanteQrUrl({
        fechaCbteYyyymmdd: fecha,
        cuitEmisor: cuitEm,
        ptoVta: Math.floor(Number(inv.ar_punto_venta)),
        tipoCmp: Math.floor(Number(inv.ar_cbte_tipo)),
        nroCmp: Math.floor(Number(inv.ar_numero_cbte)),
        importe: inv.total_amount,
        docTipoRec: rec.DocTipo,
        docNroRec: rec.DocNro,
        cae: inv.ar_cae.trim(),
      });
      afipQrBlock = `<div class="footer-qr">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=84x84&data=${encodeURIComponent(qrUrl)}" alt="QR AFIP" width="84" height="84" />
        <div class="footer-qr-cap">Código QR AFIP · verificación oficial</div>
      </div>`;
    }
  }

  /* ── QR de seguimiento (ticket) ── */
  const qrBlock = inv.ticket_tracking_url?.trim()
    ? `<div class="footer-qr">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=${encodeURIComponent(inv.ticket_tracking_url.trim())}" alt="QR" width="70" height="70" />
        <div class="footer-qr-cap">Estado de tu reparación</div>
      </div>` : '';

  /* ── Pie legal ── */
  const DEFAULT_FOOTER = 'Servicio realizado conforme al presupuesto aprobado. Garantía sujeta a las condiciones pactadas en el momento de la entrega.';
  const footerText = shop.footer_text?.trim() || DEFAULT_FOOTER;

  // Bloque de términos: solo si el usuario activó la opción en Ajustes
  let termsBlock = '';
  if (shop.invoice_show_terms) {
    const DEFAULT_TERMS_ES = 'Reparaciones: 6 meses de garantía en sustitución de componentes y 12 meses en reparaciones de placa base. Los equipos manipulados por terceros o con daños por líquidos quedan excluidos. Protección de datos: en cumplimiento del RGPD los datos facilitados se tratarán exclusivamente para la prestación del servicio y no serán cedidos a terceros.';
    const DEFAULT_TERMS_AR = 'Reparaciones: garantía de 90 días en componentes reemplazados bajo condiciones normales de uso. Excluye daños por humedad, golpes o intervención de terceros. Datos personales: la información suministrada es confidencial y se utilizará exclusivamente para prestar el servicio, conforme a la Ley 25.326 de Protección de Datos Personales.';
    const termsText = j === 'AR'
      ? (shop.terms_text_ar?.trim() || DEFAULT_TERMS_AR)
      : (shop.terms_text_es?.trim() || DEFAULT_TERMS_ES);
    termsBlock = `<div class="footer-terms">
      <div class="footer-terms-title">TÉRMINOS Y CONDICIONES</div>
      <div>${esc(termsText)}</div>
    </div>`;
  }

  const footerBlock = `<div class="footer-text">
    <div class="footer-legal">${esc(footerText)}</div>
    ${termsBlock}
    <div class="footer-copy">© ${new Date().getFullYear()} ${esc(shop.shop_name || 'Mi Taller')} &nbsp;·&nbsp; Todos los derechos reservados.</div>
  </div>`;

  /* ── Pagos parciales / total ── */
  const paidNum =
    inv.paid_amount != null && Number.isFinite(Number(inv.paid_amount))
      ? Math.min(inv.total_amount, Math.max(0, Number(inv.paid_amount)))
      : null;
  const pendingNum =
    paidNum != null ? Math.max(0, Math.round((inv.total_amount - paidNum) * 100) / 100) : null;
  const fullyPaid = paidNum != null && pendingNum != null && pendingNum <= 0.009;
  const payMethodLine = paymentMethodDisplayForPrint(inv);
  const isPaid =
    fullyPaid ||
    (paidNum == null && String(inv.payment_method ?? '').trim() !== '');
  let paidPill = '';
  if (paidNum != null && pendingNum != null && !fullyPaid) {
    paidPill = `<span class="paid-pill" style="border-color:#b45309;color:#b45309">Pago parcial · ${payMethodLine}</span>`;
  } else if (isPaid) {
    paidPill = `<span class="paid-pill">✓ Pagado · ${payMethodLine}</span>`;
  }

  /* ── Logo / nombre en header ── */
  const shopInitials = (shop.shop_name || 'MT').replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase();
  const logoHtml = shop.logo_url?.trim()
    ? `<div class="hd-logo"><img src="${esc(shop.logo_url.trim())}" alt="${esc(shop.shop_name || 'Logo')}" /></div>`
    : `<div class="hd-logo"><div class="shop-initials">${esc(shopInitials)}</div></div>`;

  const hdDocType =
    j === 'AR' && docTitleArFromCbteTipo(inv.ar_cbte_tipo ?? null)
      ? docTitleArFromCbteTipo(inv.ar_cbte_tipo ?? null)!
      : docTitle(j);

  const displayInvoiceNumber =
    j === 'AR' && inv.ar_punto_venta != null && inv.ar_numero_cbte != null
      ? formatArCbteNumero(Number(inv.ar_punto_venta), Number(inv.ar_numero_cbte))
      : inv.invoice_number;

  /* ── Filas del cuadro "Detalles de factura" ── */
  const detailRows = [
    { label: hdDocType, value: esc(displayInvoiceNumber) },
    { label: 'Fecha', value: esc(created) },
    ...(due ? [{ label: 'Vencimiento', value: esc(due) }] : []),
    ...(inv.external_reference?.trim() ? [{ label: 'Referencia', value: esc(inv.external_reference.trim()) }] : []),
    { label: 'Forma de pago', value: payMethodLine },
    { label: 'Importe total', value: `${sym}&nbsp;${fmtNum(inv.total_amount)}` },
    ...(paidNum != null
      ? [
          { label: 'Pagado (acum.)', value: `${sym}&nbsp;${fmtNum(paidNum)}` },
          ...(pendingNum != null && pendingNum > 0.009
            ? [{ label: 'Pendiente', value: `${sym}&nbsp;${fmtNum(pendingNum)}` }]
            : []),
        ]
      : []),
  ].map(r => `<div class="detail-row"><span>${r.label}</span><span>${r.value}</span></div>`).join('');

  /* ═══════════════════════════════════════════
     BODY HTML
  ═══════════════════════════════════════════ */
  const body = `<div class="page">

    <!-- CABECERA -->
    <div class="hd">
      <div class="hd-left">
        ${logoHtml}
        <div class="hd-info">
          <div class="hd-shopname">${esc(shop.shop_name || 'Mi Taller')}</div>
          <div class="hd-contact">
            ${shop.registration_number?.trim() ? `${j === 'AR' ? 'CUIT' : 'CIF'}: ${esc(shop.registration_number.trim())}<br/>` : ''}
            ${shop.address?.trim() ? `${esc(shop.address.trim())}<br/>` : ''}
            ${shop.phone?.trim() ? `Tel: ${esc(shop.phone.trim())}<br/>` : ''}
            ${shop.email?.trim() ? `Email: ${esc(shop.email.trim())}` : ''}
            ${shop.iva_condition?.trim() && j === 'AR' ? `<br/>Cond. IVA: ${esc(shop.iva_condition.trim())}` : ''}
          </div>
        </div>
      </div>
      <div class="hd-right">
        <div class="hd-doctype">${esc(hdDocType)}</div>
        <div class="hd-num">${esc(displayInvoiceNumber)}</div>
        ${j === 'AR' && displayInvoiceNumber !== String(inv.invoice_number) ? `<div class="hd-num" style="font-size:11px;font-weight:500;color:#666;margin-top:4px">N.º interno: ${esc(String(inv.invoice_number))}</div>` : ''}
      </div>
    </div>

    <hr class="sep" />

    <!-- CLIENTE | DETALLES DE FACTURA -->
    <div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;margin-bottom:24px;">
        <div>
          <div class="info-box-hd">Cliente</div>
          <div class="info-box">
            <div class="client-name">${esc(inv.customer_name)}</div>
            <div class="client-detail">
              ${inv.customer_tax_id?.trim() ? `${esc(idClienteLabel(j))}: ${esc(inv.customer_tax_id.trim())}<br/>` : ''}
              ${j === 'AR' && inv.customer_iva_condition_ar?.trim() ? `Cond. IVA: ${esc(inv.customer_iva_condition_ar.trim())}<br/>` : ''}
              ${inv.customer_billing_address?.trim() ? `${esc(inv.customer_billing_address.trim())}<br/>` : ''}
              ${inv.customer_email?.trim() ? `${esc(inv.customer_email.trim())}<br/>` : ''}
              ${inv.customer_phone?.trim() ? `Tel. ${esc(inv.customer_phone.trim())}` : ''}
            </div>
          </div>
        </div>
        <div style="border-left:1px solid #bbb">
          <div class="info-box-hd">Detalles de factura</div>
          <div class="info-box">
            ${detailRows}
            ${paidPill ? `<div style="margin-top:8px">${paidPill}</div>` : ''}
          </div>
        </div>
      </div>
    </div>

    <!-- TABLA DE LÍNEAS -->
    <table class="lines">
      <thead>
        <tr>
          <th style="width:52%">Concepto / Descripción</th>
          <th class="r" style="width:8%">Cant.</th>
          <th class="r" style="width:20%">Precio unit.</th>
          <th class="r" style="width:20%">Importe</th>
        </tr>
      </thead>
      <tbody>${lineRows}</tbody>
    </table>

    ${ledgerBlock}

    <!-- TOTALES -->
    <div class="totals-wrap">
      <div class="totals">
        <div class="t-row"><span>Subtotal</span><span>${sym}&nbsp;${fmtNum(inv.subtotal)}</span></div>
        ${inv.discount_amount > 0 ? `<div class="t-row red"><span>Descuento</span><span>−${sym}&nbsp;${fmtNum(inv.discount_amount)}</span></div>` : ''}
        ${inv.discount_amount > 0 ? `<div class="t-row"><span>Base imponible</span><span>${sym}&nbsp;${fmtNum(baseImponible)}</span></div>` : ''}
        ${inv.tax_amount > 0 ? `<div class="t-row"><span>IVA / Impuestos</span><span>${sym}&nbsp;${fmtNum(inv.tax_amount)}</span></div>` : ''}
        <div class="t-grand"><span>TOTAL</span><span>${sym}&nbsp;${fmtNum(inv.total_amount)}</span></div>
        ${
          pendingNum != null && pendingNum > 0.009
            ? `<div class="t-row" style="color:#b45309"><span>Saldo pendiente</span><span>${sym}&nbsp;${fmtNum(pendingNum)}</span></div>`
            : ''
        }
      </div>
    </div>

    <!-- FISCAL / NOTAS -->
    ${internalArBlock}
    ${arcaBlock}
    ${esBlock}
    ${inv.ticket_warranty_summary?.trim()
      ? `<div class="warranty-summary-box"><strong>Garantía sobre esta reparación</strong><div>${esc(inv.ticket_warranty_summary.trim())}</div></div>`
      : ''}
    ${inv.notes?.trim() ? `<div class="notes-box"><strong>Notas:</strong> ${esc(inv.notes.trim())}</div>` : ''}

    <!-- PIE -->
    <div class="footer">
      <div class="footer-qrs">${afipQrBlock}${qrBlock}</div>
      ${footerBlock}
    </div>

  </div>`;

  return { styles, body };
}

export function buildInvoicePrintFullHtmlDocument(payload: InvoicePrintPayload): string {
  const { styles, body } = buildInvoicePrintParts(payload);
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/>${styles}</head><body>${body}</body></html>`;
}
