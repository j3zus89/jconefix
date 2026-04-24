/**
 * Utilidades para el panel «Administrar facturas»: periodos, estado de cobro y exportación.
 */

export type PeriodPreset =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisYear'
  | 'custom';

export type InvoicePaymentDisplay =
  | 'unpaid'
  | 'partial'
  | 'paid'
  | 'refunded'
  | 'draft'
  | 'cancelled';

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function endOfDay(d: Date): Date {
  const x = startOfDay(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** Inicio y fin inclusive en hora local; `null` si preset es `all`. */
export function periodBounds(
  preset: PeriodPreset,
  customStart?: string,
  customEnd?: string
): { start: Date; end: Date } | null {
  if (preset === 'all') return null;
  const now = new Date();

  if (preset === 'custom') {
    if (!customStart || !customEnd) return null;
    const a = startOfDay(new Date(customStart));
    const b = endOfDay(new Date(customEnd));
    return a <= b ? { start: a, end: b } : { start: b, end: a };
  }

  if (preset === 'today') {
    return { start: startOfDay(now), end: endOfDay(now) };
  }
  if (preset === 'yesterday') {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return { start: startOfDay(y), end: endOfDay(y) };
  }
  if (preset === 'last7') {
    const s = new Date(now);
    s.setDate(s.getDate() - 6);
    return { start: startOfDay(s), end: endOfDay(now) };
  }
  if (preset === 'thisMonth') {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfDay(now) };
  }
  if (preset === 'lastMonth') {
    const firstThis = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastPrev = new Date(firstThis);
    lastPrev.setDate(0);
    const firstPrev = new Date(lastPrev.getFullYear(), lastPrev.getMonth(), 1);
    return { start: startOfDay(firstPrev), end: endOfDay(lastPrev) };
  }
  if (preset === 'thisYear') {
    return { start: new Date(now.getFullYear(), 0, 1), end: endOfDay(now) };
  }
  return null;
}

export function invoiceBalance(inv: {
  total_amount: number | string | null;
  paid_amount: number | string | null;
  refunded_amount?: number | string | null;
}): number {
  const total = Number(inv.total_amount || 0);
  const paid = Number(inv.paid_amount || 0);
  const ref = Number(inv.refunded_amount || 0);
  return Math.max(0, total - paid - ref);
}

export function invoicePaymentDisplay(inv: {
  status: string;
  payment_status: string;
  total_amount: number | string | null;
  paid_amount: number | string | null;
  refunded_amount?: number | string | null;
}): InvoicePaymentDisplay {
  if (inv.status === 'cancelled') return 'cancelled';
  if (inv.status === 'draft') return 'draft';
  const total = Number(inv.total_amount || 0);
  const paid = Number(inv.paid_amount || 0);
  const ref = Number(inv.refunded_amount || 0);
  const bal = Math.max(0, total - paid - ref);
  if (total > 0 && ref >= total - 0.01) return 'refunded';
  if (bal <= 0.01 && paid > 0.01) return 'paid';
  if (paid > 0.01 && bal > 0.01) return 'partial';
  return 'unpaid';
}

export function paymentDisplayLabel(s: InvoicePaymentDisplay): string {
  switch (s) {
    case 'unpaid':
      return 'No pagado';
    case 'partial':
      return 'Parcial';
    case 'paid':
      return 'Pagado';
    case 'refunded':
      return 'Reembolsado';
    case 'draft':
      return 'Borrador';
    case 'cancelled':
      return 'Cancelada';
    default:
      return s;
  }
}

export function paymentDisplayBadgeClass(s: InvoicePaymentDisplay): string {
  switch (s) {
    case 'paid':
      return 'bg-emerald-100 text-emerald-800';
    case 'partial':
      return 'bg-slate-200 text-slate-800';
    case 'unpaid':
      return 'bg-amber-100 text-amber-900';
    case 'refunded':
      return 'bg-violet-100 text-violet-900';
    case 'draft':
      return 'bg-amber-50 text-amber-800 border border-amber-200';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function referenceLabel(inv: {
  external_reference?: string | null;
  repair_tickets?: { ticket_number: string | null } | null;
}): string {
  const ext = (inv.external_reference || '').trim();
  if (ext) return ext;
  const tn = inv.repair_tickets?.ticket_number;
  if (tn && String(tn).trim()) return String(tn).trim();
  return '—';
}

/**
 * Exporta las facturas como un XLSX profesional con estilos.
 * Llama a buildXlsx de lib/excel-export (dinámica → solo cliente).
 */
export async function exportInvoicesXlsx(
  rows: Array<Record<string, string | number>>,
  filename: string,
  currencySymbol = '€'
): Promise<void> {
  if (typeof window === 'undefined' || rows.length === 0) return;
  const { buildXlsx, downloadXlsx } = await import('@/lib/excel-export');

  const CURRENCY_KEYS = ['total', 'subtotal', 'tax', 'discount', 'amount_paid', 'balance'];
  const DATE_KEYS     = ['date', 'due_date', 'created_at', 'paid_at', 'fecha', 'fecha_vencimiento'];
  const NUMBER_KEYS   = ['quantity', 'items', 'item_count'];

  const allKeys = Object.keys(rows[0]);
  const columns = allKeys.map((key) => {
    const header = key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const lk = key.toLowerCase();
    const type: 'currency' | 'date' | 'number' | 'text' =
      CURRENCY_KEYS.some((k) => lk.includes(k)) ? 'currency' :
      DATE_KEYS.some((k) => lk.includes(k)) ? 'date' :
      NUMBER_KEYS.some((k) => lk.includes(k)) ? 'number' : 'text';

    return { header, key, type, minWidth: 14 };
  });

  const buffer = await buildXlsx({
    sheetName: 'Facturas',
    title: 'JC ONE FIX — Facturas',
    currencySymbol,
    columns,
    rows: rows as unknown as Record<string, unknown>[],
  });
  downloadXlsx(buffer, filename.replace(/\.csv$/i, ''));
}

/** @deprecated Use exportInvoicesXlsx instead */
export function exportInvoicesCsv(
  rows: Array<Record<string, string | number>>,
  filename: string
): void {
  if (typeof window === 'undefined' || rows.length === 0) return;
  void exportInvoicesXlsx(rows, filename);
}
