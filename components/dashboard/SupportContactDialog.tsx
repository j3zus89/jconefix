'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, X, ChevronLeft, MoreVertical, Smile } from 'lucide-react';
import { SupportAssistantMascot } from '@/components/dashboard/SupportAssistantMascot';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { PanelChatMessageBlock, PanelChatComposer } from '@/components/dashboard/PanelChatShell';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  supportChatSideBySideRightStyle,
  supportChatStackedBottomStyle,
  useDashboardFloatingChats,
} from '@/components/dashboard/DashboardFloatingChatsContext';
import {
  SUPPORT_TYPING_BROADCAST_EVENT,
  supportTypingChannelId,
} from '@/lib/support-chat-typing';
import { useSignedAttachmentUrls } from '@/lib/hooks/useSignedAttachmentUrls';

type Msg = {
  id: string;
  sender: string;
  body: string;
  created_at: string;
  attachment_url?: string | null;
  is_bot_message?: boolean | null;
  admin_sender_avatar_url?: string | null;
  admin_sender_display_name?: string | null;
  _local?: boolean;
};

/** Respaldo ligero si Realtime falla; los mensajes nuevos entran por postgres_changes. */
const POLL_MS = 8_000;

/** Si el usuario está a menos de esto del fondo, seguimos haciendo autoscroll con mensajes nuevos. */
const SCROLL_STICK_BOTTOM_PX = 120;

const SERVER_MSG_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const QUICK_EMOJIS = ['😀', '👋', '🙂', '🙏', '👍', '✅', '❤️', '🎉'];
/** Reacciones tipo “GIF” / memes (misma grilla que abre el botón GIF). */
const QUICK_REACTIONS = ['🤣', '😂', '🔥', '💯', '👏', '🎬', '😎', '🙌'];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Hoy';
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
}

function messageVisibleAfterClientReset(createdAt: string, cutoffIso: string | null): boolean {
  if (!cutoffIso) return true;
  const t = new Date(createdAt).getTime();
  const c = new Date(cutoffIso).getTime();
  if (Number.isNaN(t) || Number.isNaN(c)) return true;
  return t > c;
}

function mergeSupportChatRealtimeRow(
  prev: Msg[],
  row: Record<string, unknown>,
  clientResetCutoffIso: string | null,
): Msg[] {
  const createdAt = String(row.created_at ?? '');
  if (!messageVisibleAfterClientReset(createdAt, clientResetCutoffIso)) return prev;
  const id = String(row.id ?? '');
  if (!SERVER_MSG_ID.test(id)) return prev;
  if (prev.some((m) => m.id === id)) return prev;
  const msg: Msg = {
    id,
    sender: String(row.sender ?? ''),
    body: String(row.body ?? ''),
    created_at: String(row.created_at ?? new Date().toISOString()),
    attachment_url: (row.attachment_url as string | null | undefined) ?? null,
    is_bot_message: (row.is_bot_message as boolean | null | undefined) ?? null,
    admin_sender_avatar_url: (row.admin_sender_avatar_url as string | null | undefined) ?? null,
    admin_sender_display_name: (row.admin_sender_display_name as string | null | undefined) ?? null,
  };
  const locals = prev.filter((m) => m._local);
  const server = prev.filter((m) => !m._local && SERVER_MSG_ID.test(m.id));
  const nextServer = [...server, msg].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return [...locals, ...nextServer];
}

export function SupportContactDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const supabase = createClient();
  const { dockMode } = useDashboardFloatingChats();

  const [loading,     setLoading]     = useState(false);
  const [sending,     setSending]     = useState(false);
  const [botThinking, setBotThinking] = useState(false);
  const [messages,    setMessages]    = useState<Msg[]>([]);
  const [draft,       setDraft]       = useState('');
  const [firstName,   setFirstName]   = useState('');
  const [myAvatar,    setMyAvatar]    = useState<string | null>(null);
  const [emojiOpen,  setEmojiOpen]  = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef     = useRef<HTMLDivElement>(null);
  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevCountRef = useRef(0);
  const typingSendRef = useRef<((active: boolean) => void) | null>(null);
  const typingIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [typingChannelReady, setTypingChannelReady] = useState(false);
  /** Si el usuario subió para leer, no forzar scroll al fondo en cada poll/actualización. */
  const stickToBottomRef = useRef(true);
  /** Mensajes con created_at ≤ este instante no se muestran al cliente (finalizar chat). */
  const clientResetCutoffRef = useRef<string | null>(null);
  const composerInputRef = useRef<HTMLTextAreaElement>(null);

  /** Si ya hubo respuesta humana en el hilo, el encabezado deja de parecer “solo bot”. */
  const threadHumanAgent = useMemo(() => {
    const rows = messages.filter((m) => m.sender === 'admin' && m.is_bot_message === false);
    if (rows.length === 0) return null;
    return rows[rows.length - 1]!;
  }, [messages]);

  const handleScrollAreaScroll = useCallback(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = fromBottom <= SCROLL_STICK_BOTTOM_PX;
  }, []);

  // ── Cargar mensajes del servidor (polling / tras enviar) ───────────────────
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res  = await fetch(`/api/dashboard/support-chat?t=${Date.now()}`, { cache: 'no-store' });
      const json = (await res.json()) as {
        messages?: Msg[];
        client_reset_after_at?: string | null;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || 'Error al cargar');
      if (Object.prototype.hasOwnProperty.call(json, 'client_reset_after_at')) {
        clientResetCutoffRef.current = json.client_reset_after_at ?? null;
      }
      const serverMsgs = json.messages ?? [];
      setMessages((prev) => {
        const greeting = prev.find((m) => m._local && m.sender === 'admin');
        if (serverMsgs.length > 0) {
          // Mantener el saludo de bienvenida arriba mientras dura la sesión
          if (greeting && !serverMsgs.some((s: Msg) => s.id === greeting.id)) {
            return [greeting, ...serverMsgs];
          }
          return serverMsgs;
        }
        const locals = prev.filter((m) => m._local);
        return locals.length > 0 ? locals : [];
      });
    } catch (e: unknown) {
      if (!silent) toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const markReadForMessageId = useCallback(
    async (messageId: string) => {
      if (!SERVER_MSG_ID.test(messageId)) return;
      const { error } = await supabase.rpc('support_chat_mark_last_read', { p_message_id: messageId });
      if (error) console.warn('[support-chat] mark_last_read:', error.message);
    },
    [supabase],
  );

  /** Cada vez que hay mensajes de servidor visibles, actualiza puntero (admin ve ✓✓ azul vía Realtime). */
  useEffect(() => {
    if (!open) return;
    const server = messages.filter((m) => !m._local && SERVER_MSG_ID.test(m.id));
    const last = server[server.length - 1];
    if (!last) return;
    const t = window.setTimeout(() => {
      void markReadForMessageId(last.id);
    }, 40);
    return () => window.clearTimeout(t);
  }, [open, messages, markReadForMessageId]);

  /** INSERT en BD: mostrar mensaje al instante + marcar lectura (sin esperar al poll). */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      channel = supabase
        .channel(`support-chat-live-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'support_chat_messages',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const row = payload.new as Record<string, unknown>;
            if (row?.id) {
              setMessages((prev) =>
                mergeSupportChatRealtimeRow(prev, row, clientResetCutoffRef.current),
              );
              void markReadForMessageId(String(row.id));
            }
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [open, supabase, markReadForMessageId]);

  /** Broadcast “escribiendo” para que el admin lo vea en tiempo real (mismo canal por user_id). */
  useEffect(() => {
    if (!open) {
      setTypingChannelReady(false);
      typingSendRef.current = null;
      if (typingIdleTimerRef.current) {
        clearTimeout(typingIdleTimerRef.current);
        typingIdleTimerRef.current = null;
      }
      return;
    }

    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const ch = supabase.channel(supportTypingChannelId(user.id), {
        config: { broadcast: { self: false } },
      });
      channel = ch;
      ch.subscribe((status) => {
        if (cancelled || status !== 'SUBSCRIBED') return;
        typingSendRef.current = (active: boolean) => {
          void ch.send({
            type: 'broadcast',
            event: SUPPORT_TYPING_BROADCAST_EVENT,
            payload: { active },
          });
        };
        setTypingChannelReady(true);
      });
    })();

    return () => {
      cancelled = true;
      setTypingChannelReady(false);
      typingSendRef.current = null;
      if (typingIdleTimerRef.current) {
        clearTimeout(typingIdleTimerRef.current);
        typingIdleTimerRef.current = null;
      }
      if (channel) {
        void channel
          .send({
            type: 'broadcast',
            event: SUPPORT_TYPING_BROADCAST_EVENT,
            payload: { active: false },
          })
          .catch(() => {});
        void supabase.removeChannel(channel);
      }
    };
  }, [open, supabase]);

  useEffect(() => {
    if (!open || !typingChannelReady) return;
    const send = typingSendRef.current;
    if (!send) return;

    if (draft.trim().length === 0) {
      if (typingIdleTimerRef.current) {
        clearTimeout(typingIdleTimerRef.current);
        typingIdleTimerRef.current = null;
      }
      send(false);
      return;
    }

    send(true);
    if (typingIdleTimerRef.current) clearTimeout(typingIdleTimerRef.current);
    typingIdleTimerRef.current = setTimeout(() => {
      typingIdleTimerRef.current = null;
      send(false);
    }, 2800);

    return () => {
      if (typingIdleTimerRef.current) {
        clearTimeout(typingIdleTimerRef.current);
        typingIdleTimerRef.current = null;
      }
    };
  }, [draft, open, typingChannelReady]);

  // ── Scroll al fondo (instantáneo, sin animación lenta) ────────────────────
  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      prevCountRef.current = messages.length;
      if (botThinking) setBotThinking(false);
    } else if (messages.length < prevCountRef.current) {
      prevCountRef.current = messages.length;
    }
  }, [messages.length, botThinking]);

  useEffect(() => {
    if (loading) return;
    const el = scrollAreaRef.current;
    if (!el) return;
    if (!stickToBottomRef.current) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages, botThinking, loading]);

  // ── Al abrir: borrar historial en servidor, sesión nueva + saludo ───────────
  useEffect(() => {
    if (!open) return;

    setDraft('');
    setMessages([]);
    setBotThinking(false);
    prevCountRef.current = 0;
    stickToBottomRef.current = true;

    let cancelled = false;

    void (async () => {
      setLoading(true);

      const [msgRes, { data: { user } }] = await Promise.all([
        fetch(`/api/dashboard/support-chat?t=${Date.now()}`, { cache: 'no-store' }).catch(() => null),
        supabase.auth.getUser(),
      ]);

      if (cancelled || !user) {
        if (!cancelled) setLoading(false);
        return;
      }

      const msgJson = msgRes?.ok
        ? ((await msgRes.json().catch(() => ({}))) as {
            messages?: Msg[];
            client_reset_after_at?: string | null;
          })
        : {};

      if (Object.prototype.hasOwnProperty.call(msgJson, 'client_reset_after_at')) {
        clientResetCutoffRef.current = msgJson.client_reset_after_at ?? null;
      }

      // Cargar perfil del usuario
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      const p = profile as { first_name?: string | null; last_name?: string | null; avatar_url?: string | null } | null;
      if (p?.avatar_url && !cancelled) setMyAvatar(p.avatar_url);
      const fullName = [p?.first_name, p?.last_name].filter(Boolean).join(' ').trim();
      const name = fullName.split(' ')[0] || user.email?.split('@')[0] || 'Usuario';
      if (!cancelled) setFirstName(name);

      if (cancelled) return;

      const serverMsgs = msgJson.messages ?? [];
      if (serverMsgs.length > 0) {
        if (!cancelled) setMessages(serverMsgs);
      } else {
        // MARI genera su propio saludo humano vía Groq al abrir
        if (!cancelled) {
          setMessages([]);
          // Obtener saludo natural de MARI
          fetch('/api/dashboard/support-chat/greeting', { method: 'POST' })
            .then(r => r.json())
            .then((g: { greeting?: string }) => {
              if (g.greeting && !cancelled) {
                const greetingMsg: Msg = {
                  id: `__greeting__${Date.now()}`,
                  sender: 'admin',
                  body: g.greeting,
                  created_at: new Date().toISOString(),
                  is_bot_message: true,
                  _local: true,
                };
                setMessages([greetingMsg]);
              }
            })
            .catch(() => {
              // Fallback si falla
              if (!cancelled) {
                const fallbackGreeting: Msg = {
                  id: `__greeting__${Date.now()}`,
                  sender: 'admin',
                  body: `¡Hola! 👋 Soy Mari del equipo de JC ONE FIX. ¿En qué te ayudo hoy?`,
                  created_at: new Date().toISOString(),
                  is_bot_message: true,
                  _local: true,
                };
                setMessages([fallbackGreeting]);
              }
            });
        }
      }

      if (!cancelled) setLoading(false);
      pollRef.current = setInterval(() => void load(true), POLL_MS);
    })();

    return () => {
      cancelled = true;
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Cerrar (flecha / X): solo oculta el widget; la conversación sigue al reabrir ──
  const handleClose = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    onOpenChange(false);
  }, [onOpenChange]);

  /** Menú ⋮: nueva sesión para el cliente; el historial completo permanece para super admin. */
  const handleFinalizeChat = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/support-chat/finalize', { method: 'POST' });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || 'No se pudo finalizar el chat');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error');
      return;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setMessages([]);
    setDraft('');
    setBotThinking(false);
    prevCountRef.current = 0;
    onOpenChange(false);
  }, [onOpenChange]);

  // ── Enviar mensaje (solo texto) ────────────────────────────────────────────
  const sendMessage = useCallback(
    async (bodyText: string) => {
      const text = bodyText.trim();
      if (!text || sending) return;
      stickToBottomRef.current = true;
      setSending(true);
      setBotThinking(true);
      setDraft('');
      try {
        const res = await fetch('/api/dashboard/support-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: text }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'No se pudo enviar');

        void load(true);

        fetch('/api/dashboard/support-chat/bot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text }),
        })
          .then(async (r) => {
            const j = await r.json().catch(() => ({}));
            if (!r.ok) console.error('[bot]', j);
            await load(true);
            setBotThinking(false);
          })
          .catch((e) => {
            console.error('[bot]', e);
            setBotThinking(false);
          });
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Error');
        setBotThinking(false);
      } finally {
        setSending(false);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            composerInputRef.current?.focus();
          });
        });
      }
    },
    [load, sending]
  );

  const sendFromDraft = useCallback(() => {
    void sendMessage(draft.trim());
  }, [draft, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const v = (e.currentTarget as HTMLTextAreaElement).value.trim();
      void sendMessage(v);
    }
  };

  const supportDockStyle = useMemo(() => {
    if (!open) return undefined;
    if (dockMode === 'sideBySide') {
      return { ...supportChatSideBySideRightStyle(), bottom: '1rem' };
    }
    if (dockMode === 'stacked') {
      return { ...supportChatStackedBottomStyle(), right: '1rem' };
    }
    return undefined;
  }, [open, dockMode]);

  const supportAttachmentEntries = useMemo(
    () =>
      messages
        .filter((m) => Boolean(m.attachment_url?.trim()))
        .map((m) => ({ key: m.id, stored: m.attachment_url })),
    [messages],
  );
  const supportSignedAttachments = useSignedAttachmentUrls(
    supabase,
    'support_chat_uploads',
    supportAttachmentEntries,
  );

  const renderMsg = (m: Msg, showDate: boolean, dateLabel: string) => {
    const attPath = m.attachment_url?.trim() ?? '';
    const attUrl = supportSignedAttachments[m.id];
    const isUser = m.sender === 'user';
    const t = formatTime(m.created_at);
    const isBotIncoming = !isUser && m.is_bot_message === true;
    const humanLabel = m.admin_sender_display_name?.trim() || 'Equipo JC ONE FIX';
    const supportAvatar = (
      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-primary ring-1 ring-primary/20">
        <SupportAssistantMascot fill title="MARI" />
      </div>
    );
    const humanSupportAvatar = (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 ring-1 ring-primary/25">
        {m.admin_sender_avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL de perfil Supabase
          <img
            src={m.admin_sender_avatar_url}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="text-sm font-bold text-primary" aria-hidden>
            {humanLabel.slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>
    );
    const userAvatar = (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-200 ring-1 ring-slate-300/80">
        {myAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL de perfil Supabase
          <img src={myAvatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="text-sm font-bold text-slate-600" aria-hidden>
            {(firstName || 'V').slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>
    );
    return (
      <div key={m.id}>
        {showDate && (
          <div className="my-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-slate-200/80" />
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-500">
              {dateLabel}
            </span>
            <div className="h-px flex-1 bg-slate-200/80" />
          </div>
        )}

        {isUser ? (
          <PanelChatMessageBlock variant="outgoing" senderName={firstName || 'Vos'} timeShort={t} avatar={userAvatar}>
            <span className="whitespace-pre-wrap">{m.body}</span>
            {attPath ? (
              !attUrl ? (
                <span className="mt-2 block text-xs text-white/70">Cargando adjunto…</span>
              ) : /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(attPath) ? (
                <a
                  href={attUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 block overflow-hidden rounded-xl ring-1 ring-white/20"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={attUrl}
                    alt=""
                    className="max-h-44 w-full object-cover"
                  />
                </a>
              ) : (
                <a
                  href={attUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex text-xs font-medium text-primary-foreground/90 underline underline-offset-2"
                >
                  Ver archivo adjunto
                </a>
              )
            ) : null}
          </PanelChatMessageBlock>
        ) : (
          <PanelChatMessageBlock
            variant="incoming"
            senderName={isBotIncoming ? 'MARI' : humanLabel}
            timeShort={t}
            avatar={isBotIncoming ? supportAvatar : humanSupportAvatar}
          >
            <span className="whitespace-pre-wrap">
              {m.body.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                part.startsWith('**') && part.endsWith('**') ? (
                  <strong key={i}>{part.slice(2, -2)}</strong>
                ) : (
                  <span key={i}>{part}</span>
                )
              )}
            </span>
            {attPath ? (
              !attUrl ? (
                <span className="mt-2 block text-xs text-slate-400">Cargando adjunto…</span>
              ) : /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(attPath) ? (
                <a
                  href={attUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 block overflow-hidden rounded-xl ring-1 ring-slate-200/80"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={attUrl}
                    alt=""
                    className="max-h-44 w-full object-cover"
                  />
                </a>
              ) : (
                <a
                  href={attUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex text-xs font-medium text-primary underline underline-offset-2"
                >
                  Ver archivo adjunto
                </a>
              )
            ) : null}
          </PanelChatMessageBlock>
        )}
      </div>
    );
  };

  // ── No renderizar nada si está cerrado ─────────────────────────────────────
  if (!open) return null;

  let lastDate = '';

  return (
    <div
      className={cn(
        // Un poco más alto para leer el hilo con fluidez
        'fixed z-[55] flex min-w-0 h-[min(78vh,580px)] w-[min(100vw-2rem,420px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-150',
        dockMode === 'single' && 'bottom-[5.75rem] right-4'
      )}
      style={supportDockStyle ?? undefined}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-white/20 bg-primary px-2 py-2.5 text-primary-foreground sm:px-3">
        <button
          type="button"
          onClick={() => void handleClose()}
          className="rounded-lg p-2 text-white/90 transition-colors hover:bg-white/15"
          aria-label="Cerrar"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-white/15 ring-1 ring-white/25">
          {threadHumanAgent ? (
            threadHumanAgent.admin_sender_avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL de perfil Supabase
              <img
                src={threadHumanAgent.admin_sender_avatar_url}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-white/10 text-sm font-bold text-white">
                {(threadHumanAgent.admin_sender_display_name?.trim() || 'E').slice(0, 1).toUpperCase()}
              </div>
            )
          ) : (
            <SupportAssistantMascot fill title="MARI" />
          )}
          <span
            className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-primary bg-emerald-400"
            aria-hidden
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold leading-tight">
            {threadHumanAgent
              ? threadHumanAgent.admin_sender_display_name?.trim() || 'Equipo JC ONE FIX'
              : 'MARI'}
          </p>
          <p className="truncate text-[11px] text-white/75">
            {sending || botThinking
              ? 'Escribiendo…'
              : threadHumanAgent
                ? 'Soporte JC ONE FIX · agente humano'
                : 'Soporte JC ONE FIX · equipo humano'}
          </p>
        </div>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="rounded-lg p-2 text-white/90 transition-colors hover:bg-white/15"
              aria-label="Más opciones"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={6}
            className="z-[200] w-52 border-slate-200 shadow-lg"
          >
            <DropdownMenuItem className="cursor-pointer" onClick={() => void handleFinalizeChat()}>
              Finalizar chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          type="button"
          onClick={() => void handleClose()}
          className="rounded-lg p-2 text-white/90 transition-colors hover:bg-white/15"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={scrollAreaRef}
        onScroll={handleScrollAreaScroll}
        className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-white px-3 py-3 space-y-2"
      >
        {loading ? (
          <div className="flex h-28 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
          </div>
        ) : (
          <>
            {messages.map((m) => {
              const dateLabel = formatDate(m.created_at);
              const showDate  = dateLabel !== lastDate;
              lastDate = dateLabel;
              return renderMsg(m, showDate, dateLabel);
            })}

            {botThinking && (
              <PanelChatMessageBlock
                variant="incoming"
                senderName="MARI"
                timeShort="…"
                avatar={
                  <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-primary ring-1 ring-primary/20">
                    <SupportAssistantMascot fill title="MARI" />
                  </div>
                }
              >
                <div className="flex items-center gap-1.5 py-0.5">
                  <span className="h-2 w-2 rounded-full bg-slate-500/70 animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 rounded-full bg-slate-500/70 animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 rounded-full bg-slate-500/70 animate-bounce" />
                </div>
              </PanelChatMessageBlock>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      <PanelChatComposer
        value={draft}
        onChange={setDraft}
        onSend={() => void sendFromDraft()}
        placeholder="Escribe un mensaje…"
        disabled={sending}
        sending={sending}
        multiline
        onKeyDown={handleKeyDown}
        inputRef={composerInputRef}
        leading={
          <>
            <Popover open={emojiOpen} onOpenChange={setEmojiOpen} modal={false}>
              <PopoverAnchor asChild>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100"
                    aria-label="Emoji y reacciones"
                    title="Emoji"
                    onClick={() => setEmojiOpen((o) => !o)}
                  >
                    <Smile className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-lg px-2 py-2 text-[10px] font-bold tracking-wide text-slate-500 transition-colors hover:bg-slate-100"
                    title="Reacciones rápidas"
                    aria-label="Reacciones tipo GIF"
                    onClick={() => setEmojiOpen((o) => !o)}
                  >
                    GIF
                  </button>
                </div>
              </PopoverAnchor>
              <PopoverContent
                className="z-[100] w-auto max-w-[min(100vw-2rem,280px)] border-slate-200 p-2.5 shadow-lg"
                align="start"
                side="top"
                sideOffset={8}
                onOpenAutoFocus={(ev) => ev.preventDefault()}
              >
                <p className="mb-1.5 px-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Emoji</p>
                <div className="flex flex-wrap gap-1">
                  {QUICK_EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      className="rounded-md p-2 text-lg leading-none hover:bg-slate-100"
                      onClick={() => {
                        setDraft((d) => `${d}${e}`);
                        setEmojiOpen(false);
                      }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
                <p className="mb-1.5 mt-2.5 px-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Reacciones
                </p>
                <div className="flex flex-wrap gap-1">
                  {QUICK_REACTIONS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      className="rounded-md p-2 text-lg leading-none hover:bg-slate-100"
                      onClick={() => {
                        setDraft((d) => `${d}${e}`);
                        setEmojiOpen(false);
                      }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </>
        }
        helperText={
          <p className="text-center text-[10px] text-slate-400">Enter para enviar · Mayús+Enter nueva línea</p>
        }
      />
    </div>
  );
}
