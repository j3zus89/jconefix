'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { RefreshCw, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { adminFetch } from '@/lib/auth/adminFetch';

type AuditRow = {
  id: string;
  admin_user_id: string;
  action: string;
  target_organization_id: string | null;
  target_user_id: string | null;
  details: any;
  ip_address: string | null;
  created_at: string;
};

export default function AdminAuditPage() {
  const sp = useSearchParams();
  const initialSearch = sp.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [q, setQ] = useState(initialSearch);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/audit/list?limit=250&t=${Date.now()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      setRows(json.data || []);
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      [
        r.action,
        r.ip_address || '',
        r.target_organization_id || '',
        r.target_user_id || '',
        r.details != null ? JSON.stringify(r.details) : '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(s)
    );
  }, [rows, q]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auditoría</h1>
          <p className="text-sm text-gray-500 mt-1">
            Acciones SUPER_ADMIN y conexiones al panel (ver acción <code className="text-gray-700">panel_login</code>).
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm"
          disabled={loading}
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Actualizar
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por acción, IP, orgId, userId..."
              className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]/30"
            />
          </div>
          <button
            onClick={load}
            className="px-3 py-2 rounded-lg bg-[#0d9488] hover:bg-[#0f766e] text-white text-sm font-medium"
            disabled={loading}
          >
            Buscar
          </button>
          <div className="text-xs text-gray-500">{filtered.length} evento(s)</div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acción</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Org</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">User</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Detalles</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                  Cargando...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                  Sin eventos.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(r.created_at).toLocaleString('es-ES')}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{r.action}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{r.target_organization_id || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{r.target_user_id || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    <pre className="whitespace-pre-wrap break-words">
                      {r.details ? JSON.stringify(r.details, null, 2) : '—'}
                    </pre>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

