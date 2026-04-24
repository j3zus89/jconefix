'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { getActiveOrganizationId } from '@/lib/dashboard-org';
import { fetchActiveOrgMemberUserIds, repairTicketsOrgScopeOr } from '@/lib/repair-tickets-org-scope';
import { computeWarrantyBadge } from '@/lib/warranty-period';
import { cn } from '@/lib/utils';

type Row = {
  id: string;
  ticket_number: string;
  status: string;
  device_type: string;
  device_model: string | null;
  created_at: string;
  warranty_info?: string | null;
  warranty_start_date?: string | null;
  warranty_end_date?: string | null;
  customers: { name: string } | null;
};

type Props = {
  title: string;
  subtitle: string;
  /** Si se omite, lista todos los tickets del usuario. */
  statusIn?: string[];
  /** Filtro adicional: filas con seguimiento de garantía (fechas o etiqueta distinta de «Sin garantía»). */
  warrantyOnly?: boolean;
};

function rowHasWarrantyRow(r: Row): boolean {
  const s = r.warranty_start_date && String(r.warranty_start_date).trim();
  const e = r.warranty_end_date && String(r.warranty_end_date).trim();
  if (s || e) return true;
  const w = (r.warranty_info || '').trim();
  return w.length > 0 && w !== 'Sin garantía';
}

function rowMatchesSearch(r: Row, q: string): boolean {
  if (!q.trim()) return true;
  const n = q.trim().toLowerCase();
  const num = r.ticket_number.toLowerCase();
  const cust = (r.customers?.name || '').toLowerCase();
  const dev = `${r.device_type} ${r.device_model || ''}`.toLowerCase();
  return num.includes(n) || cust.includes(n) || dev.includes(n);
}

export function SimpleTicketList({ title, subtitle, statusIn, warrantyOnly }: Props) {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const run = async () => {
      const orgId = await getActiveOrganizationId(supabase);
      if (!orgId) {
        setRows([]);
        setLoading(false);
        return;
      }
      const memberIds = await fetchActiveOrgMemberUserIds(supabase, orgId);
      const ticketScopeOr = repairTicketsOrgScopeOr(orgId, memberIds);
      let q = (supabase as any)
        .from('repair_tickets')
        .select(
          'id, ticket_number, status, device_type, device_model, created_at, warranty_info, warranty_start_date, warranty_end_date, customers(name)'
        )
        .or(ticketScopeOr)
        .order('updated_at', { ascending: false })
        .limit(400);

      const { data, error } = await q;
      if (error) {
        toast.error(error.message);
        setRows([]);
        setLoading(false);
        return;
      }
      let list = (data || []) as Row[];
      if (statusIn?.length) {
        list = list.filter((t) => statusIn.includes(t.status));
      }
      if (warrantyOnly) {
        list = list.filter(rowHasWarrantyRow);
      }
      setRows(list);
      setLoading(false);
    };
    run();
  }, [supabase, statusIn?.join(','), warrantyOnly]);

  const visible = useMemo(
    () => rows.filter((r) => rowMatchesSearch(r, search)),
    [rows, search]
  );

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        </div>
        <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Link href="/dashboard/tickets">Ver todos los tickets</Link>
        </Button>
      </div>

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Buscar por ticket, cliente o equipo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar garantías"
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
              ? 'No hay registros con estos criterios.'
              : 'Ningún resultado para tu búsqueda.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="p-3 text-left font-medium text-gray-600">Ticket</th>
                  <th className="p-3 text-left font-medium text-gray-600">Cliente</th>
                  <th className="p-3 text-left font-medium text-gray-600">Equipo</th>
                  <th className="p-3 text-left font-medium text-gray-600">Estado orden</th>
                  <th className="p-3 text-left font-medium text-gray-600">Garantía</th>
                  <th className="p-3 text-left font-medium text-gray-600">Fecha</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {visible.map((t) => {
                  const badge = computeWarrantyBadge({
                    warranty_start_date: t.warranty_start_date,
                    warranty_end_date: t.warranty_end_date,
                    warranty_info: t.warranty_info,
                  });
                  return (
                    <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                      <td className="p-3 font-mono text-xs">{t.ticket_number}</td>
                      <td className="p-3">{t.customers?.name || '—'}</td>
                      <td className="p-3">
                        {t.device_type}
                        {t.device_model ? ` · ${t.device_model}` : ''}
                      </td>
                      <td className="p-3 capitalize">{t.status.replace(/_/g, ' ')}</td>
                      <td className="p-3">
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={cn(
                              'inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium',
                              badge.badgeClass
                            )}
                          >
                            {badge.label}
                          </span>
                          {badge.detail ? (
                            <span className="text-[11px] text-gray-500">{badge.detail}</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="p-3 text-gray-500">
                        {new Date(t.created_at).toLocaleDateString('es-ES')}
                      </td>
                      <td className="p-3 text-right">
                        <Link
                          href={`/dashboard/tickets/${t.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
