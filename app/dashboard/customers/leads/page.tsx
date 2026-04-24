'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getActiveOrganizationId } from '@/lib/dashboard-org';
import { customersOrgScopeOr, fetchActiveOrgMemberUserIds } from '@/lib/repair-tickets-org-scope';

type Customer = {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  customer_group: string | null;
  created_at: string;
};

export default function LeadsPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const orgId = await getActiveOrganizationId(supabase);
      if (!orgId) {
        setLoading(false);
        return;
      }
      const memberIds = await fetchActiveOrgMemberUserIds(supabase, orgId);
      const customerScopeOr = customersOrgScopeOr(orgId, memberIds);
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, first_name, last_name, email, phone, customer_group, created_at')
        .or(customerScopeOr)
        .order('created_at', { ascending: false })
        .limit(150);
      if (error) {
        toast.error(error.message);
        setRows([]);
      } else {
        const list = (data || []) as Customer[];
        const leads = list.filter((c) => {
          const g = (c.customer_group || '').toLowerCase();
          return g.includes('lead') || g.includes('prospect') || g.includes('potencial');
        });
        setRows(leads.length ? leads : list);
      }
      setLoading(false);
    };
    run();
  }, [supabase]);

  const label = (c: Customer) =>
    [c.first_name, c.last_name].filter(Boolean).join(' ').trim() || c.name || 'Sin nombre';

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes potenciales</h1>
          <p className="text-sm text-gray-500 mt-1">
            Prioriza contactos con grupo «lead / prospecto»; si no hay, se muestran los últimos clientes creados.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/customers">Todos los clientes</Link>
          </Button>
          <Button asChild className="bg-primary hover:bg-primary">
            <Link href="/dashboard/customers/new">Nuevo cliente</Link>
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16 text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-center text-gray-500 py-14">No hay clientes recientes.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 font-medium text-gray-600">Cliente</th>
                <th className="text-left p-3 font-medium text-gray-600">Contacto</th>
                <th className="text-left p-3 font-medium text-gray-600">Grupo</th>
                <th className="text-left p-3 font-medium text-gray-600">Alta</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                  <td className="p-3 font-medium">{label(c)}</td>
                  <td className="p-3 text-gray-600">
                    {c.email || '—'}
                    {c.phone ? <span className="block text-xs">{c.phone}</span> : null}
                  </td>
                  <td className="p-3">{c.customer_group || '—'}</td>
                  <td className="p-3 text-gray-500">
                    {new Date(c.created_at).toLocaleDateString('es-ES')}
                  </td>
                  <td className="p-3 text-right">
                    <Link href={`/dashboard/customers/${c.id}`} className="text-[#0d9488] font-medium hover:underline">
                      Ficha
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
