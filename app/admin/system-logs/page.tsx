'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, RefreshCw, ExternalLink } from 'lucide-react';
import { adminFetch } from '@/lib/auth/adminFetch';

type Row = {
  id: string;
  created_at: string;
  user_id: string | null;
  organization_id: string | null;
  source: string;
  http_status: number | null;
  provider_message: string | null;
  model: string | null;
  extra: unknown;
};

export default function SystemAiLogsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/system-ai-logs?limit=200&t=${Date.now()}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || j.hint || 'Error');
      setRows(j.data || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-5 max-w-6xl pb-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="h-7 w-7 text-[#0d9488]" />
            Logs de IA (fallos)
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Cada error de Groq en «Pulir con IA» y bloqueos por cuota de organización. Así ves el mensaje real (429,
            rate limit, etc.) sin pedir capturas al técnico.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <Link
            href="/admin/audit"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Auditoría de acciones <ExternalLink className="h-3.5 w-3.5 opacity-60" />
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="border-b border-slate-100 bg-slate-50">
            <tr>
              <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase text-slate-500">Cuándo</th>
              <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase text-slate-500">HTTP</th>
              <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase text-slate-500">Origen</th>
              <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase text-slate-500">Modelo</th>
              <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase text-slate-500">Org</th>
              <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase text-slate-500">Mensaje / detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  Cargando…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  Sin registros todavía (o la tabla aún no existe en Supabase).
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 align-top">
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-600">
                    {new Date(r.created_at).toLocaleString('es-AR')}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs tabular-nums">
                    {r.http_status ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-700">{r.source}</td>
                  <td className="px-3 py-2 text-xs text-slate-600 max-w-[10rem] truncate" title={r.model || ''}>
                    {r.model || '—'}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {r.organization_id ? (
                      <Link
                        href={`/admin/organizations/${r.organization_id}`}
                        className="font-mono text-[#0d9488] hover:underline"
                      >
                        {r.organization_id.slice(0, 8)}…
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-800 whitespace-pre-wrap break-words max-w-xl">
                    {r.provider_message || '—'}
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
