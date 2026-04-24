export type ReturnConstanciaPrintInput = {
  reference_code: string;
  created_at: string;
  delivered_at: string | null;
  status: string;
  scenario_label: string;
  settlement_label: string;
  summary_line: string;
  detail: string | null;
  amount_money: number | null;
  currency_symbol: string;
  ticket_number: string;
  customer_name: string;
  related_invoice_number: string | null;
  shop_name: string;
  shop_address: string | null;
  shop_phone: string | null;
  shop_email: string | null;
  shop_registration: string | null;
  /** Misma URL que en facturas (Storage). */
  logo_url?: string | null;
  /** Pie opcional del taller (Ajustes), como en factura. */
  footer_text?: string | null;
  /** Etiqueta de la fila del número de caso (p. ej. Orden / Ticket). */
  repair_reference_row_label?: string | null;
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

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return esc(iso);
  }
}

/**
 * HTML alineado visualmente con `invoice-print-html.ts` (cabecera, cajas, tabla, total).
 */
export function buildReturnConstanciaPrintDocument(p: ReturnConstanciaPrintInput): { styles: string; body: string } {
  const sym = p.currency_symbol?.trim() || '€';
  const hasAmt = p.amount_money != null && !Number.isNaN(Number(p.amount_money));
  const amtStr = hasAmt ? `${esc(sym)}${fmtNum(Number(p.amount_money))}` : '—';

  const rowLabel = (p.repair_reference_row_label || 'Ticket').trim() || 'Ticket';
  const refSideNote =
    rowLabel.toLowerCase() === 'orden'
      ? 'Referenciado en la orden indicada al lado.'
      : 'Referenciado en el ticket indicado al lado.';

  const shopInitials = (p.shop_name || 'MT').replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'MT';
  const logoHtml = p.logo_url?.trim()
    ? `<div class="hd-logo"><img src="${esc(p.logo_url.trim())}" alt="${esc(p.shop_name || 'Logo')}" /></div>`
    : `<div class="hd-logo"><div class="shop-initials">${esc(shopInitials)}</div></div>`;

  const estadoLine = p.delivered_at
    ? `${esc(p.status)} · ${esc(fmtDateTime(p.delivered_at))}`
    : esc(p.status);

  const detailRows = [
    { label: 'Referencia', value: esc(p.reference_code) },
    { label: 'Fecha emisión', value: esc(fmtDateTime(p.created_at)) },
    { label: rowLabel, value: esc(p.ticket_number) },
    { label: 'Tipo de actuación', value: esc(p.scenario_label) },
    { label: 'Liquidación', value: esc(p.settlement_label) },
    { label: 'Estado', value: estadoLine },
    ...(p.related_invoice_number
      ? [{ label: 'Factura relacionada', value: esc(p.related_invoice_number) }]
      : []),
  ]
    .map(
      (r) =>
        `<div class="detail-row"><span>${r.label}</span><span>${r.value}</span></div>`
    )
    .join('');

  const conceptMain = esc(p.summary_line);
  const detailRow =
    p.detail && p.detail.trim()
      ? `<tr>
      <td class="main sub-desc">${esc(p.detail.trim())}</td>
      <td class="r">—</td>
      <td class="r">—</td>
      <td class="r">—</td>
    </tr>`
      : '';

  const DEFAULT_FOOTER =
    'Documento interno de constancia de devolución o abono. No sustituye los requisitos fiscales aplicables en tu país.';
  const footerLegal = p.footer_text?.trim() || DEFAULT_FOOTER;

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; color: #1a1a1a; font-size: 13px; line-height: 1.5; background: #fff; }
    .page { max-width: 820px; margin: 0 auto; padding: 44px 52px; background: #fff; }

    .hd { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .hd-left { display: flex; align-items: flex-start; gap: 18px; max-width: 58%; }
    .hd-logo { flex-shrink: 0; }
    .hd-logo img { max-height: 64px; max-width: 160px; object-fit: contain; display: block; }
    .hd-logo .shop-initials { width: 56px; height: 56px; background: #111; color: #fff; font-size: 20px; font-weight: 900; display: flex; align-items: center; justify-content: center; border-radius: 4px; letter-spacing: -1px; }
    .hd-shopname { font-size: 15px; font-weight: 800; color: #111; line-height: 1.2; margin-bottom: 4px; }
    .hd-contact { font-size: 11px; color: #555; line-height: 1.85; }
    .hd-right { text-align: right; max-width: 42%; }
    .hd-doctype { font-size: 22px; font-weight: 900; color: #111; letter-spacing: -0.4px; text-transform: uppercase; line-height: 1.1; }
    .hd-sub { font-size: 11px; font-weight: 600; color: #555; margin-top: 4px; text-transform: none; letter-spacing: 0; }
    .hd-num { font-size: 13px; font-weight: 700; color: #111; margin-top: 8px; font-variant-numeric: tabular-nums; }

    .sep { border: none; border-top: 2px solid #111; margin: 0 0 18px; }

    .info-row-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; margin-bottom: 22px; border: 1px solid #bbb; }
    .info-box { padding: 12px 16px; }
    .info-box + .info-box { border-left: 1px solid #bbb; }
    .info-box-hd { background: #e8e8e8; font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: #333; padding: 5px 16px; border-bottom: 1px solid #bbb; }
    .info-box-hd + .info-box-hd { border-left: 1px solid #bbb; }
    .client-name { font-size: 14px; font-weight: 700; color: #111; margin-bottom: 3px; }
    .client-detail { font-size: 11px; color: #555; line-height: 1.8; }
    .detail-row { display: flex; justify-content: space-between; font-size: 11.5px; padding: 4px 0; border-bottom: 1px solid #ebebeb; color: #333; gap: 12px; }
    .detail-row:last-child { border-bottom: none; }
    .detail-row span:first-child { color: #666; flex-shrink: 0; }
    .detail-row span:last-child { font-weight: 600; color: #111; text-align: right; word-break: break-word; }

    .doc-badge { display: inline-block; border: 1.5px solid #333; padding: 2px 10px; border-radius: 3px; font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #333; margin-top: 10px; }

    table.lines { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-bottom: 0; }
    table.lines thead tr { border-top: 2px solid #111; border-bottom: 2px solid #111; }
    table.lines th { padding: 8px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #111; text-align: left; background: #fff; }
    table.lines th.r { text-align: right; }
    table.lines tbody tr { border-bottom: 1px solid #e0e0e0; }
    table.lines tbody tr:last-child { border-bottom: 2px solid #111; }
    table.lines td { padding: 10px 10px; vertical-align: top; color: #333; }
    table.lines td.r { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    table.lines td.main { font-weight: 500; color: #111; white-space: pre-wrap; }
    table.lines td.sub-desc { font-weight: 400; color: #555; font-size: 11.5px; white-space: pre-wrap; }

    .totals-wrap { display: flex; justify-content: flex-end; margin: 16px 0 22px; }
    .totals { width: 300px; }
    .t-grand { display: flex; justify-content: space-between; align-items: center; border: 2px solid #111; padding: 10px 14px; margin-top: 6px; font-size: 15px; font-weight: 800; color: #111; }
    .t-grand .amt { font-size: 16px; color: #b45309; }

    .notes-box { border-left: 3px solid #94a3b8; padding: 8px 14px; font-size: 11px; color: #555; margin-bottom: 20px; line-height: 1.65; }
    .notes-box strong { color: #111; }

    .footer { border-top: 2px solid #111; padding-top: 16px; margin-top: 4px; }
    .footer-legal { font-size: 10.5px; color: #555; line-height: 1.75; }
    .footer-copy { font-size: 9px; color: #aaa; margin-top: 10px; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 28px 36px; }
    }
  `;

  const body = `<div class="page">
    <div class="hd">
      <div class="hd-left">
        ${logoHtml}
        <div class="hd-info">
          <div class="hd-shopname">${esc(p.shop_name)}</div>
          <div class="hd-contact">
            ${p.shop_registration?.trim() ? `ID fiscal: ${esc(p.shop_registration.trim())}<br/>` : ''}
            ${p.shop_address?.trim() ? `${esc(p.shop_address.trim())}<br/>` : ''}
            ${p.shop_phone?.trim() ? `Tel: ${esc(p.shop_phone.trim())}<br/>` : ''}
            ${p.shop_email?.trim() ? `Email: ${esc(p.shop_email.trim())}` : ''}
          </div>
        </div>
      </div>
      <div class="hd-right">
        <div class="hd-doctype">Constancia</div>
        <div class="hd-sub">Devolución / abono al cliente</div>
        <div class="hd-num">${esc(p.reference_code)}</div>
        <span class="doc-badge">Documento interno</span>
      </div>
    </div>

    <hr class="sep" />

    <div class="info-row-grid">
      <div>
        <div class="info-box-hd">Cliente</div>
        <div class="info-box">
          <div class="client-name">${esc(p.customer_name)}</div>
          <div class="client-detail">${esc(refSideNote)}</div>
        </div>
      </div>
      <div>
        <div class="info-box-hd">Detalles del documento</div>
        <div class="info-box">${detailRows}</div>
      </div>
    </div>

    <table class="lines">
      <thead>
        <tr>
          <th style="width:52%">Concepto / descripción</th>
          <th class="r" style="width:10%">Cant.</th>
          <th class="r" style="width:18%">P. unit.</th>
          <th class="r" style="width:20%">Importe</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="main">${conceptMain}</td>
          <td class="r">1</td>
          <td class="r">${hasAmt ? amtStr : '—'}</td>
          <td class="r">${amtStr}</td>
        </tr>
        ${detailRow}
      </tbody>
    </table>

    <div class="totals-wrap">
      <div class="totals">
        <div class="t-grand">
          <span>Total abonado / devuelto</span>
          <span class="amt">${amtStr}</span>
        </div>
      </div>
    </div>

    <div class="notes-box">
      <strong>Aviso:</strong> este documento es una constancia operativa del taller. No reemplaza facturas rectificativas, notas de crédito ni otros comprobantes exigidos por la normativa fiscal de tu jurisdicción.
    </div>

    <div class="footer">
      <div class="footer-legal">${esc(footerLegal)}</div>
      <div class="footer-copy">© ${new Date().getFullYear()} ${esc(p.shop_name)} · Todos los derechos reservados.</div>
    </div>
  </div>`;

  return { styles, body };
}
