'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getOrCreatePanelSessionClientKey } from '@/lib/panel-session-client';
import { shortUserAgentLabel } from '@/lib/format-user-agent';
import { humanizeUserPanelSessionsError } from '@/lib/supabase-setup-hints';

type SessionRow = {
  id: string;
  client_key: string;
  user_agent: string | null;
  ip_address: string | null;
  location_label: string | null;
  created_at: string;
  last_active_at: string;
};

async function sendHeartbeat(): Promise<boolean> {
  const key = getOrCreatePanelSessionClientKey();
  if (!key) return false;
  try {
    const r = await fetch('/api/auth/panel-session/heartbeat', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_key: key,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

function fmtDt(iso: string) {
  try {
    return new Date(iso).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function ActiveSessionsSection() {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_panel_sessions')
        .select('id, client_key, user_agent, ip_address, location_label, created_at, last_active_at')
        .order('last_active_at', { ascending: false });

      if (error) {
        toast.error(humanizeUserPanelSessionsError(error.message));
        setRows([]);
        return;
      }
      setRows((data || []) as SessionRow[]);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al cargar sesiones');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void sendHeartbeat().then(() => void load());
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void sendHeartbeat().then((ok) => {
        if (ok) void load();
      });
    }, 2 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const slice = rows.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const closeAll = async () => {
    if (!window.confirm('¿Cerrar todas las sesiones? Tendrás que volver a iniciar sesión en todos los dispositivos.')) {
      return;
    }
    setBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Sesión no válida');
        return;
      }
      const { error: delErr } = await supabase.from('user_panel_sessions').delete().eq('user_id', user.id);
      if (delErr) {
        toast.error(delErr.message);
        return;
      }
      const { error: signErr } = await supabase.auth.signOut({ scope: 'global' });
      if (signErr) {
        toast.error(signErr.message);
        window.location.href = '/login';
        return;
      }
      window.location.href = '/login';
    } finally {
      setBusy(false);
    }
  };

  const removeRow = async (row: SessionRow, isCurrent: boolean) => {
    if (isCurrent) {
      if (!window.confirm('¿Cerrar sesión en este navegador?')) return;
      setBusy(true);
      try {
        const { error: d } = await supabase.from('user_panel_sessions').delete().eq('id', row.id);
        if (d) {
          toast.error(d.message);
          return;
        }
        await supabase.auth.signOut({ scope: 'local' });
        window.location.href = '/login';
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!window.confirm('¿Quitar esta entrada de la lista? (El otro dispositivo puede seguir conectado hasta que uses «Cerrar todas».)')) {
      return;
    }
    setBusy(true);
    try {
      const { error: d } = await supabase.from('user_panel_sessions').delete().eq('id', row.id);
      if (d) toast.error(d.message);
      else {
        toast.success('Entrada eliminada');
        void load();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-8 py-6">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
        <span>Configuración</span>
        <ChevronRight className="h-3 w-3" />
        <span>Sesiones activas</span>
      </div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sesiones activas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Dispositivos que han usado el panel recientemente. La ubicación se estima por IP cuando es posible.
          </p>
        </div>
        <Button variant="destructive" disabled={busy || loading} onClick={() => void closeAll()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Cerrar todas
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Navegador y dispositivo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Dirección IP</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Inicio de sesión</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Última actividad</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Ubicación</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                  <Loader2 className="h-6 w-6 animate-spin inline text-[#F5C518] mr-2 align-middle" />
                  Cargando sesiones…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                  No hay sesiones registradas aún. Entrá de nuevo al panel o recargá la página; si el error persiste,
                  aplicá la migración <code className="text-xs bg-gray-100 px-1 rounded">202604033900_user_panel_sessions.sql</code> en
                  Supabase.
                </td>
              </tr>
            ) : (
              slice.map((row) => {
                const isCurrent =
                  typeof window !== 'undefined' && row.client_key === getOrCreatePanelSessionClientKey();
                return (
                  <tr key={row.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{shortUserAgentLabel(row.user_agent)}</span>
                        {isCurrent ? (
                          <Badge variant="outline" className="text-[10px] border-[#F5C518] text-[#F5C518]">
                            Esta sesión
                          </Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">{row.ip_address || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtDt(row.created_at)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtDt(row.last_active_at)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{row.location_label || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 text-xs bg-[#0f766e] text-white hover:bg-[#115e59]"
                        disabled={busy}
                        onClick={() => void removeRow(row, isCurrent)}
                      >
                        {isCurrent ? 'Cerrar' : 'Quitar'}
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <select
              className="h-8 px-2 border border-gray-300 rounded text-sm bg-white"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-500">
              {rows.length === 0 ? 'Sin sesiones' : `${rows.length} sesión(es) · Página ${safePage + 1} de ${totalPages}`}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              className="h-8 w-8 p-0 bg-[#0f766e] text-white hover:bg-[#115e59]"
              disabled={safePage <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              aria-label="Anterior"
            >
              ←
            </Button>
            <Button size="sm" className="h-8 min-w-8 px-2 bg-[#F5C518] hover:bg-[#D4A915] text-[#0D1117]">
              {safePage + 1}
            </Button>
            <Button
              size="sm"
              className="h-8 w-8 p-0 bg-[#0f766e] text-white hover:bg-[#115e59]"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              aria-label="Siguiente"
            >
              →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
