'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, Copy, Mail, Building2, CalendarDays, Loader2 } from 'lucide-react';
import { adminFetch } from '@/lib/auth/adminFetch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatPlanPeriodLabel } from '@/lib/org-plan';

type CommercialLead = {
  id: string;
  full_name: string;
  email: string;
  shop_name: string;
  plan_interest: string;
  billing_interest: string;
  notes: string | null;
  created_at: string;
};

export default function AdminCommercialLeadsPage() {
  const [rows, setRows] = useState<CommercialLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/commercial-signup-requests?t=${Date.now()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error cargando leads');
      setRows(json.data || []);
    } catch (e: any) {
      setError(e?.message || 'Error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads comerciales</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Solicitudes desde la home (formulario “Solicitar alta”). Tras cobrar fuera de la app, crea la organización en{' '}
            <Link href="/admin" className="text-[#0d9488] hover:underline font-medium">
              Command Center → Nueva organización
            </Link>{' '}
            con el mismo plan y periodo; la licencia se calcula con +30 o +365 días desde la activación.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm shrink-0"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Contacto</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Taller</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-gray-500">
                    <Loader2 className="h-6 w-6 animate-spin inline-block mr-2 align-middle" />
                    Cargando…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    Aún no hay solicitudes, o la tabla no existe en Supabase (migración 20260402102).
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const planLabel = formatPlanPeriodLabel(r.plan_interest, r.billing_interest);
                  const when = new Date(r.created_at).toLocaleString('es-ES');
                  const summary = `${r.full_name} · ${r.email} · ${r.shop_name} · ${planLabel}`;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 align-top">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          {when}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{r.full_name}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Mail className="h-3 w-3 shrink-0" />
                          <a href={`mailto:${r.email}`} className="text-[#0d9488] hover:underline">
                            {r.email}
                          </a>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-start gap-1.5 text-gray-800">
                          <Building2 className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                          {r.shop_name}
                        </span>
                        {r.notes ? <p className="text-xs text-gray-500 mt-1 max-w-xs">{r.notes}</p> : null}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-1 rounded-full bg-[#0d9488]/10 text-[#0f766e] text-xs font-semibold">
                          {planLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => copy(summary)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-700"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copiar resumen
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
