'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Printer } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { buildReturnConstanciaPrintDocument } from '@/lib/build-return-constancia-print-html';
import {
  labelReturnScenario,
  labelReturnSettlement,
  labelReturnStatus,
} from '@/lib/return-constancia-labels';
import { displayOrgOrShopName } from '@/lib/display-name';
import { repairCaseTerms } from '@/lib/locale';
import { isArgentinaCurrency } from '@/lib/currency-region';

export default function ReturnConstanciaPrintPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';
  const supabase = useMemo(() => createClient(), []);
  const [error, setError] = useState<string | null>(null);
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('Identificador no válido');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { data: c, error: e1 } = await (supabase as any)
          .from('customer_return_constancias')
          .select(
            'id, reference_code, created_at, delivered_at, status, scenario, settlement_method, summary_line, detail, amount_money, repair_ticket_id, related_invoice_id, organization_id'
          )
          .eq('id', id)
          .maybeSingle();
        if (e1) throw e1;
        if (!c) {
          setError('Constancia no encontrada');
          return;
        }

        const { data: t, error: e2 } = await (supabase as any)
          .from('repair_tickets')
          .select('ticket_number, customers(name)')
          .eq('id', c.repair_ticket_id)
          .maybeSingle();
        if (e2) throw e2;

        let invNum: string | null = null;
        if (c.related_invoice_id) {
          const { data: inv } = await (supabase as any)
            .from('invoices')
            .select('invoice_number')
            .eq('id', c.related_invoice_id)
            .maybeSingle();
          invNum = inv?.invoice_number ?? null;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setError('Debes iniciar sesión');
          return;
        }

        type ShopPrintRow = {
          shop_name?: string | null;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          registration_number?: string | null;
          currency_symbol?: string | null;
          currency?: string | null;
          logo_url?: string | null;
          footer_text?: string | null;
        };
        const shopSelect =
          'shop_name, address, phone, email, registration_number, currency_symbol, currency, logo_url, footer_text, user_id, organization_id';
        let shop: ShopPrintRow | null = null;
        if (c.organization_id) {
          const { data: byOrg } = await (supabase as any)
            .from('shop_settings')
            .select(shopSelect)
            .eq('organization_id', c.organization_id)
            .maybeSingle();
          shop = (byOrg as ShopPrintRow | null) ?? null;
        }
        if (!shop) {
          const { data: byUser } = await (supabase as any)
            .from('shop_settings')
            .select(shopSelect)
            .eq('user_id', user.id)
            .maybeSingle();
          shop = (byUser as ShopPrintRow | null) ?? null;
        }

        let logoUrl = shop?.logo_url?.trim() || null;
        if (!logoUrl && c.organization_id) {
          const { data: orgRow } = await (supabase as any)
            .from('organizations')
            .select('logo_url')
            .eq('id', c.organization_id)
            .maybeSingle();
          logoUrl = (orgRow?.logo_url as string | undefined)?.trim() || null;
        }

        const shopName = shop?.shop_name
          ? displayOrgOrShopName(String(shop.shop_name))
          : 'Taller';
        const curr = shop?.currency_symbol?.trim() || '$';

        let currencyCode = String(shop?.currency || '').toUpperCase();
        if (!currencyCode && c.organization_id) {
          const { data: orgCur } = await (supabase as any)
            .from('organizations')
            .select('currency')
            .eq('id', c.organization_id)
            .maybeSingle();
          currencyCode = String(orgCur?.currency || 'ARS').toUpperCase();
        }
        if (!currencyCode) currencyCode = 'ARS';
        const rc = repairCaseTerms(isArgentinaCurrency(currencyCode));

        const { styles, body } = buildReturnConstanciaPrintDocument({
          reference_code: c.reference_code,
          created_at: c.created_at,
          delivered_at: c.delivered_at,
          status: labelReturnStatus(c.status),
          scenario_label: labelReturnScenario(c.scenario),
          settlement_label: labelReturnSettlement(c.settlement_method),
          summary_line: c.summary_line || '',
          detail: c.detail,
          amount_money: c.amount_money != null ? Number(c.amount_money) : null,
          currency_symbol: curr,
          ticket_number: t?.ticket_number || '—',
          customer_name: t?.customers?.name || '—',
          related_invoice_number: invNum,
          shop_name: shopName,
          shop_address: shop?.address ?? null,
          shop_phone: shop?.phone ?? null,
          shop_email: shop?.email ?? null,
          shop_registration: shop?.registration_number ?? null,
          logo_url: logoUrl,
          footer_text: shop?.footer_text ?? null,
          repair_reference_row_label: rc.constanciaTicketRowLabel,
        });

        const full = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${styles}</style></head><body>${body}</body></html>`;
        if (!cancelled) setHtml(full);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error al cargar');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, supabase]);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="mx-auto mb-4 flex max-w-[860px] justify-end print:hidden">
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Imprimir / PDF
        </Button>
      </div>
      {error ? (
        <div className="mx-auto max-w-lg rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      ) : !html ? (
        <div className="flex justify-center py-20 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <iframe title="Constancia" className="mx-auto min-h-[80vh] w-full max-w-[860px] rounded-lg border bg-white shadow print:border-0 print:shadow-none" srcDoc={html} />
      )}
    </div>
  );
}
