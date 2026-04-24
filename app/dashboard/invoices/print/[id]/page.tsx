'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Printer } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getActiveOrganizationId } from '@/lib/dashboard-org';
import { buildInvoicePrintParts, type InvoicePrintPayload } from '@/lib/invoice-print-html';
import { fetchRepairTicketPaymentLedgerForPrint } from '@/lib/invoice-payment-ledger';
import { syncInvoiceTotalsFromTicket } from '@/lib/sync-invoice-from-ticket';
import { formatTicketWarrantySummaryForPrint } from '@/lib/warranty-period';
import { Button } from '@/components/ui/button';
import { humanizeInvoicesOrganizationsRelationshipError } from '@/lib/supabase-setup-hints';

function isPostgrestEmbedRelationshipError(err: unknown): boolean {
  const m = String((err as { message?: string })?.message || '');
  const l = m.toLowerCase();
  return l.includes('relationship') && (l.includes('schema cache') || l.includes('could not find'));
}

export default function InvoicePrintPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';
  const supabase = useMemo(() => createClient(), []);
  const [error, setError] = useState<string | null>(null);
  const [parts, setParts] = useState<{ styles: string; body: string } | null>(null);
  const [headerTitle, setHeaderTitle] = useState('Factura');

  useEffect(() => {
    if (!id) {
      setError('Identificador de factura no válido');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setError('Debes iniciar sesión');
          return;
        }

        const orgId = await getActiveOrganizationId(supabase);

        const flatCols = [
          'id',
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

        let inv: any = null;
        let invErr: any = null;
        const r1 = await (supabase as any).from('invoices').select(`${flatCols}, organizations(name, country)`).eq('id', id).maybeSingle();
        if (r1.error && isPostgrestEmbedRelationshipError(r1.error)) {
          const r0 = await (supabase as any).from('invoices').select(flatCols).eq('id', id).maybeSingle();
          if (r0.error) {
            invErr = r0.error;
          } else {
            inv = r0.data;
            if (inv?.organization_id) {
              const { data: orgRow } = await (supabase as any)
                .from('organizations')
                .select('name, country')
                .eq('id', inv.organization_id)
                .maybeSingle();
              inv = { ...inv, organizations: orgRow ?? null };
            }
          }
        } else {
          inv = r1.data;
          invErr = r1.error;
        }

        if (invErr) throw invErr;
        if (!inv) {
          setError('Factura no encontrada');
          return;
        }

        if (orgId && inv.organization_id && inv.organization_id !== orgId) {
          setError('Factura no encontrada');
          return;
        }

        if (inv.ticket_id) {
          await syncInvoiceTotalsFromTicket(supabase, id, String(inv.ticket_id));
          const rFresh = await (supabase as any).from('invoices').select(flatCols).eq('id', id).maybeSingle();
          if (rFresh.data) Object.assign(inv, rFresh.data);
        }

        const { data: items, error: itemsErr } = await (supabase as any)
          .from('invoice_items')
          .select('description, quantity, unit_price, total_price')
          .eq('invoice_id', id);

        if (itemsErr) throw itemsErr;

        const { data: shopRow } = await (supabase as any)
          .from('shop_settings')
          .select('shop_name, address, phone, email, registration_number, currency_symbol, iva_condition, logo_url, footer_text, terms_text_es, terms_text_ar, invoice_show_terms')
          .eq('user_id', user.id)
          .maybeSingle();

        const org = inv.organizations as { name?: string; country?: string } | null;

        let ticketWarrantySummary: string | null = null;
        if (inv.ticket_id) {
          const { data: trow } = await (supabase as any)
            .from('repair_tickets')
            .select('warranty_start_date, warranty_end_date, warranty_info')
            .eq('id', inv.ticket_id)
            .maybeSingle();
          if (trow) ticketWarrantySummary = formatTicketWarrantySummaryForPrint(trow);
        }

        const paymentLedger = inv.ticket_id
          ? await fetchRepairTicketPaymentLedgerForPrint(supabase, String(inv.ticket_id))
          : [];

        const payload: InvoicePrintPayload = {
          invoice: {
            invoice_number: String(inv.invoice_number),
            created_at: inv.created_at,
            customer_name: String(inv.customer_name || ''),
            customer_email: inv.customer_email,
            customer_phone: inv.customer_phone,
            customer_tax_id: inv.customer_tax_id,
            customer_iva_condition_ar: inv.customer_iva_condition_ar,
            customer_billing_address: inv.customer_billing_address,
            subtotal: Number(inv.subtotal || 0),
            discount_amount: Number(inv.discount_amount || 0),
            tax_amount: Number(inv.tax_amount || 0),
            total_amount: Number(inv.total_amount || 0),
            paid_amount: (() => {
              const st = String(inv.payment_status || '').toLowerCase();
              const pa = Number(inv.paid_amount || 0);
              if (pa > 0.005 || st === 'partial') return pa;
              if (st === 'paid') return Number(inv.total_amount || 0);
              return undefined;
            })(),
            notes: inv.notes,
            due_date: inv.due_date,
            payment_method: inv.payment_method,
            external_reference: inv.external_reference,
            billing_jurisdiction: inv.billing_jurisdiction,
            organization_name: org?.name,
            organization_country: org?.country,
            ar_cae: inv.ar_cae,
            ar_cae_expires_at: inv.ar_cae_expires_at,
            ar_cbte_tipo: inv.ar_cbte_tipo,
            ar_punto_venta: inv.ar_punto_venta,
            ar_numero_cbte: inv.ar_numero_cbte != null ? Number(inv.ar_numero_cbte) : null,
            ar_cuit_emisor: inv.ar_cuit_emisor,
            ar_internal_only: Boolean(inv.ar_internal_only),
            es_verifactu_uuid: inv.es_verifactu_uuid,
            ticket_warranty_summary: ticketWarrantySummary,
            payment_ledger: paymentLedger.length ? paymentLedger : undefined,
          },
          lines: (items || []).map((row: any) => ({
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

        if (cancelled) return;
        setParts(buildInvoicePrintParts(payload));
        const t = `Factura ${payload.invoice.invoice_number}`;
        setHeaderTitle(t);
        document.title = t;
      } catch (e: unknown) {
        if (!cancelled) {
          const raw = e instanceof Error ? e.message : 'No se pudo cargar la factura';
          setError(humanizeInvoicesOrganizationsRelationshipError(raw) || raw);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cliente Supabase estable por sesión
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  if (!parts) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-gray-600">Cargando factura…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <style dangerouslySetInnerHTML={{ __html: parts.styles.replace(/<\/?style>/g, '') }} />
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur">
        <p className="text-sm font-medium text-gray-800">{headerTitle}</p>
        <Button type="button" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Imprimir / PDF
        </Button>
      </div>
      <div dangerouslySetInnerHTML={{ __html: parts.body }} />
      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
