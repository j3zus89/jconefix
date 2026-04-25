'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useOrgLocale } from '@/lib/hooks/useOrgLocale';

type Sale = {
  id: string;
  created_at: string;
  payment_method: string;
  total: number;
  items: unknown;
};

export default function PosSalesHistoryPage() {
  const loc = useOrgLocale();
  const [rows, setRows] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      // Mostrar ventas de toda la organización (no solo del usuario actual)
      const { data: orgRow } = await (supabase as any)
        .from('organizations')
        .select('id')
        .maybeSingle();
      const orgId = orgRow?.id ?? null;
      let q = (supabase as any)
        .from('pos_sales')
        .select('id, created_at, payment_method, total, items')
        .order('created_at', { ascending: false })
        .limit(200);
      if (orgId) {
        q = q.eq('organization_id', orgId);
      } else {
        q = q.eq('user_id', user.id);
      }
      const { data, error } = await q;
      if (error) {
        toast.error(error.message + ' · Ejecuta migración 202604021500');
        setRows([]);
      } else setRows(data || []);
      setLoading(false);
    };
    run();
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historial de ventas</h1>
          <p className="text-sm text-gray-500 mt-1">Últimas ventas registradas desde el punto de venta.</p>
        </div>
        <Button asChild className="bg-[#0d9488] hover:bg-[#0f766e]">
          <Link href="/dashboard/pos">Nueva venta</Link>
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-center text-gray-500 py-14">Aún no hay ventas guardadas. Completa una venta en POS.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3">Fecha</th>
                <th className="text-left p-3">Pago</th>
                <th className="text-right p-3">Total</th>
                <th className="text-left p-3">Líneas</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const items = Array.isArray(r.items) ? r.items : [];
                return (
                  <tr key={r.id} className="border-b border-gray-100">
                    <td className="p-3 text-gray-600">{new Date(r.created_at).toLocaleString('es-ES')}</td>
                    <td className="p-3 capitalize">{r.payment_method}</td>
                    <td className="p-3 text-right font-semibold tabular-nums">
                      {loc.format(Number(r.total))}
                    </td>
                    <td className="p-3 text-gray-500">{items.length} artículo(s)</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
