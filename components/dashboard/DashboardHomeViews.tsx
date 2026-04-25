'use client';

import Link from 'next/link';
import {
  Wrench,
  Users,
  Package,
  DollarSign,
  TrendingUp,
  ChevronRight,
  TriangleAlert as AlertTriangle,
  Download,
  Calendar,
  Store,
  UserCircle,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Wallet,
  Receipt,
  PiggyBank,
  FileText,
  BarChart3,
  Printer,
  MoreHorizontal,
  ClipboardSignature,
  RefreshCw,
  Landmark,
  LayoutList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkshopReportPdfMenu } from '@/components/dashboard/WorkshopReportPdfMenu';
import { DashboardOnboardingChecklist } from '@/components/dashboard/DashboardOnboardingChecklist';
import { ArgentinaUsdRatesStrip } from '@/components/dashboard/ArgentinaUsdRatesStrip';
import { getTicketStatusBadge } from '@/lib/ticket-status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type {
  DailySaleRow,
  OrgMember,
  PaymentSlice,
  Period,
  RecentTicket,
  SalesChartPoint,
  Stats,
  DashboardHomeLocale,
} from '@/lib/dashboard-home-view-types';

const KPICard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendUp,
  color = 'blue',
  subtitle,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
  trendUp?: boolean;
  color?: 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'teal';
  subtitle?: string;
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    teal: 'bg-primary/10 text-primary',
  };

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-medium uppercase tracking-wide text-gray-500">{title}</p>
            <p className="mt-0.5 text-lg font-bold text-gray-900">{value}</p>
            {subtitle && <p className="mt-0.5 text-[10px] text-gray-400">{subtitle}</p>}
            {trend && (
              <div
                className={cn(
                  'mt-1 flex items-center gap-1 text-[10px]',
                  trendUp ? 'text-green-600' : 'text-red-600',
                )}
              >
                {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                <span>{trend}</span>
              </div>
            )}
          </div>
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
              colorClasses[color],
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export type DashboardHomeViewProps = {
  organizationName: string;
  dateRange: string;
  activePeriod: Period;
  setActivePeriod: (p: Period) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
  loadData: (period?: Period, memberId?: string) => Promise<void>;
  selectedMemberId: string;
  setSelectedMemberId: (id: string) => void;
  members: OrgMember[];
  isAR: boolean;
  loc: DashboardHomeLocale;
  s: Stats;
  formatDate: (d: string) => string;
  salesChartData: SalesChartPoint[];
  paymentChartData: PaymentSlice[];
  dailySalesRows: DailySaleRow[];
  recentTickets: RecentTicket[];
  dailyTotals: { venta: number; descuento: number; neto: number; impuesto: number };
  dailyMargenPct: number;
  periodUiShort: (p: Period) => string;
};

function DashboardSharedBody({ props }: { props: DashboardHomeViewProps }) {
  const {
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
    loc,
    s,
    formatDate,
    salesChartData,
    paymentChartData,
    dailySalesRows,
    recentTickets,
    dailyTotals,
    dailyMargenPct,
    periodUiShort,
  } = props;

  const formatCurrency = (val: number) => loc.format(val);

  return (
    <>
      {/* Filters + ticker (AR: USD / clima en la misma barra) */}
      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-2 sm:p-3">
        <div
          className={cn(
            'flex flex-col gap-2',
            isAR && 'lg:flex-row lg:items-center lg:justify-between lg:gap-4'
          )}
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 lg:min-w-0 lg:shrink-0">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">Fecha</span>
              <span className="text-sm font-medium text-gray-900">{dateRange || '—'}</span>
            </div>
            <div className="h-6 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">{isAR ? 'Taller' : 'Tienda'}</span>
              <select className="cursor-pointer border-none bg-transparent text-sm font-medium text-gray-900 focus:outline-none">
                <option>{organizationName}</option>
              </select>
            </div>
            {!isAR || members.length > 1 ? (
              <>
                <div className="h-6 w-px bg-gray-200" />
                <div className="flex items-center gap-2">
                  <UserCircle className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{isAR ? 'Quién vendió / cargó' : 'Empleado'}</span>
                  <select
                    value={selectedMemberId}
                    onChange={(e) => {
                      setSelectedMemberId(e.target.value);
                      setLoading(true);
                    }}
                    className="cursor-pointer border-none bg-transparent text-sm font-medium text-gray-900 focus:outline-none"
                  >
                    <option value="">Todos</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : null}
          </div>
          {isAR ? (
            <div
              className={cn(
                'flex min-w-0 w-full justify-start border-t border-gray-100 pt-2',
                'lg:mt-0 lg:min-w-0 lg:flex-1 lg:max-w-none lg:justify-end lg:border-l lg:border-t-0 lg:border-gray-100 lg:pt-0 lg:pl-5'
              )}
            >
              <ArgentinaUsdRatesStrip variant="toolbar" />
            </div>
          ) : null}
        </div>
      </div>

      {/* Quick Period Buttons */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(
          [
            'HOY',
            'AYER',
            'LOS ÚLTIMOS 7 DÍAS',
            'ESTE MES',
            'ÚLTIMOS 30',
            'ESTE AÑO',
            'TODO',
          ] as Period[]
        ).map((period) => {
          const isActive = activePeriod === period;
          return (
            <Button
              key={period}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              disabled={loading}
              onClick={() => {
                if (activePeriod !== period) {
                  setActivePeriod(period);
                  setLoading(true);
                }
              }}
              className={cn(
                'h-7 px-3 py-1 text-xs transition-all',
                isActive && 'border-primary bg-primary text-primary-foreground hover:bg-primary/90',
              )}
            >
              {period}
            </Button>
          );
        })}
        {loading && <span className="animate-pulse text-xs text-gray-400">Cargando…</span>}
      </div>

      {/* KPI Cards */}
      {isAR ? (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <KPICard
            title="Ingreso del período"
            value={formatCurrency(s.totalRevenue)}
            icon={DollarSign}
            color="teal"
            subtitle={`Mostrador + reparaciones cobradas (${periodUiShort(activePeriod)})`}
          />
          <KPICard
            title="Mostrador / caja"
            value={formatCurrency(s.posRevenue)}
            icon={TrendingUp}
            color="blue"
            subtitle={`Ventas del punto de venta · ${periodUiShort(activePeriod)}`}
          />
          <KPICard
            title="Cobrado en reparaciones"
            value={formatCurrency(s.ticketRevenue)}
            icon={CreditCard}
            color="green"
            subtitle={`Pagos en caja + señas (órdenes creadas en ${periodUiShort(activePeriod)})`}
          />
          <KPICard
            title="Trabajos en el período"
            value={String(s.totalTickets)}
            icon={Wrench}
            color="amber"
            subtitle="Ingresos al taller según fechas arriba"
          />
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
          <KPICard
            title="Ingreso total"
            value={formatCurrency(s.totalRevenue)}
            icon={DollarSign}
            color="teal"
            subtitle={`Tickets completados + POS (${periodUiShort(activePeriod)})`}
          />
          <KPICard title="Descuentos" value={formatCurrency(s.discounts)} icon={Receipt} color="red" />
          <KPICard
            title="POS"
            value={formatCurrency(s.posRevenue)}
            icon={TrendingUp}
            color="blue"
            subtitle={periodUiShort(activePeriod)}
          />
          <KPICard
            title="Ganancia neta"
            value={formatCurrency(s.netIncome)}
            icon={PiggyBank}
            color="green"
            subtitle="Igual a ingreso hasta definir costes"
          />
          <KPICard title="Servicios completados" value={String(s.totalServices)} icon={Wrench} color="amber" />
          <KPICard
            title="Tickets cobrados"
            value={formatCurrency(s.ticketRevenue)}
            icon={CreditCard}
            color="green"
            subtitle={`Pagos + señas (órdenes creadas en ${periodUiShort(activePeriod)})`}
          />
          <KPICard title="Créditos" value={String(s.creditCount)} icon={FileText} color="purple" />
          <KPICard
            title="Cuentas por cobrar"
            value={formatCurrency(s.accountsReceivable)}
            icon={Wallet}
            color="red"
            subtitle="Próx.: facturas pendientes"
          />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  {isAR ? 'Ingresos diarios (POS + reparaciones)' : 'Sales vs. COGS'}
                </CardTitle>
                <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                  <Download className="h-3 w-3" />
                  {isAR ? 'Ver detalle' : 'Ver informe'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {salesChartData.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-4 text-center">
                    <BarChart3 className="mb-2 h-10 w-10 text-gray-300" />
                    <p className="text-sm font-medium text-gray-600">
                      {isAR
                        ? `Sin movimientos de caja en ${periodUiShort(activePeriod)}`
                        : `Sin ventas POS en ${periodUiShort(activePeriod)}`}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {isAR
                        ? 'Incluye ventas del mostrador (POS) y cobros de reparación del período. Solo datos de tu organización.'
                        : 'Los datos son solo de tu cuenta u organización. Al registrar ventas en el POS aparecerán aquí.'}
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesChartData}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                        {!isAR ? (
                          <linearGradient id="colorCogs" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                          </linearGradient>
                        ) : null}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        stroke="#9ca3af"
                        tickFormatter={(value) => `${loc.symbol}${value}`}
                      />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                        formatter={(value: number, name: string) => [loc.format(Number(value)), name]}
                      />
                      <Area
                        type="monotone"
                        dataKey="sales"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorSales)"
                        name={isAR ? 'Ingresos (POS + reparaciones)' : 'Sales (POS + repairs)'}
                      />
                      {!isAR ? (
                        <Area
                          type="monotone"
                          dataKey="cogs"
                          stroke="#ef4444"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorCogs)"
                          name="COGS"
                        />
                      ) : null}
                      {isAR ? <Legend wrapperStyle={{ fontSize: 12 }} /> : null}
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">
                    {isAR ? 'Detalle diario (POS + reparaciones)' : 'Ventas diarias (POS)'}
                  </CardTitle>
                  <p className="text-xs text-gray-500">{periodUiShort(activePeriod)} · según el período arriba</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 border-transparent bg-primary text-xs text-primary-foreground hover:bg-primary/90"
                >
                  {isAR ? 'Descargar' : 'Descargar informe'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {dailySalesRows.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-500">
                  {isAR
                    ? 'No hay ventas POS ni cobros de reparación en este período. Solo datos reales de tu organización.'
                    : 'No hay ventas POS en este periodo. El panel muestra solo datos reales de tu cuenta.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-200 bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Fecha</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Venta</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Descuento</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Neto</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Margen</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                          {isAR ? 'IVA / impuestos' : 'Impuesto'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {dailySalesRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm text-gray-900">{row.fecha}</td>
                          <td className="px-3 py-2 text-right text-sm text-gray-900">{loc.format(row.venta)}</td>
                          <td className="px-3 py-2 text-right text-sm text-gray-900">{loc.format(row.descuento)}</td>
                          <td className="px-3 py-2 text-right text-sm text-gray-900">{loc.format(row.neto)}</td>
                          <td className="px-3 py-2 text-right text-sm text-gray-900">{row.margen.toFixed(2)}%</td>
                          <td className="px-3 py-2 text-right text-sm text-gray-900">{loc.format(row.impuesto)}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-semibold">
                        <td className="px-3 py-2 text-sm text-gray-900">Total</td>
                        <td className="px-3 py-2 text-right text-sm text-gray-900">{loc.format(dailyTotals.venta)}</td>
                        <td className="px-3 py-2 text-right text-sm text-gray-900">
                          {loc.format(dailyTotals.descuento)}
                        </td>
                        <td className="px-3 py-2 text-right text-sm text-gray-900">{loc.format(dailyTotals.neto)}</td>
                        <td className="px-3 py-2 text-right text-sm text-gray-900">{dailyMargenPct.toFixed(2)}%</td>
                        <td className="px-3 py-2 text-right text-sm text-gray-900">{loc.format(dailyTotals.impuesto)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                {isAR ? 'Resumen de reparaciones' : 'Resumen de tickets'}
              </CardTitle>
              <p className="mt-0.5 text-xs font-normal text-gray-500">{periodUiShort(activePeriod)}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{isAR ? 'Total trabajos' : 'Total Tickets'}</span>
                  <span className="text-lg font-bold text-gray-900">{s.totalTickets}</span>
                </div>
                <div className="h-px bg-gray-100" />
                {[
                  { label: 'Pendientes', count: s.pendingTickets, color: 'bg-yellow-400' },
                  { label: 'En progreso', count: s.inProgressTickets, color: 'bg-blue-400' },
                  { label: 'Completados', count: s.completedTickets, color: 'bg-green-500' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-gray-600">{item.label}</span>
                      <span className="font-medium">{item.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={cn('h-full rounded-full', item.color)}
                        style={{ width: `${s.totalTickets ? (item.count / s.totalTickets) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {s.lowStockItems ? (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-orange-50 p-2 text-xs text-orange-600">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{s.lowStockItems} producto(s) con bajo stock</span>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">
                  {isAR ? 'Formas de pago (caja)' : 'Métodos de pago (POS)'}
                </CardTitle>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  {isAR ? 'Ver detalle' : 'Ver informe'}
                </Button>
              </div>
              <p className="text-xs text-gray-500">{periodUiShort(activePeriod)}</p>
            </CardHeader>
            <CardContent>
              {paymentChartData.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-4 text-center">
                  <p className="text-sm text-gray-600">
                    {isAR
                      ? `Sin cobros en caja en ${periodUiShort(activePeriod)}`
                      : `Sin cobros POS en ${periodUiShort(activePeriod)}`}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {isAR
                      ? 'Mostrador (POS) y cobros de reparación del período: efectivo, tarjeta, seña, etc.'
                      : 'POS sales plus repair ticket payments in this period.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {paymentChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => loc.format(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {paymentChartData.map((method) => (
                      <div key={method.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: method.color }} />
                          <span className="text-gray-600">{method.name}</span>
                        </div>
                        <p className="font-medium text-gray-900">{loc.format(method.value)}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Tickets */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                {isAR ? 'Últimos trabajos' : 'Tickets recientes'}
              </CardTitle>
              <p className="mt-0.5 text-xs text-gray-500">Los 5 últimos (no dependen del período del resumen)</p>
            </div>
            <Link
              href="/dashboard/tickets"
              className="flex shrink-0 items-center gap-0.5 text-xs text-primary hover:underline"
            >
              Ver todos <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recentTickets.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              <Wrench className="mx-auto mb-2 h-8 w-8 opacity-30" />
              <p className="text-sm">{isAR ? 'Todavía no hay trabajos cargados' : 'No hay tickets aún'}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentTickets.map((ticket) => {
                const sc = getTicketStatusBadge(ticket.status);
                return (
                  <Link key={ticket.id} href={`/dashboard/tickets/${ticket.id}`}>
                    <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-primary">{ticket.ticket_number}</span>
                          <span className="truncate text-sm text-gray-900">{ticket.device_type}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {ticket.customers?.name || (isAR ? 'Mostrador' : 'Walkin')}
                          </span>
                          <span className="text-gray-300">·</span>
                          <span className="text-xs text-gray-400">{formatDate(ticket.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-sm font-medium text-gray-900">
                          {loc.format(ticket.final_cost || ticket.estimated_cost || 0)}
                        </span>
                        <span className={cn('rounded border px-2 py-0.5 text-xs font-medium', sc.cls)}>{sc.label}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Link
          href="/dashboard/recepcion"
          className="block rounded-lg bg-gradient-to-br from-primary to-primary/80 p-4 text-primary-foreground shadow-md shadow-primary/10 transition-colors hover:from-primary/90 hover:to-primary/70"
        >
          <ClipboardSignature className="mb-2 h-6 w-6 opacity-90" />
          <div className="font-semibold">Nuevo ingreso</div>
          <div className="text-xs opacity-85">Cliente + equipo en un flujo</div>
        </Link>
        <Link
          href="/dashboard/tickets"
          className="block rounded-lg border border-gray-200 bg-white p-4 text-gray-900 transition-colors hover:bg-gray-50"
        >
          <Wrench className="mb-2 h-6 w-6 text-primary" />
          <div className="font-semibold">Gestionar tickets</div>
          <div className="text-xs text-gray-500">Ver y administrar reparaciones</div>
        </Link>
        <Link
          href="/dashboard/customers"
          className="rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50"
        >
          <Users className="mb-2 h-6 w-6 text-primary" />
          <div className="font-semibold text-gray-900">Clientes</div>
          <div className="text-xs text-gray-500">Base de datos de clientes</div>
        </Link>
        <Link
          href="/dashboard/inventory"
          className="rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50"
        >
          <Package className="mb-2 h-6 w-6 text-primary" />
          <div className="font-semibold text-gray-900">Inventario</div>
          <div className="text-xs text-gray-500">Control de piezas y stock</div>
        </Link>
        <Link
          href="/dashboard/pos"
          className="rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50"
        >
          <DollarSign className="mb-2 h-6 w-6 text-primary" />
          <div className="font-semibold text-gray-900">{isAR ? 'Caja / mostrador' : 'Punto de Venta'}</div>
          <div className="text-xs text-gray-500">{isAR ? 'Ventas y cobros en el local' : 'Ventas rápidas'}</div>
        </Link>
      </div>
    </>
  );
}

function ClassicHeaderBar(props: DashboardHomeViewProps) {
  const {
    organizationName,
    isAR,
    loc,
    loading,
    setLoading,
    loadData,
    activePeriod,
    selectedMemberId,
  } = props;

  return (
    <div className="mb-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{organizationName}</h1>
          <span className="text-gray-400">|</span>
          <h2 className="text-xl font-semibold text-gray-700">Resumen</h2>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link href="/dashboard/recepcion">
            <Button size="sm" className="gap-2 shadow-sm">
              <ClipboardSignature className="h-4 w-4" />
              Nuevo ingreso
            </Button>
          </Link>
          <WorkshopReportPdfMenu shopName={organizationName} currencySymbol={loc.symbol} />
          <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            {isAR ? 'Imprimir resumen' : 'Ejecutar informe'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0" aria-label="Más acciones del resumen">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={() => {
                  setLoading(true);
                  void loadData(activePeriod, selectedMemberId);
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Actualizar datos
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/invoices" className="flex cursor-pointer items-center">
                  <Receipt className="mr-2 h-4 w-4" />
                  {isAR ? 'Mis ventas' : 'Facturas emitidas'}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/finanzas" className="flex cursor-pointer items-center">
                  <Landmark className="mr-2 h-4 w-4" />
                  Finanzas y exportación
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/tickets" className="flex cursor-pointer items-center">
                  <LayoutList className="mr-2 h-4 w-4" />
                  Listado de tickets
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/customers" className="flex cursor-pointer items-center">
                  <Users className="mr-2 h-4 w-4" />
                  Clientes
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {isAR ? (
        <p className="mb-3 text-xs text-gray-500">
          Resumen operativo del período (caja y reparaciones). No sustituye liquidaciones ni obligaciones ante
          AFIP/ARCA.
        </p>
      ) : null}
    </div>
  );
}

export function DashboardHomeClassicView(props: DashboardHomeViewProps) {
  return (
    <div className="min-h-full bg-background p-6">
      <DashboardOnboardingChecklist />
      <ClassicHeaderBar {...props} />
      <DashboardSharedBody props={props} />
    </div>
  );
}
