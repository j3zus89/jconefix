'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { getActiveOrganizationId } from '@/lib/dashboard-org';
import { fetchActiveOrgMemberUserIds, repairTicketsOrgScopeOr } from '@/lib/repair-tickets-org-scope';
import { cn } from '@/lib/utils';
import { humanizeRepairTicketsSchemaError } from '@/lib/supabase-setup-hints';
import { WhatsAppQuickSendModal } from '@/components/whatsapp/WhatsAppQuickSendModal';
import { WhatsAppLogo } from '@/components/whatsapp/WhatsAppLogo';
import {
  budgetStaleRowClass,
  budgetValidUntilUi,
  buildBudgetReminderMessage,
  daysSinceIsoDate,
} from '@/lib/budget-estimates';

type Row = {
  id: string;
  ticket_number: string;
  device_type: string;
  device_model: string | null;
  device_brand: string | null;
  device_category: string | null;
  created_at: string;
  estimated_cost: number | null;
  final_cost: number | null;
  budget_valid_until?: string | null;
  budget_last_reminder_at?: string | null;
  customers: { name: string; phone: string | null } | null;
};

function rowAmount(r: Row): number {
  const v = r.final_cost ?? r.estimated_cost;
  return typeof v === 'number' && !Number.isNaN(v) ? v : 0;
}

function formatMoneyEs(n: number): string {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function openDaysBadgeClass(days: number): string {
  if (days >= 14) return 'bg-red-100 text-red-800';
  if (days >= 7) return 'bg-amber-100 text-amber-900';
  if (days >= 3) return 'bg-yellow-100 text-yellow-900';
  return 'bg-gray-100 text-gray-700';
}

function formatShortReminder(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function deviceLine(r: Row): string {
  const parts = [r.device_type?.trim(), r.device_model?.trim()].filter(Boolean);
  return parts.join(' ') || '—';
}

function rowMatchesSearch(r: Row, q: string): boolean {
  if (!q.trim()) return true;
  const n = q.trim().toLowerCase();
  const num = r.ticket_number.toLowerCase();
  const cust = (r.customers?.name || '').toLowerCase();
  const dev = deviceLine(r).toLowerCase();
  return num.includes(n) || cust.includes(n) || dev.includes(n);
}

export function EstimatesDashboard() {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const reminderTicketIdRef = useRef<string | null>(null);
  const [waModal, setWaModal] = useState<{
    open: boolean;
    ticketId: string | null;
    defaultMessage: string;
    customerName: string;
    phone: string | null | undefined;
    deviceCategory: string | null;
    deviceType: string | null;
    deviceBrand: string | null;
    deviceModel: string | null;
  }>({
    open: false,
    ticketId: null,
    defaultMessage: '',
    customerName: '',
    phone: null,
    deviceCategory: null,
    deviceType: null,
    deviceBrand: null,
    deviceModel: null,
  });

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const orgId = await getActiveOrganizationId(supabase);
      if (!orgId) {
        setRows([]);
        setLoading(false);
        return;
      }
      const memberIds = await fetchActiveOrgMemberUserIds(supabase, orgId);
      const ticketScopeOr = repairTicketsOrgScopeOr(orgId, memberIds);
      const { data, error } = await (supabase as any)
        .from('repair_tickets')
        .select(
          'id, ticket_number, device_type, device_model, device_brand, device_category, created_at, estimated_cost, final_cost, budget_valid_until, budget_last_reminder_at, customers(name, phone)'
        )
        .eq('status', 'presupuesto')
        .or(ticketScopeOr)
        .order('created_at', { ascending: true })
        .limit(500);

      if (error) {
        toast.error(humanizeRepairTicketsSchemaError(error.message) || error.message);
        setRows([]);
        setLoading(false);
        return;
      }
      setRows((data || []) as Row[]);
      setLoading(false);
    };
    void run();
  }, [supabase]);

  const visible = useMemo(() => rows.filter((r) => rowMatchesSearch(r, search)), [rows, search]);

  const kpis = useMemo(() => {
    const count = visible.length;
    let sum = 0;
    let daySum = 0;
    for (const r of visible) {
      sum += rowAmount(r);
      daySum += daysSinceIsoDate(r.created_at);
    }
    const avgDays = count > 0 ? Math.round((daySum / count) * 10) / 10 : 0;
    return { count, sum, avgDays };
  }, [visible]);

  const markReminderSent = async (ticketId: string) => {
    const ts = new Date().toISOString();
    const { error } = await (supabase as any)
      .from('repair_tickets')
      .update({ budget_last_reminder_at: ts })
      .eq('id', ticketId);
    if (error) {
      toast.error(humanizeRepairTicketsSchemaError(error.message) || error.message);
      return;
    }
    setRows((prev) =>
      prev.map((r) => (r.id === ticketId ? { ...r, budget_last_reminder_at: ts } : r))
    );
  };

  const openReminder = (r: Row) => {
    reminderTicketIdRef.current = r.id;
    const vu = budgetValidUntilUi(r.budget_valid_until ?? null);
    const msg = buildBudgetReminderMessage({
      customerName: r.customers?.name,
      ticketNumber: r.ticket_number,
      deviceLine: deviceLine(r),
      validUntilLabel: vu.label,
    });
    setWaModal({
      open: true,
      ticketId: r.id,
      defaultMessage: msg,
      customerName: r.customers?.name || 'Cliente',
      phone: r.customers?.phone,
      deviceCategory: r.device_category,
      deviceType: r.device_type,
      deviceBrand: r.device_brand,
      deviceModel: r.device_model,
    });
  };

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Presupuestos</h1>
          <p className="mt-1 text-sm text-gray-500">
            Ordenados del más antiguo al más reciente. Usa el recordatorio por WhatsApp y revisa la vigencia
            indicada en cada fila.
          </p>
        </div>
        <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Link href="/dashboard/tickets">Ver todos los tickets</Link>
        </Button>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Presupuestos abiertos</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{kpis.count}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Suma importes</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            $ {formatMoneyEs(kpis.sum)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Antigüedad media</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {kpis.count === 0 ? '—' : `${kpis.avgDays} d`}
          </p>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Buscar por ticket, cliente o equipo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar presupuestos"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {loading ? (
          <div className="flex justify-center py-16 text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <p className="py-14 text-center text-gray-500">
            {rows.length === 0
              ? 'No hay tickets en estado presupuesto.'
              : 'Ningún resultado para tu búsqueda.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="p-3 text-left font-medium text-gray-600">Ticket</th>
                  <th className="p-3 text-left font-medium text-gray-600">Cliente</th>
                  <th className="p-3 text-left font-medium text-gray-600">Equipo</th>
                  <th className="p-3 text-right font-medium text-gray-600">Importe</th>
                  <th className="p-3 text-left font-medium text-gray-600">Días abierto</th>
                  <th className="p-3 text-left font-medium text-gray-600">Válido hasta</th>
                  <th className="p-3 text-left font-medium text-gray-600">Último aviso</th>
                  <th className="p-3 text-right font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => {
                  const openDays = daysSinceIsoDate(r.created_at);
                  const rowTint = budgetStaleRowClass(openDays);
                  const vu = budgetValidUntilUi(r.budget_valid_until ?? null);
                  return (
                    <tr key={r.id} className={cn('border-b border-gray-100', rowTint)}>
                      <td className="p-3 font-mono text-xs">{r.ticket_number}</td>
                      <td className="p-3">{r.customers?.name || '—'}</td>
                      <td className="p-3">{deviceLine(r)}</td>
                      <td className="p-3 text-right font-semibold text-gray-900">
                        $ {formatMoneyEs(rowAmount(r))}
                      </td>
                      <td className="p-3">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                            openDaysBadgeClass(openDays)
                          )}
                        >
                          {openDays}d
                        </span>
                      </td>
                      <td className={cn('p-3 text-xs', vu.badgeClass)}>{vu.label}</td>
                      <td className="p-3 text-xs text-gray-600">
                        {formatShortReminder(r.budget_last_reminder_at ?? null)}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                            onClick={() => openReminder(r)}
                          >
                            <WhatsAppLogo className="h-3.5 w-3.5" />
                            Recordatorio
                          </Button>
                          <Button type="button" variant="secondary" size="sm" className="h-8" asChild>
                            <Link href={`/dashboard/tickets/${r.id}`}>Abrir</Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <WhatsAppQuickSendModal
        open={waModal.open}
        onOpenChange={(open) => {
          if (!open) {
            reminderTicketIdRef.current = null;
            setWaModal((m) => ({
              ...m,
              open: false,
              defaultMessage: '',
              ticketId: null,
            }));
          }
        }}
        customerName={waModal.customerName}
        phone={waModal.phone}
        defaultMessage={waModal.defaultMessage}
        deviceCategory={waModal.deviceCategory}
        deviceType={waModal.deviceType}
        deviceBrand={waModal.deviceBrand}
        deviceModel={waModal.deviceModel}
        onAfterOpenWa={() => {
          const id = reminderTicketIdRef.current;
          reminderTicketIdRef.current = null;
          if (id) void markReminderSent(id);
        }}
      />
    </div>
  );
}
