'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Activity, RefreshCw, Monitor, Building2, User, ChevronDown, ChevronUp, Wifi } from 'lucide-react';
import { adminFetch } from '@/lib/auth/adminFetch';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { PANEL_REALTIME_WINDOW_MS } from '@/lib/panel-presence';

type OnlineUser = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  organizations: { id: string; name: string }[];
  last_active_at: string;
  session_count: number;
  sessions: {
    client_key: string;
    last_active_at: string;
    user_agent: string | null;
    location_label: string | null;
    ip_address: string | null;
  }[];
};

/** Tiempo máximo para considerar una sesión activa en tiempo real (30 segundos) */
const REALTIME_WINDOW_MS = PANEL_REALTIME_WINDOW_MS;

/** Intervalo de polling de respaldo cuando Realtime no está disponible (15 segundos) */
const FALLBACK_POLLING_MS = 15_000;

function relativeActivity(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (sec < 5) return 'ahora';
  if (sec < 60) return `hace ${sec}s`;
  if (sec < 3600) return `hace ${Math.floor(sec / 60)} min`;
  return `hace ${Math.floor(sec / 3600)} h`;
}

function isRecentlyActive(iso: string): boolean {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < REALTIME_WINDOW_MS;
}

function shortUa(ua: string | null): string {
  if (!ua) return '—';
  const s = ua.slice(0, 120);
  return s.length < ua.length ? `${s}…` : s;
}

export default function PanelOnlinePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [windowMs, setWindowMs] = useState(REALTIME_WINDOW_MS);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const lastDataRef = useRef<OnlineUser[]>([]);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await adminFetch('/api/admin/panel-online-users?realtime=true');
      const json = await res.json();
      if (!res.ok) {
        if (!silent) {
          setError(json.error || json.hint || 'No se pudo cargar');
          setUsers([]);
        }
        return;
      }
      const newUsers = json.data?.users || [];
      setUsers(newUsers);
      lastDataRef.current = newUsers;
      setWindowMs(REALTIME_WINDOW_MS);
      setGeneratedAt(json.data?.generated_at ?? null);
      if (silent) setError(null);
    } catch {
      if (!silent) {
        setError('Error de red');
        setUsers([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  /** Procesa cambios de la tabla user_panel_sessions en tiempo real */
  const processRealtimeChange = useCallback((payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    setUsers(currentUsers => {
      const usersMap = new Map(currentUsers.map(u => [u.user_id, { ...u, sessions: [...u.sessions] }]));

      if (eventType === 'DELETE' && oldRecord) {
        // Eliminar sesión
        const userId = oldRecord.user_id as string;
        const clientKey = oldRecord.client_key as string;
        const user = usersMap.get(userId);
        if (user) {
          user.sessions = user.sessions.filter(s => s.client_key !== clientKey);
          if (user.sessions.length === 0) {
            usersMap.delete(userId);
          } else {
            user.session_count = user.sessions.length;
            user.last_active_at = user.sessions[0]?.last_active_at || user.last_active_at;
          }
        }
      } else if ((eventType === 'INSERT' || eventType === 'UPDATE') && newRecord) {
        // Agregar o actualizar sesión
        const userId = newRecord.user_id as string;
        const session = {
          client_key: newRecord.client_key as string,
          last_active_at: newRecord.last_active_at as string,
          user_agent: newRecord.user_agent as string | null,
          location_label: newRecord.location_label as string | null,
          ip_address: newRecord.ip_address as string | null,
        };

        const user = usersMap.get(userId);
        if (user) {
          // Actualizar sesión existente o agregar nueva
          const existingIndex = user.sessions.findIndex(s => s.client_key === session.client_key);
          if (existingIndex >= 0) {
            user.sessions[existingIndex] = session;
          } else {
            user.sessions.push(session);
          }
          user.session_count = user.sessions.length;
          user.last_active_at = session.last_active_at;
          // Reordenar sesiones por fecha
          user.sessions.sort((a, b) => new Date(b.last_active_at).getTime() - new Date(a.last_active_at).getTime());
        } else {
          // Nuevo usuario - necesitamos hacer fetch completo para obtener datos del perfil
          // Esto se maneja en el efecto de suscripción con un debounce
          return currentUsers;
        }
      }

      return Array.from(usersMap.values()).sort((a, b) =>
        new Date(b.last_active_at).getTime() - new Date(a.last_active_at).getTime()
      );
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Suscripción a Supabase Realtime para cambios en tiempo real
  useEffect(() => {
    // Crear cliente de Supabase para Realtime
    const supabase = createClient();
    supabaseRef.current = supabase;

    // Suscribirse a cambios en la tabla user_panel_sessions
    const channel = supabase
      .channel('panel-online-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_panel_sessions',
        },
        (payload) => {
          processRealtimeChange(payload as { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> });
        }
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') {
          console.log('[PanelOnline] Conectado a Realtime');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[PanelOnline] Error de conexión Realtime:', status);
        }
      });

    // Cleanup
    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [processRealtimeChange]);

  // Polling de respaldo si Realtime no está conectado (o para refrescar datos completos periódicamente)
  useEffect(() => {
    const intervalMs = isRealtimeConnected ? 60_000 : FALLBACK_POLLING_MS;
    const id = setInterval(() => void load({ silent: true }), intervalMs);
    return () => clearInterval(id);
  }, [load, isRealtimeConnected]);

  const windowSec = Math.round(windowMs / 1000);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <Link href="/admin" className="hover:text-slate-700">
                Inicio
              </Link>
              <span>/</span>
              <span className="text-slate-800 font-medium">Usuarios en línea</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Activity className="h-7 w-7 text-emerald-600" />
              Usuarios con panel abierto
            </h1>
            <p className="text-sm text-slate-600 mt-2 max-w-2xl">
              Lista de <strong>cuentas de usuario</strong> con panel abierto en tiempo real (últimos{' '}
              <strong>{windowSec} segundos</strong>). La lista se actualiza automáticamente.
              Cada navegador o pestaña con sesión propia cuenta como sesión adicional.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className={cn(
                'inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full',
                isRealtimeConnected
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              )}>
                <Wifi className={cn('h-3 w-3', isRealtimeConnected && 'animate-pulse')} />
                {isRealtimeConnected ? 'Tiempo real activo' : 'Sincronizando...'}
              </span>
            </div>
            {generatedAt ? (
              <p className="text-xs text-slate-400 mt-2">Actualizado: {new Date(generatedAt).toLocaleString('es-ES')}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Actualizar
          </button>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        ) : null}

        {!error && !loading && users.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-600">
            <Monitor className="h-10 w-10 mx-auto text-slate-300 mb-3" />
            <p className="font-medium text-slate-800">Nadie en línea en este momento</p>
            <p className="text-sm mt-2 max-w-md mx-auto">
              Los usuarios deben tener el dashboard abierto. Las conexiones se detectan en tiempo real (heartbeat cada 10 segundos).
            </p>
          </div>
        ) : null}

        {loading && users.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 flex justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-[#0d9488]" />
          </div>
        ) : null}

        <div className="space-y-3">
          {users.map((u) => {
            const open = expanded[u.user_id];
            const label = u.display_name || u.email || u.user_id.slice(0, 8);
            return (
              <div
                key={u.user_id}
                className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
              >
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className={cn(
                      'mt-1 h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_0_3px_rgba(16,185,129,0.35)]',
                      isRecentlyActive(u.last_active_at)
                        ? 'bg-emerald-500 animate-pulse'
                        : 'bg-amber-500'
                    )} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900 truncate">{label}</span>
                        {u.session_count > 1 ? (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                            {u.session_count} sesiones
                          </span>
                        ) : null}
                      </div>
                      {u.email ? (
                        <p className="text-sm text-slate-600 truncate">{u.email}</p>
                      ) : (
                        <p className="text-xs text-slate-400 font-mono truncate">{u.user_id}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-500">
                        <span className={cn(
                          'inline-flex items-center gap-1',
                          isRecentlyActive(u.last_active_at) ? 'text-emerald-600' : 'text-amber-600'
                        )}>
                          <Activity className="h-3.5 w-3.5" />
                          {relativeActivity(u.last_active_at)}
                        </span>
                        {u.organizations.length > 0 ? (
                          <span className="inline-flex items-center gap-1 min-w-0">
                            <Building2 className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">
                              {u.organizations.map((o) => o.name).join(' · ')}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700/90">
                            <User className="h-3.5 w-3.5" />
                            Sin membresía activa en organization_members
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/admin/users?search=${encodeURIComponent(u.email || u.user_id)}`}
                      className="text-xs font-semibold text-[#0d9488] hover:underline"
                    >
                      Ver en Usuarios
                    </Link>
                    {u.sessions.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setExpanded((prev) => ({ ...prev, [u.user_id]: !prev[u.user_id] }))}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Detalle
                        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    ) : null}
                  </div>
                </div>
                {open ? (
                  <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-3 space-y-2">
                    {u.sessions.map((s) => (
                      <div
                        key={s.client_key}
                        className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600 space-y-1"
                      >
                        <div className="flex flex-wrap justify-between gap-2 text-slate-500">
                          <span>{relativeActivity(s.last_active_at)}</span>
                          {s.location_label ? <span className="text-slate-700">{s.location_label}</span> : null}
                          {s.ip_address ? <span className="font-mono">{s.ip_address}</span> : null}
                        </div>
                        <p className="text-[11px] leading-relaxed break-all text-slate-500">{shortUa(s.user_agent)}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
