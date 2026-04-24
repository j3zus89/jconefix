'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DiagnosticNotesWithAi } from '@/components/dashboard/DiagnosticNotesWithAi';
import {
  Plus,
  Pencil,
  Trash2,
  Loader as Loader2,
  Search,
  Filter,
  Calendar,
  AlignLeft,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pin,
  Settings2,
} from 'lucide-react';
import { buildXlsx, downloadXlsx } from '@/lib/excel-export';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getActiveOrganizationId } from '@/lib/dashboard-org';
import {
  customersOrgScopeOr,
  fetchActiveOrgMemberUserIds,
  repairTicketsOrgScopeOr,
} from '@/lib/repair-tickets-org-scope';
import { formatAssignedToLabel, loadTechnicianIdToNameMap } from '@/lib/panel-notifications';
import { reserveNextBoletoTicketNumber } from '@/lib/boleto-ticket-number';
import { useOrgLocale } from '@/lib/hooks/useOrgLocale';
import { WhatsAppQuickSendModal } from '@/components/whatsapp/WhatsAppQuickSendModal';
import { WhatsAppQuickIconButton } from '@/components/whatsapp/WhatsAppQuickIconButton';
import {
  composeAccessCredentials,
  parseStoredAccessCredentials,
} from '@/lib/ticket-access-credentials';
import { DeviceUnlockInputs } from '@/components/dashboard/DeviceUnlockInputs';
import { formatImeiInput, imeiFieldError, normalizeImeiForDb } from '@/lib/imei-input';
import { parseTicketRepairsSettings } from '@/lib/ticket-repairs-settings';
import { fetchTicketRepairsSettingsForOrg } from '@/lib/fetch-ticket-repairs-settings-org';
import { formatEquipoBrandInchesModelLine } from '@/lib/device-screen-display';
import {
  applyTabAndStatusToTicketQuery,
  applyTicketListSort,
  buildTicketSearchOrFragments,
  fetchCustomerIdsForTicketSearch,
  normalizeTicketSearchTerms,
} from '@/lib/dashboard/repair-tickets-list-server';

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

type Ticket = {
  id: string;
  ticket_number: string;
  customer_id: string;
  device_type: string;
  device_model: string | null;
  device_brand: string | null;
  device_category: string | null;
  device_screen_inches: string | null;
  serial_number: string | null;
  imei: string | null;
  issue_description: string;
  status: string;
  priority: string;
  estimated_cost: number | null;
  final_cost: number | null;
  notes: string | null;
  diagnostic_notes?: string | null;
  warranty_info?: string | null;
  task_type: string | null;
  assigned_to: string | null;
  due_date: string | null;
  is_urgent: boolean;
  is_draft: boolean;
  created_at: string;
  updated_at: string;
  pin_pattern?: string | null;
  customers: { name: string; email: string | null; phone: string | null };
};

/** Fila mínima para el calendario (carga aparte por mes). */
type TicketCalendarRow = {
  id: string;
  due_date: string;
  ticket_number: string;
  status: string;
  device_type: string;
  customers: { name: string } | null;
};

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-500' },
  { value: 'in_progress', label: 'En progreso', color: 'bg-repairdesk-500' },
  { value: 'completed', label: 'Reparado', color: 'bg-green-500' },
  { value: 'cancelled', label: 'Cancelado', color: 'bg-red-500' },
  { value: 'no_repair', label: 'No Reparado', color: 'bg-gray-500' },
  { value: 'draft', label: 'Draft', color: 'bg-slate-400' },
  { value: 'diagnostic', label: 'Diagnóstico', color: 'bg-orange-500' },
];

const FILTER_TABS = ['TODO', 'HOY', 'AYER', '7 DÍAS', '14 DÍAS', '30 DÍAS', 'ACTIVOS', 'VENCIDOS'];

/** Grupos de fecha, en el orden en que deben aparecer de arriba a abajo. */
const DATE_GROUP_ORDER = ['HOY', 'AYER', '7 DÍAS', '14 DÍAS', '30 DÍAS', 'ACTIVOS', 'VENCIDOS'] as const;
type DateGroup = typeof DATE_GROUP_ORDER[number];

/** Clasifica un ticket en su grupo de fecha (para la vista TODO agrupada). */
function getTicketDateGroup(ticket: Ticket): DateGroup {
  const now = new Date();
  // Inicio del día local (medianoche de hoy)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);

  const created = new Date(ticket.created_at);

  if (created >= todayStart) return 'HOY';
  if (created >= yesterdayStart) return 'AYER';

  const diffDays = (now.getTime() - created.getTime()) / 86_400_000;
  if (diffDays <= 7) return '7 DÍAS';
  if (diffDays <= 14) return '14 DÍAS';
  if (diffDays <= 30) return '30 DÍAS';

  // VENCIDOS: fecha de entrega pasada y no finalizado
  if (
    ticket.due_date &&
    new Date(ticket.due_date) < now &&
    ticket.status !== 'completed' &&
    ticket.status !== 'cancelled'
  ) return 'VENCIDOS';

  return 'ACTIVOS';
}

export default function TicketsPage() {
  const loc = useOrgLocale();
  const sym = loc.symbol;
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsTotalCount, setTicketsTotalCount] = useState(0);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [listScopeReady, setListScopeReady] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [calendarTickets, setCalendarTickets] = useState<TicketCalendarRow[]>([]);
  const listContextRef = useRef<{
    orgId: string;
    ticketScopeOr: string;
    customerScopeOr: string;
    memberIds: string[];
  } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') || '');
  const [saving, setSaving] = useState(false);

  // Sincronizar con ?q= cuando viene del buscador global
  // Si llega un ?q= también quitamos el filtro de fecha para que no oculte resultados
  const [activeFilter, setActiveFilter] = useState('TODO');
  useEffect(() => {
    const q = searchParams.get('q') || '';
    if (q) {
      setSearchTerm(q);
      setActiveFilter('TODO');
    }
  }, [searchParams]);
  const [listPage, setListPage] = useState(1);
  const [ticketRepairsPrefs, setTicketRepairsPrefs] = useState(() =>
    parseTicketRepairsSettings(undefined)
  );
  const [techIdToName, setTechIdToName] = useState<Map<string, string>>(new Map());
  const submitGuardRef = useRef(false);
  /** Filtro extra por estado (el menú «Filtros»). */
  const [statusFilter, setStatusFilter] = useState<string>('all');
  /** Vista tabla completa vs compacta («Descripción general»). */
  const [listLayout, setListLayout] = useState<'full' | 'compact'>('full');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [calendarPickDay, setCalendarPickDay] = useState<string | null>(null);

  const [waModal, setWaModal] = useState<{
    name: string;
    phone: string | null;
    defaultMessage?: string;
    deviceCategory: string | null;
    deviceType: string;
    deviceBrand: string | null;
    deviceModel: string | null;
  } | null>(null);
  /** Selección para exportar CSV (todos los filtrados, no solo la página actual). */
  const [selectedTicketIds, setSelectedTicketIds] = useState<Set<string>>(new Set());
  /** Ref para la casilla de "seleccionar todo" del encabezado: permite poner `indeterminate` vía JS. */
  const headerCheckRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  const [formData, setFormData] = useState({
    customer_id: '',
    device_type: '',
    device_model: '',
    device_brand: '',
    device_category: '',
    device_screen_inches: '',
    serial_number: '',
    imei: '',
    issue_description: '',
    status: 'pending',
    priority: 'medium',
    task_type: 'TIENDA',
    estimated_cost: '',
    final_cost: '',
    notes: '',
    diagnostic_notes: '',
    device_pin: '',
    unlock_pattern: '',
    warranty_info: '',
  });

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearchTerm(searchTerm), 400);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

  /** Variantes de búsqueda memoizadas (misma semántica que antes; la consulta usa `debouncedSearchTerm`). */
  const normalizedSearchTerms = useMemo(
    () => normalizeTicketSearchTerms(debouncedSearchTerm),
    [debouncedSearchTerm]
  );

  /** Carga scope org, clientes para el formulario y preferencias (una vez por montaje). */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const orgId = await getActiveOrganizationId(supabase);
        if (!orgId) {
          toast.error('No hay organización activa para tu usuario.');
          setTickets([]);
          setTicketsTotalCount(0);
          setCustomers([]);
          listContextRef.current = null;
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        const memberIds = await fetchActiveOrgMemberUserIds(supabase, orgId);
        const ticketScopeOr = repairTicketsOrgScopeOr(orgId, memberIds);
        const customerScopeOr = customersOrgScopeOr(orgId, memberIds);
        listContextRef.current = { orgId, ticketScopeOr, customerScopeOr, memberIds };

        const customersRes = await (supabase as any)
          .from('customers')
          .select('id, name, email, phone')
          .or(customerScopeOr)
          .order('name')
          .limit(10000);

        if (cancelled) return;
        setCustomers(customersRes.data || []);

        if (user) {
          const tr = await fetchTicketRepairsSettingsForOrg(supabase, orgId);
          if (cancelled) return;
          setTicketRepairsPrefs(tr);
          const hasSearchQuery = !!new URLSearchParams(window.location.search).get('q');
          if (!hasSearchQuery) {
            if (tr.tickets_list_initial_filter === 'today') setActiveFilter('HOY');
            else if (tr.tickets_list_initial_filter === 'overdue') setActiveFilter('VENCIDOS');
            else if (tr.tickets_list_initial_filter === 'all_active') setActiveFilter('ACTIVOS');
            else setActiveFilter('TODO');
          }
        } else {
          setTechIdToName(new Map());
        }

        if (!cancelled) setListScopeReady(true);
      } catch {
        if (!cancelled) toast.error('Error al cargar datos');
      } finally {
        if (!cancelled && !listContextRef.current) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  /** Evita un fetch con `listPage` obsoleto cuando cambian filtros y se fuerza la página 1. */
  const skipListPageFetchRef = useRef(false);

  const listFilterKey = useMemo(
    () =>
      [
        debouncedSearchTerm,
        activeFilter,
        statusFilter,
        ticketRepairsPrefs.tickets_per_page,
        ticketRepairsPrefs.show_closed_cancelled_in_list,
        ticketRepairsPrefs.tickets_default_sort,
        ticketRepairsPrefs.tickets_default_date_field,
      ].join('\u0001'),
    [
      debouncedSearchTerm,
      activeFilter,
      statusFilter,
      ticketRepairsPrefs.tickets_per_page,
      ticketRepairsPrefs.show_closed_cancelled_in_list,
      ticketRepairsPrefs.tickets_default_sort,
      ticketRepairsPrefs.tickets_default_date_field,
    ]
  );

  const fetchTicketsPage = useCallback(
    async (pageOverride?: number) => {
      const ctx = listContextRef.current;
      if (!ctx) return;
      const { orgId, ticketScopeOr, customerScopeOr } = ctx;

      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const terms = normalizeTicketSearchTerms(debouncedSearchTerm);
        let customerIds: string[] = [];
        if (terms.length) {
          customerIds = await fetchCustomerIdsForTicketSearch(supabase, customerScopeOr, terms);
        }

        let q = (supabase as any)
          .from('repair_tickets')
          .select('*, customers(name, email, phone)', { count: 'exact' })
          .or(ticketScopeOr);

        q = applyTabAndStatusToTicketQuery(q, {
          activeFilter,
          statusFilter,
          hideClosedCancelled: ticketRepairsPrefs.show_closed_cancelled_in_list,
        });

        if (terms.length) {
          const orParts: string[] = [];
          for (const t of terms) {
            orParts.push(...buildTicketSearchOrFragments(t));
          }
          if (customerIds.length) {
            orParts.push(`customer_id.in.(${customerIds.join(',')})`);
          }
          q = q.or(orParts.join(','));
        }

        q = applyTicketListSort(q, ticketRepairsPrefs);

        const pageSize = ticketRepairsPrefs.tickets_per_page;
        const page = Math.max(1, pageOverride ?? listPage);
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data: ticketsData, error, count } = await q.range(from, to);
        if (error) throw error;

        const rows = (ticketsData || []) as Ticket[];
        setTickets(rows);
        setTicketsTotalCount(typeof count === 'number' ? count : rows.length);

        if (user) {
          const techMap = await loadTechnicianIdToNameMap(supabase, {
            organizationId: orgId,
            currentUserId: user.id,
            ensureIds: rows.map((t) => t.assigned_to),
          });
          setTechIdToName((prev) => {
            const merged = new Map(prev);
            techMap.forEach((v, k) => merged.set(k, v));
            return merged;
          });
        }
      } catch {
        toast.error('Error al cargar tickets');
        setTickets([]);
        setTicketsTotalCount(0);
      } finally {
        setLoading(false);
      }
    },
    [
      supabase,
      debouncedSearchTerm,
      activeFilter,
      statusFilter,
      ticketRepairsPrefs,
      listPage,
    ]
  );

  const fetchTicketsPageRef = useRef(fetchTicketsPage);
  fetchTicketsPageRef.current = fetchTicketsPage;

  useEffect(() => {
    if (!listScopeReady) return;
    setListPage(1);
    skipListPageFetchRef.current = true;
    void fetchTicketsPageRef.current(1);
  }, [listScopeReady, listFilterKey]);

  useEffect(() => {
    if (!listScopeReady) return;
    if (skipListPageFetchRef.current) {
      skipListPageFetchRef.current = false;
      return;
    }
    void fetchTicketsPageRef.current();
  }, [listScopeReady, listPage]);

  /** Calendario: tickets con entrega en el mes visible y mismos filtros que el listado (sin paginación). */
  useEffect(() => {
    if (!calendarOpen || !listContextRef.current) return;
    const ctx = listContextRef.current;
    let cancelled = false;
    (async () => {
      const terms = normalizeTicketSearchTerms(debouncedSearchTerm);
      let customerIds: string[] = [];
      if (terms.length) {
        customerIds = await fetchCustomerIdsForTicketSearch(supabase, ctx.customerScopeOr, terms);
      }
      const y = calendarMonth.getFullYear();
      const m = calendarMonth.getMonth();
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0, 23, 59, 59, 999);

      let q = (supabase as any)
        .from('repair_tickets')
        .select('id, due_date, ticket_number, status, device_type, customers(name)')
        .or(ctx.ticketScopeOr)
        .not('due_date', 'is', null)
        .gte('due_date', start.toISOString())
        .lte('due_date', end.toISOString());

      q = applyTabAndStatusToTicketQuery(q, {
        activeFilter,
        statusFilter,
        hideClosedCancelled: ticketRepairsPrefs.show_closed_cancelled_in_list,
      });

      if (terms.length) {
        const orParts: string[] = [];
        for (const t of terms) {
          orParts.push(...buildTicketSearchOrFragments(t));
        }
        if (customerIds.length) {
          orParts.push(`customer_id.in.(${customerIds.join(',')})`);
        }
        q = q.or(orParts.join(','));
      }

      const { data, error } = await q.limit(5000);
      if (cancelled) return;
      if (error) {
        setCalendarTickets([]);
        return;
      }
      setCalendarTickets((data || []) as TicketCalendarRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    calendarOpen,
    calendarMonth,
    supabase,
    debouncedSearchTerm,
    activeFilter,
    statusFilter,
    ticketRepairsPrefs.show_closed_cancelled_in_list,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitGuardRef.current) return;

    const imeiErr = imeiFieldError(formData.imei);
    if (imeiErr) {
      toast.error(imeiErr);
      return;
    }

    submitGuardRef.current = true;
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const orgId = await getActiveOrganizationId(supabase);
      if (!orgId) {
        toast.error('No hay organización activa.');
        return;
      }

      const ticketNumber = editingTicket
        ? editingTicket.ticket_number
        : await reserveNextBoletoTicketNumber(
            supabase,
            orgId,
            ticketRepairsPrefs.ticket_number_style
          );

      const { device_pin, unlock_pattern, ...formFields } = formData;
      const ticketData = {
        ...formFields,
        imei: normalizeImeiForDb(formData.imei),
        pin_pattern: composeAccessCredentials(device_pin, unlock_pattern),
        user_id: user.id,
        organization_id: orgId,
        estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
        final_cost: formData.final_cost ? parseFloat(formData.final_cost) : null,
        ticket_number: ticketNumber,
        device_screen_inches:
          formData.device_category === 'SMART_TV'
            ? formData.device_screen_inches?.trim() || null
            : null,
      };

      if (editingTicket) {
        const memberIds = await fetchActiveOrgMemberUserIds(supabase, orgId);
        const ticketScopeOr = repairTicketsOrgScopeOr(orgId, memberIds);
        const { error } = await (supabase as any)
          .from('repair_tickets')
          .update(ticketData)
          .eq('id', editingTicket.id)
          .or(ticketScopeOr);
        if (error) throw error;
        toast.success('Ticket actualizado');
      } else {
        const { error } = await (supabase as any)
          .from('repair_tickets')
          .insert([ticketData]);
        if (error) throw error;
        toast.success('Ticket creado');
      }

      setIsDialogOpen(false);
      resetForm();
      void fetchTicketsPageRef.current();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar ticket');
    } finally {
      submitGuardRef.current = false;
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este ticket?')) return;
    try {
      const orgId = await getActiveOrganizationId(supabase);
      if (!orgId) {
        toast.error('No hay organización activa.');
        return;
      }
      const memberIds = await fetchActiveOrgMemberUserIds(supabase, orgId);
      const ticketScopeOr = repairTicketsOrgScopeOr(orgId, memberIds);
      const { error } = await (supabase as any)
        .from('repair_tickets')
        .delete()
        .eq('id', id)
        .or(ticketScopeOr);
      if (error) throw error;
      toast.success('Ticket eliminado');
      void fetchTicketsPageRef.current();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar');
    }
  };

  const handleEdit = (ticket: Ticket) => {
    setEditingTicket(ticket);
    const { pin, pattern } = parseStoredAccessCredentials(ticket.pin_pattern);
    setFormData({
      customer_id: ticket.customer_id,
      device_type: ticket.device_type,
      device_model: ticket.device_model || '',
      device_brand: ticket.device_brand || '',
      device_category: ticket.device_category || '',
      device_screen_inches: ticket.device_screen_inches || '',
      serial_number: ticket.serial_number || '',
      imei: ticket.imei || '',
      issue_description: ticket.issue_description,
      status: ticket.status,
      priority: ticket.priority,
      task_type: ticket.task_type || 'TIENDA',
      estimated_cost: ticket.estimated_cost?.toString() || '',
      final_cost: ticket.final_cost?.toString() || '',
      notes: ticket.notes || '',
      diagnostic_notes: ticket.diagnostic_notes ?? '',
      device_pin: pin,
      unlock_pattern: pattern,
      warranty_info: ticket.warranty_info ?? '',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      device_type: '',
      device_model: '',
      device_brand: '',
      device_category: '',
      device_screen_inches: '',
      serial_number: '',
      imei: '',
      issue_description: '',
      status: 'pending',
      priority: 'medium',
      task_type: 'TIENDA',
      estimated_cost: '',
      final_cost: '',
      notes: '',
      diagnostic_notes: '',
      device_pin: '',
      unlock_pattern: '',
      warranty_info: '',
    });
    setEditingTicket(null);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending':     return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'completed':   return 'bg-green-500 text-white';
      case 'cancelled':   return 'bg-red-100 text-red-800 border border-red-200';
      case 'no_repair':   return 'bg-gray-100 text-gray-700 border border-gray-200';
      case 'draft':       return 'bg-slate-100 text-slate-600 border border-slate-200';
      case 'diagnostic':  return 'bg-orange-100 text-orange-800 border border-orange-200';
      default:            return 'bg-gray-100 text-gray-700';
    }
  };

  /**
   * Devuelve [bg, text] como valores de color hex para la píldora del nº de ticket.
   * Los colores coinciden con los puntos del selector de estado interno.
   */
  const getStatusBadgeColors = (status: string): [string, string] => {
    switch (status) {
      // ── Recibidos / Entrada ───────────────────────────────────────────
      case 'pending':            return ['#fef9c3', '#92400e'];   // amarillo suave
      case 'entrada':            return ['#fee2e2', '#b91c1c'];   // rojo suave
      case 'presupuesto':        return ['#fef3c7', '#92400e'];   // ámbar
      case 'envios':             return ['#dbeafe', '#1e40af'];   // azul
      // ── Esperando ────────────────────────────────────────────────────
      case 'waiting_parts':      return ['#dbeafe', '#1e40af'];   // azul
      case 'pendiente_pedido':   return ['#ffedd5', '#9a3412'];   // naranja
      case 'pendiente_pieza':    return ['#ffedd5', '#9a3412'];   // naranja
      case 'pendiente_cliente':  return ['#ffedd5', '#9a3412'];   // naranja
      // ── Activos ───────────────────────────────────────────────────────
      case 'en_proceso':         return ['#ef4444', '#ffffff'];   // rojo sólido
      case 'in_progress':        return ['#3b82f6', '#ffffff'];   // azul sólido
      case 'diagnostico':        return ['#3b82f6', '#ffffff'];   // azul sólido
      case 'diagnostic':         return ['#3b82f6', '#ffffff'];   // azul sólido
      case 'en_estudio':         return ['#dcfce7', '#166534'];   // verde suave
      case 'prioridad':          return ['#a21caf', '#ffffff'];   // morado
      case 'traslado':           return ['#fce7f3', '#9d174d'];   // rosa
      case 'externa':            return ['#d1fae5', '#065f46'];   // verde teal
      // ── Cerrado positivo ──────────────────────────────────────────────
      case 'reparado':           return ['#22c55e', '#ffffff'];   // verde sólido ✔
      case 'completed':          return ['#22c55e', '#ffffff'];   // verde sólido ✔
      case 'repaired_collected': return ['#16a34a', '#ffffff'];   // verde oscuro ✔✔
      case 'no_reparado_open':   return ['#d1fae5', '#065f46'];   // verde pálido
      // ── Cerrado negativo ──────────────────────────────────────────────
      case 'no_reparado':        return ['#dc2626', '#ffffff'];   // rojo sólido ✖
      case 'cancelled':          return ['#6b7280', '#ffffff'];   // gris ✖
      case 'no_repair':          return ['#dc2626', '#ffffff'];   // rojo sólido ✖
      case 'draft':              return ['#e2e8f0', '#475569'];   // gris claro
      default:                   return ['#e5e7eb', '#374151'];   // neutro
    }
  };

  const getStatusLabel = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status)?.label || status;
  };

  /** Página actual ya filtrada en servidor; referencia estable para hijos memoizados. */
  const filteredTickets = useMemo(() => tickets, [tickets]);

  /** Tickets con fecha de entrega por día (calendario: datos del mes cargados aparte). */
  const ticketsByDueDay = useMemo(() => {
    const map = new Map<string, TicketCalendarRow[]>();
    for (const t of calendarTickets) {
      if (!t.due_date) continue;
      const d = new Date(t.due_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return map;
  }, [calendarTickets]);

  /** Reordenación solo en vista «TODO» por grupo de fecha; el resto llega ordenado desde Supabase. */
  const sortedTickets = useMemo(() => {
    const arr = [...filteredTickets];
    if (activeFilter !== 'TODO') return arr;
    const groupPriority = (t: Ticket) => DATE_GROUP_ORDER.indexOf(getTicketDateGroup(t));
    arr.sort((a, b) => {
      const gDiff = groupPriority(a) - groupPriority(b);
      if (gDiff !== 0) return gDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return arr;
  }, [filteredTickets, activeFilter]);

  const ticketPhone = (t: Ticket) =>
    (t.customers?.phone ?? customers.find((c) => c.id === t.customer_id)?.phone ?? '').trim();

  const exportTicketsXlsx = async (mode: 'selected' | 'visible') => {
    const ctx = listContextRef.current;
    let rows: Ticket[] = [];

    if (mode === 'selected') {
      rows = sortedTickets.filter((t) => selectedTicketIds.has(String(t.id)));
      if (selectedTicketIds.size === 0) {
        toast.info('Marca filas con la casilla o elige «Exportar todos visibles».');
        return;
      }
    } else {
      if (!ctx || ticketsTotalCount === 0) {
        toast.info('No hay tickets para exportar con los filtros actuales.');
        return;
      }
      const terms = normalizeTicketSearchTerms(debouncedSearchTerm);
      let customerIds: string[] = [];
      if (terms.length) {
        customerIds = await fetchCustomerIdsForTicketSearch(supabase, ctx.customerScopeOr, terms);
      }
      const batch = 400;
      let from = 0;
      while (from < ticketsTotalCount) {
        let q = (supabase as any)
          .from('repair_tickets')
          .select('*, customers(name, email, phone)')
          .or(ctx.ticketScopeOr);
        q = applyTabAndStatusToTicketQuery(q, {
          activeFilter,
          statusFilter,
          hideClosedCancelled: ticketRepairsPrefs.show_closed_cancelled_in_list,
        });
        if (terms.length) {
          const orParts: string[] = [];
          for (const t of terms) {
            orParts.push(...buildTicketSearchOrFragments(t));
          }
          if (customerIds.length) {
            orParts.push(`customer_id.in.(${customerIds.join(',')})`);
          }
          q = q.or(orParts.join(','));
        }
        q = applyTicketListSort(q, ticketRepairsPrefs);
        const to = from + batch - 1;
        const { data: chunk, error } = await q.range(from, to);
        if (error) {
          toast.error(error.message || 'Error al exportar');
          return;
        }
        const part = (chunk || []) as Ticket[];
        rows.push(...part);
        if (part.length < batch) break;
        from += batch;
      }
    }

    if (rows.length === 0) {
      toast.info(
        mode === 'selected'
          ? 'Ningún seleccionado está en la lista actual (revisa filtros o búsqueda).'
          : 'No hay tickets para exportar con los filtros actuales.'
      );
      return;
    }

    const currency = sym; // símbolo de moneda de la org (€/$)

    const dataRows = rows.map((t) => ({
      ticket_number:  t.ticket_number,
      status:         getStatusLabel(t.status),
      priority:       t.priority ?? '',
      customer:       t.customers?.name ?? '',
      phone:          ticketPhone(t),
      email:          t.customers?.email ?? '',
      device_type:    t.device_type ?? '',
      device_category:t.device_category ?? '',
      device_brand:   t.device_brand ?? '',
      device_model:   t.device_model ?? '',
      device_screen_inches: t.device_screen_inches ?? '',
      imei:           t.imei ?? '',
      serial_number:  t.serial_number ?? '',
      issue_description: t.issue_description ?? '',
      task_type:      t.task_type ?? '',
      assigned_to:    formatAssignedToLabel(t.assigned_to, techIdToName) || '',
      created_at:     t.created_at,
      due_date:       t.due_date ?? '',
      total:          t.final_cost ?? t.estimated_cost ?? 0,
    }));

    const toastId = toast.loading('Generando Excel…');
    try {
      const buffer = await buildXlsx({
        sheetName: 'Tickets',
        title: 'JC ONE FIX — Tickets',
        currencySymbol: currency,
        columns: [
          { header: 'Nº Ticket',         key: 'ticket_number',     minWidth: 12 },
          { header: 'Estado',             key: 'status',            minWidth: 14 },
          { header: 'Prioridad',          key: 'priority',          minWidth: 10 },
          { header: 'Cliente',            key: 'customer',          minWidth: 22 },
          { header: 'Teléfono',           key: 'phone',             minWidth: 14 },
          { header: 'Email',              key: 'email',             minWidth: 26 },
          { header: 'Dispositivo',        key: 'device_type',       minWidth: 16 },
          { header: 'Categoría',          key: 'device_category',   minWidth: 14 },
          { header: 'Marca',              key: 'device_brand',      minWidth: 12 },
          { header: 'Modelo',             key: 'device_model',      minWidth: 14 },
          { header: 'Pulgadas (TV)',    key: 'device_screen_inches', minWidth: 12 },
          { header: 'IMEI',               key: 'imei',              minWidth: 18 },
          { header: 'Nº Serie',           key: 'serial_number',     minWidth: 16 },
          { header: 'Problema / Servicio',key: 'issue_description', minWidth: 30 },
          { header: 'Tipo de tarea',      key: 'task_type',         minWidth: 14 },
          { header: 'Asignado a',         key: 'assigned_to',       minWidth: 16 },
          { header: 'Fecha creación',     key: 'created_at',        type: 'date', minWidth: 18 },
          { header: 'Fecha entrega',      key: 'due_date',          type: 'date', minWidth: 18 },
          { header: 'Total',              key: 'total',             type: 'currency', minWidth: 12 },
        ],
        rows: dataRows,
      });
      const scope =
        mode === 'selected'
          ? `${rows.length} seleccionado${rows.length === 1 ? '' : 's'}`
          : `${rows.length} tickets`;
      downloadXlsx(buffer, `tickets_${new Date().toISOString().slice(0, 10)}`);
      toast.success(`Excel exportado: ${scope}`, { id: toastId });
    } catch {
      toast.error('Error al generar el Excel', { id: toastId });
    }
  };

  const pageSize = ticketRepairsPrefs.tickets_per_page;
  const pageCount = Math.max(1, Math.ceil(ticketsTotalCount / pageSize));
  const safePage = Math.min(listPage, pageCount);

  /** Filas enriquecidas con cabeceras de grupo de fecha. */
  type GroupedRow =
    | { kind: 'header'; label: DateGroup; count: number }
    | { kind: 'ticket'; ticket: Ticket };

  const groupedRows = useMemo<GroupedRow[]>(() => {
    if (activeFilter !== 'TODO') {
      return sortedTickets.map((t) => ({ kind: 'ticket' as const, ticket: t }));
    }
    const rows: GroupedRow[] = [];
    let lastGroup = '';
    const countByGroup: Partial<Record<DateGroup, number>> = {};
    for (const t of sortedTickets) {
      const g = getTicketDateGroup(t);
      countByGroup[g] = (countByGroup[g] ?? 0) + 1;
    }
    for (const t of sortedTickets) {
      const g = getTicketDateGroup(t);
      if (g !== lastGroup) {
        rows.push({ kind: 'header', label: g, count: countByGroup[g] ?? 0 });
        lastGroup = g;
      }
      rows.push({ kind: 'ticket', ticket: t });
    }
    return rows;
  }, [sortedTickets, activeFilter]);

  useEffect(() => {
    const valid = new Set(sortedTickets.map((t) => String(t.id)));
    setSelectedTicketIds((prev) => {
      const next = new Set<string>();
      Array.from(prev).forEach((id) => {
        if (valid.has(id)) next.add(id);
      });
      const prevArr = Array.from(prev);
      if (next.size === prev.size && prevArr.every((id) => next.has(id))) return prev;
      return next;
    });
  }, [sortedTickets]);

  const allFilteredIds = sortedTickets.map((t) => String(t.id));
  const allTicketsSelected =
    allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedTicketIds.has(id));
  const someTicketsSelected =
    allFilteredIds.length > 0 &&
    !allTicketsSelected &&
    allFilteredIds.some((id) => selectedTicketIds.has(id));

  /** Mantiene la propiedad `indeterminate` del <input> del encabezado sincronizada con el estado. */
  useEffect(() => {
    if (!headerCheckRef.current) return;
    headerCheckRef.current.indeterminate = someTicketsSelected;
    headerCheckRef.current.checked = allTicketsSelected;
  }, [someTicketsSelected, allTicketsSelected]);

  const toggleSelectAllTickets = () => {
    if (allTicketsSelected) {
      setSelectedTicketIds(new Set());
    } else {
      setSelectedTicketIds(new Set(sortedTickets.map((t) => String(t.id))));
    }
  };

  useEffect(() => {
    if (listPage > pageCount) setListPage(pageCount);
  }, [listPage, pageCount]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) + ' at ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const tableColSpan = listLayout === 'compact' ? 8 : 13;

  const calendarGrid = useMemo(() => {
    const y = calendarMonth.getFullYear();
    const m = calendarMonth.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const startPad = (first.getDay() + 6) % 7;
    const daysInMonth = last.getDate();
    const cells: { day: number | null; isoKey: string | null }[] = [];
    for (let i = 0; i < startPad; i++) cells.push({ day: null, isoKey: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const isoKey = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, isoKey });
    }
    return {
      cells,
      title: first.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
    };
  }, [calendarMonth]);

  const shiftCalendarMonth = (delta: number) => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    setCalendarPickDay(null);
  };

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Administrar tickets</h1>
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
              >
                <Filter className="h-3.5 w-3.5" />
                Filtros
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Estado del ticket</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={statusFilter} onValueChange={setStatusFilter}>
                <DropdownMenuRadioItem value="all">Todos los estados</DropdownMenuRadioItem>
                {STATUS_OPTIONS.map((s) => (
                  <DropdownMenuRadioItem key={s.value} value={s.value}>
                    {s.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Período</DropdownMenuLabel>
              {FILTER_TABS.map((tab) => (
                <DropdownMenuItem
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                  className={cn(activeFilter === tab && 'bg-slate-100 font-medium')}
                >
                  {tab}
                  {activeFilter === tab ? ' ✓' : ''}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            onClick={() => {
              setCalendarMonth(new Date());
              setCalendarPickDay(null);
              setCalendarOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
          >
            <Calendar className="h-3.5 w-3.5" />
            Vista de calendario
          </button>
          <button
            type="button"
            onClick={() => setListLayout((v) => (v === 'full' ? 'compact' : 'full'))}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded hover:bg-gray-50 text-gray-700',
              listLayout === 'compact'
                ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                : 'border-gray-300'
            )}
            title={listLayout === 'compact' ? 'Ver todas las columnas' : 'Vista resumida (menos columnas)'}
          >
            <AlignLeft className="h-3.5 w-3.5" />
            Descripción general
          </button>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
                title="CSV con separador para Excel (ES). Exportar solo marcados o todos los visibles con filtros."
              >
                <Download className="h-3.5 w-3.5" />
                Exportar
                <ChevronDown className="h-3 w-3 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[14rem]">
              <DropdownMenuLabel className="text-xs font-normal text-gray-500">
                Excel (ES): columnas con «;»
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                disabled={selectedTicketIds.size === 0}
                onSelect={() => void exportTicketsXlsx('selected')}
              >
                <Download className="h-4 w-4 shrink-0" />
                Exportar seleccionados
                {selectedTicketIds.size > 0 ? ` (${selectedTicketIds.size})` : ''}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                disabled={ticketsTotalCount === 0}
                onSelect={() => void exportTicketsXlsx('visible')}
              >
                <Download className="h-4 w-4 shrink-0" />
                Exportar todos visibles
                {ticketsTotalCount > 0 ? ` (${ticketsTotalCount})` : ''}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard/recepcion">
              <Button
                className="h-auto gap-1 bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary"
              >
                Recepción
              </Button>
            </Link>
            <Link href="/dashboard/tickets/new">
              <Button className="h-auto gap-0 px-4 py-1.5 text-sm bg-primary text-white hover:bg-primary">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Crear ticket
              </Button>
            </Link>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <span className="hidden" />
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTicket ? 'Editar Ticket' : 'Crear Nuevo Ticket'}</DialogTitle>
                <DialogDescription>
                  {editingTicket ? 'Actualiza los datos del ticket' : 'Completa los datos para crear un ticket de reparación'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Cliente *</Label>
                    <Select
                      value={formData.customer_id}
                      onValueChange={(v) => setFormData({ ...formData, customer_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Dispositivo *</Label>
                    <Input
                      value={formData.device_type}
                      onChange={(e) => setFormData({ ...formData, device_type: e.target.value })}
                      placeholder="iPhone 16 Pro Max"
                      required
                    />
                  </div>
                  <div>
                    <Label>Marca</Label>
                    <Input
                      value={formData.device_brand}
                      onChange={(e) => setFormData({ ...formData, device_brand: e.target.value })}
                      placeholder="APPLE"
                    />
                  </div>

                  <div>
                    <Label>Categoría</Label>
                    <Select
                      value={formData.device_category}
                      onValueChange={(v) =>
                        setFormData((prev) => ({
                          ...prev,
                          device_category: v,
                          device_screen_inches: v === 'SMART_TV' ? prev.device_screen_inches : '',
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SMARTPHONES">SMARTPHONES</SelectItem>
                        <SelectItem value="TABLETS">TABLETS</SelectItem>
                        <SelectItem value="LAPTOPS">LAPTOPS Y PC</SelectItem>
                        <SelectItem value="CONSOLAS">CONSOLAS</SelectItem>
                        <SelectItem value="SMARTWATCH">SMARTWATCH</SelectItem>
                        <SelectItem value="AURICULARES">AURICULARES</SelectItem>
                        <SelectItem value="SMART_TV">SMART TV</SelectItem>
                        <SelectItem value="AUDIO_VIDEO">EQUIPOS DE AUDIO Y VÍDEO</SelectItem>
                        <SelectItem value="OTROS">OTROS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Modelo</Label>
                    <Input
                      value={formData.device_model}
                      onChange={(e) => setFormData({ ...formData, device_model: e.target.value })}
                      placeholder="A2483"
                    />
                  </div>

                  {formData.device_category === 'SMART_TV' ? (
                    <div className="col-span-2">
                      <Label>Pulgadas (pantalla) — opcional</Label>
                      <Input
                        value={formData.device_screen_inches}
                        onChange={(e) =>
                          setFormData({ ...formData, device_screen_inches: e.target.value })
                        }
                        placeholder='Ej. 55, 55 pulgadas…'
                      />
                    </div>
                  ) : null}

                  <div>
                    <Label>IMEI</Label>
                    <Input
                      inputMode="numeric"
                      value={formData.imei}
                      onChange={(e) =>
                        setFormData({ ...formData, imei: formatImeiInput(e.target.value) })
                      }
                      placeholder="15 dígitos (opcional)"
                      aria-invalid={!!imeiFieldError(formData.imei)}
                    />
                    {imeiFieldError(formData.imei) ? (
                      <p className="mt-1 text-xs text-primary" role="alert">
                        {imeiFieldError(formData.imei)}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-gray-500">
                        Opcional. Si lo cargás, exactamente 15 dígitos.
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>Número de Serie</Label>
                    <Input
                      value={formData.serial_number}
                      onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                      placeholder="Número de serie"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label>Descripción del problema *</Label>
                    <Textarea
                      value={formData.issue_description}
                      onChange={(e) => setFormData({ ...formData, issue_description: e.target.value })}
                      placeholder="Describe el problema..."
                      required
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label>Estado</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(v) => setFormData({ ...formData, status: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Tipo de tarea</Label>
                    <Select
                      value={formData.task_type}
                      onValueChange={(v) => setFormData({ ...formData, task_type: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TIENDA">TIENDA</SelectItem>
                        <SelectItem value="ONLINE">ONLINE</SelectItem>
                        <SelectItem value="DOMICILIO">DOMICILIO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Coste estimado ({sym})</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.estimated_cost}
                      onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <Label>Coste final ({sym})</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.final_cost}
                      onChange={(e) => setFormData({ ...formData, final_cost: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="col-span-2">
                    <DeviceUnlockInputs
                      pin={formData.device_pin}
                      pattern={formData.unlock_pattern}
                      onPinChange={(v) => setFormData({ ...formData, device_pin: v })}
                      onPatternChange={(v) => setFormData({ ...formData, unlock_pattern: v })}
                      labelClassName="text-sm font-medium text-gray-700"
                    />
                  </div>

                  <div>
                    <Label>Info garantía</Label>
                    <Input
                      value={formData.warranty_info}
                      onChange={(e) => setFormData({ ...formData, warranty_info: e.target.value })}
                      placeholder="Sin garantía"
                    />
                  </div>

                  <DiagnosticNotesWithAi
                    value={formData.diagnostic_notes}
                    onChange={(v) => setFormData({ ...formData, diagnostic_notes: v })}
                    placeholder="Notas del técnico..."
                    labelClassName="text-sm font-medium text-gray-700"
                    textareaClassName="mt-1"
                  />

                  <div className="col-span-2">
                    <Label>Notas adicionales</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Notas adicionales..."
                      rows={2}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" className="bg-primary text-white hover:bg-primary" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingTicket ? 'Actualizar' : 'Crear'} Ticket
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="px-6 py-2 border-b border-gray-200 flex items-center gap-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded transition-colors',
              activeFilter === tab
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {tab}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {selectedTicketIds.size > 0 && (
            <span className="whitespace-nowrap rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {selectedTicketIds.size} marcado{selectedTicketIds.size === 1 ? '' : 's'}
            </span>
          )}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary w-48"
            />
          </div>
          <button className="p-1.5 hover:bg-gray-100 rounded">
            <Settings2 className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sortedTickets.length === 0 ? (
          <div className="text-center py-16 px-4 text-gray-500 max-w-lg mx-auto">
            <p className="font-medium text-gray-800">No se encontraron tickets con los filtros actuales</p>
            <p className="text-sm mt-2">
              Probá la pestaña <strong className="font-medium text-gray-700">Todo</strong>, ampliá el rango de fechas
              o limpiá la búsqueda. Si el taller es nuevo, creá tu primer ticket con el botón superior.
            </p>
            {ticketsTotalCount === 0 ? (
              <p className="text-xs mt-4 text-left text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5">
                Tus datos (clientes y órdenes) están en la base de datos en la nube;{' '}
                <strong className="font-medium">cambiar el dominio del sitio no los borra</strong>. Si antes veías
                información y ahora no, revisá filtros, la cuenta con la que entrás y que el despliegue use el mismo
                proyecto Supabase (variables de entorno en Vercel).
              </p>
            ) : null}
          </div>
        ) : (
          <table className="jc-panel-data-table w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="w-8 px-3 py-3">
                  <input
                    ref={headerCheckRef}
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
                    title="Seleccionar / deseleccionar todos"
                    onChange={toggleSelectAllTickets}
                  />
                </th>
                <th className="px-3 py-3 text-left font-medium text-gray-600 text-xs uppercase tracking-wide">IDENTIFICACIÓN</th>
                <th className="px-3 py-3 text-left font-medium text-gray-600 text-xs uppercase tracking-wide">Información del dispositivo</th>
                <th
                  className={cn(
                    'px-3 py-3 text-left font-medium text-gray-600 text-xs uppercase tracking-wide',
                    listLayout === 'compact' && 'hidden'
                  )}
                >
                  Servicio
                </th>
                <th className="px-3 py-3 text-left font-medium text-gray-600 text-xs uppercase tracking-wide">Cliente</th>
                <th
                  className={cn(
                    'px-3 py-3 text-left font-medium text-gray-600 text-xs uppercase tracking-wide',
                    listLayout === 'compact' && 'hidden'
                  )}
                >
                  Tipo de tarea
                </th>
                <th
                  className={cn(
                    'px-3 py-3 text-left font-medium text-gray-600 text-xs uppercase tracking-wide',
                    listLayout === 'compact' && 'hidden'
                  )}
                >
                  Asignado a
                </th>
                <th className="px-3 py-3 text-left font-medium text-gray-600 text-xs uppercase tracking-wide">Fecha y hora de creación</th>
                <th
                  className={cn(
                    'px-3 py-3 text-left font-medium text-gray-600 text-xs uppercase tracking-wide',
                    listLayout === 'compact' && 'hidden'
                  )}
                >
                  Última actualización
                </th>
                <th
                  className={cn(
                    'px-3 py-3 text-left font-medium text-gray-600 text-xs uppercase tracking-wide',
                    listLayout === 'compact' && 'hidden'
                  )}
                >
                  Total
                </th>
                <th className="px-3 py-3 text-left font-medium text-gray-600 text-xs uppercase tracking-wide">Estado del ticket</th>
                <th className="px-3 py-3 text-center font-medium text-gray-600 text-xs uppercase tracking-wide min-w-[88px] whitespace-nowrap">WhatsApp</th>
                <th className="px-3 py-3 text-left font-medium text-gray-600 text-xs uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {groupedRows.map((row, idx) => {
                if (row.kind === 'header') {
                  const colorMap: Partial<Record<DateGroup, string>> = {
                    HOY:      'bg-emerald-50 text-emerald-700 border-emerald-200',
                    AYER:     'bg-sky-50 text-sky-700 border-sky-200',
                    '7 DÍAS': 'bg-violet-50 text-violet-700 border-violet-200',
                    '14 DÍAS':'bg-amber-50 text-amber-700 border-amber-200',
                    '30 DÍAS':'bg-orange-50 text-orange-700 border-orange-200',
                    ACTIVOS:  'bg-slate-50 text-slate-600 border-slate-200',
                    VENCIDOS: 'bg-red-50 text-red-700 border-red-200',
                  };
                  return (
                    <tr key={`hdr-${idx}`}>
                      <td colSpan={tableColSpan} className="px-3 py-1.5">
                        <span className={cn(
                          'inline-flex items-center gap-2 rounded-full border px-3 py-0.5 text-primary font-bold uppercase tracking-wider',
                          colorMap[row.label] ?? 'bg-gray-50 text-gray-600 border-gray-200'
                        )}>
                          {row.label}
                          <span className="opacity-60 font-normal">{row.count} ticket{row.count !== 1 ? 's' : ''}</span>
                        </span>
                      </td>
                    </tr>
                  );
                }
                const ticket = row.ticket;
                return (
                <tr
                  key={ticket.id}
                  className={cn(
                    'hover:bg-gray-50 group',
                    selectedTicketIds.has(String(ticket.id)) && 'bg-teal-50/40'
                  )}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
                      checked={selectedTicketIds.has(String(ticket.id))}
                      onChange={(e) => {
                        const id = String(ticket.id);
                        setSelectedTicketIds((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(id);
                          else next.delete(id);
                          return next;
                        });
                      }}
                      aria-label={`Seleccionar ticket ${ticket.ticket_number}`}
                    />
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {/* Badge de nº ticket coloreado según estado */}
                    {(() => {
                      const [bg, fg] = getStatusBadgeColors(ticket.status);
                      return (
                        <Link
                          href={`/dashboard/tickets/${ticket.id}`}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ring-1 ring-inset transition-opacity hover:opacity-80"
                          style={{
                            backgroundColor: bg,
                            color: fg,
                            outline: `1px solid ${fg}33`,
                          }}
                          title={getStatusLabel(ticket.status)}
                        >
                          {ticket.is_urgent && (
                            <Pin className="h-2.5 w-2.5 rotate-45 shrink-0" />
                          )}
                          {ticket.ticket_number}
                        </Link>
                      );
                    })()}
                    {ticket.is_draft && (
                      <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">
                        Draft
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-gray-900">{ticket.device_type}</div>
                    {(() => {
                      const equipLine = formatEquipoBrandInchesModelLine({
                        category: ticket.device_category,
                        brand: ticket.device_brand,
                        model: ticket.device_model,
                        screenInches: ticket.device_screen_inches,
                      });
                      const fallback = [ticket.device_brand, ticket.device_model]
                        .filter(Boolean)
                        .join(' · ');
                      const right = equipLine || fallback;
                      if (!ticket.device_category && !right) return null;
                      return (
                        <div className="text-xs text-gray-500">
                          {ticket.device_category ? `${ticket.device_category} → ` : null}
                          {right || '—'}
                        </div>
                      );
                    })()}
                    {ticket.imei && (
                      <div className="text-xs text-gray-400">IMEI: {ticket.imei}</div>
                    )}
                  </td>
                  <td className={cn('px-3 py-3 max-w-[140px]', listLayout === 'compact' && 'hidden')}>
                    {ticket.issue_description && (
                      <div className="flex items-start gap-1">
                        <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs text-gray-500">!</span>
                        </div>
                        <span className="text-xs text-gray-600 line-clamp-2">{ticket.issue_description}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {ticket.customers ? (
                      <div>
                        <div className="font-medium text-gray-900 text-xs uppercase">{ticket.customers.name}</div>
                        {ticket.customers.email && (
                          <div className="text-xs text-gray-500">Correo: {ticket.customers.email}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Walkin Customer</span>
                    )}
                  </td>
                  <td className={cn('px-3 py-3', listLayout === 'compact' && 'hidden')}>
                    <span className="text-xs font-medium text-gray-700">{ticket.task_type || 'TIENDA'}</span>
                  </td>
                  <td className={cn('px-3 py-3', listLayout === 'compact' && 'hidden')}>
                    <span className="text-xs text-gray-500">
                      {formatAssignedToLabel(ticket.assigned_to, techIdToName) || '---'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">
                    {formatDate(ticket.created_at)}
                  </td>
                  <td className={cn('px-3 py-3 text-xs text-gray-600 whitespace-nowrap', listLayout === 'compact' && 'hidden')}>
                    {formatDate(ticket.updated_at)}
                  </td>
                  <td className={cn('px-3 py-3 text-xs font-medium text-gray-900', listLayout === 'compact' && 'hidden')}>
                    {sym} {(ticket.final_cost || ticket.estimated_cost || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <span className={cn(
                        'text-xs font-medium px-2 py-1 rounded flex items-center gap-1',
                        getStatusStyle(ticket.status)
                      )}>
                        {getStatusLabel(ticket.status)}
                        <ChevronDown className="h-3 w-3" />
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <WhatsAppQuickIconButton
                      className="!px-2 !py-1 text-xs mx-auto"
                      disabled={
                        !(
                          ticket.customers?.phone?.trim() ||
                          customers.find((c) => c.id === ticket.customer_id)?.phone?.trim()
                        )
                      }
                      onClick={() => {
                        const phone =
                          ticket.customers?.phone?.trim() ||
                          customers.find((c) => c.id === ticket.customer_id)?.phone?.trim() ||
                          null;
                        if (!phone) {
                          toast.error('Este cliente no tiene teléfono en la ficha');
                          return;
                        }
                        const name = ticket.customers?.name || 'Cliente';
                        const defaultMessage = `${loc.isAR ? 'Te escribo respecto a la orden' : 'Te escribo respecto al ticket'} ${ticket.ticket_number}${
                          ticket.device_type?.trim()
                            ? ` (${ticket.device_type.trim()})`
                            : ticket.device_category?.trim()
                              ? ` (${ticket.device_category.trim()})`
                              : ''
                        }.`;
                        setWaModal({
                          name,
                          phone,
                          defaultMessage,
                          deviceCategory: ticket.device_category,
                          deviceType: ticket.device_type || '',
                          deviceBrand: ticket.device_brand,
                          deviceModel: ticket.device_model,
                        });
                      }}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-0.5">
                      <button
                        type="button"
                        title="Editar"
                        aria-label={`Editar orden ${ticket.ticket_number}`}
                        onClick={() => handleEdit(ticket)}
                        className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Eliminar"
                        aria-label={`Eliminar orden ${ticket.ticket_number}`}
                        onClick={() => handleDelete(ticket.id)}
                        className="p-1.5 rounded-md text-gray-600 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!loading && ticketsTotalCount > 0 && pageCount > 1 ? (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50 text-sm text-gray-600">
            <span>
              Mostrando {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, ticketsTotalCount)} de{' '}
              {ticketsTotalCount}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                className="h-8 bg-primary text-white hover:bg-primary"
                disabled={safePage <= 1}
                onClick={() => setListPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <span className="text-xs tabular-nums">
                {safePage} / {pageCount}
              </span>
              <Button
                type="button"
                size="sm"
                className="h-8 bg-primary text-white hover:bg-primary"
                disabled={safePage >= pageCount}
                onClick={() => setListPage((p) => Math.min(pageCount, p + 1))}
              >
                Siguiente
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Vista de calendario</DialogTitle>
            <DialogDescription>
              Días con <strong>fecha de entrega</strong> en el mes visible (mismos filtros y búsqueda que el listado).
              Haz clic en un día para listar {loc.isAR ? 'las órdenes' : 'los tickets'}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
            <Button type="button" size="icon" className="h-8 w-8 shrink-0 bg-primary text-white hover:bg-primary" onClick={() => shiftCalendarMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-0 truncate text-center text-sm font-semibold capitalize text-gray-900">
              {calendarGrid.title}
            </span>
            <Button type="button" size="icon" className="h-8 w-8 shrink-0 bg-primary text-white hover:bg-primary" onClick={() => shiftCalendarMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase text-gray-500">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarGrid.cells.map((c, i) =>
              c.day == null || c.isoKey == null ? (
                <div key={`empty-${i}`} className="min-h-[3rem]" />
              ) : (
                <button
                  key={c.isoKey}
                  type="button"
                  onClick={() => setCalendarPickDay((p) => (p === c.isoKey ? null : c.isoKey))}
                  className={cn(
                    'flex min-h-[3rem] flex-col items-center justify-start rounded-lg border p-1.5 text-left transition-colors',
                    calendarPickDay === c.isoKey
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-100 hover:bg-gray-50',
                    (ticketsByDueDay.get(c.isoKey)?.length ?? 0) > 0
                      ? 'font-semibold text-primary'
                      : 'text-gray-500'
                  )}
                >
                  <span className="text-sm">{c.day}</span>
                  {(ticketsByDueDay.get(c.isoKey)?.length ?? 0) > 0 ? (
                    <span className="text-[10px] leading-tight">
                      {ticketsByDueDay.get(c.isoKey)!.length} ticket
                      {ticketsByDueDay.get(c.isoKey)!.length !== 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-400">—</span>
                  )}
                </button>
              )
            )}
          </div>
          {calendarPickDay ? (
            <div className="rounded-md border border-gray-200 bg-gray-50/80">
              <p className="border-b border-gray-200 px-3 py-2 text-xs font-medium text-gray-600">
                {calendarPickDay} — {(ticketsByDueDay.get(calendarPickDay) ?? []).length} ticket
                {(ticketsByDueDay.get(calendarPickDay) ?? []).length !== 1 ? 's' : ''}
              </p>
              <ul className="max-h-44 divide-y divide-gray-100 overflow-y-auto text-sm">
                {(ticketsByDueDay.get(calendarPickDay) ?? []).map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-x-2 px-3 py-2">
                    <Link
                      href={`/dashboard/tickets/${t.id}`}
                      className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold hover:opacity-80"
                      style={(() => {
                        const [bg, fg] = getStatusBadgeColors(t.status);
                        return { backgroundColor: bg, color: fg };
                      })()}
                      onClick={() => setCalendarOpen(false)}
                    >
                      {t.ticket_number}
                    </Link>
                    <span className="text-gray-500">{t.customers?.name ?? 'Cliente'}</span>
                    <span className="text-xs text-gray-400">{getStatusLabel(t.status)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="text-xs text-gray-500">
            Los tickets sin fecha de entrega no aparecen en el calendario. Asigna entrega en la ficha del ticket.
          </p>
        </DialogContent>
      </Dialog>

      <WhatsAppQuickSendModal
        open={!!waModal}
        onOpenChange={(open) => {
          if (!open) setWaModal(null);
        }}
        customerName={waModal?.name ?? ''}
        phone={waModal?.phone}
        defaultMessage={waModal?.defaultMessage}
        deviceCategory={waModal?.deviceCategory}
        deviceType={waModal?.deviceType}
        deviceBrand={waModal?.deviceBrand}
        deviceModel={waModal?.deviceModel}
      />
    </div>
  );
}
