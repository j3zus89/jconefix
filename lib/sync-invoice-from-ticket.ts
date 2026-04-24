/**
 * Mantiene alineados `invoices` / `invoice_items` con el importe actual del ticket.
 * No modifica comprobantes ya autorizados en AFIP (con CAE), salvo comprobantes internos.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export async function syncInvoiceTotalsFromTicket(
  supabase: SupabaseClient,
  invoiceId: string,
  ticketId: string
): Promise<void> {
  const invRes = await (supabase as any)
    .from('invoices')
    .select('ticket_id, ar_cae, ar_internal_only')
    .eq('id', invoiceId)
    .maybeSingle();
  const inv = invRes.data as
    | { ticket_id?: string | null; ar_cae?: string | null; ar_internal_only?: boolean | null }
    | null
    | undefined;
  if (!inv || String(inv.ticket_id || '') !== ticketId) return;

  const cae = String(inv.ar_cae || '').trim();
  const internal = Boolean(inv.ar_internal_only);
  if (cae && !internal) return;

  const tRes = await (supabase as any)
    .from('repair_tickets')
    .select('final_cost, estimated_cost, apply_iva, device_type, issue_description')
    .eq('id', ticketId)
    .maybeSingle();
  const t = tRes.data as
    | {
        final_cost?: number | null;
        estimated_cost?: number | null;
        apply_iva?: boolean | null;
        device_type?: string | null;
        issue_description?: string | null;
      }
    | null
    | undefined;
  if (!t) return;

  const base = Number(t.final_cost ?? t.estimated_cost ?? 0) || 0;
  const applyIva = t.apply_iva === true;
  const tax = applyIva ? base * 0.21 : 0;
  const total = applyIva ? base * 1.21 : base;

  const { error: upInvErr } = await (supabase as any)
    .from('invoices')
    .update({
      subtotal: base,
      tax_amount: tax,
      total_amount: total,
    })
    .eq('id', invoiceId);
  if (upInvErr) {
    console.warn('[syncInvoiceTotalsFromTicket] invoices', upInvErr);
    return;
  }

  const itemsRes = await (supabase as any)
    .from('invoice_items')
    .select('id')
    .eq('invoice_id', invoiceId);
  const items = (itemsRes.data || []) as { id: string }[];
  if (items.length !== 1) return;

  const desc = `${t.device_type ?? ''} — ${String(t.issue_description || 'Reparación').substring(0, 120)}`.trim() || 'Servicio';
  const { error: itemErr } = await (supabase as any)
    .from('invoice_items')
    .update({
      description: desc,
      quantity: 1,
      unit_price: base,
      total_price: total,
    })
    .eq('id', items[0].id);
  if (itemErr) console.warn('[syncInvoiceTotalsFromTicket] invoice_items', itemErr);
}
