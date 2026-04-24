/** Tipos compartidos entre `app/dashboard/page.tsx` y el resumen clásico del inicio. */

export type Stats = {
  totalTickets: number;
  pendingTickets: number;
  inProgressTickets: number;
  completedTickets: number;
  totalRevenue: number;
  ticketRevenue: number;
  posRevenue: number;
  totalCustomers: number;
  lowStockItems: number;
  discounts: number;
  netIncome: number;
  totalServices: number;
  paymentsReceived: number;
  cogs: number;
  creditCount: number;
  accountsReceivable: number;
};

export type RecentTicket = {
  id: string;
  ticket_number: string;
  device_type: string;
  status: string;
  final_cost: number | null;
  estimated_cost: number | null;
  created_at: string;
  updated_at: string;
  customers: { name: string } | null;
};

export type SalesChartPoint = { date: string; sales: number; cogs: number };
export type PaymentSlice = { name: string; value: number; color: string };
export type DailySaleRow = {
  fecha: string;
  venta: number;
  descuento: number;
  neto: number;
  margen: number;
  impuesto: number;
};

export type Period = 'HOY' | 'AYER' | 'LOS ÚLTIMOS 7 DÍAS' | 'ESTE MES' | 'ÚLTIMOS 30' | 'ESTE AÑO' | 'TODO';

export type OrgMember = { id: string; name: string };

export type DashboardHomeLocale = {
  format: (n: number) => string;
  symbol: string;
  isAR: boolean;
};
