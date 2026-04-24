'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TrendingUp, Wrench, Users, Package, DollarSign, ChartBar as BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getActiveOrganizationId } from '@/lib/dashboard-org';
import {
  customersOrgScopeOr,
  fetchActiveOrgMemberUserIds,
  repairTicketsOrgScopeOr,
} from '@/lib/repair-tickets-org-scope';
import { useOrgLocale } from '@/lib/hooks/useOrgLocale';
import { reportsIncomePeriodIsoRange, type ReportsIncomePeriod } from '@/lib/dashboard-period-range';
import { parsePosSalesDashboardAggregates } from '@/lib/pos-sales-dashboard-aggregates';
import type { Database } from '@/lib/supabase/types';

type PosDashboardRpcArgs = Database['public']['Functions']['get_pos_sales_dashboard_aggregates']['Args'];
type RepairPaymentsSumRpcArgs = Database['public']['Functions']['get_dashboard_repair_payments_sum']['Args'];

type StatCard = {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  color: string;
};

const OPEN_STATUSES = [
  'en_proceso',
  'pending',
  'diagnostico',
  'entrada',
  'pendiente_pieza',
  'in_progress',
] as const;

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  en_proceso: { label: 'En proceso', color: 'bg-primary' },
  pending: { label: 'Pendiente', color: 'bg-primary' },
  diagnostico: { label: 'Diagnóstico', color: 'bg-primary' },
  entrada: { label: 'Entrada', color: 'bg-primary' },
  pendiente_pieza: { label: 'Pendiente pieza', color: 'bg-primary' },
  in_progress: { label: 'En progreso', color: 'bg-primary' },
};

export default function ReportsPage() {
  const loc = useOrgLocale();
  const formatEur = (n: number) => loc.format(n);
  const supabase = createClient();
  const [stats, setStats] = useState({
    totalTickets: 0,
    openTickets: 0,
    completedTickets: 0,
    totalCustomers: 0,
    inventoryItems: 0,
    periodRevenue: 0,
  });
  const [statusDistribution, setStatusDistribution] = useState<{ label: string; count: number; color: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const orgId = await getActiveOrganizationId(supabase);
      if (!orgId) {
        setLoading(false);
        return;
      }

      const memberIds = await fetchActiveOrgMemberUserIds(supabase, orgId);
      const ticketScopeOr = repairTicketsOrgScopeOr(orgId, memberIds);
      const customerScopeOr = customersOrgScopeOr(orgId, memberIds);

      const rangeKey: ReportsIncomePeriod =
        period === 'week' ? 'week' : period === 'year' ? 'year' : 'month';
      const { from, to } = reportsIncomePeriodIsoRange(rangeKey);

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

      const [
        { count: totalTickets },
        { count: openTickets },
        { count: completedTickets },
        { count: totalCustomers },
        { count: inventoryItems },
        { data: openRows },
        posAggRes,
        repairSumRes,
      ] = await Promise.all([
        (supabase as any).from('repair_tickets').select('*', { count: 'exact', head: true }).or(ticketScopeOr),
        (supabase as any)
          .from('repair_tickets')
          .select('*', { count: 'exact', head: true })
          .or(ticketScopeOr)
          .in('status', [...OPEN_STATUSES]),
        (supabase as any)
          .from('repair_tickets')
          .select('*', { count: 'exact', head: true })
          .or(ticketScopeOr)
          .in('status', ['reparado', 'repaired_collected', 'completed']),
        (supabase as any)
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .or(customerScopeOr),
        (supabase as any).from('inventory_items').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
        (supabase as any).from('repair_tickets').select('status').or(ticketScopeOr).in('status', [...OPEN_STATUSES]),
        supabase.rpc('get_pos_sales_dashboard_aggregates', posRpcArgs),
        supabase.rpc('get_dashboard_repair_payments_sum', repairSumArgs),
      ]);

      if (posAggRes.error) {
        console.error('[reports] get_pos_sales_dashboard_aggregates', posAggRes.error);
      }
      if (repairSumRes.error) {
        console.error('[reports] get_dashboard_repair_payments_sum', repairSumRes.error);
      }
      const posParsed =
        !posAggRes.error && posAggRes.data != null ? parsePosSalesDashboardAggregates(posAggRes.data) : null;
      const posSum = posParsed?.period.pos_total ?? 0;
      const ticketPeriod =
        !repairSumRes.error && repairSumRes.data != null ? Number(repairSumRes.data) : 0;
      const periodRevenue = posSum + ticketPeriod;

      const distMap = new Map<string, number>();
      for (const row of openRows || []) {
        const st = String((row as { status: string }).status);
        distMap.set(st, (distMap.get(st) || 0) + 1);
      }
      const slices = Array.from(distMap.entries())
        .map(([status, count]) => {
          const meta = STATUS_LABEL[status] || { label: status, color: 'bg-primary' };
          return { label: meta.label, count, color: meta.color };
        })
        .filter((s) => s.count > 0)
        .sort((a, b) => b.count - a.count);

      setStatusDistribution(slices);
      setStats({
        totalTickets: totalTickets || 0,
        openTickets: openTickets || 0,
        completedTickets: completedTickets || 0,
        totalCustomers: totalCustomers || 0,
        inventoryItems: inventoryItems || 0,
        periodRevenue,
      });
      setLoading(false);
    };
    void load();
  }, [period]);

  const statCards: StatCard[] = useMemo(() => {
    const revenueSub =
      period === 'week'
        ? 'Últimos 7 días (misma suma que Resumen: POS + cobros y señas)'
        : period === 'year'
          ? 'Año en curso (misma suma que Resumen)'
          : 'Mes en curso (misma suma que Resumen)';
    return [
      { label: 'Tickets totales', value: stats.totalTickets.toString(), sub: 'Todos los tiempos', icon: Wrench, color: 'bg-blue-500' },
      { label: 'Tickets abiertos', value: stats.openTickets.toString(), sub: 'Estados activos', icon: BarChart3, color: 'bg-amber-500' },
      { label: 'Tickets completados', value: stats.completedTickets.toString(), sub: 'Histórico', icon: TrendingUp, color: 'bg-green-500' },
      { label: 'Total clientes', value: stats.totalCustomers.toString(), sub: 'Registrados', icon: Users, color: 'bg-sky-500' },
      { label: 'Artículos en stock', value: stats.inventoryItems.toString(), sub: 'Líneas de inventario', icon: Package, color: 'bg-violet-500' },
      {
        label: period === 'week' ? 'Ingresos (7 días)' : period === 'year' ? 'Ingresos (año)' : 'Ingresos del mes',
        value: formatEur(stats.periodRevenue),
        sub: revenueSub,
        icon: DollarSign,
        color: 'bg-emerald-500',
      },
    ];
  }, [stats, period]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Informes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Resumen general del negocio</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {['week', 'month', 'year'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
              >
                {p === 'week' ? 'Semana' : p === 'month' ? 'Mes' : 'Año'}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 max-w-xs text-right">
            Ingresos = POS + cobros registrados en reparaciones y señas (misma lógica que el inicio / Resumen).
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {statCards.map(card => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', card.color)}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-sm font-medium text-gray-700 mt-0.5">{card.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-base font-bold text-gray-900 mb-4">Tickets abiertos por estado</h2>
              {stats.openTickets === 0 || statusDistribution.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Sin tickets activos</div>
              ) : (
                <div className="space-y-3">
                  {statusDistribution.map(s => (
                    <div key={s.label}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-700 font-medium">{s.label}</span>
                        <span className="text-gray-500">{s.count} tickets</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${stats.openTickets > 0 ? (s.count / stats.openTickets) * 100 : 0}%`, backgroundColor: s.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-base font-bold text-gray-900 mb-4">Tasa de finalización</h2>
              <div className="flex items-center justify-center py-4">
                <div className="relative w-32 h-32">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                    <circle
                      cx="60" cy="60" r="50" fill="none"
                      stroke="currentColor" strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 50}`}
                      strokeDashoffset={`${2 * Math.PI * 50 * (1 - (stats.totalTickets > 0 ? stats.completedTickets / stats.totalTickets : 0))}`}
                      className="transition-all duration-700"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-gray-900">
                      {stats.totalTickets > 0 ? Math.round((stats.completedTickets / stats.totalTickets) * 100) : 0}%
                    </span>
                    <span className="text-xs text-gray-400">completado</span>
                  </div>
                </div>
                <div className="ml-8 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <span className="text-xs text-gray-600">Completados: <strong>{stats.completedTickets}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-200" />
                    <span className="text-xs text-gray-600">Pendientes: <strong>{stats.openTickets}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-200" />
                    <span className="text-xs text-gray-600">Total: <strong>{stats.totalTickets}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
              <h2 className="text-base font-bold text-gray-900 mb-4">Más detalle</h2>
              <div className="text-center py-8 text-gray-400">
                <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">
                  Para desglose por ingresos y reparaciones usa los informes <strong>Ingresos</strong> y <strong>Reparaciones</strong> en el menú.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
