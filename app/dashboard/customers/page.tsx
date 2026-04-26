'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useOrgLocale } from '@/lib/hooks/useOrgLocale';
import { requiresGdprUiForOrg } from '@/lib/locale';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Pencil, Trash2, MoveHorizontal as MoreHorizontal, Upload, Download, RotateCcw, SlidersHorizontal, ChevronDown, ChevronLeft, ChevronRight, Mail, Phone, Building2, UserCheck, UserX, Loader as Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getActiveOrganizationId } from '@/lib/dashboard-org';
import {
  customersOrgScopeOr,
  fetchActiveOrgMemberUserIds,
  repairTicketsOrgScopeOr,
} from '@/lib/repair-tickets-org-scope';
import { WhatsAppQuickSendModal } from '@/components/whatsapp/WhatsAppQuickSendModal';
import { WhatsAppQuickIconButton } from '@/components/whatsapp/WhatsAppQuickIconButton';
import {
  buildCustomerFieldMapping,
  csvRowToCustomerPayload,
  fillMissingCustomerFieldsFromRow,
  parseCustomerCsvText,
  payloadToInsert,
  type CustomerCsvInsert,
} from '@/lib/customers-csv';
import { runCustomersExcelSmartImport } from '@/lib/dashboard/customers-excel-smart-import';
import { buildXlsx, downloadXlsx } from '@/lib/excel-export';
import { escapeIlikeFragment } from '@/lib/dashboard/repair-tickets-list-server';

const CUSTOMERS_PAGE_SIZE = 25;

/** Filas mínimas de repair_tickets para acumular montos y saldo por cliente. */
type CustomerTicketAggRow = {
  id: string;
  customer_id: string | null;
  final_cost: number | null;
  estimated_cost: number | null;
  status: string;
  payment_status: string | null;
  deposit_amount: number | null;
};

function ticketLineTotalForCustomer(t: Pick<CustomerTicketAggRow, 'final_cost' | 'estimated_cost'>): number {
  return Number(t.final_cost ?? t.estimated_cost ?? 0);
}

/** Suma pagos completados por ticket (misma idea que el detalle de orden). */
async function fetchCompletedPaymentsSumByTicket(
  supabase: ReturnType<typeof createClient>,
  ticketIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const ids = Array.from(new Set(ticketIds.filter(Boolean)));
  const CHUNK = 100;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from('payments')
      .select('ticket_id, amount, status')
      .in('ticket_id', slice);
    if (error) continue;
    for (const row of data || []) {
      const tid = row.ticket_id as string | null;
      if (!tid) continue;
      const st = String((row as { status?: string | null }).status ?? 'completed').toLowerCase();
      if (st !== 'completed') continue;
      const amt = Number((row as { amount?: number | string | null }).amount ?? 0);
      map.set(tid, (map.get(tid) ?? 0) + amt);
    }
  }
  return map;
}

/** Lo que falta cobrar en una orden (alineado con ticket: seña + pagos vs total mostrado). */
function ticketOutstandingForCustomerRow(
  t: CustomerTicketAggRow,
  paidSumByTicket: Map<string, number>
): number {
  const line = ticketLineTotalForCustomer(t);
  const ps = String(t.payment_status || '').toLowerCase();
  if (ps === 'paid' || ps === 'complete' || ps === 'completed') return 0;
  const deposit = Number(t.deposit_amount || 0);
  const paid = (paidSumByTicket.get(t.id) ?? 0) + deposit;
  return Math.max(0, line - paid);
}

function aggregateTicketsPerCustomer(
  tickets: CustomerTicketAggRow[],
  paidSumByTicket: Map<string, number>
): Map<string, { count: number; ticket_amount: number; receivables: number }> {
  const agg = new Map<string, { count: number; ticket_amount: number; receivables: number }>();
  for (const t of tickets) {
    const cid = t.customer_id;
    if (!cid) continue;
    const cur = agg.get(cid) ?? { count: 0, ticket_amount: 0, receivables: 0 };
    cur.count += 1;
    cur.ticket_amount += ticketLineTotalForCustomer(t);
    cur.receivables += ticketOutstandingForCustomerRow(t, paidSumByTicket);
    agg.set(cid, cur);
  }
  return agg;
}

const emptyCustomerPanelFilters = () => ({
  name: '',
  email: '',
  phone: '',
  customer_group: 'all',
  organization: '',
  mailchimp_status: 'all',
  date_from: '',
  date_to: '',
});

type Customer = {
  id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  organization: string | null;
  customer_group: string | null;
  address: string | null;
  gdpr_consent: boolean | null;
  mailchimp_status: string | null;
  created_at: string;
  ticket_count?: number;
  ticket_amount?: number;
  receivables?: number;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  notes?: string | null;
  id_type?: string | null;
  id_number?: string | null;
};

export default function CustomersPage() {
  const loc = useOrgLocale();
  const showRgpdColumn = requiresGdprUiForOrg(loc.country);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [listPage, setListPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState(emptyCustomerPanelFilters);
  /** Filtros del panel aplicados al listado (se actualizan con «Buscar»). */
  const [committedFilters, setCommittedFilters] = useState(emptyCustomerPanelFilters);

  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') || '');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearchTerm(searchTerm), 350);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

  // Sincronizar con ?q= cuando cambia la URL (viene del buscador global)
  useEffect(() => {
    const q = searchParams.get('q') || '';
    if (q) setSearchTerm(q);
  }, [searchParams]);
  const [waModal, setWaModal] = useState<{
    name: string;
    phone: string | null;
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  const customerListFilterKey = useMemo(
    () => JSON.stringify(committedFilters) + '\u0001' + debouncedSearchTerm,
    [committedFilters, debouncedSearchTerm]
  );

  const skipCustomerPageFetchRef = useRef(false);

  const loadCustomers = useCallback(
    async (pageOverride?: number) => {
      try {
        const orgId = await getActiveOrganizationId(supabase);
        if (!orgId) {
          toast.error('No hay organización activa.');
          setCustomers([]);
          setTotalCount(0);
          return;
        }

        const memberIds = await fetchActiveOrgMemberUserIds(supabase, orgId);
        const ticketScopeOr = repairTicketsOrgScopeOr(orgId, memberIds);
        const customerScopeOr = customersOrgScopeOr(orgId, memberIds);

        let q = supabase.from('customers').select('*', { count: 'exact' }).or(customerScopeOr);

        const cf = committedFilters;
        if (cf.name.trim()) {
          q = q.ilike('name', `%${escapeIlikeFragment(cf.name.trim())}%`);
        }
        if (cf.email.trim()) {
          q = q.ilike('email', `%${escapeIlikeFragment(cf.email.trim())}%`);
        }
        if (cf.phone.trim()) {
          q = q.ilike('phone', `%${escapeIlikeFragment(cf.phone.trim())}%`);
        }
        if (cf.organization.trim()) {
          q = q.ilike('organization', `%${escapeIlikeFragment(cf.organization.trim())}%`);
        }
        if (cf.customer_group && cf.customer_group !== 'all') {
          q = q.eq('customer_group', cf.customer_group);
        }
        if (cf.mailchimp_status && cf.mailchimp_status !== 'all') {
          q = q.eq('mailchimp_status', cf.mailchimp_status);
        }
        if (cf.date_from) {
          q = q.gte('created_at', `${cf.date_from}T00:00:00.000Z`);
        }
        if (cf.date_to) {
          q = q.lte('created_at', `${cf.date_to}T23:59:59.999Z`);
        }

        if (debouncedSearchTerm.trim()) {
          const s = escapeIlikeFragment(debouncedSearchTerm.trim());
          q = q.or(`name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`);
        }

        q = q.order('created_at', { ascending: false });

        const page = Math.max(1, pageOverride ?? listPage);
        const from = (page - 1) * CUSTOMERS_PAGE_SIZE;
        const to = from + CUSTOMERS_PAGE_SIZE - 1;
        const { data: customersData, error, count } = await q.range(from, to);
        if (error) throw error;

        const rows = (customersData || []) as Customer[];
        const ids = rows.map((c) => c.id);

        let enriched: Customer[] = rows;
        if (ids.length > 0) {
          const { data: ticketRows } = await supabase
            .from('repair_tickets')
            .select('id, customer_id, final_cost, estimated_cost, status, payment_status, deposit_amount')
            .in('customer_id', ids)
            .or(ticketScopeOr);

          const trows = (ticketRows || []) as CustomerTicketAggRow[];
          const paidByTicket = await fetchCompletedPaymentsSumByTicket(
            supabase,
            trows.map((x) => x.id)
          );
          const agg = aggregateTicketsPerCustomer(trows, paidByTicket);
          enriched = rows.map((c) => {
            const a = agg.get(c.id);
            return {
              ...c,
              ticket_count: a?.count ?? 0,
              ticket_amount: a?.ticket_amount ?? 0,
              receivables: a?.receivables ?? 0,
            };
          });
        }

        setCustomers(enriched);
        setTotalCount(typeof count === 'number' ? count : rows.length);
      } catch {
        toast.error('Error al cargar clientes');
        setCustomers([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    },
    [supabase, committedFilters, debouncedSearchTerm, listPage]
  );

  const loadCustomersRef = useRef(loadCustomers);
  loadCustomersRef.current = loadCustomers;

  useEffect(() => {
    setListPage(1);
    skipCustomerPageFetchRef.current = true;
    setLoading(true);
    void loadCustomersRef.current(1);
  }, [customerListFilterKey]);

  useEffect(() => {
    if (skipCustomerPageFetchRef.current) {
      skipCustomerPageFetchRef.current = false;
      return;
    }
    setLoading(true);
    void loadCustomersRef.current();
  }, [listPage]);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este cliente?')) return;
    try {
      const orgId = await getActiveOrganizationId(supabase);
      if (!orgId) {
        toast.error('No hay organización activa.');
        return;
      }
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
      toast.success('Cliente eliminado');
      void loadCustomersRef.current();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar cliente');
    }
  };

  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const n = ids.length;
    if (
      !confirm(
        `¿Eliminar ${n} cliente${n === 1 ? '' : 's'} seleccionado${n === 1 ? '' : 's'}? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    setBulkDeleting(true);
    try {
      const orgId = await getActiveOrganizationId(supabase);
      if (!orgId) {
        toast.error('No hay organización activa.');
        return;
      }
      const CHUNK = 80;
      for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK);
        const { error } = await supabase.from('customers').delete().in('id', chunk);
        if (error) throw error;
      }
      toast.success(
        n === 1 ? 'Cliente eliminado' : `${n} clientes eliminados`
      );
      setSelectedIds(new Set());
      await loadCustomersRef.current();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : 'Error al eliminar clientes'
      );
    } finally {
      setBulkDeleting(false);
    }
  };

  const resetFilters = () => {
    const empty = emptyCustomerPanelFilters();
    setFilters(empty);
    setCommittedFilters(empty);
    setSearchTerm('');
  };

  const exportCustomersXlsx = async (mode: 'selected' | 'visible') => {
    let source: Customer[] = [];

    if (mode === 'selected') {
      if (selectedIds.size === 0) {
        toast.info('Marca una o más filas con la casilla o elige «Exportar todos visibles».');
        return;
      }
      const orgId = await getActiveOrganizationId(supabase);
      if (!orgId) {
        toast.error('No hay organización activa.');
        return;
      }
      const memberIds = await fetchActiveOrgMemberUserIds(supabase, orgId);
      const customerScopeOr = customersOrgScopeOr(orgId, memberIds);
      const ticketScopeOr = repairTicketsOrgScopeOr(orgId, memberIds);
      const idArr = Array.from(selectedIds);
      const CHUNK = 80;
      const rows: Customer[] = [];
      for (let i = 0; i < idArr.length; i += CHUNK) {
        const chunk = idArr.slice(i, i + CHUNK);
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .in('id', chunk)
          .or(customerScopeOr);
        if (error) {
          toast.error(error.message || 'Error al leer clientes seleccionados');
          return;
        }
        rows.push(...((data || []) as Customer[]));
      }
      if (rows.length === 0) {
        toast.info('No se encontraron los clientes seleccionados en tu organización.');
        return;
      }
      const ids = rows.map((c) => c.id);
      const { data: ticketRows } = await supabase
        .from('repair_tickets')
        .select('id, customer_id, final_cost, estimated_cost, status, payment_status, deposit_amount')
        .in('customer_id', ids)
        .or(ticketScopeOr);
      const trows = (ticketRows || []) as CustomerTicketAggRow[];
      const paidByTicket = await fetchCompletedPaymentsSumByTicket(
        supabase,
        trows.map((x) => x.id)
      );
      const agg = aggregateTicketsPerCustomer(trows, paidByTicket);
      source = rows.map((c) => {
        const a = agg.get(c.id);
        return {
          ...c,
          ticket_count: a?.count ?? 0,
          ticket_amount: a?.ticket_amount ?? 0,
          receivables: a?.receivables ?? 0,
        };
      });
    } else {
      if (totalCount === 0) {
        toast.info('No hay clientes para exportar.');
        return;
      }
      const orgId = await getActiveOrganizationId(supabase);
      if (!orgId) {
        toast.error('No hay organización activa.');
        return;
      }
      const memberIds = await fetchActiveOrgMemberUserIds(supabase, orgId);
      const ticketScopeOr = repairTicketsOrgScopeOr(orgId, memberIds);
      const customerScopeOr = customersOrgScopeOr(orgId, memberIds);

      const buildQuery = () => {
        let q = supabase.from('customers').select('*').or(customerScopeOr);
        const cf = committedFilters;
        if (cf.name.trim()) {
          q = q.ilike('name', `%${escapeIlikeFragment(cf.name.trim())}%`);
        }
        if (cf.email.trim()) {
          q = q.ilike('email', `%${escapeIlikeFragment(cf.email.trim())}%`);
        }
        if (cf.phone.trim()) {
          q = q.ilike('phone', `%${escapeIlikeFragment(cf.phone.trim())}%`);
        }
        if (cf.organization.trim()) {
          q = q.ilike('organization', `%${escapeIlikeFragment(cf.organization.trim())}%`);
        }
        if (cf.customer_group && cf.customer_group !== 'all') {
          q = q.eq('customer_group', cf.customer_group);
        }
        if (cf.mailchimp_status && cf.mailchimp_status !== 'all') {
          q = q.eq('mailchimp_status', cf.mailchimp_status);
        }
        if (cf.date_from) {
          q = q.gte('created_at', `${cf.date_from}T00:00:00.000Z`);
        }
        if (cf.date_to) {
          q = q.lte('created_at', `${cf.date_to}T23:59:59.999Z`);
        }
        if (debouncedSearchTerm.trim()) {
          const s = escapeIlikeFragment(debouncedSearchTerm.trim());
          q = q.or(`name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`);
        }
        return q.order('created_at', { ascending: false });
      };

      const batch = 200;
      let from = 0;
      while (from < totalCount) {
        const to = from + batch - 1;
        const { data: batchRows, error } = await buildQuery().range(from, to);
        if (error) {
          toast.error(error.message || 'Error al exportar');
          return;
        }
        const chunk = (batchRows || []) as Customer[];
        if (chunk.length === 0) break;
        const ids = chunk.map((c) => c.id);
        const { data: ticketRows } = await supabase
          .from('repair_tickets')
          .select('id, customer_id, final_cost, estimated_cost, status, payment_status, deposit_amount')
          .in('customer_id', ids)
          .or(ticketScopeOr);
        const trows = (ticketRows || []) as CustomerTicketAggRow[];
        const paidByTicket = await fetchCompletedPaymentsSumByTicket(
          supabase,
          trows.map((x) => x.id)
        );
        const agg = aggregateTicketsPerCustomer(trows, paidByTicket);
        source.push(
          ...chunk.map((c) => {
            const a = agg.get(c.id);
            return {
              ...c,
              ticket_count: a?.count ?? 0,
              ticket_amount: a?.ticket_amount ?? 0,
              receivables: a?.receivables ?? 0,
            };
          })
        );
        if (chunk.length < batch) break;
        from += batch;
      }
    }

    if (source.length === 0) {
      toast.info(
        mode === 'selected'
          ? 'Ninguno de los seleccionados aparece en la lista actual.'
          : 'No hay clientes para exportar.'
      );
      return;
    }

    const dataRows = source.map((c) => ({
      name:           c.name,
      first_name:     c.first_name ?? '',
      last_name:      c.last_name ?? '',
      email:          c.email ?? '',
      phone:          c.phone ?? '',
      organization:   c.organization ?? '',
      customer_group: c.customer_group ?? '',
      address:        c.address ?? '',
      city:           c.city ?? '',
      state:          c.state ?? '',
      postal_code:    c.postal_code ?? '',
      country:        c.country ?? '',
      notes:          c.notes ?? '',
      id_type:        c.id_type ?? '',
      id_number:      c.id_number ?? '',
      ticket_count:   c.ticket_count ?? 0,
      ticket_amount:  c.ticket_amount ?? 0,
      mailchimp_status: c.mailchimp_status ?? '',
      ...(showRgpdColumn ? { gdpr_consent: c.gdpr_consent ? 'Sí' : 'No' } : {}),
    }));

    const toastId = toast.loading('Generando Excel…');
    try {
      const baseColumns = [
        { header: 'Nombre completo',   key: 'name',           minWidth: showRgpdColumn ? 24 : 28 },
        { header: 'Nombre',            key: 'first_name',     minWidth: showRgpdColumn ? 16 : 18 },
        { header: 'Apellidos',         key: 'last_name',      minWidth: showRgpdColumn ? 18 : 20 },
        { header: 'Correo electrónico', key: 'email',          minWidth: showRgpdColumn ? 28 : 32 },
        { header: 'Teléfono',          key: 'phone',          minWidth: showRgpdColumn ? 14 : 16 },
        { header: 'Organización',      key: 'organization',   minWidth: showRgpdColumn ? 20 : 24 },
        { header: 'Grupo',             key: 'customer_group', minWidth: showRgpdColumn ? 12 : 14 },
        { header: 'Dirección',         key: 'address',        minWidth: showRgpdColumn ? 24 : 28 },
        { header: 'Ciudad',            key: 'city',           minWidth: showRgpdColumn ? 14 : 16 },
        { header: 'Provincia',         key: 'state',          minWidth: showRgpdColumn ? 14 : 16 },
        { header: 'Código postal',     key: 'postal_code',    minWidth: showRgpdColumn ? 12 : 14 },
        { header: 'País',              key: 'country',        minWidth: showRgpdColumn ? 12 : 14 },
        { header: 'Notas',             key: 'notes',          minWidth: showRgpdColumn ? 24 : 28 },
        { header: 'Tipo documento',    key: 'id_type',        minWidth: showRgpdColumn ? 14 : 16 },
        { header: 'Nº documento',      key: 'id_number',      minWidth: showRgpdColumn ? 16 : 18 },
        { header: 'Órdenes',           key: 'ticket_count',   type: 'number' as const, minWidth: showRgpdColumn ? 10 : 12 },
        { header: 'Total facturado',   key: 'ticket_amount',  type: 'currency' as const, minWidth: showRgpdColumn ? 14 : 16 },
        { header: 'MailChimp',         key: 'mailchimp_status', minWidth: showRgpdColumn ? 12 : 14 },
      ];
      const columns = showRgpdColumn
        ? [
            ...baseColumns,
            { header: 'RGPD conforme', key: 'gdpr_consent', minWidth: 14 },
          ]
        : baseColumns;

      const buffer = await buildXlsx({
        sheetName: 'Clientes',
        title: 'JC ONE FIX — Clientes',
        columns,
        rows: dataRows,
      });
      const scope =
        mode === 'selected'
          ? `${source.length} seleccionado${source.length === 1 ? '' : 's'}`
          : `${source.length} clientes`;
      downloadXlsx(buffer, `clientes_${new Date().toISOString().slice(0, 10)}`);
      toast.success(`Excel exportado: ${scope}`, { id: toastId });
    } catch {
      toast.error('Error al generar el Excel', { id: toastId });
    }
  };

  const handleCustomerCsvSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImporting(true);
    try {
      const orgId = await getActiveOrganizationId(supabase);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !orgId) {
        toast.error('No hay sesión u organización activa.');
        return;
      }

      const isXlsx =
        file.name.endsWith('.xlsx') ||
        file.name.endsWith('.xls') ||
        file.type.includes('spreadsheet') ||
        file.type.includes('ms-excel');

      let headers: string[] = [];
      let rows: string[][] = [];

      if (isXlsx) {
        const smart = await runCustomersExcelSmartImport(file);
        if (!smart.ok) {
          toast.error(smart.message);
          return;
        }
        const { summary, blankRowsSkipped, rowsWithData } = smart;
        {
          const nuevo =
            summary.customersCreated === 1
              ? '1 cliente nuevo'
              : `${summary.customersCreated} clientes nuevos`;
          const reused =
            summary.customersReused === 1
              ? '1 fila reutilizó un contacto existente'
              : `${summary.customersReused} filas reutilizaron un contacto existente`;
          let msg = `Excel importado (mapeo inteligente): ${nuevo}, ${reused} (${summary.rowsProcessed} filas con datos).`;
          if (summary.distinctCustomersInImport < summary.rowsProcessed) {
            msg += ` ${summary.distinctCustomersInImport} contacto${
              summary.distinctCustomersInImport === 1 ? '' : 's'
            } distinto${summary.distinctCustomersInImport === 1 ? '' : 's'} en esta corrida (varias filas compartieron cliente).`;
          }
          if (summary.rowErrors.length > 0) {
            msg += ` Atención: ${summary.rowErrors.length} fila${summary.rowErrors.length === 1 ? '' : 's'} con error — revisá Ajustes → Importar desde Excel.`;
            toast.warning(msg, { duration: 12000 });
          } else {
            toast.success(msg, { duration: 7000 });
          }
        }
        if (blankRowsSkipped > 0) {
          toast.message(
            `En la hoja había ${rowsWithData + blankRowsSkipped} filas bajo la cabecera; ${blankRowsSkipped} vacía${blankRowsSkipped === 1 ? '' : 's'} no se importaron.`,
            { duration: 6000 }
          );
        }
        void loadCustomersRef.current();
        return;
      } else {
        // ── CSV import (camino original)
        const text = await file.text();
        const parsed = parseCustomerCsvText(text);
        headers = parsed.headers;
        rows = parsed.rows;
      }

      if (!headers.length) {
        toast.error('El archivo no tiene cabeceras.');
        return;
      }
      if (!rows.length) {
        toast.error('El archivo no tiene filas de datos.');
        return;
      }

      const fieldByIndex = buildCustomerFieldMapping(headers);

      if (fieldByIndex.size === 0) {
        toast.error(
          'No se reconocen columnas. El archivo debe tener al menos «Nombre», «Email» o «Teléfono».'
        );
        return;
      }

      const payloads: Record<string, unknown>[] = [];
      const rowErrors: string[] = [];

      rows.forEach((cells, i) => {
        // Trim all cell values to avoid whitespace-caused DB errors
        const cleanCells = cells.map((c) => (typeof c === 'string' ? c.trim() : String(c ?? '')));
        while (cleanCells.length < headers.length) cleanCells.push('');
        const raw = csvRowToCustomerPayload(cleanCells, fieldByIndex);
        const rawFilled = fillMissingCustomerFieldsFromRow(raw, cleanCells, fieldByIndex);
        const parsed = payloadToInsert(rawFilled);
        if (!parsed.ok) {
          rowErrors.push(`Fila ${i + 2}: ${parsed.error}`);
          return;
        }
        const d = parsed.data;
        payloads.push({
          user_id: user.id,
          organization_id: orgId,
          name: d.name,
          first_name: d.first_name,
          last_name: d.last_name,
          email: d.email,
          phone: d.phone,
          organization: d.organization,
          customer_group: d.customer_group,
          address: d.address,
          city: d.city,
          state: d.state,
          postal_code: d.postal_code,
          country: d.country,
          notes: d.notes,
          id_type: d.id_type,
          id_number: d.id_number,
          mailchimp_status: d.mailchimp_status,
          gdpr_consent: showRgpdColumn ? d.gdpr_consent : true,
          email_notifications: true,
        });
      });

      if (payloads.length === 0) {
        toast.error(rowErrors.slice(0, 3).join(' · ') || 'Ninguna fila válida para importar.');
        return;
      }

      const CHUNK = 40;
      let inserted = 0;
      for (let i = 0; i < payloads.length; i += CHUNK) {
        const chunk = payloads.slice(i, i + CHUNK);
        const { error } = await supabase.from('customers').insert(chunk);
        if (error) {
          toast.error(error.message || 'Error al insertar clientes');
          if (inserted > 0) void loadCustomersRef.current();
          return;
        }
        inserted += chunk.length;
      }

      toast.success(`Importados ${inserted} cliente${inserted === 1 ? '' : 's'}.`);
      if (rowErrors.length > 0) {
        toast.message(`${rowErrors.length} fila(s) omitida(s)`, {
          description: rowErrors.slice(0, 5).join(' · '),
        });
      }
      void loadCustomersRef.current();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al leer el CSV');
    } finally {
      setImporting(false);
    }
  };

  const pageCount = Math.max(1, Math.ceil(totalCount / CUSTOMERS_PAGE_SIZE));
  const safePage = Math.min(listPage, pageCount);

  useEffect(() => {
    if (listPage > pageCount) setListPage(pageCount);
  }, [listPage, pageCount]);

  const visibleIds = customers.map((c) => String(c.id));
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected =
    visibleIds.length > 0 &&
    !allVisibleSelected &&
    visibleIds.some((id) => selectedIds.has(id));

  const mailchimpBadge = (status: string | null) => {
    if (!status || status === 'No suscrito') {
      return (
        <Badge variant="outline" className="text-xs text-gray-500 border-gray-300">
          No suscrito
        </Badge>
      );
    }
    if (status === 'Suscrito') {
      return (
        <Badge className="text-xs bg-green-100 text-green-700 border-0">
          Suscrito
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs">
        {status}
      </Badge>
    );
  };

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-semibold text-gray-900">Clientes</h1>
            <p className="text-xs md:text-sm text-gray-500 mt-0.5">
              {totalCount.toLocaleString('es-ES')} cliente{totalCount === 1 ? '' : 's'}
            </p>
          </div>
          <input
            ref={csvInputRef}
            id="customers-csv-import-input"
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="sr-only"
            tabIndex={-1}
            disabled={importing}
            onChange={handleCustomerCsvSelected}
          />
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            {/* Filtros: Solo en PC */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="hidden md:flex text-sm gap-1.5 shrink-0"
              onClick={() => setShowFilters(!showFilters)}
              title={
                showFilters
                  ? 'Ocultar panel de filtros'
                  : 'Abrir filtros (nombre, email, fechas…). Importar está en el botón «CSV / Excel».'
              }
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {showFilters ? 'Ocultar filtros' : 'Filtros'}
            </Button>

            {/* CSV/Excel: Solo en PC */}
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="hidden md:flex text-sm gap-1.5 shrink-0"
                  disabled={importing}
                  title="Importar CSV o Excel (Excel usa detección inteligente de columnas) / exportar"
                >
                  {importing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  CSV / Excel
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[11rem]">
                <DropdownMenuItem asChild>
                  <label
                    htmlFor="customers-csv-import-input"
                    className={cn(
                      'flex cursor-pointer items-center gap-2',
                      importing && 'pointer-events-none opacity-50'
                    )}
                  >
                    <Upload className="h-4 w-4 shrink-0" />
                    Importar CSV o Excel
                  </label>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  disabled={selectedIds.size === 0}
                  onSelect={() => void exportCustomersXlsx('selected')}
                >
                  <Download className="h-4 w-4 shrink-0" />
                  Exportar seleccionados
                  {selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onSelect={() => void exportCustomersXlsx('visible')}
                >
                  <Download className="h-4 w-4 shrink-0" />
                  Exportar todos visibles
                  {customers.length > 0 ? ` (${customers.length})` : ''}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Agregar cliente: Visible en ambos */}
            <Link href="/dashboard/customers/new" className="shrink-0 w-full md:w-auto">
              <Button
                size="sm"
                className="gap-1.5 w-full md:w-auto"
              >
                <Plus className="h-4 w-4" />
                Agregar cliente
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="hidden md:block bg-white border-b border-gray-200 px-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Nombre completo
              </label>
              <Input
                placeholder="Buscar por nombre..."
                value={filters.name}
                onChange={(e) =>
                  setFilters({ ...filters, name: e.target.value })
                }
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Correo electrónico
              </label>
              <Input
                placeholder="Buscar por email..."
                value={filters.email}
                onChange={(e) =>
                  setFilters({ ...filters, email: e.target.value })
                }
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Teléfono móvil
              </label>
              <Input
                placeholder="Buscar por teléfono..."
                value={filters.phone}
                onChange={(e) =>
                  setFilters({ ...filters, phone: e.target.value })
                }
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Grupo de clientes
              </label>
              <Select
                value={filters.customer_group}
                onValueChange={(v) =>
                  setFilters({ ...filters, customer_group: v })
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Todos los grupos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los grupos</SelectItem>
                  <SelectItem value="Particular">Particular</SelectItem>
                  <SelectItem value="Empresa">Empresa</SelectItem>
                  <SelectItem value="VIP">VIP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Organización
              </label>
              <Input
                placeholder="Buscar por organización..."
                value={filters.organization}
                onChange={(e) =>
                  setFilters({ ...filters, organization: e.target.value })
                }
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Estado de MailChimp
              </label>
              <Select
                value={filters.mailchimp_status}
                onValueChange={(v) =>
                  setFilters({ ...filters, mailchimp_status: v })
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Suscrito">Suscrito</SelectItem>
                  <SelectItem value="No suscrito">No suscrito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Partir de la fecha
              </label>
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) =>
                  setFilters({ ...filters, date_from: e.target.value })
                }
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Hasta la fecha
              </label>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) =>
                  setFilters({ ...filters, date_to: e.target.value })
                }
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={() => setCommittedFilters({ ...filters })}
            >
              <Search className="h-3 w-3" />
              Buscar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1"
              onClick={resetFilters}
            >
              <RotateCcw className="h-3 w-3" />
              Reiniciar
            </Button>
          </div>
          <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-3 sm:flex-row sm:flex-wrap sm:items-center">
            <span className="text-xs text-gray-500">
              Ajustá los campos y pulsa <strong className="font-medium text-gray-700">Buscar</strong> para aplicar
              filtros al listado. Importar / exportar: botón <strong className="font-medium text-gray-700">CSV / Excel</strong> arriba o aquí.
            </span>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-xs"
                disabled={importing}
                onClick={() => csvInputRef.current?.click()}
              >
                {importing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Upload className="h-3 w-3" />
                )}
                Importar CSV o Excel
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-xs"
                disabled={selectedIds.size === 0}
                onClick={() => void exportCustomersXlsx('selected')}
              >
                <Download className="h-3 w-3" />
                Exportar seleccionados
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={() => void exportCustomersXlsx('visible')}
              >
                <Download className="h-3 w-3" />
                Exportar todos visibles
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto px-3 md:px-6 py-3 md:py-4">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Búsqueda: Móvil más prominente arriba */}
          <div className="px-3 md:px-4 py-3 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Buscar clientes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 md:h-8 text-sm w-full"
                />
              </div>
              {/* Selección: Solo en PC */}
              {selectedIds.size > 0 && (
                <div className="hidden md:flex flex-wrap items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {selectedIds.size} seleccionado(s)
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                    disabled={bulkDeleting}
                    title="Eliminar todos los clientes marcados"
                    onClick={() => void handleDeleteSelected()}
                  >
                    {bulkDeleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5 shrink-0" />
                    )}
                    Eliminar seleccionados
                  </Button>
                </div>
              )}
            </div>
            {/* Resultados: Texto compacto en móvil */}
            <span className="text-xs text-gray-500 text-right">
              {customers.length} resultado{customers.length !== 1 ? 's' : ''}
              <span className="hidden md:block text-[10px] text-gray-400 mt-0.5">
                CSV con «;» para Excel (ES). Exportá desde el menú «CSV / Excel». Importar Excel: primera hoja, fila 1 = cabeceras.
              </span>
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 md:py-16">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-12 md:py-16 text-gray-400 px-4">
              <p className="font-medium text-gray-600">No hay clientes</p>
              <p className="text-sm mt-1">
                Agrega tu primer cliente para comenzar
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    {/* Checkbox: Solo en PC */}
                    <TableHead className="w-10 hidden md:table-cell">
                      <Checkbox
                        checked={
                          allVisibleSelected
                            ? true
                            : someVisibleSelected
                              ? 'indeterminate'
                              : false
                        }
                        onCheckedChange={(checked) => {
                          if (checked === true) {
                            setSelectedIds(
                              new Set(customers.map((c) => String(c.id)))
                            );
                          } else {
                            setSelectedIds(new Set());
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead
                      className={cn(
                        'text-xs font-semibold text-gray-600',
                        showRgpdColumn ? 'min-w-[160px]' : 'min-w-[190px]'
                      )}
                    >
                      Nombre del cliente
                    </TableHead>
                    <TableHead
                      className={cn(
                        'hidden md:table-cell text-xs font-semibold text-gray-600',
                        showRgpdColumn ? 'min-w-[180px]' : 'min-w-[210px]'
                      )}
                    >
                      Correo electrónico
                    </TableHead>
                    <TableHead
                      className={cn(
                        'text-xs font-semibold text-gray-600',
                        showRgpdColumn ? 'min-w-[130px]' : 'min-w-[150px]'
                      )}
                    >
                      Teléfono móvil
                    </TableHead>
                    {/* Ocultas en móvil */}
                    <TableHead
                      className={cn(
                        'hidden md:table-cell text-xs font-semibold text-gray-600',
                        showRgpdColumn ? 'min-w-[150px]' : 'min-w-[175px]'
                      )}
                    >
                      Organización
                    </TableHead>
                    <TableHead
                      className={cn(
                        'hidden md:table-cell text-xs font-semibold text-gray-600 text-right',
                        showRgpdColumn ? 'min-w-[80px]' : 'min-w-[92px]'
                      )}
                    >
                      Entradas
                    </TableHead>
                    <TableHead
                      className={cn(
                        'hidden md:table-cell text-xs font-semibold text-gray-600 text-right',
                        showRgpdColumn ? 'min-w-[120px]' : 'min-w-[135px]'
                      )}
                    >
                      {loc.isAR ? 'Monto de órdenes' : 'Monto de tickets'}
                    </TableHead>
                    <TableHead
                      className={cn(
                        'hidden md:table-cell text-xs font-semibold text-gray-600 text-right',
                        showRgpdColumn ? 'min-w-[130px]' : 'min-w-[148px]'
                      )}
                    >
                      {loc.isAR ? 'Saldo pendiente' : 'Amount receivables'}
                    </TableHead>
                    <TableHead
                      className={cn(
                        'hidden md:table-cell text-xs font-semibold text-gray-600',
                        showRgpdColumn ? 'min-w-[120px]' : 'min-w-[140px]'
                      )}
                    >
                      Grupo de clientes
                    </TableHead>
                    {showRgpdColumn && (
                      <TableHead className="hidden md:table-cell text-xs font-semibold text-gray-600 min-w-[120px]">
                        RGPD
                      </TableHead>
                    )}
                    <TableHead
                      className={cn(
                        'hidden md:table-cell text-xs font-semibold text-gray-600',
                        showRgpdColumn ? 'min-w-[120px]' : 'min-w-[135px]'
                      )}
                    >
                      MailChimp
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-gray-600 min-w-[80px] md:min-w-[88px] text-center whitespace-nowrap">
                      WhatsApp
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-gray-600 w-16 md:w-20 text-center">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow
                      key={customer.id}
                      className="hover:bg-gray-50 group"
                    >
                      {/* Checkbox: Solo en PC */}
                      <TableCell className="hidden md:table-cell">
                        <Checkbox
                          checked={selectedIds.has(String(customer.id))}
                          onCheckedChange={(checked) => {
                            const id = String(customer.id);
                            setSelectedIds((prev) => {
                              const next = new Set(prev);
                              if (checked === true) next.add(id);
                              else next.delete(id);
                              return next;
                            });
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/dashboard/customers/${customer.id}`}
                          className="text-xs md:text-sm font-medium text-primary hover:underline"
                        >
                          {customer.name}
                        </Link>
                      </TableCell>
                      {/* Email: Oculto en móvil */}
                      <TableCell className="hidden md:table-cell">
                        {customer.email ? (
                          <a
                            href={`mailto:${customer.email}`}
                            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary"
                          >
                            <Mail className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            {customer.email}
                          </a>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {customer.phone ? (
                          <a
                            href={`tel:${customer.phone}`}
                            className="flex items-center gap-1.5 text-xs md:text-sm text-gray-600 hover:text-primary"
                          >
                            <Phone className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            {customer.phone}
                          </a>
                        ) : (
                          <span className="text-gray-400 text-xs md:text-sm">-</span>
                        )}
                      </TableCell>
                      {/* Organización: Solo en PC */}
                      <TableCell className="hidden md:table-cell">
                        {customer.organization ? (
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <Building2 className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            {customer.organization}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      {/* Entradas: Solo en PC */}
                      <TableCell className="hidden md:table-cell text-right">
                        <span className="text-sm font-medium text-gray-700">
                          {customer.ticket_count || 0}
                        </span>
                      </TableCell>
                      {/* Monto: Solo en PC */}
                      <TableCell className="hidden md:table-cell text-right">
                        <span className="text-sm font-medium text-gray-700">
                          {loc.format(customer.ticket_amount || 0)}
                        </span>
                      </TableCell>
                      {/* Saldo: Solo en PC */}
                      <TableCell className="hidden md:table-cell text-right">
                        <span className="text-sm font-medium text-gray-700">
                          {loc.format(customer.receivables || 0)}
                        </span>
                      </TableCell>
                      {/* Grupo: Solo en PC */}
                      <TableCell className="hidden md:table-cell">
                        {customer.customer_group ? (
                          <Badge
                            variant="outline"
                            className="text-xs text-gray-600 border-gray-300"
                          >
                            {customer.customer_group}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      {/* RGPD: Solo en PC */}
                      {showRgpdColumn && (
                        <TableCell className="hidden md:table-cell">
                          {customer.gdpr_consent ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <UserCheck className="h-4 w-4" />
                              <span className="text-xs">Conforme</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-red-500">
                              <UserX className="h-4 w-4" />
                              <span className="text-xs">No conforme</span>
                            </div>
                          )}
                        </TableCell>
                      )}
                      {/* MailChimp: Solo en PC */}
                      <TableCell className="hidden md:table-cell">
                        {mailchimpBadge(customer.mailchimp_status)}
                      </TableCell>
                      <TableCell className="text-center">
                        <WhatsAppQuickIconButton
                          className="!px-2 !py-1 text-xs"
                          disabled={!customer.phone?.trim()}
                          onClick={() => {
                            if (!customer.phone?.trim()) {
                              toast.error('Este cliente no tiene teléfono');
                              return;
                            }
                            setWaModal({
                              name: customer.name || 'Cliente',
                              phone: customer.phone,
                            });
                          }}
                        />
                      </TableCell>
                      <TableCell className="p-1 md:p-4">
                        <div className="flex items-center justify-center gap-0.5 md:gap-1">
                          <Link href={`/dashboard/customers/${customer.id}`}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 md:h-7 md:w-7 p-0"
                            >
                              <Pencil className="h-3 w-3 md:h-3.5 md:w-3.5 text-gray-500" />
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 md:h-7 md:w-7 p-0"
                            onClick={() => handleDelete(customer.id)}
                          >
                            <Trash2 className="h-3 w-3 md:h-3.5 md:w-3.5 text-red-500" />
                          </Button>
                          {/* Dropdown solo en PC */}
                          <div className="hidden md:block">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                >
                                  <MoreHorizontal className="h-3.5 w-3.5 text-gray-500" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/dashboard/customers/${customer.id}`}>
                                    Ver detalles
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/dashboard/recepcion?customerId=${customer.id}`}>
                                    Nuevo ingreso (recepción)
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/dashboard/tickets/new?customerId=${customer.id}`}>
                                    Nuevo ticket (formulario completo)
                                  </Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {!loading && totalCount > 0 && pageCount > 1 ? (
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
              <span>
                Página {safePage} de {pageCount} · {(safePage - 1) * CUSTOMERS_PAGE_SIZE + 1}–
                {Math.min(safePage * CUSTOMERS_PAGE_SIZE, totalCount)} de {totalCount.toLocaleString('es-ES')}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={safePage <= 1}
                  onClick={() => setListPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={safePage >= pageCount}
                  onClick={() => setListPage((p) => Math.min(pageCount, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <WhatsAppQuickSendModal
        open={!!waModal}
        onOpenChange={(open) => {
          if (!open) setWaModal(null);
        }}
        customerName={waModal?.name ?? ''}
        phone={waModal?.phone}
      />
    </div>
  );
}
