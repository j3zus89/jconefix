'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { getActiveOrganizationId } from '@/lib/dashboard-org';
import { fetchActiveOrgMemberUserIds, repairTicketsOrgScopeOr } from '@/lib/repair-tickets-org-scope';

export default function RepairsReportsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const run = async () => {
      const orgId = await getActiveOrganizationId(supabase);
      if (!orgId) {
        setLoading(false);
        return;
      }
      const memberIds = await fetchActiveOrgMemberUserIds(supabase, orgId);
      const ticketScopeOr = repairTicketsOrgScopeOr(orgId, memberIds);
      const { data, error } = await (supabase as any)
        .from('repair_tickets')
        .select('status')
        .or(ticketScopeOr)
        .limit(5000);
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      const map: Record<string, number> = {};
      for (const row of data || []) {
        const s = row.status || 'sin_estado';
        map[s] = (map[s] || 0) + 1;
      }
      setCounts(map);
      setLoading(false);
    };
    run();
  }, [supabase]);

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wrench className="h-7 w-7 text-[#0d9488]" />
            Reparaciones por estado
          </h1>
          <p className="text-sm text-gray-500 mt-1">Distribución de tus tickets (muestra hasta 5000 registros recientes).</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/reports">Volver a informes</Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
        </div>
      ) : entries.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No hay tickets todavía.</p>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3">Estado</th>
                <th className="text-right p-3">Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([status, n]) => (
                <tr key={status} className="border-b border-gray-100">
                  <td className="p-3 capitalize">{status.replace(/_/g, ' ')}</td>
                  <td className="p-3 text-right font-semibold tabular-nums">{n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
