'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Volume2, VolumeX } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
  getDashboardUiSoundOn,
  setDashboardUiSoundOn,
  playDashboardUiSoftPing,
  playPanelTicketAssignedChime,
  primeAndPlayPanelAssignChime,
} from '@/lib/dashboard-ui-sound';

export type PanelNotificationRow = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  ticket_id: string | null;
  read_at: string | null;
  created_at: string;
};

/** Prioridad visual: texto «urgente» gana sobre el tipo de aviso. */
function notificationVisual(n: PanelNotificationRow): {
  rowClass: string;
  chip: string;
  chipClass: string;
  rank: number;
} {
  const blob = `${n.title} ${n.body ?? ''}`;
  const urgent =
    /\burgente\b|\burgent\b|\bcritical\b|\bilocalizable\b|\bprio\s*alta\b|\bprioridad\s*alta\b/i.test(
      blob
    );

  if (urgent) {
    return {
      rowClass:
        'border-l-4 border-red-600 bg-gradient-to-r from-red-50 to-red-50/40 hover:from-red-100 hover:to-red-50/60 shadow-[inset_0_0_0_1px_rgba(220,38,38,0.12)]',
      chip: 'Urgente',
      chipClass: 'bg-red-600 text-white ring-1 ring-red-700/30',
      rank: 0,
    };
  }

  switch (n.kind) {
    case 'ticket_assigned':
      return {
        rowClass:
          'border-l-4 border-rose-500 bg-gradient-to-r from-rose-50 to-rose-50/30 hover:from-rose-100/90 hover:to-rose-50/50',
        chip: 'Asignación',
        chipClass: 'bg-rose-600 text-white',
        rank: 1,
      };
    case 'ticket_assigned_team':
      return {
        rowClass:
          'border-l-4 border-amber-500 bg-gradient-to-r from-amber-50 to-amber-50/25 hover:from-amber-100/80 hover:to-amber-50/45',
        chip: 'Equipo',
        chipClass: 'bg-amber-600 text-white',
        rank: 2,
      };
    case 'ticket_repaired_reception':
      return {
        rowClass:
          'border-l-4 border-sky-500 bg-gradient-to-r from-sky-50 to-sky-50/25 hover:from-sky-100/80 hover:to-sky-50/45',
        chip: 'Listo',
        chipClass: 'bg-sky-600 text-white',
        rank: 3,
      };
    case 'ticket_delay_followup':
      return {
        rowClass:
          'border-l-4 border-violet-500 bg-gradient-to-r from-violet-50 to-violet-50/25 hover:from-violet-100/80 hover:to-violet-50/45',
        chip: 'Seguimiento',
        chipClass: 'bg-violet-600 text-white',
        rank: 2,
      };
    default:
      return {
        rowClass:
          'border-l-4 border-teal-500/80 bg-gradient-to-r from-teal-50/90 to-teal-50/20 hover:from-teal-100/70 hover:to-teal-50/35',
        chip: 'Aviso',
        chipClass: 'bg-primary text-primary-foreground',
        rank: 4,
      };
  }
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PanelNotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [soundOn, setSoundOn] = useState(() =>
    typeof window !== 'undefined' ? getDashboardUiSoundOn() : true
  );
  const wrapRef = useRef<HTMLDivElement>(null);
  const bellBtnRef = useRef<HTMLButtonElement>(null);
  const lastPanelSoundAtRef = useRef(0);
  const initialSoundDoneRef = useRef(false);
  const unreadRef = useRef(0);
  const prevUnreadRef = useRef(0);
  const lastBellScrollAtRef = useRef(0);
  const shakeEndTimerRef = useRef<number | null>(null);

  const [bellShaking, setBellShaking] = useState(false);

  useEffect(() => {
    const sync = () => setSoundOn(getDashboardUiSoundOn());
    sync();
    window.addEventListener('dashboard-ui-sound-pref', sync);
    return () => window.removeEventListener('dashboard-ui-sound-pref', sync);
  }, []);

  useEffect(() => {
    return () => {
      if (shakeEndTimerRef.current) {
        window.clearTimeout(shakeEndTimerRef.current);
        shakeEndTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let cleanupFn: (() => void) | null = null;
    let cancelled = false;

    const setupChannel = async () => {
      // Delay para evitar race conditions
      await new Promise(r => setTimeout(r, 150));
      if (cancelled) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      // Crear canal fresco cada vez
      const channelName = `panel_notifications_sound_${user.id}_${Date.now()}`;
      const channel = supabase.channel(channelName);

      // Configurar callback antes de subscribe
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'panel_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const n: PanelNotificationRow = {
            id: String(row.id ?? ''),
            kind: String(row.kind ?? 'default'),
            title: String(row.title ?? 'Aviso'),
            body: row.body != null ? String(row.body) : null,
            ticket_id: row.ticket_id != null ? String(row.ticket_id) : null,
            read_at: row.read_at != null ? String(row.read_at) : null,
            created_at: String(row.created_at ?? new Date().toISOString()),
          };
          if (!n.id || n.read_at) return;
          setItems((prev) => [n, ...prev.filter((x) => x.id !== n.id)].slice(0, 25));
          if (!getDashboardUiSoundOn()) return;
          const now = Date.now();
          if (now - lastPanelSoundAtRef.current < 400) return;
          lastPanelSoundAtRef.current = now;
          void primeAndPlayPanelAssignChime().catch(() => {});
        }
      );

      // Subscribe sin callback inline - usar promise
      try {
        await channel.subscribe();
      } catch (e) {
        console.warn('[NotificationBell] Subscribe error:', e);
      }

      // Guardar función de limpieza
      cleanupFn = () => {
        void supabase.removeChannel(channel);
      };
    };

    void setupChannel();

    return () => {
      cancelled = true;
      if (cleanupFn) {
        cleanupFn();
        cleanupFn = null;
      }
    };
  }, []);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('panel_notifications')
        .select('id, kind, title, body, ticket_id, read_at, created_at')
        .eq('user_id', user.id)
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(25);
      if (!error && data) setItems(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  // Suena una vez al cargar si ya hay notificaciones sin leer
  useEffect(() => {
    if (loading) return;
    if (initialSoundDoneRef.current) return;
    if (items.length === 0) return;
    initialSoundDoneRef.current = true;
    if (!getDashboardUiSoundOn()) return;
    // Espera a que el usuario haya interactuado con la página (audio desbloqueado)
    const play = () => void playPanelTicketAssignedChime().catch(() => {});
    // Primer intento inmediato (funciona si ya hubo interacción previa)
    play();
    // Segundo intento tras interacción: por si el audio todavía no estaba desbloqueado
    const onInteract = () => {
      play();
      window.removeEventListener('pointerdown', onInteract);
    };
    window.addEventListener('pointerdown', onInteract, { once: true });
    // Limpiar listener tras 15 s si no hubo interacción
    const t = window.setTimeout(() => window.removeEventListener('pointerdown', onInteract), 15000);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('pointerdown', onInteract);
    };
  }, [loading, items.length]);

  /** Orden: más prioritarios primero, luego más recientes. */
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const ra = notificationVisual(a).rank;
      const rb = notificationVisual(b).rank;
      if (ra !== rb) return ra - rb;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [items]);

  /** Solo guardamos no leídos: el contador es la longitud de la lista. */
  const unread = items.length;
  unreadRef.current = unread;

  const runBellShake = useCallback(() => {
    if (unreadRef.current <= 0) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    if (shakeEndTimerRef.current) {
      window.clearTimeout(shakeEndTimerRef.current);
      shakeEndTimerRef.current = null;
    }
    setBellShaking(true);
    shakeEndTimerRef.current = window.setTimeout(() => {
      setBellShaking(false);
      shakeEndTimerRef.current = null;
    }, 700);
  }, []);

  /** Mientras haya avisos sin leer: balanceo cada 5 s (técnico alejado del panel). */
  useEffect(() => {
    if (unread <= 0) {
      setBellShaking(false);
      if (shakeEndTimerRef.current) {
        window.clearTimeout(shakeEndTimerRef.current);
        shakeEndTimerRef.current = null;
      }
      return;
    }
    const id = window.setInterval(() => {
      runBellShake();
    }, 5000);
    return () => window.clearInterval(id);
  }, [unread, runBellShake]);

  /** Primera aparición de contador >0 en esta sesión del componente: un toque inmediato. */
  useEffect(() => {
    if (unread > 0 && prevUnreadRef.current === 0) {
      const t = window.setTimeout(() => runBellShake(), 400);
      prevUnreadRef.current = unread;
      return () => window.clearTimeout(t);
    }
    prevUnreadRef.current = unread;
  }, [unread, runBellShake]);

  /** Vuelve a la pestaña del panel: sacudida + intento de llevar la campana a la vista (p. ej. scroll largo). */
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'visible') return;
      if (unreadRef.current <= 0) return;
      runBellShake();
      const now = Date.now();
      if (now - lastBellScrollAtRef.current < 25_000) return;
      lastBellScrollAtRef.current = now;
      bellBtnRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [runBellShake]);

  const hasUrgent = useMemo(
    () => items.some((n) => notificationVisual(n).rank === 0),
    [items]
  );

  const dismissNotification = async (id: string) => {
    const supabase = createClient();
    const { error } = await (supabase as any)
      .from('panel_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id);
    if (error) console.warn('panel_notifications mark read:', error.message);
  };

  const markAllRead = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const now = new Date().toISOString();
    await (supabase as any)
      .from('panel_notifications')
      .update({ read_at: now })
      .eq('user_id', user.id)
      .is('read_at', null);
    setItems([]);
  };

  const onItemClick = async (n: PanelNotificationRow) => {
    setOpen(false);
    setItems((prev) => prev.filter((x) => x.id !== n.id));
    void dismissNotification(n.id);
    if (n.ticket_id) {
      router.push(`/dashboard/tickets/${n.ticket_id}`);
    } else {
      router.push('/dashboard/tickets');
    }
  };

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button
        ref={bellBtnRef}
        type="button"
        aria-expanded={open}
        aria-label={unread > 0 ? `Notificaciones, ${unread} sin leer` : 'Notificaciones'}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full p-0 text-white/90 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <span
          className={cn(
            'flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-white/20 ring-1 ring-white/25',
            bellShaking && 'animate-panel-bell-shake'
          )}
        >
          <Bell className="h-4 w-4 text-white" strokeWidth={2} aria-hidden />
        </span>
        {unread > 0 && (
          <span
            className={
              hasUrgent
                ? 'absolute -right-0.5 -top-0.5 z-[1] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-[var(--panel-header-bg)]'
                : 'absolute -right-0.5 -top-0.5 z-[1] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold leading-none text-gray-900 shadow-sm ring-2 ring-[var(--panel-header-bg)]'
            }
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-[min(100vw-2rem,22rem)] rounded-xl border border-gray-200 bg-white shadow-xl z-[60] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50/80">
            <span className="text-xs font-semibold text-gray-700">Avisos</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-[11px] font-medium text-primary hover:underline"
              >
                Marcar leídas
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto overflow-x-hidden">
            {loading ? (
              <div className="px-4 py-8 text-center text-xs text-gray-400">Cargando…</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-gray-500">
                No hay avisos pendientes. Cuando te asignen un ticket verás el aviso aquí; al pulsarlo
                se abre la ficha.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100/80">
                {sortedItems.map((n) => {
                  const vis = notificationVisual(n);
                  return (
                    <li key={n.id} className="min-w-0">
                      <button
                        type="button"
                        onClick={() => void onItemClick(n)}
                        className={`w-full min-w-0 text-left px-3 py-2.5 transition-colors ${vis.rowClass}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-0.5">
                          <p className="text-xs font-semibold text-gray-900 break-words flex-1 min-w-0">
                            {n.title}
                          </p>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${vis.chipClass}`}
                          >
                            {vis.chip}
                          </span>
                        </div>
                        {n.body && (
                          <p className="text-[11px] text-gray-700 mt-0.5 line-clamp-2 break-words leading-snug">
                            {n.body}
                          </p>
                        )}
                        <p className="text-[10px] text-gray-500 mt-1.5 font-medium">
                          {new Date(n.created_at).toLocaleString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-gray-100 bg-gray-50/90 px-3 py-2">
            <span className="text-[10px] text-gray-600">Pitido al avisar</span>
            <button
              type="button"
              onClick={() => {
                const next = !soundOn;
                setSoundOn(next);
                setDashboardUiSoundOn(next);
                if (next) void playDashboardUiSoftPing().catch(() => {});
              }}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-gray-700 transition-colors hover:bg-gray-200/80"
              aria-pressed={soundOn}
            >
              {soundOn ? (
                <>
                  <Volume2 className="h-3.5 w-3.5 text-primary" />
                  Activado
                </>
              ) : (
                <>
                  <VolumeX className="h-3.5 w-3.5 text-gray-400" />
                  Silenciado
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
