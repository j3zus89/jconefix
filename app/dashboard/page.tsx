'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { displayOrgOrShopName } from '@/lib/display-name';
import { getActiveOrganizationId } from '@/lib/dashboard-org';
import { usePanelUiMode } from '@/components/dashboard/PanelUiModeContext';
import { DashboardSimpleHome } from '@/components/dashboard/DashboardSimpleHome';
import {
  DashboardHomeClassicView,
  type DashboardHomeViewProps,
} from '@/components/dashboard/DashboardHomeViews';
import { useOrgLocale } from '@/lib/hooks/useOrgLocale';
import {
  customersOrgScopeOr,
  fetchActiveOrgMemberUserIds,
  repairTicketsOrgScopeOr,
} from '@/lib/repair-tickets-org-scope';
import {
  mergePaymentMethodTotals,
  mergePosDailyWithRepairDaily,
  parsePosSalesDashboardAggregates,
  parseRepairDailyVentaJson,
  parseRepairPaymentsByMethodJson,
} from '@/lib/pos-sales-dashboard-aggregates';
import type { Database } from '@/lib/supabase/types';
import type {
  DailySaleRow,
  OrgMember,
  PaymentSlice,
  Period,
  RecentTicket,
  SalesChartPoint,
  Stats,
} from '@/lib/dashboard-home-view-types';

type PosDashboardRpcArgs = Database['public']['Functions']['get_pos_sales_dashboard_aggregates']['Args'];
type RepairPaymentsSumRpcArgs = Database['public']['Functions']['get_dashboard_repair_payments_sum']['Args'];
type RepairPaymentsByMethodRpcArgs = Database['public']['Functions']['get_dashboard_repair_payments_by_method']['Args'];
type RepairPaymentsDailyRpcArgs = Database['public']['Functions']['get_dashboard_repair_payments_daily']['Args'];

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  transferencia: 'Transferencia',
  bizum: 'Bizum',
  mercadopago: 'Mercado Pago',
  qr: 'QR / billetera',
  debit: 'Débito',
  credit: 'Crédito',
  other: 'Otro',
  deposit: 'Seña / anticipo',
};

/** Primer color = identidad del taller (variable CSS --primary). */
const CHART_COLORS = ['hsl(var(--primary))', '#3b82f6', '#8b5cf6', '#f59e0b', '#64748b', '#ec4899'];

const EMPTY_STATS: Stats = {
  totalTickets: 0,
  pendingTickets: 0,
  inProgressTickets: 0,
  completedTickets: 0,
  totalRevenue: 0,
  ticketRevenue: 0,
  posRevenue: 0,
  totalCustomers: 0,
  lowStockItems: 0,
  discounts: 0,
  netIncome: 0,
  totalServices: 0,
  paymentsReceived: 0,
  cogs: 0,
  creditCount: 0,
  accountsReceivable: 0,
};

/** Devuelve [desde, hasta] en ISO para el período dado. */
function periodRange(period: Period): { from: string; to: string; label: string } {
  const now = new Date();
  const pad = (d: Date) => d.toISOString();
  const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
  const endOfDay   = (d: Date) => { const x = new Date(d); x.setHours(23,59,59,999); return x; };
  const fmt = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

  if (period === 'HOY') {
    const s = startOfDay(now); const e = endOfDay(now);
    return { from: pad(s), to: pad(e), label: fmt(s) };
  }
  if (period === 'AYER') {
    const y = new Date(now); y.setDate(y.getDate() - 1);
    const s = startOfDay(y); const e = endOfDay(y);
    return { from: pad(s), to: pad(e), label: fmt(s) };
  }
  if (period === 'LOS ÚLTIMOS 7 DÍAS') {
    const s = startOfDay(new Date(now)); s.setDate(s.getDate() - 6);
    const e = endOfDay(now);
    return { from: pad(s), to: pad(e), label: `${fmt(s)} — ${fmt(e)}` };
  }
  if (period === 'ESTE MES') {
    const s = new Date(now.getFullYear(), now.getMonth(), 1);
    const e = endOfDay(now);
    return { from: pad(s), to: pad(e), label: `${fmt(s)} — ${fmt(e)}` };
  }
  if (period === 'ÚLTIMOS 30') {
    const s = startOfDay(new Date(now)); s.setDate(s.getDate() - 29);
    const e = endOfDay(now);
    return { from: pad(s), to: pad(e), label: `${fmt(s)} — ${fmt(e)}` };
  }
  if (period === 'ESTE AÑO') {
    const s = new Date(now.getFullYear(), 0, 1);
    const e = endOfDay(now);
    return { from: pad(s), to: pad(e), label: `${fmt(s)} — ${fmt(e)}` };
  }
  // TODO — sin filtro de fecha (todo el historial)
  return { from: new Date(2020, 0, 1).toISOString(), to: endOfDay(now).toISOString(), label: 'Todo el historial' };
}

/** Texto corto para subtítulos y mensajes vacíos (coherente con el botón de período). */
function periodUiShort(period: Period): string {
  const map: Record<Period, string> = {
    HOY: 'hoy',
    AYER: 'ayer',
    'LOS ÚLTIMOS 7 DÍAS': 'últimos 7 días',
    'ESTE MES': 'este mes',
    'ÚLTIMOS 30': 'últimos 30 días',
    'ESTE AÑO': 'este año',
    TODO: 'todo el historial',
  };
  return map[period];
}

const SIMPLE_PENDING_STATUSES = ['pending', 'entrada', 'presupuesto', 'diagnostico', 'draft'] as const;
const SIMPLE_PROGRESS_STATUSES = [
  'in_progress',
  'en_proceso',
  'pendiente_pedido',
  'pendiente_pieza',
  'externa',
] as const;
/** Lista PostgREST para `status.not.in.(...)` */
const CLOSED_STATUS_LIST = 'completed,reparado,no_reparado,cancelled,cancelado';

/** Alineado con informes de taller (`lib/build-workshop-report-payload.ts`): reparado/cerrado, no solo `completed`. */
const DASHBOARD_REPAIRED_PERIOD_STATUSES = [
  'reparado',
  'repaired_collected',
  'completed',
  'rep_completed',
  'delivered',
] as const;

export default function DashboardPage() {
  const loc = useOrgLocale();
  const { mode: panelMode, loading: panelModeLoading } = usePanelUiMode();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [salesChartData, setSalesChartData] = useState<SalesChartPoint[]>([]);
  const [paymentChartData, setPaymentChartData] = useState<PaymentSlice[]>([]);
  const [dailySalesRows, setDailySalesRows] = useState<DailySaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('');
  const [activePeriod, setActivePeriod] = useState<Period>('HOY');
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  // Clave global eliminada — se usa clave org-específica tras resolver orgId
  const [organizationName, setOrganizationName] = useState('Mi Taller');
  /** Conteos de tickets abiertos (sin filtro de período) para el inicio en modo panel sencillo. */
  const [simpleTicketKpis, setSimpleTicketKpis] = useState({
    pending: 0,
    inProgress: 0,
    totalActive: 0,
  });
  const supabase = createClient();

  useEffect(() => {
    loadData(activePeriod, selectedMemberId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePeriod, selectedMemberId]);

  // Refrescar el nombre del negocio cuando se guarda desde Ajustes
  useEffect(() => {
    const handleNameChange = (e: Event) => {
      const name = (e as CustomEvent<{ name?: string }>).detail?.name;
      if (name?.trim()) {
        setOrganizationName(displayOrgOrShopName(name));
      }
      // El nombre en event.detail siempre viene porque broadcastNameChange lo incluye.
      // No hay fallback a profiles — es cross-org.
    };
    window.addEventListener('org-name-changed', handleNameChange);
    return () => window.removeEventListener('org-name-changed', handleNameChange);
  }, []);

  const loadData = async (period: Period = activePeriod, memberId: string = selectedMemberId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { from, to, label } = periodRange(period);
      setDateRange(label);

      const orgId = await getActiveOrganizationId(supabase);

      if (orgId) {
        try {
          const cached = localStorage.getItem(`jcof_shop_name_${orgId}`);
          if (cached) setOrganizationName(displayOrgOrShopName(cached));
        } catch { /* ignore */ }

        const { data: memberData } = await supabase
          .from('organization_members')
          .select('organization_id, organizations!inner(name)')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .eq('organization_id', orgId)
          .maybeSingle();

        if (memberData?.organizations) {
          const org = memberData.organizations as { name?: string };
          const name = displayOrgOrShopName(org.name);
          setOrganizationName(name);
          try { localStorage.setItem(`jcof_shop_name_${orgId}`, name); } catch { /* ignore */ }
        }
      } else {
        try {
          const cached = localStorage.getItem('jcof_shop_name_solo');
          if (cached) setOrganizationName(displayOrgOrShopName(cached));
        } catch { /* ignore */ }
        const { data: shopSolo } = await (supabase as any)
          .from('shop_settings')
          .select('shop_name')
          .eq('user_id', user.id)
          .maybeSingle();
        if (shopSolo?.shop_name?.trim()) {
          const name = displayOrgOrShopName(shopSolo.shop_name);
          setOrganizationName(name);
          try { localStorage.setItem('jcof_shop_name_solo', name); } catch { /* ignore */ }
        }
      }

      const memberIds = orgId ? await fetchActiveOrgMemberUserIds(supabase, orgId) : [user.id];

      if (orgId && members.length === 0) {
        const { data: profRows } = await (supabase as any)
          .from('profiles')
          .select('id, full_name, first_name, last_name')
          .in('id', memberIds);
        const memberList: OrgMember[] = (profRows || []).map((p: any) => {
          const fn = (p.first_name || '').trim();
          const ln = (p.last_name || '').trim();
          const name = [fn, ln].filter(Boolean).join(' ') || p.full_name || p.id;
          return { id: p.id, name };
        });
        setMembers(memberList);
      }

      const scopeMemberIds = memberId ? [memberId] : memberIds;
      const ticketUserId = memberId || user.id;
      const isOrg = !!orgId;
      const recentSelect =
        'id, ticket_number, device_type, status, final_cost, estimated_cost, created_at, updated_at, customers(name)';

      const applyRepairScopePeriod = (q: any) => {
        if (isOrg) return q.or(repairTicketsOrgScopeOr(orgId!, scopeMemberIds)).gte('created_at', from).lte('created_at', to);
        return q.eq('user_id', ticketUserId).gte('created_at', from).lte('created_at', to);
      };

      const applyRepairScopeAllTime = (q: any) => {
        if (isOrg) return q.or(repairTicketsOrgScopeOr(orgId!, memberIds));
        return q.eq('user_id', user.id);
      };

      let lowStockQ = (supabase as any)
        .from('inventory_items')
        .select('*', { count: 'exact', head: true })
        .eq('is_low_stock', true);
      lowStockQ = isOrg ? lowStockQ.eq('organization_id', orgId) : lowStockQ.eq('user_id', user.id);

      let customersCountQ = (supabase as any).from('customers').select('*', { count: 'exact', head: true });
      customersCountQ = isOrg
        ? customersCountQ.or(customersOrgScopeOr(orgId!, memberIds))
        : customersCountQ.eq('user_id', user.id);

      const countTicketsPeriod = (extra?: (q: any) => any) => {
        let q = (supabase as any).from('repair_tickets').select('*', { count: 'exact', head: true });
        q = applyRepairScopePeriod(q);
        if (extra) q = extra(q);
        return q;
      };

      const [
        posAggRes,
        cCountRes,
        lowStockRes,
        rRecent,
        cntTotal,
        cntPending,
        cntProg,
        cntDone,
        repairSumRes,
        repairByMethodRes,
        repairDailyRes,
        simpleActive,
        simplePend,
        simpleProg,
      ] = await Promise.all([
        (() => {
          // La función SQL acepta p_organization_id NULL (modo sin org); los tipos generados suelen marcarlo como string.
          const posRpcArgs = {
            p_organization_id: isOrg && orgId ? orgId : null,
            p_from: from,
            p_to: to,
            ...(memberId ? { p_filter_user_id: memberId } : {}),
          } as PosDashboardRpcArgs;
          return supabase.rpc('get_pos_sales_dashboard_aggregates', posRpcArgs);
        })(),
        customersCountQ,
        lowStockQ,
        (() => {
          let rq = (supabase as any).from('repair_tickets').select(recentSelect);
          rq = isOrg
            ? rq.or(repairTicketsOrgScopeOr(orgId!, scopeMemberIds))
            : rq.eq('user_id', ticketUserId);
          return rq.order('created_at', { ascending: false }).limit(5);
        })(),
        countTicketsPeriod(),
        countTicketsPeriod((q: any) => q.eq('status', 'pending')),
        countTicketsPeriod((q: any) => q.eq('status', 'in_progress')),
        countTicketsPeriod((q: any) => q.in('status', [...DASHBOARD_REPAIRED_PERIOD_STATUSES])),
        (() => {
          const repairSumArgs = {
            p_organization_id: isOrg && orgId ? orgId : null,
            p_from: from,
            p_to: to,
            ...(memberId ? { p_filter_user_id: memberId } : {}),
          } as RepairPaymentsSumRpcArgs;
          return supabase.rpc('get_dashboard_repair_payments_sum', repairSumArgs);
        })(),
        (() => {
          const args = {
            p_organization_id: isOrg && orgId ? orgId : null,
            p_from: from,
            p_to: to,
            ...(memberId ? { p_filter_user_id: memberId } : {}),
          } as RepairPaymentsByMethodRpcArgs;
          return supabase.rpc('get_dashboard_repair_payments_by_method', args);
        })(),
        (() => {
          const args = {
            p_organization_id: isOrg && orgId ? orgId : null,
            p_from: from,
            p_to: to,
            ...(memberId ? { p_filter_user_id: memberId } : {}),
          } as RepairPaymentsDailyRpcArgs;
          return supabase.rpc('get_dashboard_repair_payments_daily', args);
        })(),
        (() => {
          let q = (supabase as any).from('repair_tickets').select('*', { count: 'exact', head: true });
          q = applyRepairScopeAllTime(q);
          return q.or(`status.is.null,status.not.in.(${CLOSED_STATUS_LIST})`);
        })(),
        (() => {
          let q = (supabase as any).from('repair_tickets').select('*', { count: 'exact', head: true });
          q = applyRepairScopeAllTime(q);
          return q.in('status', [...SIMPLE_PENDING_STATUSES]);
        })(),
        (() => {
          let q = (supabase as any).from('repair_tickets').select('*', { count: 'exact', head: true });
          q = applyRepairScopeAllTime(q);
          return q.in('status', [...SIMPLE_PROGRESS_STATUSES]);
        })(),
      ]);

      const recentRows = rRecent.data || [];

      if (posAggRes.error) {
        console.error('get_pos_sales_dashboard_aggregates', posAggRes.error);
      }
      const posParsed =
        !posAggRes.error && posAggRes.data != null
          ? parsePosSalesDashboardAggregates(posAggRes.data)
          : null;

      let lowStockItems = lowStockRes.count ?? 0;
      if (lowStockRes.error && /is_low_stock|schema cache|column/i.test(String(lowStockRes.error.message || ''))) {
        lowStockItems = 0;
      }

      const totalTickets = cntTotal.count ?? 0;
      const pendingTickets = cntPending.count ?? 0;
      const inProgressTickets = cntProg.count ?? 0;
      const completedTickets = cntDone.count ?? 0;

      let ticketRev = 0;
      if (!repairSumRes.error && repairSumRes.data != null) {
        ticketRev = Number(repairSumRes.data);
      }
      if (repairSumRes.error) {
        console.error('get_dashboard_repair_payments_sum', repairSumRes.error);
      }
      if (repairByMethodRes.error) {
        console.error('get_dashboard_repair_payments_by_method', repairByMethodRes.error);
      }
      if (repairDailyRes.error) {
        console.error('get_dashboard_repair_payments_daily', repairDailyRes.error);
      }

      const posTotal = posParsed?.period.pos_total ?? 0;

      const repairDailyRows = !repairDailyRes.error
        ? parseRepairDailyVentaJson(repairDailyRes.data)
        : [];
      const mergedDaily = mergePosDailyWithRepairDaily(posParsed?.daily ?? [], repairDailyRows);

      const chartPoints: SalesChartPoint[] = mergedDaily
        .slice()
        .sort((a, b) => a.sale_day.localeCompare(b.sale_day))
        .map((d) => ({
          date: new Date(d.sale_day + 'T12:00:00').toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
          }),
          sales: d.venta,
          cogs: 0,
        }));
      setSalesChartData(chartPoints);

      const repairPayRows = !repairByMethodRes.error
        ? parseRepairPaymentsByMethodJson(repairByMethodRes.data)
        : [];
      const mergedByMethod = mergePaymentMethodTotals(posParsed?.by_payment ?? [], repairPayRows);
      const paySlices: PaymentSlice[] = mergedByMethod.map((row, i) => ({
        name:
          PAYMENT_METHOD_LABEL[row.payment_method] ||
          (row.payment_method
            ? row.payment_method.charAt(0).toUpperCase() + row.payment_method.slice(1)
            : 'Otro'),
        value: row.total_amount,
        color: CHART_COLORS[i % CHART_COLORS.length],
      }));
      setPaymentChartData(paySlices);

      const dailyRows: DailySaleRow[] = mergedDaily
        .slice()
        .sort((a, b) => b.sale_day.localeCompare(a.sale_day))
        .map((d) => ({
          fecha: new Date(d.sale_day + 'T12:00:00').toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }),
          venta: d.venta,
          descuento: d.descuento,
          neto: d.neto,
          margen: d.venta > 0 ? (d.neto / d.venta) * 100 : 0,
          impuesto: d.impuesto,
        }));
      setDailySalesRows(dailyRows);

      const totalRevenue = ticketRev + posTotal;

      setStats({
        totalTickets,
        pendingTickets,
        inProgressTickets,
        completedTickets,
        totalRevenue,
        ticketRevenue: ticketRev,
        posRevenue: posTotal,
        totalCustomers: cCountRes.count ?? 0,
        lowStockItems,
        discounts: 0,
        netIncome: totalRevenue,
        totalServices: completedTickets,
        paymentsReceived: totalRevenue,
        cogs: 0,
        creditCount: 0,
        accountsReceivable: 0,
      });
      setRecentTickets(recentRows);

      setSimpleTicketKpis({
        pending: simplePend.count ?? 0,
        inProgress: simpleProg.count ?? 0,
        totalActive: simpleActive.count ?? 0,
      });
    } catch (e) {
      console.error(e);
      setStats(EMPTY_STATS);
      setRecentTickets([]);
      setSalesChartData([]);
      setPaymentChartData([]);
      setDailySalesRows([]);
      setSimpleTicketKpis({ pending: 0, inProgress: 0, totalActive: 0 });
    } finally {
      setLoading(false);
    }
  };

  if (loading || panelModeLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (panelMode === 'simple') {
    return (
      <DashboardSimpleHome
        organizationName={organizationName}
        currencySymbol={loc.symbol}
        pendingTickets={simpleTicketKpis.pending}
        inProgressTickets={simpleTicketKpis.inProgress}
        totalTickets={simpleTicketKpis.totalActive}
        recentTickets={recentTickets}
        formatDate={(d) =>
          new Date(d).toLocaleDateString('es-ES', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        }
        formatCurrency={(val) => loc.format(val)}
      />
    );
  }

  const s = stats ?? EMPTY_STATS;
  const isAR = loc.isAR;
  const formatDate = (d: string) => new Date(d).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' });

  const dailyTotals = dailySalesRows.reduce(
    (acc, row) => ({
      venta: acc.venta + row.venta,
      descuento: acc.descuento + row.descuento,
      neto: acc.neto + row.neto,
      impuesto: acc.impuesto + row.impuesto,
    }),
    { venta: 0, descuento: 0, neto: 0, impuesto: 0 }
  );
  const dailyMargenPct = dailyTotals.venta > 0 ? (dailyTotals.neto / dailyTotals.venta) * 100 : 0;
  const viewProps: DashboardHomeViewProps = {
    organizationName,
    dateRange,
    activePeriod,
    setActivePeriod,
    loading,
    setLoading,
    loadData,
    selectedMemberId,
    setSelectedMemberId,
    members,
    isAR,
    loc: { format: (n: number) => loc.format(n), symbol: loc.symbol, isAR: loc.isAR },
    s,
    formatDate,
    salesChartData,
    paymentChartData,
    dailySalesRows,
    recentTickets,
    dailyTotals,
    dailyMargenPct,
    periodUiShort,
  };

  return <DashboardHomeClassicView {...viewProps} />;
}
