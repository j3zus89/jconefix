import { toast } from 'sonner';
import { printInvoiceHtmlWithQz } from '@/lib/invoice-print-qz';
import type { QzTrayConnectOptions } from '@/lib/qz-tray-session';

/** Construye opciones de conexión QZ a partir de una fila `shop_settings`. */
export function shopRowToQzConnect(row: {
  qz_tray_port?: unknown;
  qz_tray_using_secure?: unknown;
  qz_tray_certificate_pem?: string | null;
} | null | undefined): QzTrayConnectOptions | null {
  if (!row) return null;
  const raw = row.qz_tray_port;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10);
  const port = Number.isFinite(n) && n > 0 && n <= 65535 ? n : 8182;
  return {
    port,
    usingSecure: Boolean(row.qz_tray_using_secure),
    certificatePem: row.qz_tray_certificate_pem?.trim() ? row.qz_tray_certificate_pem : null,
  };
}

export function openInvoicePrintTab(invoiceId: string): void {
  if (typeof window === 'undefined') return;
  const url = `${window.location.origin}/dashboard/invoices/print/${invoiceId}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Tras crear una factura: imprime con QZ si está configurado, si no (o si falla) abre la vista en pestaña nueva.
 */
export async function deliverInvoiceDocument(args: {
  invoiceId: string;
  htmlDocumentForQz: string;
  preferQz: boolean;
  qzConnect: QzTrayConnectOptions | null;
}): Promise<void> {
  const { invoiceId, htmlDocumentForQz, preferQz, qzConnect } = args;
  if (preferQz && qzConnect) {
    const r = await printInvoiceHtmlWithQz(htmlDocumentForQz, qzConnect, null);
    if (r.ok) return;
    toast.warning(r.message || 'No se pudo imprimir con QZ Tray; abriendo vista en el navegador…');
  }
  openInvoicePrintTab(invoiceId);
}
