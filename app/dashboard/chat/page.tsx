'use client';

import { useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { Send, Hash, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { getActiveOrganizationId } from '@/lib/dashboard-org';
import { getChatMessagesSinceIso, CHAT_HISTORY_RETENTION_DAYS } from '@/lib/chat-retention';
import { loadOrgUserRoleLabelMap } from '@/lib/org-role-labels';
import { ChatDmMessageRow } from '@/components/dashboard/ChatDmMessageRow';
import { profileDisplayName, profileMentionHandle } from '@/lib/profile-display-name';
import {
  resolveOrgChatLogoUrl,
  SHOP_LOGO_UPDATED_EVENT,
} from '@/lib/resolve-org-chat-logo';

const PROFILE_UPDATED_EVENT = 'jc-profile-avatar-updated';

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
  '#0d9488', '#dc2626', '#d97706', '#059669',
  '#7c3aed', '#db2777', '#0891b2', '#65a30d',
];

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
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

export default function ChatPage() {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [ticketRef, setTicketRef] = useState('');
  const [senderName, setSenderName] = useState('');
  const [mentionHandle, setMentionHandle] = useState('');
  const [senderColor, setSenderColor] = useState(AVATAR_COLORS[0]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [orgChatLogoUrl, setOrgChatLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleLabelByUserId, setRoleLabelByUserId] = useState<Map<string, string>>(new Map());
  const [avatarByUserId, setAvatarByUserId] = useState<Record<string, string>>({});
  const [displayNameByUserId, setDisplayNameByUserId] = useState<Record<string, string>>({});
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async (user: User | null) => {
      if (cancelled) return;
      if (user) {
        setCurrentUserId(user.id);
        const { data: prof } = await (supabase as any)
          .from('profiles')
          .select('first_name, last_name, full_name')
          .eq('id', user.id)
          .maybeSingle();
        const dn = profileDisplayName(prof, {
          email: user.email,
          metadataFullName: (user.user_metadata?.full_name as string | undefined) ?? undefined,
        });
        const mh = profileMentionHandle(prof, user.email);
        if (!cancelled) {
          setSenderName(dn);
          setMentionHandle(mh);
          const colorIndex = user.id.charCodeAt(0) % AVATAR_COLORS.length;
          setSenderColor(AVATAR_COLORS[colorIndex]);
        }
        const orgId = await getActiveOrganizationId(supabase);
        if (!cancelled) setOrganizationId(orgId);
      } else {
        setCurrentUserId(null);
        setOrganizationId(null);
        setSenderName('');
        setMentionHandle('');
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

  useEffect(() => {
    if (!organizationId) {
      setOrgChatLogoUrl(null);
      return;
    }
    let cancelled = false;
    void resolveOrgChatLogoUrl(supabase, organizationId).then((url) => {
      if (!cancelled) setOrgChatLogoUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [organizationId, supabase]);

  useEffect(() => {
    const refresh = () => {
      if (!organizationId) return;
      void resolveOrgChatLogoUrl(supabase, organizationId).then(setOrgChatLogoUrl);
    };
    window.addEventListener(SHOP_LOGO_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(SHOP_LOGO_UPDATED_EVENT, refresh);
  }, [organizationId, supabase]);

  useEffect(() => {
    const onProfileUpdated = () => {
      setProfileRefreshKey((k) => k + 1);
      void (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: prof } = await (supabase as any)
          .from('profiles')
          .select('first_name, last_name, full_name')
          .eq('id', user.id)
          .maybeSingle();
        setSenderName(
          profileDisplayName(prof, {
            email: user.email,
            metadataFullName: (user.user_metadata?.full_name as string | undefined) ?? undefined,
          })
        );
        setMentionHandle(profileMentionHandle(prof, user.email));
      })();
    };
    window.addEventListener(PROFILE_UPDATED_EVENT, onProfileUpdated);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, onProfileUpdated);
  }, [supabase]);

  useEffect(() => {
    if (!organizationId) {
      setMessages([]);
      return;
    }
    loadMessages(organizationId);
    const channel = supabase
      .channel(`chat_messages_full_${organizationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `organization_id=eq.${organizationId}` },
        (payload) => {
          const incoming = payload.new as Message;
          setMessages((prev) => {
            const withoutTemp = prev.filter((m) => {
              if (!m.id.startsWith('temp-')) return true;
              const isSameSender = m.user_id === incoming.user_id;
              const isSameText = m.message.trim() === incoming.message.trim();
              const dt = Math.abs(new Date(m.created_at).getTime() - new Date(incoming.created_at).getTime());
              return !(isSameSender && isSameText && dt < 15000);
            });
            return [...withoutTemp, incoming];
          });
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        }
      )
      .subscribe((status: string, err?: Error) => {
        if (status === 'SUBSCRIBED') return;
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[ChatPage] Realtime:', status, err);
        }
      });

    const poll = setInterval(() => loadMessages(organizationId, { silent: true }), 15000);

    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [organizationId, supabase]);

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

  const loadMessages = async (orgId: string, opts?: { silent?: boolean }) => {
    const { data, error } = await (supabase as any)
      .from('chat_messages')
      .select('*')
      .eq('organization_id', orgId)
      .gte('created_at', getChatMessagesSinceIso())
      .order('created_at', { ascending: true })
      .limit(500);
    if (error) {
      console.error('[ChatPage]', error);
      if (!opts?.silent) {
        toast.error(error.message || 'No se pudieron cargar los mensajes');
      }
      return;
    }
    setMessages(data || []);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  useEffect(() => {
    const ids = Array.from(new Set(messages.map((m) => m.user_id)));
    if (ids.length === 0) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('id, avatar_url, first_name, last_name, full_name')
        .in('id', ids);
      if (cancelled || error || !data) return;
      const rows = data as {
        id: string;
        avatar_url: string | null;
        first_name?: string | null;
        last_name?: string | null;
        full_name?: string | null;
      }[];
      setAvatarByUserId((prev) => {
        const next = { ...prev };
        for (const row of rows) {
          if (row.avatar_url) next[row.id] = row.avatar_url;
        }
        return next;
      });
      setDisplayNameByUserId((prev) => {
        const next = { ...prev };
        for (const row of rows) {
          next[row.id] = profileDisplayName(row, {});
        }
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [messages, supabase, profileRefreshKey]);

  const handleSend = async () => {
    if (!input.trim() || !currentUserId || !organizationId) return;
    const messageText = input.trim();
    const optimisticId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: optimisticId,
      user_id: currentUserId,
      organization_id: organizationId,
      sender_name: senderName,
      sender_color: senderColor,
      message: messageText,
      ticket_ref: ticketRef.trim() || null,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setInput('');
    setTicketRef('');
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);

    const payload = {
      user_id: currentUserId,
      organization_id: organizationId,
      sender_name: senderName,
      sender_color: senderColor,
      message: messageText,
      ticket_ref: optimisticMsg.ticket_ref,
    };
    const { error } = await (supabase as any).from('chat_messages').insert([payload]);
    if (error) {
      toast.error(error.message || 'Error al enviar (revisa RLS y columna organization_id en Supabase)');
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      return;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  let lastDate = '';

  return (
    <div className="flex h-full min-h-0 bg-white">
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col border-x border-gray-200 bg-white">
        <div className="flex items-start gap-3 border-b border-gray-200 bg-gradient-to-r from-white to-teal-50/50 px-6 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-teal-100 ring-1 ring-teal-200/80">
            {orgChatLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL pública de Storage / organización
              <img
                src={orgChatLogoUrl}
                alt=""
                className="h-full w-full object-contain p-0.5"
                referrerPolicy="no-referrer"
              />
            ) : (
              <Hash className="h-4 w-4 text-teal-700" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold text-gray-900">Canal general</h1>
            <p className="text-xs leading-snug text-gray-500">
              Chat interno de tu organización. Para llamar la atención de alguien escribe{' '}
              <span className="font-mono text-gray-600">@</span> seguido del primer nombre en minúsculas (ej.{' '}
              <span className="font-mono text-gray-600">@jesus</span>) o la parte del correo antes de{' '}
              <span className="font-mono text-gray-600">@</span>. Historial: últimos {CHAT_HISTORY_RETENTION_DAYS}{' '}
              días.
            </p>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2 text-xs text-gray-500">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span>En línea</span>
          </div>
        </div>

        <div className="min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden bg-white px-4 py-4 sm:px-6">
          {!loading && !organizationId && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              No tienes una organización activa asociada a tu usuario. El chat interno solo funciona para miembros de una
              organización (registro de prueba o alta por administrador).
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mb-3">
                <Hash className="h-7 w-7 text-blue-400" />
              </div>
              <p className="font-semibold text-gray-700">El chat esta vacio</p>
              <p className="text-sm text-gray-400 mt-1">Sé el primero en enviar un mensaje al equipo</p>
            </div>
          ) : (
            messages.map((msg) => {
              const dateLabel = formatDate(msg.created_at);
              const showDate = dateLabel !== lastDate;
              lastDate = dateLabel;
              const isMe = msg.user_id === currentUserId;

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-xs font-medium text-gray-400 px-2">{dateLabel}</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                  )}
                  <div className="py-0.5">
                    <ChatDmMessageRow
                      senderName={displayNameByUserId[msg.user_id] ?? msg.sender_name}
                      senderColor={msg.sender_color}
                      body={msg.message}
                      timeLabel={formatTime(msg.created_at)}
                      isMe={isMe}
                      mentionHandle={mentionHandle}
                      avatarUrl={avatarByUserId[msg.user_id]}
                      roleLabel={roleLabelByUserId.get(msg.user_id)}
                      size="md"
                      ticketRef={msg.ticket_ref}
                    />
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-white">
          {ticketRef && (
            <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-blue-50 rounded-lg text-xs text-blue-700">
              <Wrench className="h-3.5 w-3.5" />
              <span>Referencia a ticket: <strong>#{ticketRef}</strong></span>
              <button onClick={() => setTicketRef('')} className="ml-auto text-blue-400 hover:text-blue-600">×</button>
            </div>
          )}
          <div className="flex gap-3 items-end">
            <div className="flex-1 rounded-2xl border border-[#0d9488]/35 bg-gray-50 px-4 py-3">
              <textarea
                rows={1}
                className="w-full resize-none bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none"
                placeholder={`Escribe un mensaje… (@${mentionHandle || 'nombre'} para mencionarte · Enter para enviar)`}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{ minHeight: '24px', maxHeight: '120px' }}
              />
              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-200">
                <div className="flex items-center gap-1.5">
                  <Wrench className="h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    className="text-xs text-gray-600 bg-transparent focus:outline-none w-20 placeholder-gray-400"
                    placeholder="Ref. ticket"
                    value={ticketRef}
                    onChange={e => setTicketRef(e.target.value)}
                  />
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <div
                    className="w-4 h-4 rounded-full cursor-pointer border-2 border-white shadow-sm"
                    style={{ backgroundColor: senderColor }}
                    title="Tu color"
                  />
                  <span className="text-xs text-gray-600 truncate max-w-[140px]" title={senderName}>
                    {senderName}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim()}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary transition-colors hover:bg-primary disabled:opacity-40"
            >
              <Send className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
