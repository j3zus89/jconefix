import type { SupabaseClient } from '@supabase/supabase-js';
import { getActiveOrganizationId } from '@/lib/dashboard-org';
import { fetchActiveOrgMemberUserIds, repairTicketsOrgScopeOr } from '@/lib/repair-tickets-org-scope';
import { toYmd, workshopReportRange, type WorkshopReportKind } from '@/lib/workshop-report-period';
import type { WorkshopReportPayload } from '@/lib/workshop-report-pdf';
import { repairCaseTerms } from '@/lib/locale';
import { isArgentinaCurrency } from '@/lib/currency-region';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  entrada: 'Entrada',
  presupuesto: 'Presupuesto',
  diagnostico: 'Diagnostico',
  pendiente_pedido: 'Esperando pedido',
  pendiente_pieza: 'Esperando pieza',
  en_proceso: 'En proceso',
  externa: 'Reparacion externa',
  reparado: 'Reparado',
  no_reparado: 'No reparado',
  in_progress: 'En progreso',
  completed: 'Completado',
  cancelled: 'Cancelado',
  no_repair: 'Sin reparar',
  draft: 'Borrador',
  repaired_collected: 'Reparado recogido',
};

function labelForStatus(s: string): string {
  const k = (s || '').toLowerCase();
  return STATUS_LABEL[k] || s || '—';
}

const REPAIRED = new Set(['reparado', 'repaired_collected', 'completed', 'rep_completed']);
const NOT_REPAIRED = new Set(['no_reparado', 'no_repair']);
const CANCELLED = new Set(['cancelled', 'cancelado', 'cancelled_collected']);

function bucket(
  s: string
): 'repaired' | 'not_repaired' | 'cancelled' | 'in_progress' {
  const x = (s || '').toLowerCase();
  if (REPAIRED.has(x)) return 'repaired';
  if (NOT_REPAIRED.has(x)) return 'not_repaired';
  if (CANCELLED.has(x)) return 'cancelled';
  return 'in_progress';
}

export async function buildWorkshopReportPayload(
  supabase: SupabaseClient,
  kind: WorkshopReportKind,
  shopName: string,
  currencySymbol: string
): Promise<WorkshopReportPayload> {
  const { from, to, label } = workshopReportRange(kind);
  const fromYmd = toYmd(from);
  const toYmdStr = toYmd(to);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No hay sesion activa.');

  const orgId = await getActiveOrganizationId(supabase);
  const memberIds = orgId ? await fetchActiveOrgMemberUserIds(supabase, orgId) : [user.id];

  const ticketSelect =
    'ticket_number, created_at, status, device_type, final_cost, estimated_cost, customers(name)';

  let tickets: Record<string, unknown>[] = [];
  let posRows: Record<string, unknown>[] = [];
  let expenses: Record<string, unknown>[] = [];

  if (orgId) {
    const ticketScopeOr = repairTicketsOrgScopeOr(orgId, memberIds);
    const [tRes, posRes] = await Promise.all([
      (supabase as any)
        .from('repair_tickets')
        .select(ticketSelect)
        .or(ticketScopeOr)
        .gte('created_at', from)
        .lte('created_at', to)
        .order('created_at', { ascending: false })
        .limit(800),
      (supabase as any)
        .from('pos_sales')
        .select('total, created_at')
        .eq('organization_id', orgId)
        .gte('created_at', from)
        .lte('created_at', to),
    ]);
    tickets = (tRes.data || []) as Record<string, unknown>[];
    posRows = (posRes.data || []) as Record<string, unknown>[];

    const expRes = await (supabase as any)
      .from('expenses')
      .select('title, amount, category, date, notes')
      .eq('organization_id', orgId)
      .gte('date', fromYmd)
      .lte('date', toYmdStr)
      .order('date', { ascending: false })
      .limit(500);
    if (!expRes.error) {
      expenses = (expRes.data || []) as Record<string, unknown>[];
    } else {
      const fallback = await supabase
        .from('expenses')
        .select('title, amount, category, date, notes')
        .eq('user_id', user.id)
        .gte('date', fromYmd)
        .lte('date', toYmdStr)
        .order('date', { ascending: false })
        .limit(500);
      expenses = (fallback.data || []) as Record<string, unknown>[];
    }
  } else {
    const [tRes, posRes, expRes] = await Promise.all([
      (supabase as any)
        .from('repair_tickets')
        .select(ticketSelect)
        .eq('user_id', user.id)
        .gte('created_at', from)
        .lte('created_at', to)
        .order('created_at', { ascending: false })
        .limit(800),
      (supabase as any)
        .from('pos_sales')
        .select('total, created_at')
        .eq('user_id', user.id)
        .gte('created_at', from)
        .lte('created_at', to),
      supabase
        .from('expenses')
        .select('title, amount, category, date, notes')
        .eq('user_id', user.id)
        .gte('date', fromYmd)
        .lte('date', toYmdStr)
        .order('date', { ascending: false })
        .limit(500),
    ]);
    tickets = (tRes.data || []) as Record<string, unknown>[];
    posRows = (posRes.data || []) as Record<string, unknown>[];
    expenses = (expRes.data || []) as Record<string, unknown>[];
  }

  let repaired = 0;
  let notRepaired = 0;
  let cancelled = 0;
  let inProgress = 0;
  let ticketRevenue = 0;

  for (const t of tickets) {
    const b = bucket(String(t.status || ''));
    if (b === 'repaired') {
      repaired++;
      ticketRevenue += Number(t.final_cost || t.estimated_cost || 0);
    } else if (b === 'not_repaired') notRepaired += 1;
    else if (b === 'cancelled') cancelled += 1;
    else inProgress += 1;
  }

  const posTotal = posRows.reduce((sum, r) => sum + Number(r.total || 0), 0);
  const expensesTotal = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const ticketRows = tickets.map((t) => {
    const cust = t.customers as { name?: string } | null | undefined;
    return {
      ticket_number: String(t.ticket_number ?? ''),
      created_at: String(t.created_at ?? ''),
      status: String(t.status || ''),
      statusLabel: labelForStatus(String(t.status || '')),
      device: String(t.device_type || '—'),
      customer: cust?.name ? String(cust.name) : '—',
      amount:
        t.final_cost != null
          ? Number(t.final_cost)
          : t.estimated_cost != null
            ? Number(t.estimated_cost)
            : null,
    };
  });

  const expenseRows = expenses.map((e) => ({
    date: String(e.date || ''),
    title: String(e.title || '—'),
    category: String(e.category || '—'),
    amount: Number(e.amount || 0),
    notes: e.notes ? String(e.notes) : undefined,
  }));

  const generatedAt = new Date().toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let isArgentinaReport = false;
  if (orgId) {
    const [{ data: orgRow }, { data: shopRow }] = await Promise.all([
      (supabase as any).from('organizations').select('currency').eq('id', orgId).maybeSingle(),
      (supabase as any).from('shop_settings').select('currency').eq('organization_id', orgId).maybeSingle(),
    ]);
    const cur = String(orgRow?.currency || shopRow?.currency || 'ARS').toUpperCase();
    isArgentinaReport = isArgentinaCurrency(cur);
  } else {
    const { data: shopRow } = await (supabase as any)
      .from('shop_settings')
      .select('currency')
      .eq('user_id', user.id)
      .maybeSingle();
    isArgentinaReport = isArgentinaCurrency(String(shopRow?.currency || 'ARS'));
  }

  const rc = repairCaseTerms(isArgentinaReport);
  const repairPdfLabels = {
    detailHeading: rc.pdfDetailHeading,
    tableColumn: rc.pdfTableColumn,
    truncateNote: rc.pdfTruncateNote,
  };

  return {
    shopName,
    periodLabel: label,
    reportKind: kind,
    currencySymbol,
    generatedAt,
    repairPdfLabels,
    summary: {
      ticketsEntered: tickets.length,
      repaired,
      notRepaired,
      cancelled,
      inProgress,
      ticketRevenue,
      posTotal,
      expensesTotal,
    },
    expenses: expenseRows,
    tickets: ticketRows,
  };
}
