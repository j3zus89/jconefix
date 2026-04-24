import type { SupabaseClient } from '@supabase/supabase-js';
import type { InvoicePrintPayload } from '@/lib/invoice-print-html';
import { fetchRepairTicketPaymentLedgerForPrint } from '@/lib/invoice-payment-ledger';
import { syncInvoiceTotalsFromTicket } from '@/lib/sync-invoice-from-ticket';
import { formatTicketWarrantySummaryForPrint } from '@/lib/warranty-period';

function isPostgrestEmbedRelationshipError(err: unknown): boolean {
  const m = String((err as { message?: string })?.message || '');
  const l = m.toLowerCase();
  return l.includes('relationship') && (l.includes('schema cache') || l.includes('could not find'));
}

/**
 * Carga el payload de impresión de una factura (misma lógica que la página de impresión) para exportación ZIP / informes.
 */
export async function loadInvoicePrintPayloadForExport(
  supabase: SupabaseClient,
  invoiceId: string,
  activeOrgId: string | null
): Promise<{ payload: InvoicePrintPayload; shopOwnerId: string } | null> {
  const flatCols = [
    'id',
    'shop_owner_id',
    'organization_id',
    'invoice_number',
    'created_at',
    'customer_name',
    'customer_email',
    'customer_phone',
    'customer_tax_id',
    'customer_iva_condition_ar',
    'customer_billing_address',
    'subtotal',
    'discount_amount',
    'tax_amount',
    'total_amount',
    'notes',
    'due_date',
    'payment_method',
    'payment_status',
    'paid_amount',
    'external_reference',
    'billing_jurisdiction',
    'ar_cae',
    'ar_cae_expires_at',
    'ar_cbte_tipo',
    'ar_punto_venta',
    'ar_numero_cbte',
    'ar_cuit_emisor',
    'ar_internal_only',
    'es_verifactu_uuid',
    'ticket_id',
  ].join(', ');

  let inv: Record<string, unknown> | null = null;
  let invErr: { message?: string } | null = null;

  const r1 = await (supabase as any)
    .from('invoices')
    .select(`${flatCols}, organizations(name, country)`)
    .eq('id', invoiceId)
    .maybeSingle();

  if (r1.error && isPostgrestEmbedRelationshipError(r1.error)) {
    const r0 = await (supabase as any).from('invoices').select(flatCols).eq('id', invoiceId).maybeSingle();
    if (r0.error) {
      invErr = r0.error;
    } else {
      inv = r0.data;
      if (inv?.organization_id) {
        const { data: orgRow } = await (supabase as any)
          .from('organizations')
          .select('name, country')
          .eq('id', inv.organization_id as string)
          .maybeSingle();
        inv = { ...inv, organizations: orgRow ?? null };
      }
    }
  } else {
    inv = r1.data;
    invErr = r1.error;
  }

  if (invErr || !inv) return null;

  if (activeOrgId && inv.organization_id && String(inv.organization_id) !== activeOrgId) {
    return null;
  }

  const shopOwnerId = String(inv.shop_owner_id || '');
  if (!shopOwnerId) return null;

  let invRow: Record<string, unknown> = inv;
  if (invRow.ticket_id) {
    await syncInvoiceTotalsFromTicket(supabase, invoiceId, String(invRow.ticket_id));
    const rInv = await (supabase as any).from('invoices').select(flatCols).eq('id', invoiceId).maybeSingle();
    if (rInv.data) invRow = { ...invRow, ...rInv.data };
  }

  const { data: items, error: itemsErr } = await (supabase as any)
    .from('invoice_items')
    .select('description, quantity, unit_price, total_price')
    .eq('invoice_id', invoiceId);

  if (itemsErr) return null;

  const { data: shopRow } = await (supabase as any)
    .from('shop_settings')
    .select(
      'shop_name, address, phone, email, registration_number, currency_symbol, iva_condition, logo_url, footer_text, terms_text_es, terms_text_ar, invoice_show_terms'
    )
    .eq('user_id', shopOwnerId)
    .maybeSingle();

  const org = invRow.organizations as { name?: string; country?: string } | null;

  let ticketWarrantySummary: string | null = null;
  const tid = invRow.ticket_id as string | null | undefined;
  if (tid) {
    const { data: trow } = await (supabase as any)
      .from('repair_tickets')
      .select('warranty_start_date, warranty_end_date, warranty_info')
      .eq('id', tid)
      .maybeSingle();
    if (trow) {
      ticketWarrantySummary = formatTicketWarrantySummaryForPrint(trow);
    }
  }

  const paymentLedger = tid ? await fetchRepairTicketPaymentLedgerForPrint(supabase, tid) : [];

  const payload: InvoicePrintPayload = {
    invoice: {
      invoice_number: String(invRow.invoice_number),
      created_at: String(invRow.created_at),
      customer_name: String(invRow.customer_name || ''),
      customer_email: invRow.customer_email as string | null,
      customer_phone: invRow.customer_phone as string | null,
      customer_tax_id: invRow.customer_tax_id as string | null,
      customer_iva_condition_ar: invRow.customer_iva_condition_ar as string | null,
      customer_billing_address: invRow.customer_billing_address as string | null,
      subtotal: Number(invRow.subtotal || 0),
      discount_amount: Number(invRow.discount_amount || 0),
      tax_amount: Number(invRow.tax_amount || 0),
      total_amount: Number(invRow.total_amount || 0),
      paid_amount: (() => {
        const st = String(invRow.payment_status || '').toLowerCase();
        const pa = Number(invRow.paid_amount || 0);
        if (pa > 0.005 || st === 'partial') return pa;
        if (st === 'paid') return Number(invRow.total_amount || 0);
        return undefined;
      })(),
      notes: invRow.notes as string | null,
      due_date: invRow.due_date as string | null,
      payment_method: invRow.payment_method as string | null,
      external_reference: invRow.external_reference as string | null,
      billing_jurisdiction: invRow.billing_jurisdiction as string | null,
      organization_name: org?.name,
      organization_country: org?.country,
      ar_cae: invRow.ar_cae as string | null,
      ar_cae_expires_at: invRow.ar_cae_expires_at as string | null,
      ar_cbte_tipo: invRow.ar_cbte_tipo as number | null,
      ar_punto_venta: invRow.ar_punto_venta as number | null,
      ar_numero_cbte: invRow.ar_numero_cbte != null ? Number(invRow.ar_numero_cbte) : null,
      ar_cuit_emisor: invRow.ar_cuit_emisor as string | null,
      ar_internal_only: Boolean(invRow.ar_internal_only),
      es_verifactu_uuid: invRow.es_verifactu_uuid as string | null,
      ticket_warranty_summary: ticketWarrantySummary,
      payment_ledger: paymentLedger.length ? paymentLedger : undefined,
    },
    lines: (items || []).map((row: Record<string, unknown>) => ({
      description: String(row.description || ''),
      quantity: Math.max(1, Number(row.quantity || 1)),
      unit_price: Number(row.unit_price || 0),
      total_price: Number(row.total_price || 0),
    })),
    shop: {
      shop_name: shopRow?.shop_name?.trim() || 'Mi Taller',
      address: shopRow?.address,
      phone: shopRow?.phone,
      email: shopRow?.email,
      registration_number: shopRow?.registration_number,
      currency_symbol: shopRow?.currency_symbol,
      iva_condition: shopRow?.iva_condition,
      logo_url: shopRow?.logo_url || null,
      footer_text: shopRow?.footer_text || null,
      terms_text_es: shopRow?.terms_text_es || null,
      terms_text_ar: shopRow?.terms_text_ar || null,
      invoice_show_terms: Boolean(shopRow?.invoice_show_terms),
    },
  };

  return { payload, shopOwnerId };
}
