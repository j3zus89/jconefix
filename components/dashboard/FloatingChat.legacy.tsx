'use client';

/**
 * CHAT INTERNO — DISEÑO ANTERIOR (respaldo)
 * -----------------------------------------
 * El panel usa `FloatingChat` en `components/dashboard/FloatingChat.tsx` (diseño minimal).
 * Para volver al estilo con cabecera teal y burbujas de color:
 *   En `app/dashboard/layout.tsx`, cambia:
 *     import { FloatingChat } from '@/components/dashboard/FloatingChat';
 *   por:
 *     import { FloatingChatLegacy as FloatingChat } from '@/components/dashboard/FloatingChat.legacy';
 */

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { MessageCircle, Send, Minimize2, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getActiveOrganizationId } from '@/lib/dashboard-org';
import { dashboardTealHeaderGradient } from '@/components/dashboard/dashboard-form-styles';
import {
  getDashboardUiSoundOn,
  setDashboardUiSoundOn,
  playDashboardUiSoftPing,
  primeDashboardUiAudio,
} from '@/lib/dashboard-ui-sound';
import { getChatMessagesSinceIso, CHAT_HISTORY_RETENTION_DAYS } from '@/lib/chat-retention';
import { loadOrgUserRoleLabelMap } from '@/lib/org-role-labels';
import { ChatDmMessageRow } from '@/components/dashboard/ChatDmMessageRow';

type Message = {
  id: string;
  user_id: string;
  organization_id: string;
  sender_name: string;
  sender_color: string;
  message: string;
  ticket_ref: string | null;
  created_at: string;
};

const AVATAR_COLORS = [
  '#0d9488', '#dc2626', '#d97706', '#7c3aed',
  '#db2777', '#0891b2', '#65a30d', '#ea580c',
  '#2563eb', '#9333ea', '#b45309', '#0f766e',
  '#be123c', '#4338ca', '#15803d', '#c2410c',
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Construye un mapa userId → color garantizando que ningún usuario repite color.
 * Intenta usar el color natural del hash; si hay colisión, busca el siguiente libre.
 * Los ids se procesan ordenados por userId para que el resultado sea determinista
 * entre sesiones (independiente del orden de llegada de mensajes).
 */
function buildUniqueColorMap(userIds: string[]): Map<string, string> {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const id of userIds) {
    if (!seen.has(id)) { seen.add(id); unique.push(id); }
  }
  unique.sort();
  const map = new Map<string, string>();
  const usedIdxs: number[] = [];
  for (const uid of unique) {
    let idx = hashString(uid) % AVATAR_COLORS.length;
    let attempts = 0;
    while (usedIdxs.includes(idx) && attempts < AVATAR_COLORS.length) {
      idx = (idx + 1) % AVATAR_COLORS.length;
      attempts++;
    }
    map.set(uid, AVATAR_COLORS[idx]!);
    usedIdxs.push(idx);
  }
  return map;
}

function getUserColor(userId: string): string {
  const hash = hashString(userId);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]!;
}

/** En polls silenciosos, fusiona respuesta del servidor con el estado local (Realtime / optimistas) para no perder filas ni desincronizar el contador. */
function mergeChatMessages(prev: Message[], serverRows: Message[]): Message[] {
  const server = serverRows.map((m) => ({
    ...m,
    sender_color: m.sender_color || getUserColor(m.user_id),
  }));
  const byId = new Map<string, Message>();
  for (const m of server) byId.set(m.id, m);
  for (const m of prev) {
    if (m.id.startsWith('temp-')) {
      const dup = server.some(
        (s) =>
          s.user_id === m.user_id &&
          s.message.trim() === m.message.trim() &&
          Math.abs(new Date(s.created_at).getTime() - new Date(m.created_at).getTime()) < 20000
      );
      if (!dup) byId.set(m.id, m);
    } else if (!byId.has(m.id)) {
      byId.set(m.id, m);
    }
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

/** Respaldo del chat interno (diseño anterior con cabecera teal y burbujas). Para volver atrás, en `layout.tsx` importa `FloatingChatLegacy` en lugar de `FloatingChat`. */
export function FloatingChatLegacy() {
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(() =>
    typeof window !== 'undefined' ? getDashboardUiSoundOn() : true
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderColor, setSenderColor] = useState(AVATAR_COLORS[0]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [roleLabelByUserId, setRoleLabelByUserId] = useState<Map<string, string>>(new Map());
  const [avatarByUserId, setAvatarByUserId] = useState<Record<string, string>>({});
  // Mapa único: cada userId → color diferente, sin colisiones
  const uniqueColorMap = useMemo(() => {
    const ids = messages.map((m) => m.user_id);
    if (currentUserId && !ids.includes(currentUserId)) ids.push(currentUserId);
    return buildUniqueColorMap(ids);
  }, [messages, currentUserId]);

  // Mantener senderColor sincronizado con el mapa único
  useEffect(() => {
    if (currentUserId) {
      const c = uniqueColorMap.get(currentUserId);
      if (c) setSenderColor(c);
    }
  }, [uniqueColorMap, currentUserId]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isOpenRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);
  const lastReadKeyRef = useRef<string | null>(null);
  const unreadCountRef = useRef(0);
  const lastChatSoundAtRef = useRef(0);

  useEffect(() => {
    lastReadKeyRef.current =
      organizationId && currentUserId
        ? `floating_chat_last_read_${organizationId}_${currentUserId}`
        : null;
  }, [organizationId, currentUserId]);

  useEffect(() => {
    if (isOpen) {
      void primeDashboardUiAudio();
    }
  }, [isOpen]);

  useEffect(() => {
    const sync = () => setSoundOn(getDashboardUiSoundOn());
    sync();
    window.addEventListener('dashboard-ui-sound-pref', sync);
    return () => window.removeEventListener('dashboard-ui-sound-pref', sync);
  }, []);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    unreadCountRef.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    const ids = Array.from(new Set(messages.map((m) => m.user_id)));
    if (ids.length === 0) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('id, avatar_url')
        .in('id', ids);
      if (cancelled || error || !data) return;
      setAvatarByUserId((prev) => {
        const next = { ...prev };
        for (const row of data as { id: string; avatar_url: string | null }[]) {
          if (row.avatar_url) next[row.id] = row.avatar_url;
        }
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [messages, supabase]);

  useEffect(() => {
    if (!organizationId) {
      setRoleLabelByUserId(new Map());
      return;
    }
    let cancelled = false;
    void loadOrgUserRoleLabelMap(supabase, organizationId).then((map) => {
      if (!cancelled) setRoleLabelByUserId(map);
    });
    return () => {
      cancelled = true;
    };
  }, [organizationId, supabase]);

  const maybePlayChatSound = useCallback(() => {
    if (!getDashboardUiSoundOn()) return;
    const now = Date.now();
    if (now - lastChatSoundAtRef.current < 500) return;
    lastChatSoundAtRef.current = now;
    void playDashboardUiSoftPing().catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async (user: User | null) => {
      if (cancelled) return;
      if (user) {
        setCurrentUserId(user.id);
        setSenderName(user.email?.split('@')[0] || 'Usuario');
        setSenderColor(uniqueColorMap.get(user.id) ?? getUserColor(user.id));
        const orgId = await getActiveOrganizationId(supabase);
        if (!cancelled) setOrganizationId(orgId);
      } else {
        setCurrentUserId(null);
        setOrganizationId(null);
      }
      if (!cancelled) setLoading(false);
    };

    void supabase.auth.getSession().then(({ data: { session } }) => {
      void hydrate(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void hydrate(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const loadMessages = useCallback(
    async (orgId: string, opts?: { silent?: boolean }) => {
      const { data, error } = await (supabase as any)
        .from('chat_messages')
        .select('*')
        .eq('organization_id', orgId)
        .gte('created_at', getChatMessagesSinceIso())
        .order('created_at', { ascending: false })  // descendente para coger los más recientes
        .limit(40);                                   // solo los últimos 40
      if (error) {
        console.error('[FloatingChatLegacy]', error);
        if (!opts?.silent) {
          toast.error(error.message || 'No se pudieron cargar los mensajes del chat');
        }
        return;
      }
      // La query devuelve DESC → revertir para mostrar orden cronológico
      const list = ((data || []) as Message[]).reverse();

      let pingFromPoll = false;
      setMessages((prev) => {
        const next = opts?.silent ? mergeChatMessages(prev, list) : mergeChatMessages([], list);

        const key = lastReadKeyRef.current;
        if (key && localStorage.getItem(key) == null && next.length > 0) {
          const t = new Date(next[next.length - 1].created_at).getTime();
          localStorage.setItem(key, String(t));
        }
        if (!isOpenRef.current && key && currentUserIdRef.current) {
          const lr = parseFloat(localStorage.getItem(key) || '0');
          const n = next.filter(
            (m) =>
              new Date(m.created_at).getTime() > lr && m.user_id !== currentUserIdRef.current
          ).length;
          if (opts?.silent && n > unreadCountRef.current) {
            pingFromPoll = true;
          }
          setUnreadCount(n);
        }

        return next;
      });
      if (pingFromPoll) {
        queueMicrotask(() => maybePlayChatSound());
      }
    },
    [supabase, maybePlayChatSound]
  );

  useEffect(() => {
    if (!organizationId) {
      setMessages([]);
      return;
    }

    void loadMessages(organizationId);
    const channel = supabase
      .channel(`chat_messages_${organizationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `organization_id=eq.${organizationId}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            const withoutTemp = prev.filter((m) => {
              if (!m.id.startsWith('temp-')) return true;
              const isSameSender = m.user_id === newMsg.user_id;
              const isSameText = m.message.trim() === newMsg.message.trim();
              const dt = Math.abs(new Date(m.created_at).getTime() - new Date(newMsg.created_at).getTime());
              return !(isSameSender && isSameText && dt < 15000);
            });
            return [...withoutTemp, { ...newMsg, sender_color: getUserColor(newMsg.user_id) }];
          });
          if (newMsg.user_id !== currentUserIdRef.current && !isOpenRef.current) {
            let didIncrement = false;
            const key = lastReadKeyRef.current;
            if (key) {
              const lr = parseFloat(localStorage.getItem(key) || '0');
              if (new Date(newMsg.created_at).getTime() > lr) {
                setUnreadCount((prev) => prev + 1);
                didIncrement = true;
              }
            } else {
              setUnreadCount((prev) => prev + 1);
              didIncrement = true;
            }
            if (didIncrement) {
              maybePlayChatSound();
            }
          }
        }
      )
      .subscribe((status: string, err?: Error) => {
        if (status === 'SUBSCRIBED') return;
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[FloatingChatLegacy] Realtime:', status, err);
        }
      });

    const pollMs = 3000;
    const poll = setInterval(() => {
      void loadMessages(organizationId, { silent: true });
    }, pollMs);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void loadMessages(organizationId, { silent: true });
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
      supabase.removeChannel(channel);
    };
  }, [organizationId, supabase, loadMessages]);

  const scrollToBottomInstant = useCallback(() => {
    // Intentar via scrollTop primero (más fiable), fallback a scrollIntoView
    const el = bottomRef.current?.parentElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    } else {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      const key = lastReadKeyRef.current;
      if (key) localStorage.setItem(key, String(Date.now()));
      setUnreadCount(0);
      setTimeout(() => inputRef.current?.focus(), 50);
      // Scroll instantáneo: doble disparo para asegurar que el DOM ya renderizó
      scrollToBottomInstant();
      setTimeout(() => scrollToBottomInstant(), 80);
    }
  }, [isOpen, scrollToBottomInstant]);

  const handleSend = async () => {
    if (!input.trim() || !currentUserId || !organizationId) return;
    const messageText = input.trim();
    
    // Optimistic update - show message immediately
    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      user_id: currentUserId,
      organization_id: organizationId,
      sender_name: senderName,
      sender_color: senderColor,
      message: messageText,
      ticket_ref: null,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setInput('');
    
    // Scroll instantáneo tras enviar
    setTimeout(() => scrollToBottomInstant(), 0);
    
    // Send to database
    const payload = {
      user_id: currentUserId,
      organization_id: organizationId,
      sender_name: senderName,
      sender_color: senderColor,
      message: messageText,
      ticket_ref: null,
    };
    const { error } = await (supabase as any).from('chat_messages').insert([payload]);
    if (error) {
      toast.error(
        error.message ||
          'No se pudo enviar: revisa RLS (debe aplicarse 202604021800/202604021710) y que exista migración 202604025500 (Realtime en chat_messages).'
      );
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * El layout del dashboard es `flex flex-col`; un hijo directo `button` con `fixed` puede
   * seguir tratándose como ítem flex y estirarse al 100% del ancho (`align-items: stretch`).
   * Este `div` con `fixed` sale del flujo flex y limita el ancho al contenido (`w-max`).
   */
  return (
    <div className="fixed bottom-4 right-4 z-50 w-max max-w-[calc(100vw-2rem)]">
      {!isOpen && (
        <button
          onClick={() => {
            void primeDashboardUiAudio();
            setIsOpen(true);
          }}
          type="button"
          className={cn(
            'no-ui-hover-grow relative inline-flex shrink-0 items-center gap-2 rounded-full bg-[#0d9488] px-4 py-3 text-white shadow-lg transition-all hover:scale-105 hover:bg-[#0f766e]',
            unreadCount > 0 && 'shadow-md shadow-red-500/35'
          )}
        >
          <MessageCircle className="h-5 w-5" />
          <span className="font-medium text-sm">Chat</span>
          {unreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold leading-none text-white shadow-md">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </button>
      )}

      {isOpen && (
        <div className="flex h-96 w-80 min-w-0 max-w-full flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xl">
          <div
            className={cn(
              'flex flex-shrink-0 items-center justify-between px-4 py-3 text-white',
              dashboardTealHeaderGradient
            )}
          >
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 shrink-0" />
              <span className="text-sm font-semibold">Chat Interno</span>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => {
                  const next = !soundOn;
                  setSoundOn(next);
                  setDashboardUiSoundOn(next);
                  if (next) {
                    void primeDashboardUiAudio()
                      .then(() => playDashboardUiSoftPing())
                      .catch(() => {});
                  }
                }}
                className="rounded p-1.5 transition-colors hover:bg-white/20"
                title={
                  soundOn
                    ? 'Silenciar pitido al recibir mensajes (minimizado)'
                    : 'Activar pitido suave al recibir mensajes'
                }
                aria-pressed={soundOn}
                aria-label={soundOn ? 'Desactivar sonido de avisos' : 'Activar sonido de avisos'}
              >
                {soundOn ? (
                  <Volume2 className="h-4 w-4 shrink-0 opacity-90" />
                ) : (
                  <VolumeX className="h-4 w-4 shrink-0 opacity-70" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded p-1 transition-colors hover:bg-white/20"
                title="Minimizar"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages — flex-col-reverse: el navegador mantiene el scroll en el fondo automáticamente */}
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-white px-3 py-3 flex flex-col-reverse">
            {/* bottomRef al inicio del DOM (visualmente abajo por col-reverse) */}
            <div ref={bottomRef} />
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#0d9488] border-t-transparent" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageCircle className="h-8 w-8 text-gray-300 mb-2" />
                <p className="text-xs text-gray-400">Sin mensajes</p>
                <p className="text-[10px] text-gray-300">Escribe para empezar</p>
                <p className="mt-2 text-[9px] text-gray-400">Historial: últimos {CHAT_HISTORY_RETENTION_DAYS} días</p>
              </div>
            ) : (
              /* Revertir para que flex-col-reverse muestre orden cronológico correcto */
              [...messages].reverse().map((msg) => {
                const isMe = msg.user_id === currentUserId;
                const resolvedColor = uniqueColorMap.get(msg.user_id) ?? msg.sender_color;
                return (
                  <div key={msg.id} className="mb-3">
                    <ChatDmMessageRow
                      senderName={msg.sender_name}
                      senderColor={resolvedColor}
                      body={msg.message}
                      timeLabel={formatTime(msg.created_at)}
                      isMe={isMe}
                      mentionHandle={senderName}
                      avatarUrl={avatarByUserId[msg.user_id]}
                      roleLabel={roleLabelByUserId.get(msg.user_id)}
                      size="sm"
                    />
                  </div>
                );
              })
            )}
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t border-gray-200/80 flex-shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe un mensaje… (@nombre para mencionar)"
                className="flex-1 rounded-full border border-[#0d9488]/35 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim()}
                className="rounded-full bg-[#0d9488] p-2 text-white transition-colors hover:bg-[#0f766e] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
