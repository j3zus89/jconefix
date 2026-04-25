'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { getActiveOrganizationId } from '@/lib/dashboard-org';
import { fetchActiveOrgMemberUserIds, repairTicketsOrgScopeOr } from '@/lib/repair-tickets-org-scope';
import { useOrgLocale } from '@/lib/hooks/useOrgLocale';
import { last30DaysIsoRange } from '@/lib/dashboard-period-range';
import { parsePosSalesDashboardAggregates } from '@/lib/pos-sales-dashboard-aggregates';
import type { Database } from '@/lib/supabase/types';

type PosDashboardRpcArgs = Database['public']['Functions']['get_pos_sales_dashboard_aggregates']['Args'];
type RepairPaymentsSumRpcArgs = Database['public']['Functions']['get_dashboard_repair_payments_sum']['Args'];

/** PostgREST `not.in` — valores entre comillas dobles (texto). */
const INVOICE_SUM_STATUSES_EXCLUDED = '("draft","cancelled")';
/** Tickets anulados no deben sumar al «coste final» de referencia. */
const TICKET_REF_STATUS_EXCLUDED = '("cancelled","cancelado")';
/** PostgREST devuelve como máximo `PAGE` filas por petición si no se pagina. */
const PAGE = 1000;

export default function RevenueReportsPage() {
  const loc = useOrgLocale();
  const eur = (n: number) => loc.format(n);
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  /** Misma lógica que Resumen del panel → ÚLTIMOS 30 (cobros + señas + POS). */
  const [panelIncome30, setPanelIncome30] = useState(0);
  const [repairIncome30, setRepairIncome30] = useState(0);
  const [posIncome30, setPosIncome30] = useState(0);
  /** Suma de total_amount de comprobantes guardados distintos de borrador/cancelada. */
  const [invoiceDocumentsTotal, setInvoiceDocumentsTotal] = useState(0);
  const [posTableError, setPosTableError] = useState<string | null>(null);
  const [ticketFinalRef, setTicketFinalRef] = useState(0);

  useEffect(() => {
    const run = async () => {
      const orgId = await getActiveOrganizationId(supabase);
      if (!orgId) {
        setLoading(false);
        return;
      }
      const memberIds = await fetchActiveOrgMemberUserIds(supabase, orgId);
      const ticketScopeOr = repairTicketsOrgScopeOr(orgId, memberIds);
      const { from, to } = last30DaysIsoRange();

      const posRpcArgs = {
        p_organization_id: orgId,
        p_from: from,
        p_to: to,
      } as PosDashboardRpcArgs;
      const repairSumArgs = {
        p_organization_id: orgId,
        p_from: from,
        p_to: to,
      } as RepairPaymentsSumRpcArgs;

      try {
        const [posAggRes, repairSumRes, posRaw] = await Promise.all([
          supabase.rpc('get_pos_sales_dashboard_aggregates', posRpcArgs),
          supabase.rpc('get_dashboard_repair_payments_sum', repairSumArgs),
          (supabase as any)
            .from('pos_sales')
            .select('total')
            .eq('organization_id', orgId)
            .gte('created_at', from)
            .lte('created_at', to),
        ]);

        const posMsg = String(posRaw.error?.message || '');
        if (posRaw.error && /does not exist|schema cache/i.test(posMsg)) {
          setPosTableError('La tabla pos_sales no está disponible en este entorno.');
        } else if (posRaw.error) {
          setPosTableError(posMsg);
        } else {
          setPosTableError(null);
        }

        if (posAggRes.error) {
          console.error('[revenue/30d] get_pos_sales_dashboard_aggregates', posAggRes.error);
        }
        if (repairSumRes.error) {
          console.error('[revenue/30d] get_dashboard_repair_payments_sum', repairSumRes.error);
        }

        const posParsed =
          !posAggRes.error && posAggRes.data != null ? parsePosSalesDashboardAggregates(posAggRes.data) : null;
        const posFromRpc = posParsed?.period.pos_total ?? 0;
        const repairFromRpc =
          !repairSumRes.error && repairSumRes.data != null ? Number(repairSumRes.data) : 0;

        const pSumTable = (posRaw.data || []).reduce((a: number, r: { total?: string }) => a + Number(r.total || 0), 0);

        let iSum = 0;
        for (let off = 0; ; off += PAGE) {
          const inv = await (supabase as any)
            .from('invoices')
            .select('total_amount')
            .eq('organization_id', orgId)
            .gte('created_at', from)
            .lte('created_at', to)
            .not('status', 'in', INVOICE_SUM_STATUSES_EXCLUDED)
            .range(off, off + PAGE - 1);
          if (inv.error) throw inv.error;
          const rows = inv.data || [];
          for (const r of rows) iSum += Number((r as { total_amount?: string }).total_amount || 0);
          if (rows.length < PAGE) break;
        }

        let tk = 0;
        for (let off = 0; ; off += PAGE) {
          const tix = await (supabase as any)
            .from('repair_tickets')
            .select('final_cost')
            .or(ticketScopeOr)
            .gte('created_at', from)
            .lte('created_at', to)
            .not('final_cost', 'is', null)
            .not('status', 'in', TICKET_REF_STATUS_EXCLUDED)
            .range(off, off + PAGE - 1);
          if (tix.error) throw tix.error;
          const rows = tix.data || [];
          for (const r of rows) tk += Number((r as { final_cost?: string }).final_cost || 0);
          if (rows.length < PAGE) break;
        }

        setInvoiceDocumentsTotal(iSum);
        setRepairIncome30(repairFromRpc);
        setPosIncome30(posFromRpc || pSumTable);
        setPanelIncome30(repairFromRpc + (posFromRpc || pSumTable));
        setTicketFinalRef(tk);
      } catch (e: any) {
        toast.error(e?.message || 'No se pudieron cargar los datos');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [supabase]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-7 w-7 text-[#0d9488]" />
            Ingresos (30 días)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            El import principal coincide con el <strong>Resumen del panel</strong> en «Últimos 30 días»: cobros en
            reparaciones (y señas) más ventas POS. Las facturas suman el total del comprobante (puede diferir unos pesos
            del cobrado por IVA o pagos parciales). El coste final en tickets es otra métrica (ver tarjeta inferior).
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/reports">Volver a informes</Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-6 shadow-sm sm:col-span-2">
            <p className="text-xs font-semibold uppercase text-emerald-800">Ingreso del panel (últimos 30 días)</p>
            <p className="text-3xl font-bold text-emerald-900 mt-2 tabular-nums">{eur(panelIncome30)}</p>
            <p className="text-xs text-emerald-800/80 mt-2">
              Reparaciones cobradas + señas: {eur(repairIncome30)} · POS: {eur(posIncome30)}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase text-gray-500">Facturas (sin borrador / anulada)</p>
            <p className="text-3xl font-bold text-gray-900 mt-2 tabular-nums">{eur(invoiceDocumentsTotal)}</p>
            <p className="text-xs text-gray-400 mt-2">
              Suma de <code className="text-[10px]">total_amount</code> en el período (paginada; sin borrador ni
              cancelada). Puede superar ligeramente el cobrado del panel si el comprobante incluye IVA o quedó saldo
              distinto en factura vs. caja.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase text-gray-500">Ventas POS (misma fuente que el panel)</p>
            <p className="text-3xl font-bold text-gray-900 mt-2 tabular-nums">{eur(posIncome30)}</p>
            {posTableError ? (
              <p className="text-xs text-amber-600 mt-2">{posTableError}</p>
            ) : (
              <p className="text-xs text-gray-400 mt-2">Agregado vía RPC del panel (tabla pos_sales si existe).</p>
            )}
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:col-span-2">
            <p className="text-xs font-semibold uppercase text-gray-500">Coste final en tickets (referencia)</p>
            <p className="text-2xl font-semibold text-gray-800 mt-2 tabular-nums">{eur(ticketFinalRef)}</p>
            <p className="text-xs text-gray-400 mt-2">
              Suma de <code className="text-[10px]">final_cost</code> en órdenes <strong>creadas</strong> en la ventana
              (excl. canceladas), con coste final cargado. No es el dinero cobrado en esos 30 días: los cobros se
              cuentan por fecha de pago en la tarjeta verde; además un ticket puede cobrarse fuera del mes en que se
              abrió o tener cobros mayores al coste final si hubo anticipos.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
