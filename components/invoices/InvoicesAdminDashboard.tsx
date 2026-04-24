'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getActiveOrganizationId } from '@/lib/dashboard-org';
import { useOrgLocale } from '@/lib/hooks/useOrgLocale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  ChevronDown,
  Copy,
  Download,
  Euro,
  FileText,
  Filter,
  Loader2,
  Mail,
  MoreHorizontal,
  PenLine,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Save,
  Search,
  Send,
  Signature,
  Trash2,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { openInvoicePrintTab } from '@/lib/invoice-print-deliver';
import { waMeUrlForPhone } from '@/lib/wa-me';
import { WhatsAppLogo } from '@/components/whatsapp/WhatsAppLogo';
import { humanizeInvoicesOrganizationsRelationshipError } from '@/lib/supabase-setup-hints';
import {
  exportInvoicesCsv,
  invoiceBalance,
  invoicePaymentDisplay,
  paymentDisplayBadgeClass,
  paymentDisplayLabel,
  periodBounds,
  referenceLabel,
  type PeriodPreset,
} from '@/lib/invoice-dashboard';
import { parsePosSalesDashboardAggregates } from '@/lib/pos-sales-dashboard-aggregates';
import type { Database } from '@/lib/supabase/types';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

type PosDashboardRpcArgs = Database['public']['Functions']['get_pos_sales_dashboard_aggregates']['Args'];
type RepairPaymentsSumRpcArgs = Database['public']['Functions']['get_dashboard_repair_payments_sum']['Args'];

type OrgEmbed = { name: string | null; country: string | null } | null;
type TicketEmbed = { ticket_number: string | null } | null;

/** Select sin embeds (si PostgREST no ve FK hacia organizations/repair_tickets). */
const INVOICES_SELECT_FLAT =
  'id, created_at, shop_owner_id, organization_id, ticket_id, invoice_number, customer_name, customer_email, customer_phone, customer_tax_id, customer_billing_address, customer_iva_condition_ar, ar_internal_only, subtotal, tax_amount, discount_amount, total_amount, paid_amount, refunded_amount, status, payment_status, payment_method, paid_at, external_reference, created_by_user_id, billing_jurisdiction, customer_signature_url';

/** `!invoices_ticket_id_fkey`: hay otra FK repair_tickets → invoices (p. ej. return_related_invoice_id). */
const INVOICES_SELECT_WITH_EMBEDS = `${INVOICES_SELECT_FLAT}, organizations(name, country), repair_tickets!invoices_ticket_id_fkey(ticket_number)`;

function isPostgrestEmbedRelationshipError(err: unknown): boolean {
  const m = String((err as { message?: string })?.message || '');
  const l = m.toLowerCase();
  if (!l.includes('relationship')) return false;
  return (
    l.includes('schema cache') ||
    l.includes('could not find') ||
    l.includes('more than one relationship') ||
    l.includes('more than one foreign key')
  );
}

async function mergeInvoiceRowsWithEmbeds(supabase: any, rows: Record<string, unknown>[]): Promise<InvoiceRow[]> {
  if (!rows.length) return [];
  const orgIds = Array.from(
    new Set(rows.map((r) => r.organization_id).filter(Boolean) as string[])
  );
  const ticketIds = Array.from(
    new Set(rows.map((r) => r.ticket_id).filter(Boolean) as string[])
  );
  const orgMap = new Map<string, { name: string | null; country: string | null }>();
  if (orgIds.length) {
    const { data: orgs } = await supabase.from('organizations').select('id, name, country').in('id', orgIds);
    for (const o of orgs || []) {
      orgMap.set(String(o.id), { name: o.name ?? null, country: o.country ?? null });
    }
  }
  const ticketMap = new Map<string, string | null>();
  if (ticketIds.length) {
    const { data: tix } = await supabase.from('repair_tickets').select('id, ticket_number').in('id', ticketIds);
    for (const t of tix || []) {
      ticketMap.set(String(t.id), t.ticket_number != null ? String(t.ticket_number) : null);
    }
  }
  return rows.map((r) => {
    const oid = r.organization_id as string | null;
    const tid = r.ticket_id as string | null;
    return {
      ...r,
      organizations: oid ? orgMap.get(oid) ?? null : null,
      repair_tickets: tid ? { ticket_number: ticketMap.get(tid) ?? null } : null,
    } as InvoiceRow;
  });
}

export type InvoiceRow = {
  id: string;
  created_at: string;
  shop_owner_id: string;
  organization_id: string | null;
  ticket_id: string | null;
  invoice_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  customer_tax_id: string | null;
  customer_billing_address: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  refunded_amount?: number | null;
  status: string;
  payment_status: string;
  payment_method: string | null;
  paid_at: string | null;
  external_reference: string | null;
  created_by_user_id: string | null;
  billing_jurisdiction: string | null;
  customer_iva_condition_ar?: string | null;
  ar_internal_only?: boolean | null;
  customer_signature_url?: string | null;
  organizations?: OrgEmbed;
  repair_tickets?: TicketEmbed;
};

type SavedFilterRow = {
  id: string;
  name: string;
  filter_json: Record<string, unknown>;
};

const PERIOD_LABEL: Record<PeriodPreset, string> = {
  all: 'Todo',
  today: 'Hoy',
  yesterday: 'Ayer',
  last7: 'Últimos 7 días',
  thisMonth: 'Este mes',
  lastMonth: 'Mes pasado',
  thisYear: 'Este año',
  custom: 'Personalizado',
};

const CHART_COLORS = ['#0d9488', '#f59e0b', '#64748b', '#8b5cf6', '#ef4444', '#0ea5e9'];

type Props = {
  onCreateInvoice: () => void;
  reloadToken?: number;
};

export function InvoicesAdminDashboard({ onCreateInvoice, reloadToken = 0 }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const loc = useOrgLocale();
  const money = (n: number) => loc.format(n);
  const pageHeading = loc.isAR ? 'Mis Ventas' : 'Administrar facturas';

  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [openBalanceTotal, setOpenBalanceTotal] = useState<number | null>(null);

  const [periodTab, setPeriodTab] = useState<PeriodPreset>('lastMonth');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterInvoiceId, setFilterInvoiceId] = useState('');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [criteriaExtra, setCriteriaExtra] = useState<string>('all');

  const [employeeOptions, setEmployeeOptions] = useState<{ id: string; label: string }[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilterRow[]>([]);
  const [selectedSavedFilterId, setSelectedSavedFilterId] = useState<string>('');

  const [showCharts, setShowCharts] = useState(true);
  const [overviewMode, setOverviewMode] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteBusy, setBulkDeleteBusy] = useState(false);
  /** Misma suma que Inicio → Resumen (taller+POS) para el mismo rango de fechas que las facturas listadas. */
  const [resumenPeriodIncome, setResumenPeriodIncome] = useState<number | null>(null);

  const [payOpen, setPayOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<InvoiceRow | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [payNotes, setPayNotes] = useState('');
  const [payBusy, setPayBusy] = useState(false);

  const [sigOpen, setSigOpen] = useState(false);
  const [sigTarget, setSigTarget] = useState<InvoiceRow | null>(null);
  const [sigUrl, setSigUrl] = useState('');
  const [sigBusy, setSigBusy] = useState(false);

  // ── Modal Editar Factura ──────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<InvoiceRow | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  type EditLine = { id?: string; description: string; quantity: number; unit_price: number; total_price: number };
  const [editLines, setEditLines] = useState<EditLine[]>([]);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerEmail, setEditCustomerEmail] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editCustomerTaxId, setEditCustomerTaxId] = useState('');
  const [editCustomerAddress, setEditCustomerAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState('');
  const [editStatus, setEditStatus] = useState('');

  const openEdit = async (inv: InvoiceRow) => {
    setEditTarget(inv);
    setEditCustomerName(inv.customer_name || '');
    setEditCustomerEmail(inv.customer_email || '');
    setEditCustomerPhone(inv.customer_phone || '');
    setEditCustomerTaxId(inv.customer_tax_id || '');
    setEditCustomerAddress(inv.customer_billing_address || '');
    setEditNotes((inv as any).notes || '');
    setEditDueDate((inv as any).due_date ? String((inv as any).due_date).slice(0, 10) : '');
    setEditPaymentMethod(inv.payment_method || 'cash');
    setEditStatus(inv.status || 'draft');
    // load lines
    const { data: items } = await (supabase as any)
      .from('invoice_items')
      .select('id, description, quantity, unit_price, total_price')
      .eq('invoice_id', inv.id);
    setEditLines((items || []).map((i: any) => ({
      id: i.id,
      description: String(i.description || ''),
      quantity: Number(i.quantity || 1),
      unit_price: Number(i.unit_price || 0),
      total_price: Number(i.total_price || 0),
    })));
    setEditOpen(true);
  };

  const editLineChange = (idx: number, field: keyof EditLine, value: string) => {
    setEditLines(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      const updated = { ...l, [field]: field === 'description' ? value : Number(value) || 0 };
      if (field === 'quantity' || field === 'unit_price') {
        updated.total_price = updated.quantity * updated.unit_price;
      }
      return updated;
    }));
  };

  const submitEdit = async () => {
    if (!editTarget) return;
    setEditBusy(true);
    try {
      const subtotal = editLines.reduce((s, l) => s + l.total_price, 0);
      const { error: invErr } = await (supabase as any)
        .from('invoices')
        .update({
          customer_name: editCustomerName.trim() || editTarget.customer_name,
          customer_email: editCustomerEmail.trim() || null,
          customer_phone: editCustomerPhone.trim() || null,
          customer_tax_id: editCustomerTaxId.trim() || null,
          customer_billing_address: editCustomerAddress.trim() || null,
          notes: editNotes.trim() || null,
          due_date: editDueDate || null,
          payment_method: editPaymentMethod || null,
          status: editStatus,
          subtotal,
          total_amount: subtotal,
        })
        .eq('id', editTarget.id);
      if (invErr) throw invErr;

      // Delete old items and re-insert
      await (supabase as any).from('invoice_items').delete().eq('invoice_id', editTarget.id);
      if (editLines.length) {
        const rows = editLines.map(l => ({
          invoice_id: editTarget.id,
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          total_price: l.total_price,
        }));
        const { error: itemsErr } = await (supabase as any).from('invoice_items').insert(rows);
        if (itemsErr) throw itemsErr;
      }

      toast.success('Factura actualizada');
      setEditOpen(false);
      setEditTarget(null);
      void loadInvoices('quiet');
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo guardar');
    } finally {
      setEditBusy(false);
    }
  };

  const loadEmployees = useCallback(
    async (oid: string | null) => {
      if (!oid) {
        setEmployeeOptions([]);
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, first_name, last_name')
        .eq('organization_id', oid);
      if (error) {
        setEmployeeOptions([]);
        return;
      }
      const opts = (data || []).map((p: any) => {
        const label =
          [p.first_name, p.last_name].filter(Boolean).join(' ').trim() ||
          p.full_name?.trim() ||
          p.id.slice(0, 8);
        return { id: p.id, label };
      });
      setEmployeeOptions(opts);
    },
    [supabase]
  );

  const loadSavedFiltersList = useCallback(
    async (oid: string | null, uid: string | null) => {
      if (!oid || !uid) {
        setSavedFilters([]);
        return;
      }
      const { data, error } = await (supabase as any)
        .from('invoice_saved_filters')
        .select('id, name, filter_json')
        .eq('organization_id', oid)
        .eq('user_id', uid)
        .order('created_at', { ascending: false });
      if (error) {
        setSavedFilters([]);
        return;
      }
      setSavedFilters(data || []);
    },
    [supabase]
  );

  const loadInvoices = useCallback(
    async (mode: 'full' | 'quiet' = 'full') => {
      if (mode === 'full') setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const oid = user ? await getActiveOrganizationId(supabase) : null;
        setOrgId(oid);
        if (user) {
          void loadEmployees(oid);
          void loadSavedFiltersList(oid, user.id);
        }

        const bounds =
          periodTab === 'custom'
            ? periodBounds('custom', customStart, customEnd)
            : periodBounds(periodTab);

        const buildBaseQuery = (selectStr: string) => {
          let qq = (supabase as any)
            .from('invoices')
            .select(selectStr)
            .order('created_at', { ascending: false })
            .limit(1000);
          qq = oid ? qq.eq('organization_id', oid) : qq;
          if (bounds) {
            qq = qq.gte('created_at', bounds.start.toISOString()).lte('created_at', bounds.end.toISOString());
          }
          return qq;
        };

        let { data, error } = await buildBaseQuery(INVOICES_SELECT_WITH_EMBEDS);
        if (error && isPostgrestEmbedRelationshipError(error)) {
          const r2 = await buildBaseQuery(INVOICES_SELECT_FLAT);
          if (r2.error) throw r2.error;
          data = await mergeInvoiceRowsWithEmbeds(supabase, (r2.data || []) as Record<string, unknown>[]);
        } else if (error) {
          throw error;
        } else {
          data = (data || []) as InvoiceRow[];
        }
        setRows(data as InvoiceRow[]);

        let resumenTotal: number | null = null;
        if (oid && bounds) {
          const fromIso = bounds.start.toISOString();
          const toIso = bounds.end.toISOString();
          const posArgs = {
            p_organization_id: oid,
            p_from: fromIso,
            p_to: toIso,
          } as PosDashboardRpcArgs;
          const repArgs = {
            p_organization_id: oid,
            p_from: fromIso,
            p_to: toIso,
          } as RepairPaymentsSumRpcArgs;
          const [posRes, repRes] = await Promise.all([
            supabase.rpc('get_pos_sales_dashboard_aggregates', posArgs),
            supabase.rpc('get_dashboard_repair_payments_sum', repArgs),
          ]);
          if (posRes.error) console.error('[Mis ventas] get_pos_sales_dashboard_aggregates', posRes.error);
          if (repRes.error) console.error('[Mis ventas] get_dashboard_repair_payments_sum', repRes.error);
          const posParsed =
            !posRes.error && posRes.data != null ? parsePosSalesDashboardAggregates(posRes.data) : null;
          const posT = posParsed?.period.pos_total ?? 0;
          const repT = !repRes.error && repRes.data != null ? Number(repRes.data) : 0;
          resumenTotal = posT + repT;
        }
        setResumenPeriodIncome(resumenTotal);

        if (oid) {
          const { data: bal, error: balErr } = await (supabase as any).rpc('organization_invoice_open_balance', {
            p_organization_id: oid,
          });
          if (!balErr && bal != null) setOpenBalanceTotal(Number(bal));
          else setOpenBalanceTotal(null);
        } else {
          setOpenBalanceTotal(null);
        }
      } catch (e: any) {
        toast.error(
          humanizeInvoicesOrganizationsRelationshipError(String(e?.message || '')) ||
            e?.message ||
            'No se pudieron cargar las facturas'
        );
        setRows([]);
        setOpenBalanceTotal(null);
        setResumenPeriodIncome(null);
      } finally {
        if (mode === 'full') setLoading(false);
      }
    },
    [supabase, periodTab, customStart, customEnd, loadEmployees, loadSavedFiltersList]
  );

  useEffect(() => {
    void loadInvoices('full');
  }, [loadInvoices]);

  useEffect(() => {
    if (reloadToken > 0) void loadInvoices('quiet');
  }, [reloadToken, loadInvoices]);

  const filtered = useMemo(() => {
    const cn = filterCustomer.trim().toLowerCase();
    const invQ = filterInvoiceId.trim().toLowerCase();
    return rows.filter((inv) => {
      if (cn && !inv.customer_name.toLowerCase().includes(cn)) return false;
      if (invQ) {
        const hit =
          inv.invoice_number.toLowerCase().includes(invQ) || inv.id.toLowerCase().includes(invQ);
        if (!hit) return false;
      }
      if (filterPayment !== 'all') {
        const d = invoicePaymentDisplay(inv);
        if (d !== filterPayment) return false;
      }
      if (filterEmployee !== 'all') {
        if ((inv.created_by_user_id || '') !== filterEmployee) return false;
      }
      if (criteriaExtra === 'with_ticket' && !inv.ticket_id) return false;
      if (criteriaExtra === 'no_ticket' && inv.ticket_id) return false;
      return true;
    });
  }, [rows, filterCustomer, filterInvoiceId, filterPayment, filterEmployee, criteriaExtra]);

  const kpis = useMemo(() => {
    let totalSales = 0;
    let totalTax = 0;
    let totalRefunds = 0;
    let taxable = 0;
    let nonTaxable = 0;
    let arFiltered = 0;
    for (const inv of filtered) {
      if (inv.status === 'cancelled') continue;
      totalSales += Number(inv.total_amount || 0);
      totalTax += Number(inv.tax_amount || 0);
      totalRefunds += Number(inv.refunded_amount || 0);
      const base = Math.max(0, Number(inv.subtotal || 0) - Number(inv.discount_amount || 0));
      if (Number(inv.tax_amount || 0) > 0.001) taxable += base;
      else nonTaxable += base;
      const disp = invoicePaymentDisplay(inv);
      if (disp !== 'paid' && disp !== 'cancelled' && disp !== 'draft' && disp !== 'refunded') {
        arFiltered += invoiceBalance(inv);
      }
    }
    return {
      totalSales,
      invoiceCount: filtered.filter((i) => i.status !== 'cancelled').length,
      totalTax,
      totalRefunds,
      arFiltered,
      taxable,
      nonTaxable,
    };
  }, [filtered]);

  const salesPayChart = useMemo(() => {
    let paid = 0;
    let unpaid = 0;
    for (const inv of filtered) {
      if (inv.status === 'cancelled') continue;
      paid += Number(inv.paid_amount || 0);
      unpaid += invoiceBalance(inv);
    }
    const refunds = filtered.reduce((s, i) => s + Number(i.refunded_amount || 0), 0);
    return [
      { name: 'Cobrado', value: Math.max(0, paid) },
      { name: 'Pendiente', value: Math.max(0, unpaid) },
      { name: 'Reembolsos', value: Math.max(0, refunds) },
    ].filter((x) => x.value > 0.01);
  }, [filtered]);

  const statusChart = useMemo(() => {
    const map = new Map<string, number>();
    for (const inv of filtered) {
      const d = invoicePaymentDisplay(inv);
      map.set(d, (map.get(d) || 0) + 1);
    }
    return Array.from(map.entries()).map(([name, value]) => ({
      name: paymentDisplayLabel(name as import('@/lib/invoice-dashboard').InvoicePaymentDisplay),
      value,
      key: name,
    }));
  }, [filtered]);

  const resetFilters = () => {
    setFilterCustomer('');
    setFilterInvoiceId('');
    setFilterPayment('all');
    setFilterEmployee('all');
    setCriteriaExtra('all');
    setSelectedSavedFilterId('');
  };

  const captureFilterState = (): Record<string, unknown> => ({
    periodTab,
    customStart,
    customEnd,
    filterCustomer,
    filterInvoiceId,
    filterPayment,
    filterEmployee,
    criteriaExtra,
  });

  const applyFilterState = (j: Record<string, unknown>) => {
    if (typeof j.periodTab === 'string') setPeriodTab(j.periodTab as PeriodPreset);
    if (typeof j.customStart === 'string') setCustomStart(j.customStart);
    if (typeof j.customEnd === 'string') setCustomEnd(j.customEnd);
    if (typeof j.filterCustomer === 'string') setFilterCustomer(j.filterCustomer);
    if (typeof j.filterInvoiceId === 'string') setFilterInvoiceId(j.filterInvoiceId);
    if (typeof j.filterPayment === 'string') setFilterPayment(j.filterPayment);
    if (typeof j.filterEmployee === 'string') setFilterEmployee(j.filterEmployee);
    if (typeof j.criteriaExtra === 'string') setCriteriaExtra(j.criteriaExtra);
  };

  const saveCurrentFilter = async () => {
    const name = window.prompt('Nombre del filtro');
    if (!name?.trim()) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !orgId) {
      toast.error('Sesión u organización no disponible');
      return;
    }
    const { error } = await (supabase as any).from('invoice_saved_filters').insert({
      organization_id: orgId,
      user_id: user.id,
      name: name.trim(),
      filter_json: captureFilterState(),
    });
    if (error) {
      toast.error(error.message || 'No se pudo guardar el filtro');
      return;
    }
    toast.success('Filtro guardado');
    void loadSavedFiltersList(orgId, user.id);
  };

  const onPickSavedFilter = (id: string) => {
    setSelectedSavedFilterId(id);
    const row = savedFilters.find((x) => x.id === id);
    if (row?.filter_json && typeof row.filter_json === 'object') {
      applyFilterState(row.filter_json as Record<string, unknown>);
      toast.success('Filtro aplicado');
    }
  };

  const toggleSelect = (id: string, on: boolean) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
  };

  const toggleSelectAll = (on: boolean) => {
    if (on) setSelectedIds(new Set(filtered.map((r) => r.id)));
    else setSelectedIds(new Set());
  };

  const exportCsv = () => {
    const data = filtered.map((inv) => ({
      Identificación: inv.invoice_number,
      Referencia: referenceLabel(inv),
      Fecha: new Date(inv.created_at).toLocaleString('es-ES'),
      Cliente: inv.customer_name,
      Organización: inv.organizations?.name || '—',
      Estado: paymentDisplayLabel(invoicePaymentDisplay(inv)),
      Pagado: Number(inv.paid_amount || 0).toFixed(2),
      Pendiente: invoiceBalance(inv).toFixed(2),
      Impuesto: Number(inv.tax_amount || 0).toFixed(2),
      Total: Number(inv.total_amount || 0).toFixed(2),
    }));
    exportInvoicesCsv(data, `facturas-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success('Exportación lista');
  };

  const cloneInvoice = async (inv: InvoiceRow) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: full, error: e1 } = await (supabase as any)
        .from('invoices')
        .select(
          'customer_id, customer_name, customer_email, customer_phone, customer_tax_id, customer_billing_address, customer_iva_condition_ar, subtotal, tax_amount, discount_amount, total_amount, payment_method, notes, due_date, external_reference, billing_jurisdiction, ar_cae, ar_cbte_tipo, ar_punto_venta, ar_numero_cbte, ar_cuit_emisor'
        )
        .eq('id', inv.id)
        .single();
      if (e1 || !full) throw e1 || new Error('Factura no encontrada');
      const { data: lines, error: e2 } = await (supabase as any)
        .from('invoice_items')
        .select('description, quantity, unit_price, total_price')
        .eq('invoice_id', inv.id);
      if (e2) throw e2;

      const organizationId = await getActiveOrganizationId(supabase);
      const insertBody = {
        shop_owner_id: user.id,
        organization_id: organizationId,
        ticket_id: null,
        customer_id: full.customer_id ?? null,
        invoice_number: `INV-${Date.now()}`,
        customer_name: full.customer_name,
        customer_email: full.customer_email,
        customer_phone: full.customer_phone,
        customer_tax_id: full.customer_tax_id,
        customer_billing_address: full.customer_billing_address,
        customer_iva_condition_ar: full.customer_iva_condition_ar ?? null,
        ar_internal_only: (full.billing_jurisdiction || '') === 'AR',
        subtotal: full.subtotal,
        tax_amount: full.tax_amount,
        discount_amount: full.discount_amount,
        total_amount: full.total_amount,
        status: 'draft',
        payment_status: 'pending',
        payment_method: full.payment_method,
        paid_amount: 0,
        refunded_amount: 0,
        notes: full.notes,
        due_date: full.due_date,
        external_reference: full.external_reference,
        created_by_user_id: user.id,
        billing_jurisdiction: full.billing_jurisdiction || 'ES',
        clone_of_invoice_id: inv.id,
      };

      const { data: ins, error: e3 } = await (supabase as any)
        .from('invoices')
        .insert([insertBody])
        .select('id')
        .single();
      if (e3) throw e3;

      const itemRows = (lines || []).map((L: any) => ({
        invoice_id: ins.id,
        description: L.description,
        quantity: L.quantity,
        unit_price: L.unit_price,
        total_price: L.total_price,
      }));
      if (itemRows.length) {
        const { error: e4 } = await (supabase as any).from('invoice_items').insert(itemRows);
        if (e4) throw e4;
      }
      toast.success('Factura clonada (borrador)');
      void loadInvoices('quiet');
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo clonar');
    }
  };

  const deleteInvoice = async (inv: InvoiceRow) => {
    if (inv.status !== 'draft' && inv.status !== 'cancelled') {
      toast.error('Solo se pueden eliminar borradores o canceladas');
      return;
    }
    if (!window.confirm('¿Eliminar esta factura?')) return;
    const { error } = await (supabase as any).from('invoices').delete().eq('id', inv.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Factura eliminada');
    void loadInvoices('quiet');
  };

  const deleteSelectedInvoices = async () => {
    const rows = filtered.filter((inv) => selectedIds.has(inv.id));
    const deletable = rows.filter((inv) => inv.status === 'draft' || inv.status === 'cancelled');
    const blocked = rows.length - deletable.length;
    if (deletable.length === 0) {
      toast.error(
        blocked > 0
          ? 'Las facturas seleccionadas no son borrador ni canceladas. Solo esas se pueden eliminar aquí.'
          : 'Seleccioná al menos una factura.',
      );
      return;
    }
    const msg =
      blocked > 0
        ? `Se eliminarán ${deletable.length} factura(s) (borrador o cancelada). ${blocked} con otro estado se omitirán. ¿Continuar?`
        : `¿Eliminar ${deletable.length} factura(s) seleccionada(s)?`;
    if (!window.confirm(msg)) return;

    setBulkDeleteBusy(true);
    try {
      const ids = deletable.map((i) => i.id);
      const { error } = await (supabase as any).from('invoices').delete().in('id', ids);
      if (error) throw error;
      toast.success(`${ids.length} factura(s) eliminada(s)`);
      setSelectedIds(new Set());
      void loadInvoices('quiet');
    } catch (e: any) {
      toast.error(e?.message || 'No se pudieron eliminar las facturas');
    } finally {
      setBulkDeleteBusy(false);
    }
  };

  const openPay = (inv: InvoiceRow) => {
    setPayTarget(inv);
    setPayAmount(String(invoiceBalance(inv).toFixed(2)));
    setPayMethod(inv.payment_method || 'cash');
    setPayNotes('');
    setPayOpen(true);
  };

  const submitPayment = async () => {
    if (!payTarget) return;
    const amt = Math.max(0, Number(payAmount.replace(',', '.')));
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error('Importe no válido');
      return;
    }
    setPayBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Sesión inválida');

      const total = Number(payTarget.total_amount || 0);
      const cur = Number(payTarget.paid_amount || 0);
      const newPaid = Math.min(total, cur + amt);
      let ps = 'partial';
      if (newPaid >= total - 0.01) ps = 'paid';

      const { error: pErr } = await (supabase as any).from('payments').insert({
        shop_owner_id: user.id,
        invoice_id: payTarget.id,
        amount: amt,
        payment_method: payMethod,
        notes: payNotes.trim() || null,
      });
      if (pErr) throw pErr;

      const nextStatus =
        ps === 'paid' ? 'paid' : payTarget.status === 'draft' ? 'sent' : payTarget.status;
      const { error: uErr } = await (supabase as any)
        .from('invoices')
        .update({
          paid_amount: newPaid,
          payment_status: ps,
          status: nextStatus,
          paid_at: ps === 'paid' ? new Date().toISOString() : payTarget.paid_at,
        })
        .eq('id', payTarget.id);
      if (uErr) throw uErr;

      toast.success('Pago registrado');
      setPayOpen(false);
      setPayTarget(null);
      void loadInvoices('quiet');
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo registrar el pago');
    } finally {
      setPayBusy(false);
    }
  };

  const openSig = (inv: InvoiceRow) => {
    setSigTarget(inv);
    setSigUrl(inv.customer_signature_url || '');
    setSigOpen(true);
  };

  const submitSignature = async () => {
    if (!sigTarget) return;
    setSigBusy(true);
    try {
      const { error } = await (supabase as any)
        .from('invoices')
        .update({ customer_signature_url: sigUrl.trim() || null })
        .eq('id', sigTarget.id);
      if (error) throw error;
      toast.success('Firma guardada');
      setSigOpen(false);
      void loadInvoices('quiet');
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo guardar');
    } finally {
      setSigBusy(false);
    }
  };

  const sendLinks = (inv: InvoiceRow) => {
    const printUrl =
      typeof window !== 'undefined' ? `${window.location.origin}/dashboard/invoices/print/${inv.id}` : '';
    return { printUrl, wa: waMeUrlForPhone(inv.customer_phone, `Hola, te envío la factura ${inv.invoice_number}: ${printUrl}`) };
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{pageHeading}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Facturación España / Argentina: columnas listas para ARCA (CAE, PV, tipo) y Verifactu (reservado).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowCharts((v) => !v)}>
            <BarChart3 className="h-4 w-4" />
            {showCharts ? 'Ocultar gráficos' : 'Gráficos'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setOverviewMode((v) => !v)}
          >
            {overviewMode ? 'Vista detallada' : 'Overview'}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCsv}>
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              resetFilters();
              setPeriodTab('lastMonth');
              toast.message('Filtros reiniciados: ajustá criterios y usá «Guardar filtro».');
            }}
          >
            <Filter className="h-4 w-4" />
            Nuevo filtro
          </Button>
          <Button onClick={onCreateInvoice} className="bg-primary hover:bg-primary/90 text-white gap-2">
            <Plus className="h-4 w-4" />
            Crear factura
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <div>
            <Label className="text-xs text-gray-500">Nombre del cliente</Label>
            <Input className="h-9 mt-1" value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Identificación de factura</Label>
            <Input
              className="h-9 mt-1"
              value={filterInvoiceId}
              onChange={(e) => setFilterInvoiceId(e.target.value)}
              placeholder="Número o ID"
            />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Estado de cobro</Label>
            <Select value={filterPayment} onValueChange={setFilterPayment}>
              <SelectTrigger className="h-9 mt-1">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="unpaid">No pagado</SelectItem>
                <SelectItem value="partial">Parcial</SelectItem>
                <SelectItem value="paid">Pagado</SelectItem>
                <SelectItem value="refunded">Reembolsado</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Empleado (creador)</Label>
            <Select value={filterEmployee} onValueChange={setFilterEmployee}>
              <SelectTrigger className="h-9 mt-1">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {employeeOptions.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Seleccionar criterios</Label>
            <Select
              value={selectedSavedFilterId || 'none'}
              onValueChange={(v) => {
                if (v === 'none') {
                  setSelectedSavedFilterId('');
                  resetFilters();
                } else {
                  onPickSavedFilter(v);
                }
              }}
            >
              <SelectTrigger className="h-9 mt-1">
                <SelectValue placeholder="Filtros guardados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Ninguno —</SelectItem>
                {savedFilters.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Criterio extra</Label>
            <Select value={criteriaExtra} onValueChange={setCriteriaExtra}>
              <SelectTrigger className="h-9 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="with_ticket">
                  {loc.isAR ? 'Con orden o ticket de taller' : 'Con ticket de taller'}
                </SelectItem>
                <SelectItem value="no_ticket">Sin ticket</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {periodTab === 'custom' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
            <div>
              <Label className="text-xs text-gray-500">Desde</Label>
              <Input type="date" className="h-9 mt-1" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Hasta</Label>
              <Input type="date" className="h-9 mt-1" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Reiniciar
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void saveCurrentFilter()}>
            <Save className="h-4 w-4 mr-1.5" />
            Guardar filtro
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-primary hover:bg-primary/90 text-white"
            onClick={() => void loadInvoices('full')}
          >
            <Search className="h-4 w-4 mr-1.5" />
            Buscar
          </Button>
        </div>
      </div>

      {!overviewMode ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi
            title="Total facturas (vista)"
            value={money(kpis.totalSales)}
            icon={Euro}
            extraLabel="Ingreso Resumen (mismo período)"
            extraValue={resumenPeriodIncome != null ? money(resumenPeriodIncome) : '—'}
            hint={
              resumenPeriodIncome != null
                ? 'El Resumen suma cobros de órdenes + POS; acá sumás los totales de cada factura listada. Si hay facturas sin ticket de taller o de prueba, puede haber diferencia.'
                : 'Con período «Todo» no se calcula la línea del Resumen (hace falta un rango de fechas).'
            }
          />
          <Kpi title="Facturas (vista)" value={String(kpis.invoiceCount)} icon={Receipt} />
          <Kpi title="Impuestos (vista)" value={money(kpis.totalTax)} icon={Receipt} />
          <Kpi title="Reembolsos (vista)" value={money(kpis.totalRefunds)} icon={RefreshCw} />
          <Kpi
            title="Por cobrar en el período (vista)"
            value={money(kpis.arFiltered)}
            icon={Wallet}
            hint="Solo facturas listadas según fechas y filtros."
          />
          <Kpi
            title="Pendiente global en la org."
            value={openBalanceTotal != null ? money(openBalanceTotal) : '—'}
            icon={Wallet}
            hint="Todas las fechas: facturas con saldo distinto de borrador/cancelada. No cambia al elegir «Mes pasado», etc."
          />
          <Kpi title="Base imponible (vista)" value={money(kpis.taxable)} icon={Euro} />
          <Kpi title="No imponible (vista)" value={money(kpis.nonTaxable)} icon={Euro} />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi
            title="Total facturas (vista)"
            value={money(kpis.totalSales)}
            icon={Euro}
            extraLabel="Ingreso Resumen (mismo período)"
            extraValue={resumenPeriodIncome != null ? money(resumenPeriodIncome) : '—'}
          />
          <Kpi title="Facturas" value={String(kpis.invoiceCount)} icon={Receipt} />
          <Kpi
            title="Pendiente global (org.)"
            value={openBalanceTotal != null ? money(openBalanceTotal) : '—'}
            icon={Wallet}
            hint="Todas las fechas; independiente del período."
          />
          <Kpi title="Impuestos" value={money(kpis.totalTax)} icon={Receipt} />
        </div>
      )}

      {showCharts && !overviewMode ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-800 mb-2">Ventas y cobros</p>
            <div className="h-52">
              {salesPayChart.length === 0 ? (
                <p className="text-sm text-gray-500 py-12 text-center">Sin datos en el periodo</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={salesPayChart} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value">
                      {salesPayChart.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => money(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <ul className="text-xs text-gray-600 space-y-1 mt-2">
              {salesPayChart.map((x, i) => (
                <li key={x.name} className="flex justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    {x.name}
                  </span>
                  <span>{money(x.value)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-800 mb-2">Estado de la factura</p>
            <div className="h-52">
              {statusChart.length === 0 ? (
                <p className="text-sm text-gray-500 py-12 text-center">Sin datos</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusChart} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value">
                      {statusChart.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <Tabs value={periodTab} onValueChange={(v) => setPeriodTab(v as PeriodPreset)}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-gray-100/80 p-1">
          {(Object.keys(PERIOD_LABEL) as PeriodPreset[]).map((k) => (
            <TabsTrigger
              key={k}
              value={k}
              className="text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              {PERIOD_LABEL[k]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {selectedIds.size > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-teal-200 bg-teal-50/70 px-3 py-2.5">
          <p className="text-sm text-gray-800">
            <span className="font-semibold text-[#0f766e]">{selectedIds.size}</span> seleccionada(s)
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
              Quitar selección
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={bulkDeleteBusy}
              onClick={() => void deleteSelectedInvoices()}
            >
              {bulkDeleteBusy ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Eliminando…
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Eliminar seleccionadas
                </>
              )}
            </Button>
          </div>
          <p className="text-[11px] text-gray-600 w-full sm:w-auto sm:ml-auto">
            Solo se borran facturas en <strong>borrador</strong> o <strong>cancelada</strong> (misma regla que fila a fila).
          </p>
        </div>
      ) : null}

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[1000px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-3 w-10">
                <Checkbox
                  checked={filtered.length > 0 && selectedIds.size === filtered.length}
                  onCheckedChange={(c) => toggleSelectAll(c === true)}
                  aria-label="Seleccionar todas"
                />
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Identificación</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Referencia</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Fecha</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Cliente</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Organización</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Estado</th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Pagado</th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Pendiente</th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Impuesto</th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
              <th className="px-3 py-3 w-24 text-right text-xs font-semibold text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={12} className="px-4 py-10 text-center text-gray-500">
                  <Loader2 className="h-6 w-6 animate-spin inline mr-2 text-[#0d9488]" />
                  Cargando…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-12 text-center text-gray-500">
                  No hay facturas en este criterio.
                </td>
              </tr>
            ) : (
              filtered.map((inv) => {
                const disp = invoicePaymentDisplay(inv);
                const { printUrl, wa } = sendLinks(inv);
                return (
                  <tr key={inv.id} className="hover:bg-teal-50/40">
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(inv.id)}
                        onCheckedChange={(c) => toggleSelect(inv.id, c === true)}
                        aria-label={`Seleccionar ${inv.invoice_number}`}
                      />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => void openEdit(inv)}
                        className="font-medium text-left text-[#0d9488] hover:text-[#0f766e] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]/40 rounded-sm"
                        title="Abrir factura"
                      >
                        {inv.invoice_number}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{referenceLabel(inv)}</td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                      {new Date(inv.created_at).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-800">{inv.customer_name}</div>
                      <div className="text-xs text-gray-500">{inv.customer_email || '—'}</div>
                    </td>
                    <td className="px-3 py-2 text-gray-700">{inv.organizations?.name || '—'}</td>
                    <td className="px-3 py-2">
                      <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', paymentDisplayBadgeClass(disp))}>
                        {paymentDisplayLabel(disp)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(Number(inv.paid_amount || 0))}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-amber-900">{money(invoiceBalance(inv))}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(Number(inv.tax_amount || 0))}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{money(Number(inv.total_amount || 0))}</td>
                    <td className="px-3 py-2 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 text-xs px-2.5 border-gray-300 hover:border-[#0d9488] hover:text-[#0d9488]"
                          >
                            Acción <ChevronDown className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          {/* Editar */}
                          <DropdownMenuItem onClick={() => void openEdit(inv)}>
                            <PenLine className="h-4 w-4 mr-2 text-gray-500" />
                            Editar factura
                          </DropdownMenuItem>
                          {/* Agregar pago */}
                          <DropdownMenuItem onClick={() => openPay(inv)}>
                            <Wallet className="h-4 w-4 mr-2 text-gray-500" />
                            Agregar pago
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {/* Enviar por correo */}
                          {inv.customer_email?.trim() ? (
                            <DropdownMenuItem asChild>
                              <a href={`mailto:${encodeURIComponent(inv.customer_email.trim())}?subject=${encodeURIComponent(`Factura ${inv.invoice_number}`)}&body=${encodeURIComponent(`Estimado/a ${inv.customer_name},\n\nAdjuntamos su factura ${inv.invoice_number}.\n\nPuede consultar y descargar su factura en el siguiente enlace:\n${printUrl}\n\nGracias por confiar en nosotros.`)}`}>
                                <Mail className="h-4 w-4 mr-2 text-gray-500" />
                                Enviar por correo electrónico
                              </a>
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem disabled>
                              <Mail className="h-4 w-4 mr-2 text-gray-400" />
                              Enviar por correo (sin email)
                            </DropdownMenuItem>
                          )}
                          {/* Enviar por WhatsApp */}
                          {wa ? (
                            <DropdownMenuItem asChild>
                              <a href={wa} target="_blank" rel="noreferrer">
                                <WhatsAppLogo className="h-4 w-4 mr-2 inline text-gray-500" />
                                Enviar por WhatsApp
                              </a>
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem disabled>
                              <WhatsAppLogo className="h-4 w-4 mr-2 inline text-gray-400" />
                              WhatsApp (sin teléfono)
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {/* Imprimir factura */}
                          <DropdownMenuItem onClick={() => openInvoicePrintTab(inv.id)}>
                            <Printer className="h-4 w-4 mr-2 text-gray-500" />
                            Imprimir factura
                          </DropdownMenuItem>
                          {/* Imprimir recibo térmico */}
                          <DropdownMenuItem onClick={() => {
                            const url = `${window.location.origin}/dashboard/invoices/print/${inv.id}?thermal=1`;
                            const w = window.open(url, '_blank', 'width=400,height=600');
                            if (w) setTimeout(() => { try { w.print(); } catch { /* noop */ } }, 1200);
                          }}>
                            <Receipt className="h-4 w-4 mr-2 text-gray-500" />
                            Imprimir recibo térmico
                          </DropdownMenuItem>
                          {/* Exportar como PDF */}
                          <DropdownMenuItem onClick={() => openInvoicePrintTab(inv.id)}>
                            <Download className="h-4 w-4 mr-2 text-gray-500" />
                            Exportar como PDF
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {/* Firma del cliente */}
                          <DropdownMenuItem onClick={() => openSig(inv)}>
                            <Signature className="h-4 w-4 mr-2 text-gray-500" />
                            Firma del cliente
                          </DropdownMenuItem>
                          {/* Clonar */}
                          <DropdownMenuItem onClick={() => void cloneInvoice(inv)}>
                            <Copy className="h-4 w-4 mr-2 text-gray-500" />
                            Clonar factura
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {/* Eliminar */}
                          <DropdownMenuItem
                            className={cn('text-red-600', inv.status !== 'draft' && inv.status !== 'cancelled' && 'opacity-40')}
                            onClick={() => void deleteInvoice(inv)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {inv.status !== 'draft' && inv.status !== 'cancelled'
                              ? 'Eliminar (solo borradores)'
                              : 'Eliminar'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar pago</DialogTitle>
          </DialogHeader>
          {payTarget ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Factura {payTarget.invoice_number} · Pendiente {money(invoiceBalance(payTarget))}
              </p>
              <div>
                <Label>Importe</Label>
                <Input className="h-9 mt-1" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
              </div>
              <div>
                <Label>Método</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger className="h-9 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="card">Tarjeta</SelectItem>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notas</Label>
                <Input className="h-9 mt-1" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPayOpen(false)}>
                  Cancelar
                </Button>
                <Button className="bg-primary hover:bg-primary/90 text-white" disabled={payBusy} onClick={() => void submitPayment()}>
                  {payBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Registrar'}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={sigOpen} onOpenChange={setSigOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Firma del cliente</DialogTitle>
          </DialogHeader>
          {sigTarget ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">URL de imagen (p. ej. enlace firmado de Storage).</p>
              <Input className="h-9" value={sigUrl} onChange={(e) => setSigUrl(e.target.value)} placeholder="https://…" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSigOpen(false)}>
                  Cancelar
                </Button>
                <Button className="bg-primary hover:bg-primary/90 text-white" disabled={sigBusy} onClick={() => void submitSignature()}>
                  {sigBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ── Modal EDITAR FACTURA ───────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={(v) => { if (!v) setEditOpen(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#0d9488]" />
              Editar factura {editTarget?.invoice_number}
            </DialogTitle>
          </DialogHeader>
          {editTarget && (
            <div className="space-y-5 pt-1">

              {/* Cliente */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Datos del cliente</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Nombre *</Label>
                    <Input className="h-9 mt-1" value={editCustomerName} onChange={e => setEditCustomerName(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input className="h-9 mt-1" type="email" value={editCustomerEmail} onChange={e => setEditCustomerEmail(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Teléfono</Label>
                    <Input className="h-9 mt-1" value={editCustomerPhone} onChange={e => setEditCustomerPhone(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">NIF / CIF / CUIT</Label>
                    <Input className="h-9 mt-1" value={editCustomerTaxId} onChange={e => setEditCustomerTaxId(e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Dirección de facturación</Label>
                    <Input className="h-9 mt-1" value={editCustomerAddress} onChange={e => setEditCustomerAddress(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Líneas */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Líneas de factura</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setEditLines(prev => [...prev, { description: '', quantity: 1, unit_price: 0, total_price: 0 }])}
                  >
                    <Plus className="h-3 w-3" /> Añadir línea
                  </Button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-500">Concepto</th>
                        <th className="px-2 py-2 text-right font-semibold text-gray-500 w-14">Cant.</th>
                        <th className="px-2 py-2 text-right font-semibold text-gray-500 w-24">P. Unit.</th>
                        <th className="px-2 py-2 text-right font-semibold text-gray-500 w-24">Total</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {editLines.map((line, idx) => (
                        <tr key={idx}>
                          <td className="px-2 py-1.5">
                            <Input
                              className="h-7 text-xs border-0 shadow-none focus-visible:ring-1"
                              value={line.description}
                              onChange={e => editLineChange(idx, 'description', e.target.value)}
                              placeholder="Descripción del servicio o pieza"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <Input
                              className="h-7 text-xs text-right border-0 shadow-none focus-visible:ring-1"
                              type="number"
                              min="1"
                              value={line.quantity}
                              onChange={e => editLineChange(idx, 'quantity', e.target.value)}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <Input
                              className="h-7 text-xs text-right border-0 shadow-none focus-visible:ring-1"
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.unit_price}
                              onChange={e => editLineChange(idx, 'unit_price', e.target.value)}
                            />
                          </td>
                          <td className="px-2 py-1.5 text-right font-medium">{money(line.total_price)}</td>
                          <td className="px-1">
                            <button
                              type="button"
                              className="text-red-400 hover:text-red-600 p-1"
                              onClick={() => setEditLines(prev => prev.filter((_, i) => i !== idx))}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t">
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-right text-xs font-bold text-gray-700">TOTAL</td>
                        <td className="px-2 py-2 text-right text-sm font-bold text-gray-900">
                          {money(editLines.reduce((s, l) => s + l.total_price, 0))}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Estado, método de pago, fechas */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Estado</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger className="h-9 mt-1 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Borrador</SelectItem>
                      <SelectItem value="sent">Enviada</SelectItem>
                      <SelectItem value="paid">Pagada</SelectItem>
                      <SelectItem value="cancelled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Forma de pago</Label>
                  <Select value={editPaymentMethod} onValueChange={setEditPaymentMethod}>
                    <SelectTrigger className="h-9 mt-1 text-xs">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Efectivo</SelectItem>
                      <SelectItem value="card">Tarjeta</SelectItem>
                      <SelectItem value="transfer">Transferencia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Fecha de vencimiento</Label>
                  <Input className="h-9 mt-1 text-xs" type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} />
                </div>
              </div>

              {/* Notas */}
              <div>
                <Label className="text-xs">Notas internas</Label>
                <textarea
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-xs min-h-[64px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]/40 resize-none"
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Observaciones adicionales…"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1 border-t">
                <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
                <Button
                  className="bg-primary hover:bg-primary/90 text-white"
                  disabled={editBusy || !editCustomerName.trim()}
                  onClick={() => void submitEdit()}
                >
                  {editBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Guardar cambios
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

function Kpi({
  title,
  value,
  icon: Icon,
  hint,
  extraLabel,
  extraValue,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  extraLabel?: string;
  extraValue?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase text-gray-500 leading-tight">{title}</p>
        <Icon className="h-4 w-4 text-[#0d9488] shrink-0" />
      </div>
      <p className="text-lg font-bold text-gray-900 mt-1.5 tabular-nums">{value}</p>
      {extraLabel != null && extraValue != null ? (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-[9px] font-semibold uppercase text-[#0f766e]/90 leading-tight">{extraLabel}</p>
          <p className="text-base font-bold text-[#0f766e] mt-0.5 tabular-nums">{extraValue}</p>
        </div>
      ) : null}
      {hint ? <p className="text-[10px] text-gray-400 mt-1 leading-snug">{hint}</p> : null}
    </div>
  );
}
