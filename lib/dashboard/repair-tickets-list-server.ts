import type { TicketRepairsSettings } from '@/lib/ticket-repairs-settings';

/** Escapa comodines para filtros PostgREST `ilike`. */
export function escapeIlikeFragment(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/** Variantes de búsqueda para nº de ticket (p. ej. 022473 ↔ 22473 ↔ 0-22473). */
export function normalizeTicketSearchTerms(searchTerm: string): string[] {
  const raw = searchTerm.trim().toLowerCase();
  const terms = new Set<string>();
  if (raw) terms.add(raw);
  if (/^\d+$/.test(raw)) {
    if (raw.length >= 2) terms.add(`${raw[0]}-${raw.slice(1)}`);
    const stripped = raw.replace(/^0+/, '');
    // Evita añadir «1» para «0001»: ilike %1% coincide con modelos (p. ej. «15»).
    if (stripped.length >= 3) terms.add(stripped);
  }
  if (/^\d+-\d+$/.test(raw)) terms.add(raw.replace('-', ''));
  return Array.from(terms).filter(Boolean);
}

/**
 * Fragmentos PostgREST para `.or()` al buscar tickets.
 * Con menos de 3 caracteres solo `ticket_number`: `%1%` en modelo/equipo da falsos positivos.
 */
export function buildTicketSearchOrFragments(term: string): string[] {
  const t = term.trim();
  if (!t) return [];
  const s = escapeIlikeFragment(t);
  const parts = [`ticket_number.ilike.%${s}%`];
  if (t.length >= 3) {
    parts.push(
      `device_type.ilike.%${s}%`,
      `imei.ilike.%${s}%`,
      `serial_number.ilike.%${s}%`,
      `device_model.ilike.%${s}%`
    );
  }
  return parts;
}

export function applyTabAndStatusToTicketQuery(
  q: any,
  args: {
    activeFilter: string;
    statusFilter: string;
    hideClosedCancelled: boolean;
  }
) {
  let query = q;
  if (args.hideClosedCancelled) {
    query = query.not('status', 'eq', 'completed').not('status', 'eq', 'cancelled');
  }
  if (args.statusFilter !== 'all') {
    query = query.eq('status', args.statusFilter);
  }
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart.getTime() + 86_400_000);
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);

  switch (args.activeFilter) {
    case 'HOY':
      query = query
        .gte('created_at', todayStart.toISOString())
        .lt('created_at', tomorrowStart.toISOString());
      break;
    case 'AYER':
      query = query
        .gte('created_at', yesterdayStart.toISOString())
        .lt('created_at', todayStart.toISOString());
      break;
    case '7 DÍAS':
      query = query.gte('created_at', new Date(now.getTime() - 7 * 86_400_000).toISOString());
      break;
    case '14 DÍAS':
      query = query.gte('created_at', new Date(now.getTime() - 14 * 86_400_000).toISOString());
      break;
    case '30 DÍAS':
      query = query.gte('created_at', new Date(now.getTime() - 30 * 86_400_000).toISOString());
      break;
    case 'VENCIDOS':
      query = query
        .not('due_date', 'is', null)
        .lt('due_date', now.toISOString())
        .not('status', 'eq', 'completed')
        .not('status', 'eq', 'cancelled');
      break;
    case 'ACTIVOS':
      query = query.not('status', 'eq', 'completed').not('status', 'eq', 'cancelled');
      break;
    default:
      break;
  }
  return query;
}

export function applyTicketListSort(q: any, prefs: TicketRepairsSettings) {
  switch (prefs.tickets_default_sort) {
    case 'date_only': {
      const col = prefs.tickets_default_date_field === 'appointment' ? 'due_date' : 'created_at';
      return q.order(col, { ascending: false, nullsFirst: false });
    }
    case 'status_only':
      return q.order('status', { ascending: true });
    case 'due_date':
      return q.order('due_date', { ascending: true, nullsFirst: false });
    case 'date_status':
    default:
      return q.order('created_at', { ascending: false }).order('status', { ascending: true });
  }
}

export async function fetchCustomerIdsForTicketSearch(
  supabase: any,
  customerScopeOr: string,
  terms: string[]
): Promise<string[]> {
  if (!terms.length) return [];
  const ors: string[] = [];
  for (const t of terms) {
    if (!t || t.length < 3) continue;
    const s = escapeIlikeFragment(t);
    ors.push(`name.ilike.%${s}%`);
    ors.push(`email.ilike.%${s}%`);
    ors.push(`phone.ilike.%${s}%`);
  }
  if (!ors.length) return [];
  const { data, error } = await supabase
    .from('customers')
    .select('id')
    .or(customerScopeOr)
    .or(ors.join(','))
    .limit(500);
  if (error || !data) return [];
  return (data as { id: string }[]).map((r) => r.id);
}
