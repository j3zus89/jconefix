'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, ExternalLink, Loader2, Printer } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getActiveOrganizationId } from '@/lib/dashboard-org';
import { useOrgLocale } from '@/lib/hooks/useOrgLocale';
import { toast } from 'sonner';
import {
  labelReturnScenario,
  labelReturnSettlement,
  labelReturnStatus,
} from '@/lib/return-constancia-labels';

type Row = {
  id: string;
  reference_code: string;
  scenario: string;
  settlement_method: string | null;
  summary_line: string;
  amount_money: number | null;
  status: string;
  delivered_at: string | null;
  created_at: string;
  repair_ticket_id: string;
  repair_tickets: { ticket_number: string } | null;
};

export default function DevolucionesPage() {
  const supabase = useMemo(() => createClient(), []);
  const loc = useOrgLocale();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const orgId = await getActiveOrganizationId(supabase);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRows([]);
        return;
      }

      let q = (supabase as any)
        .from('customer_return_constancias')
        .select(
          'id, reference_code, scenario, settlement_method, summary_line, amount_money, status, delivered_at, created_at, repair_ticket_id, repair_tickets(ticket_number)'
        )
        .order('created_at', { ascending: false })
        .limit(300);

      if (orgId) {
        q = q.eq('organization_id', orgId);
      } else {
        q = q.eq('shop_owner_id', user.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      setRows((data || []) as Row[]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No se pudo cargar';
      toast.error(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-full bg-background p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <Link href="/dashboard" className="hover:text-gray-700">
            Inicio
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/dashboard/finanzas" className="hover:text-gray-700">
            Finanzas
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-gray-900">Devoluciones al cliente</span>
        </div>
      </div>

      <h1 className="mb-2 text-2xl font-bold text-gray-900">Devoluciones al cliente</h1>
      <p className="mb-6 max-w-2xl text-sm text-gray-600">
        Constancias generadas desde {loc.isAR ? 'la orden' : 'el ticket'} (botón Devolución). Aquí puedes revisar el
        historial y abrir la hoja para entregar al cliente o archivar. No reemplaza notas de crédito fiscales donde las
        exija tu normativa.
      </p>

      {loading ? (
        <div className="flex justify-center py-16 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
          Aún no hay constancias. Regístralas desde la ficha de {loc.isAR ? 'una orden' : 'un ticket'} → Cobrar /
          Efectivo / Devolución.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-3 py-2.5">Referencia</th>
                <th className="px-3 py-2.5">{loc.isAR ? 'Orden' : 'Ticket'}</th>
                <th className="px-3 py-2.5">Tipo</th>
                <th className="px-3 py-2.5">Liquidación</th>
                <th className="px-3 py-2.5">Importe</th>
                <th className="px-3 py-2.5">Estado</th>
                <th className="px-3 py-2.5">Fecha</th>
                <th className="px-3 py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/80">
                  <td className="px-3 py-2 font-mono text-xs font-medium text-teal-800">{r.reference_code}</td>
                  <td className="px-3 py-2">
                    {r.repair_tickets?.ticket_number ? (
                      <Link
                        href={`/dashboard/tickets/${r.repair_ticket_id}`}
                        className="font-medium text-[#0d9488] hover:underline"
                      >
                        #{r.repair_tickets.ticket_number}
                      </Link>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="max-w-[140px] px-3 py-2 text-xs text-gray-800">
                    {labelReturnScenario(r.scenario)}
                  </td>
                  <td className="max-w-[120px] px-3 py-2 text-xs text-gray-600">
                    {labelReturnSettlement(r.settlement_method)}
                  </td>
                  <td className="px-3 py-2 text-xs font-medium tabular-nums">
                    {r.amount_money != null ? loc.format(Number(r.amount_money)) : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs">{labelReturnStatus(r.status)}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">
                    {new Date(r.created_at).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/dashboard/devoluciones/print/${r.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Imprimir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-gray-500">
        <ExternalLink className="mr-1 inline h-3 w-3" />
        La vista de impresión se abre en una pestaña nueva; usa el menú del navegador para guardar como PDF si lo
        necesitas.
      </p>
    </div>
  );
}
