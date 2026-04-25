'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import {
  MessageCircle,
  Volume2,
  VolumeX,
  Paperclip,
  Smile,
  Trash2,
  ChevronLeft,
  MoreVertical,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getActiveOrganizationId } from '@/lib/dashboard-org';
import {
  getDashboardUiSoundOn,
  setDashboardUiSoundOn,
  playDashboardUiSoftPing,
  primeDashboardUiAudio,
} from '@/lib/dashboard-ui-sound';
import { getChatMessagesSinceIso, CHAT_HISTORY_RETENTION_DAYS } from '@/lib/chat-retention';
import { FloatingTeamChatMessageRow } from '@/components/dashboard/FloatingTeamChatMessageRow';
import { useSignedAttachmentUrls } from '@/lib/hooks/useSignedAttachmentUrls';
import { dashboardTealHeaderGradient } from '@/components/dashboard/dashboard-form-styles';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PanelChatComposer } from '@/components/dashboard/PanelChatShell';
import { useDashboardFloatingChats } from '@/components/dashboard/DashboardFloatingChatsContext';
import { profileDisplayName, profileMentionHandle } from '@/lib/profile-display-name';
import { humanizeInternalChatMessagesError } from '@/lib/supabase-setup-hints';
import { resolveShopDisplayName } from '@/lib/resolve-shop-display-name';
import { displayOrgOrShopName } from '@/lib/display-name';
import {
  resolveOrgChatLogoUrl,
  SHOP_LOGO_UPDATED_EVENT,
} from '@/lib/resolve-org-chat-logo';

/** Mismo evento que `UserMenu` / foto de perfil; también tras guardar datos personales. */
const PROFILE_UPDATED_EVENT = 'jc-profile-avatar-updated';

type Message = {
  id: string;
  user_id: string;
  organization_id: string;
  sender_name: string;
  sender_color: string;
  message: string;
  ticket_ref: string | null;
  attachment_url?: string | null;
  created_at: string;
};

/** Primer tono = color corporativo del panel; el resto diferencia usuarios sin duplicar la marca. */
const AVATAR_COLORS = [
  'hsl(var(--primary))',
  '#dc2626',
  '#d97706',
  '#7c3aed',
  '#db2777',
  '#0891b2',
  '#65a30d',
  '#ea580c',
  '#2563eb',
  '#9333ea',
  '#b45309',
  '#6366f1',
  '#be123c',
  '#4338ca',
  '#15803d',
  '#c2410c',
];

const QUICK_EMOJIS = ['😀', '😄', '😊', '❤️', '🎉', '✅', '⭐', '🔥'];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function buildUniqueColorMap(userIds: string[]): Map<string, string> {
  const seen: Record<string, boolean> = {};
  const unique: string[] = [];
  for (const id of userIds) {
    if (id && !seen[id]) {
      seen[id] = true;
      unique.push(id);
    }
  }
  unique.sort();
  const map = new Map<string, string>();
  const usedIdxs: number[] = [];
  for (const uid of unique) {
    let idx = hashString(uid) % AVATAR_COLORS.length;
    let attempts = 0;
    while (usedIdxs.indexOf(idx) >= 0 && attempts < AVATAR_COLORS.length) {
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

export function FloatingChat() {
  const supabase = createClient();
  const { setInternalChatOpen } = useDashboardFloatingChats();
  const [isOpen, setIsOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(() =>
    typeof window !== 'undefined' ? getDashboardUiSoundOn() : true
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [senderName, setSenderName] = useState('');
  /** Para resaltar @menciones dirigidas al usuario actual (sin espacios). */
  const [mentionHandle, setMentionHandle] = useState('');
  const [senderColor, setSenderColor] = useState(AVATAR_COLORS[0]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  /** Logo del taller (organizations / shop_settings) para la cabecera del panel. */
  const [orgChatLogoUrl, setOrgChatLogoUrl] = useState<string | null>(null);
  /** Nombre del taller para la cabecera del panel (p. ej. «Chat interno JC ONE FIX»). */
  const [shopDisplayLabel, setShopDisplayLabel] = useState('');
  const [avatarByUserId, setAvatarByUserId] = useState<Record<string, string>>({});
  const [displayNameByUserId, setDisplayNameByUserId] = useState<Record<string, string>>({});
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);

  const uniqueColorMap = useMemo(() => {
    const ids = messages.map((m) => m.user_id);
    if (currentUserId && ids.indexOf(currentUserId) < 0) ids.push(currentUserId);
    return buildUniqueColorMap(ids);
  }, [messages, currentUserId]);

  useEffect(() => {
    if (currentUserId) {
      const c = uniqueColorMap.get(currentUserId);
      if (c) setSenderColor(c);
    }
  }, [uniqueColorMap, currentUserId]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isOpenRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);
  const lastReadKeyRef = useRef<string | null>(null);
  const unreadCountRef = useRef(0);
  const lastChatSoundAtRef = useRef(0);
  /** Tras abrir el panel: forzar scroll al fondo unos ms (sin animación) hasta que el historial haya pintado. */
  const openStickBottomRef = useRef(false);
  const lastAutoScrolledOwnMessageIdRef = useRef<string | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);

  const teamChatAttachmentEntries = useMemo(
    () =>
      messages
        .filter((m) => Boolean(m.attachment_url?.trim()))
        .map((m) => ({ key: m.id, stored: m.attachment_url })),
    [messages],
  );
  const teamChatSignedAttachments = useSignedAttachmentUrls(
    supabase,
    'team_chat_uploads',
    teamChatAttachmentEntries,
  );

  useEffect(() => {
    setInternalChatOpen(isOpen);
  }, [isOpen, setInternalChatOpen]);

  useEffect(() => {
    lastReadKeyRef.current =
      organizationId && currentUserId
        ? `floating_chat_last_read_${organizationId}_${currentUserId}`
        : null;
  }, [organizationId, currentUserId]);

  useEffect(() => {
    if (!organizationId) {
      setShopDisplayLabel('');
      return;
    }
    let cancelled = false;
    void resolveShopDisplayName(supabase, organizationId).then((n) => {
      if (!cancelled) setShopDisplayLabel(n ?? '');
    });
    return () => {
      cancelled = true;
    };
  }, [organizationId, supabase]);

  useEffect(() => {
    const handleNameChange = (e: Event) => {
      const name = (e as CustomEvent<{ name?: string }>).detail?.name;
      if (name?.trim()) {
        const cleaned = displayOrgOrShopName(name);
        setShopDisplayLabel(cleaned);
        if (organizationId) {
          try {
            localStorage.setItem(`jcof_shop_name_${organizationId}`, cleaned);
          } catch {
            /* ignore */
          }
        }
        return;
      }
      if (organizationId) {
        void resolveShopDisplayName(supabase, organizationId).then((n) =>
          setShopDisplayLabel(n ?? '')
        );
      }
    };
    window.addEventListener('org-name-changed', handleNameChange);
    return () => window.removeEventListener('org-name-changed', handleNameChange);
  }, [organizationId, supabase]);

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

  const chatPanelTitle = shopDisplayLabel.trim()
    ? `Chat interno ${shopDisplayLabel}`
    : 'Chat interno';

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
    if (isOpen) {
      openStickBottomRef.current = true;
    } else {
      openStickBottomRef.current = false;
    }
  }, [isOpen]);
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    unreadCountRef.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    const seen: Record<string, boolean> = {};
    const ids: string[] = [];
    for (const m of messages) {
      if (m.user_id && !seen[m.user_id]) {
        seen[m.user_id] = true;
        ids.push(m.user_id);
      }
    }
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
        const n = { ...prev };
        for (const row of rows) {
          if (row.avatar_url) n[row.id] = row.avatar_url;
        }
        return n;
      });
      setDisplayNameByUserId((prev) => {
        const n = { ...prev };
        for (const row of rows) {
          const dn = profileDisplayName(row, {});
          if (dn) n[row.id] = dn;
        }
        return n;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [messages, supabase, profileRefreshKey]);

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
          setSenderColor(uniqueColorMap.get(user.id) ?? getUserColor(user.id));
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

  const loadMessages = useCallback(
    async (orgId: string, opts?: { silent?: boolean }) => {
      const { data, error } = await (supabase as any)
        .from('chat_messages')
        .select('*')
        .eq('organization_id', orgId)
        .gte('created_at', getChatMessagesSinceIso())
        .order('created_at', { ascending: false })
        .limit(40);
      if (error) {
        console.error('[FloatingChat]', error);
        if (!opts?.silent) {
          toast.error(
            humanizeInternalChatMessagesError(error.message) ||
              error.message ||
              'No se pudieron cargar los mensajes del chat'
          );
        }
        return;
      }
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
        { event: 'DELETE', schema: 'public', table: 'chat_messages', filter: `organization_id=eq.${organizationId}` },
        (payload) => {
          const oldRow = payload.old as { id?: string };
          if (oldRow?.id) {
            setMessages((prev) => prev.filter((m) => m.id !== oldRow.id));
          }
        }
      )
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
            return [
              ...withoutTemp,
              {
                ...newMsg,
                sender_color: getUserColor(newMsg.user_id),
                attachment_url: (newMsg as Message).attachment_url ?? null,
              },
            ];
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
          console.warn('[FloatingChat] Realtime:', status, err);
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

  const scrollContainerToBottomInstant = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  /** Al abrir: solo saltos instantáneos al final (nunca smooth). No auto-scroll al recibir mensajes ajenos. */
  useLayoutEffect(() => {
    if (!isOpen || !scrollRef.current || !openStickBottomRef.current) return;
    scrollContainerToBottomInstant();
  }, [isOpen, messages, loading, scrollContainerToBottomInstant]);

  useEffect(() => {
    if (!isOpen) return;
    const t = window.setTimeout(() => {
      openStickBottomRef.current = false;
    }, 1200);
    return () => window.clearTimeout(t);
  }, [isOpen]);

  /** Si el usuario sube a leer historial, dejar de forzar el fondo al abrir. */
  useEffect(() => {
    const el = scrollRef.current;
    if (!isOpen || !el) return;
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (dist > 72) openStickBottomRef.current = false;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen || !scrollRef.current) return;
    const last = messages[messages.length - 1];
    if (!last || !currentUserId || last.user_id !== currentUserId) return;
    if (lastAutoScrolledOwnMessageIdRef.current === last.id) return;
    lastAutoScrolledOwnMessageIdRef.current = last.id;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isOpen, currentUserId]);

  useEffect(() => {
    if (isOpen) {
      const key = lastReadKeyRef.current;
      if (key) localStorage.setItem(key, String(Date.now()));
      setUnreadCount(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const insertTeamChatMessage = async (messageText: string, attachmentUrl: string | null) => {
    if (!currentUserId || !organizationId) return;
    const finalMessage =
      messageText.trim() || (attachmentUrl ? '📎 Archivo adjunto' : '');
    if (!finalMessage && !attachmentUrl) return;
    const textForRow = finalMessage || '📎 Archivo adjunto';

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const optimisticMsg: Message = {
      id: tempId,
      user_id: currentUserId,
      organization_id: organizationId,
      sender_name: senderName,
      sender_color: senderColor,
      message: textForRow,
      ticket_ref: null,
      attachment_url: attachmentUrl,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    queueMicrotask(() => scrollContainerToBottomInstant());

    const payload: Record<string, unknown> = {
      user_id: currentUserId,
      organization_id: organizationId,
      sender_name: senderName,
      sender_color: senderColor,
      message: textForRow,
      ticket_ref: null,
    };
    if (attachmentUrl) payload.attachment_url = attachmentUrl;
    const { error } = await (supabase as any).from('chat_messages').insert([payload]);
    if (error) {
      toast.error(
        humanizeInternalChatMessagesError(error.message) ||
          error.message ||
          'No se pudo enviar: revisa RLS, columna attachment_url (migración) y Realtime en chat_messages.'
      );
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !currentUserId || !organizationId) return;
    const t = input.trim();
    setInput('');
    await insertTeamChatMessage(t, null);
  };

  const handleFilesSelected = async (fileList: FileList) => {
    if (!currentUserId || !organizationId || uploadingAttachment) return;
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setUploadingAttachment(true);
    const typedCaption = input.trim();
    setInput('');

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]!;
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/dashboard/team-chat/attachment', {
          method: 'POST',
          body: formData,
        });
        const data = (await res.json()) as { path?: string; error?: string };
        if (!res.ok) {
          toast.error(data.error || 'No se pudo subir el archivo');
          continue;
        }
        if (!data.path) {
          toast.error('No se recibió la ruta del adjunto');
          continue;
        }
        const caption =
          i === 0 && typedCaption ? typedCaption : file.name || '📎 Archivo adjunto';
        await insertTeamChatMessage(caption, data.path);
      }
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const appendEmoji = (emoji: string) => {
    setInput((prev) => `${prev}${emoji}`);
    inputRef.current?.focus();
  };

  const handleClearChat = async () => {
    if (!organizationId || clearingChat) return;
    setClearingChat(true);
    try {
      const res = await fetch('/api/dashboard/team-chat/clear', { method: 'POST' });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || 'No se pudo vaciar el chat');
        return;
      }
      setMessages([]);
      toast.success('Chat vaciado');
    } catch {
      toast.error('Error de red al vaciar el chat');
    } finally {
      setClearingChat(false);
    }
  };

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
            'no-ui-hover-grow relative inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-lg transition-all hover:scale-105 hover:bg-primary/90',
            unreadCount > 0 && 'shadow-md shadow-red-500/35'
          )}
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-sm font-medium">Chat</span>
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold leading-none text-white shadow-md">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </button>
      )}

      {isOpen && (
        <div
          className={cn(
            'flex min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl',
            'h-[min(70vh,520px)] w-[min(100vw-2rem,420px)]'
          )}
        >
          {/* Cabecera a color primario sólido (alineada con el botón flotante del chat) */}
          <div
            className={cn(
              'flex flex-shrink-0 items-center gap-2 border-b border-white/20 px-2 py-2.5 text-white sm:px-3',
              dashboardTealHeaderGradient
            )}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-2 text-white/90 transition-colors hover:bg-white/15"
              title="Cerrar"
              aria-label="Cerrar chat"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div
              className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/15 p-1 ring-1 ring-white/25"
              title={chatPanelTitle}
            >
              {orgChatLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL pública de Storage / organización
                <img
                  src={orgChatLogoUrl}
                  alt=""
                  className="max-h-full max-w-full object-contain object-center"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center">
                  <MessageCircle className="h-5 w-5 opacity-95" aria-hidden />
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold leading-tight" title={chatPanelTitle}>
                {chatPanelTitle}
              </p>
              <p className="truncate text-[11px] text-white/70">Tu equipo en tiempo real</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="rounded-lg p-2 text-white/90 transition-colors hover:bg-white/15"
                  aria-label="Más opciones"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem
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
                >
                  {soundOn ? (
                    <>
                      <Volume2 className="mr-2 h-4 w-4" />
                      Silenciar avisos
                    </>
                  ) : (
                    <>
                      <VolumeX className="mr-2 h-4 w-4" />
                      Activar avisos
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={clearingChat || loading || messages.length === 0}
                  onClick={() => void handleClearChat()}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Vaciar historial
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-2 text-white/90 transition-colors hover:bg-white/15"
              title="Minimizar"
              aria-label="Minimizar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            ref={scrollRef}
            className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-white px-3 py-3"
          >
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageCircle className="mb-2 h-8 w-8 text-gray-200" />
                <p className="text-sm text-gray-500">Sin mensajes</p>
                <p className="mt-1 text-xs text-gray-400">Escribe un mensaje para empezar</p>
                <p className="mt-3 text-[10px] text-gray-400">
                  Historial: últimos {CHAT_HISTORY_RETENTION_DAYS} días
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const resolvedColor = uniqueColorMap.get(msg.user_id) ?? msg.sender_color;
                const own = Boolean(currentUserId && msg.user_id === currentUserId);
                return (
                  <FloatingTeamChatMessageRow
                    key={msg.id}
                    isOwnMessage={own}
                    senderName={displayNameByUserId[msg.user_id] ?? msg.sender_name}
                    senderColor={resolvedColor}
                    body={msg.message}
                    timeLabel={formatTime(msg.created_at)}
                    createdAtIso={msg.created_at}
                    mentionHandle={mentionHandle}
                    attachmentUrl={teamChatSignedAttachments[msg.id] ?? null}
                    attachmentPathForKind={msg.attachment_url?.trim() || null}
                    avatarUrl={avatarByUserId[msg.user_id]}
                  />
                );
              })
            )}
          </div>

          <div className="flex-shrink-0 bg-white">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              className="hidden"
              aria-hidden
              onChange={(e) => {
                const fl = e.target.files;
                if (fl && fl.length > 0) void handleFilesSelected(fl);
                e.target.value = '';
              }}
            />
            <PanelChatComposer
              value={input}
              onChange={setInput}
              onSend={() => void handleSend()}
              placeholder="Escribe un mensaje…"
              disabled={uploadingAttachment}
              sending={uploadingAttachment}
              inputRef={inputRef}
              onKeyDown={handleKeyDown}
              leading={
                <>
                  <button
                    type="button"
                    disabled={uploadingAttachment}
                    className="rounded-lg p-2 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:pointer-events-none disabled:opacity-40"
                    title="Adjuntar imagen o PDF"
                    aria-label="Adjuntar archivo"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="rounded-lg p-2 transition-colors hover:bg-slate-100 hover:text-slate-600"
                        title="Emoji"
                        aria-label="Insertar emoji"
                      >
                        <Smile className="h-4 w-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="z-[100] w-auto border-slate-200 p-2 shadow-lg"
                      align="start"
                      side="top"
                      sideOffset={6}
                      onOpenAutoFocus={(ev) => ev.preventDefault()}
                    >
                      <div className="flex flex-wrap gap-1">
                        {QUICK_EMOJIS.map((e) => (
                          <button
                            key={e}
                            type="button"
                            className="rounded-md p-2 text-lg leading-none hover:bg-gray-100"
                            onClick={() => appendEmoji(e)}
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
                <p className="text-[10px] text-slate-400">
                  Enter para enviar · @{mentionHandle || 'nombre'} para mencionarte
                  {uploadingAttachment ? ' · Subiendo…' : ''}
                </p>
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
