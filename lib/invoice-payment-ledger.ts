import type { SupabaseClient } from '@supabase/supabase-js';

export type InvoicePaymentLedgerPrintRow = {
  label: string;
  amount: number;
  method_display?: string | null;
  date_display?: string | null;
};

function formatLedgerDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

function paymentMethodLabel(m: string | null | undefined): string {
  const x = (m || '').toLowerCase();
  if (x === 'cash') return 'Efectivo';
  if (x === 'card') return 'Tarjeta';
  if (x === 'transfer') return 'Transferencia';
  return m ? String(m) : '—';
}

/** Filas para el bloque “Detalle de cobros” del comprobante impreso. */
export async function fetchRepairTicketPaymentLedgerForPrint(
  supabase: SupabaseClient,
  ticketId: string
): Promise<InvoicePaymentLedgerPrintRow[]> {
  const { data: trow } = await (supabase as any)
    .from('repair_tickets')
    .select('deposit_amount')
    .eq('id', ticketId)
    .maybeSingle();

  const dep = Number(trow?.deposit_amount ?? 0);
  const rows: InvoicePaymentLedgerPrintRow[] = [];
  if (dep > 0.005) {
    rows.push({
      label: 'Seña o adelanto (al ingreso)',
      amount: dep,
      method_display: null,
      date_display: null,
    });
  }

  const { data: pays } = await (supabase as any)
    .from('payments')
    .select('amount, payment_method, created_at, status')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  for (const p of pays || []) {
    if (String((p as { status?: string }).status ?? 'completed').toLowerCase() !== 'completed') continue;
    const amt = Number((p as { amount?: number }).amount || 0);
    if (amt < 0.005) continue;
    rows.push({
      label: 'Cobro registrado',
      amount: amt,
      method_display: paymentMethodLabel((p as { payment_method?: string }).payment_method),
      date_display: formatLedgerDate((p as { created_at?: string }).created_at),
    });
  }

  return rows;
}
