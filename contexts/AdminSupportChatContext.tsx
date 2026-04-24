'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { adminFetch } from '@/lib/auth/adminFetch';
import {
  dispatchAdminBadgesRefresh,
  dispatchAdminSupportDisplayPending,
} from '@/lib/admin-badges-refresh';
import { playAdminSupportChatPing } from '@/lib/admin-support-chat-sound';
import { createClient } from '@/lib/supabase/client';

export type SupportThread = {
  user_id: string;
  organization_id: string | null;
  organization_name: string | null;
  organization_country: string | null;
  organization_plan_label: string | null;
  last_at: string;
  last_preview: string;
  last_sender: string;
  esperando_respuesta: boolean;
  user_name: string;
  user_avatar: string | null;
};

/** Pendiente en UI: el hilo espera respuesta y el admin no lo tiene abierto expandido. */
export function supportThreadShowsPending(
  thread: SupportThread,
  windows: Record<string, { minimized: boolean }>,
): boolean {
  if (!thread.esperando_respuesta) return false;
  const w = windows[thread.user_id];
  if (w && !w.minimized) return false;
  return true;
}

export type SupportMsg = {
  id: string;
  sender: string;
  body: string;
  created_at: string;
  attachment_url?: string | null;
  is_bot_message?: boolean | null;
  admin_sender_avatar_url?: string | null;
  admin_sender_display_name?: string | null;
};

export type UserProfileBrief = {
  name: string;
  avatar_url: string | null;
};

type WindowEntry = {
  thread: SupportThread;
  minimized: boolean;
  messages: SupportMsg[];
  userProfile: UserProfileBrief | null;
  loadingMessages: boolean;
  reply: string;
  sending: boolean;
  lastReadMessageId: string | null;
  /** Puntero de lectura del cliente (panel taller); viene del API al cargar mensajes. */
  userLastReadMessageId: string | null;
};

type Ctx = {
  threads: SupportThread[];
  threadsLoading: boolean;
  threadsError: string | null;
  refreshThreads: (opts?: { silent?: boolean }) => Promise<void>;
  openWindows: string[];
  windows: Record<string, WindowEntry>;
  openChat: (thread: SupportThread) => void;
  closeChat: (userId: string) => void;
  toggleMinimize: (userId: string) => void;
  setReply: (userId: string, text: string) => void;
  sendReply: (userId: string, attachmentUrl?: string | null) => Promise<void>;
  /** Envía texto directo (plantillas) sin usar el borrador del composer. */
  sendCannedReply: (userId: string, body: string) => Promise<void>;
  loadMessages: (userId: string, opts?: { silent?: boolean }) => Promise<void>;
  pendingReplyCount: number;
  dockUnreadCount: number;
  supportNeedsAttention: boolean;
  acknowledgeSupportAttention: () => void;
};

const AdminSupportChatContext = createContext<Ctx | null>(null);

function rowToSupportMsg(row: Record<string, unknown>): SupportMsg {
  return {
    id: String(row.id),
    sender: String(row.sender),
    body: String(row.body),
    created_at: String(row.created_at),
    attachment_url: (row.attachment_url as string | null | undefined) ?? null,
    is_bot_message: (row.is_bot_message as boolean | null | undefined) ?? null,
    admin_sender_avatar_url: (row.admin_sender_avatar_url as string | null | undefined) ?? null,
    admin_sender_display_name: (row.admin_sender_display_name as string | null | undefined) ?? null,
  };
}

export function AdminSupportChatProvider({ children }: { children: React.ReactNode }) {
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [threadsError, setThreadsError] = useState<string | null>(null);
  const [openWindows, setOpenWindows] = useState<string[]>([]);
  const [windows, setWindows] = useState<Record<string, WindowEntry>>({});
  const [supportNeedsAttention, setSupportNeedsAttention] = useState(false);

  const windowsRef = useRef(windows);
  windowsRef.current = windows;

  const openWindowsRef = useRef(openWindows);
  openWindowsRef.current = openWindows;

  const acknowledgeSupportAttention = useCallback(() => {
    setSupportNeedsAttention(false);
  }, []);

  const refreshThreads = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) {
      setThreadsLoading(true);
      setThreadsError(null);
    }
    try {
      const res = await adminFetch('/api/admin/support-chat');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      setThreads(json.threads || []);
      dispatchAdminBadgesRefresh();
    } catch (e: unknown) {
      setThreadsError(e instanceof Error ? e.message : 'Error');
    } finally {
      if (!silent) setThreadsLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (userId: string, opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) {
      setWindows((prev) => {
        const w = prev[userId];
        if (!w) return prev;
        return {
          ...prev,
          [userId]: { ...w, loadingMessages: true },
        };
      });
    }
    try {
      const res = await adminFetch(`/api/admin/support-chat?userId=${encodeURIComponent(userId)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      const messages = (json.messages || []) as SupportMsg[];
      const userProfile = (json.userProfile ?? null) as UserProfileBrief | null;
      const userLastReadMessageId =
        typeof json.userLastReadMessageId === 'string' ? json.userLastReadMessageId : null;
      const wPrev = windowsRef.current[userId];
      const prevLatest = wPrev?.messages[wPrev.messages.length - 1];
      const newLatest = messages[messages.length - 1];
      const shouldNotify =
        !!wPrev?.minimized &&
        !!newLatest &&
        newLatest.sender === 'user' &&
        !!prevLatest &&
        newLatest.id !== prevLatest.id;

      if (shouldNotify) {
        playAdminSupportChatPing();
        setSupportNeedsAttention(true);
      }

      setWindows((prev) => {
        const w = prev[userId];
        if (!w) return prev;
        const last = messages[messages.length - 1];
        const lastRead =
          !w.minimized && last ? last.id : w.lastReadMessageId;
        return {
          ...prev,
          [userId]: {
            ...w,
            messages,
            userProfile: userProfile ?? w.userProfile,
            loadingMessages: false,
            lastReadMessageId: w.minimized ? w.lastReadMessageId : last?.id ?? w.lastReadMessageId,
            userLastReadMessageId,
          },
        };
      });
    } catch {
      setWindows((prev) => {
        const w = prev[userId];
        if (!w) return prev;
        return { ...prev, [userId]: { ...w, loadingMessages: false } };
      });
    }
  }, []);

  const loadMessagesRef = useRef(loadMessages);
  loadMessagesRef.current = loadMessages;

  const openChat = useCallback(
    (thread: SupportThread) => {
      acknowledgeSupportAttention();
      setOpenWindows((prev) => {
        const rest = prev.filter((id) => id !== thread.user_id);
        return [...rest, thread.user_id];
      });
      setWindows((prev) => {
        const existing = prev[thread.user_id];
        if (existing) {
          return {
            ...prev,
            [thread.user_id]: {
              ...existing,
              thread,
              minimized: false,
              userLastReadMessageId: existing.userLastReadMessageId ?? null,
            },
          };
        }
        return {
          ...prev,
          [thread.user_id]: {
            thread,
            minimized: false,
            messages: [],
            userProfile: null,
            loadingMessages: true,
            reply: '',
            sending: false,
            lastReadMessageId: null,
            userLastReadMessageId: null,
          },
        };
      });
      void loadMessages(thread.user_id);
    },
    [loadMessages, acknowledgeSupportAttention]
  );

  const closeChat = useCallback((userId: string) => {
    setOpenWindows((prev) => prev.filter((id) => id !== userId));
    setWindows((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }, []);

  const toggleMinimize = useCallback((userId: string) => {
    setWindows((prev) => {
      const w = prev[userId];
      if (!w) return prev;
      const nextMin = !w.minimized;
      if (!nextMin) acknowledgeSupportAttention();
      const last = w.messages[w.messages.length - 1];
      // Al minimizar o expandir, lo visible queda leído → el badge solo cuenta mensajes nuevos del cliente.
      const lastReadMessageId = last?.id ?? w.lastReadMessageId;
      return {
        ...prev,
        [userId]: {
          ...w,
          minimized: nextMin,
          lastReadMessageId,
        },
      };
    });
  }, [acknowledgeSupportAttention]);

  const setReply = useCallback((userId: string, text: string) => {
    setWindows((prev) => {
      const w = prev[userId];
      if (!w) return prev;
      return { ...prev, [userId]: { ...w, reply: text } };
    });
  }, []);

  const sendReply = useCallback(
    async (userId: string, attachmentUrl?: string | null) => {
      const w = windowsRef.current[userId];
      if (!w) return;
      const text = w.reply.trim();
      if (!text && !attachmentUrl) return;
      const bodyText = text || (attachmentUrl ? '📎 Archivo adjunto' : '');
      setWindows((prev) => {
        const cur = prev[userId];
        if (!cur) return prev;
        return { ...prev, [userId]: { ...cur, sending: true } };
      });
      try {
        const res = await adminFetch('/api/admin/support-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            organizationId: w.thread.organization_id,
            body: bodyText,
            attachmentUrl: attachmentUrl ?? undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Error');
        setWindows((prev) => {
          const cur = prev[userId];
          if (!cur) return prev;
          return { ...prev, [userId]: { ...cur, reply: '', sending: false } };
        });
        void loadMessages(userId, { silent: true });
        void refreshThreads({ silent: true });
      } catch {
        setWindows((prev) => {
          const cur = prev[userId];
          if (!cur) return prev;
          return { ...prev, [userId]: { ...cur, sending: false } };
        });
        throw new Error('No se pudo enviar');
      }
    },
    [loadMessages, refreshThreads]
  );

  const sendCannedReply = useCallback(
    async (userId: string, body: string) => {
      const t = body.trim();
      if (!t || t.length > 8000) return;
      const w = windowsRef.current[userId];
      if (!w) return;
      setWindows((prev) => {
        const cur = prev[userId];
        if (!cur) return prev;
        return { ...prev, [userId]: { ...cur, sending: true } };
      });
      try {
        const res = await adminFetch('/api/admin/support-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            organizationId: w.thread.organization_id,
            body: t,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Error');
        setWindows((prev) => {
          const cur = prev[userId];
          if (!cur) return prev;
          return { ...prev, [userId]: { ...cur, sending: false } };
        });
        void loadMessages(userId, { silent: true });
        void refreshThreads({ silent: true });
      } catch {
        setWindows((prev) => {
          const cur = prev[userId];
          if (!cur) return prev;
          return { ...prev, [userId]: { ...cur, sending: false } };
        });
        throw new Error('No se pudo enviar');
      }
    },
    [loadMessages, refreshThreads]
  );

  const refreshThreadsRef = useRef(refreshThreads);
  refreshThreadsRef.current = refreshThreads;
  const threadRefreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSilentThreadRefresh = useCallback(() => {
    if (threadRefreshDebounceRef.current) clearTimeout(threadRefreshDebounceRef.current);
    threadRefreshDebounceRef.current = setTimeout(() => {
      threadRefreshDebounceRef.current = null;
      void refreshThreadsRef.current({ silent: true });
    }, 120);
  }, []);

  useEffect(() => {
    void refreshThreads();
  }, [refreshThreads]);

  /** Mantener metadatos del hilo (pendiente, vista previa…) alineados con la lista del servidor. */
  useEffect(() => {
    if (threads.length === 0) return;
    setWindows((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const uid of Object.keys(next)) {
        const fresh = threads.find((t) => t.user_id === uid);
        if (!fresh) continue;
        const cur = next[uid]!.thread;
        if (
          cur.last_at !== fresh.last_at ||
          cur.last_preview !== fresh.last_preview ||
          cur.esperando_respuesta !== fresh.esperando_respuesta ||
          cur.last_sender !== fresh.last_sender
        ) {
          next[uid] = { ...next[uid]!, thread: fresh };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [threads]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('admin-support-chat-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_chat_messages' },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (!row?.id || !row.user_id) return;
          const uid = String(row.user_id);
          const msg = rowToSupportMsg(row);
          scheduleSilentThreadRefresh();
          const wSnap = windowsRef.current[uid];
          const isDup = !!wSnap?.messages.some((m) => m.id === msg.id);
          const shouldNotify = !!wSnap && !isDup && wSnap.minimized && msg.sender === 'user';
          setWindows((prev) => {
            const w = prev[uid];
            if (!w) return prev;
            if (w.messages.some((m) => m.id === msg.id)) return prev;
            const merged = [...w.messages, msg].sort((a, b) =>
              a.created_at.localeCompare(b.created_at)
            );
            const last = merged[merged.length - 1];
            return {
              ...prev,
              [uid]: {
                ...w,
                messages: merged,
                lastReadMessageId: w.minimized
                  ? w.lastReadMessageId
                  : last?.id ?? w.lastReadMessageId,
                userLastReadMessageId: w.userLastReadMessageId,
              },
            };
          });
          if (shouldNotify) {
            playAdminSupportChatPing();
            setSupportNeedsAttention(true);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'support_chat_messages' },
        (payload) => {
          const oldRow = payload.old as { id?: string; user_id?: string };
          if (!oldRow?.id) return;
          scheduleSilentThreadRefresh();
          setWindows((prev) => {
            const uid = oldRow.user_id ? String(oldRow.user_id) : null;
            if (!uid || !prev[uid]) return prev;
            const w = prev[uid];
            const nextMsgs = w.messages.filter((m) => m.id !== oldRow.id);
            const last = nextMsgs[nextMsgs.length - 1];
            return {
              ...prev,
              [uid]: {
                ...w,
                messages: nextMsgs,
                lastReadMessageId:
                  w.lastReadMessageId === oldRow.id
                    ? last?.id ?? null
                    : w.lastReadMessageId,
                userLastReadMessageId: w.userLastReadMessageId,
              },
            };
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'support_chat_threads' },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const uid = row?.user_id != null ? String(row.user_id) : null;
          if (!uid) return;
          if (!Object.prototype.hasOwnProperty.call(row, 'user_last_read_message_id')) return;
          const readRaw = row.user_last_read_message_id;
          const readId =
            readRaw === null || readRaw === undefined
              ? null
              : typeof readRaw === 'string'
                ? readRaw
                : String(readRaw);
          setWindows((prev) => {
            const w = prev[uid];
            if (!w) return prev;
            return {
              ...prev,
              [uid]: {
                ...w,
                userLastReadMessageId: readId,
              },
            };
          });
        }
      )
      .subscribe((status: string, err?: Error) => {
        if (status === 'SUBSCRIBED') return;
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[AdminSupportChat] Realtime:', status, err);
        }
      });

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void refreshThreadsRef.current({ silent: true });
        const ids = openWindowsRef.current;
        for (const uid of ids) {
          void loadMessagesRef.current(uid, { silent: true });
        }
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      if (threadRefreshDebounceRef.current) clearTimeout(threadRefreshDebounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [scheduleSilentThreadRefresh]);

  const pendingReplyCount = useMemo(
    () => threads.filter((t) => supportThreadShowsPending(t, windows)).length,
    [threads, windows],
  );

  useEffect(() => {
    dispatchAdminSupportDisplayPending(pendingReplyCount);
  }, [pendingReplyCount]);

  const dockUnreadCount = useMemo(() => {
    let n = 0;
    for (const uid of openWindows) {
      const w = windows[uid];
      if (!w || !w.minimized || w.messages.length === 0) continue;
      const last = w.messages[w.messages.length - 1];
      if (!last || last.sender !== 'user') continue;
      if (!w.lastReadMessageId) {
        n += 1;
        continue;
      }
      const idx = w.messages.findIndex((m) => m.id === w.lastReadMessageId);
      if (idx < 0) {
        n += 1;
        continue;
      }
      n += w.messages.slice(idx + 1).filter((m) => m.sender === 'user').length;
    }
    return n;
  }, [openWindows, windows]);

  const value = useMemo<Ctx>(
    () => ({
      threads,
      threadsLoading,
      threadsError,
      refreshThreads,
      openWindows,
      windows,
      openChat,
      closeChat,
      toggleMinimize,
      setReply,
      sendReply,
      sendCannedReply,
      loadMessages,
      pendingReplyCount,
      dockUnreadCount,
      supportNeedsAttention,
      acknowledgeSupportAttention,
    }),
    [
      threads,
      threadsLoading,
      threadsError,
      refreshThreads,
      openWindows,
      windows,
      openChat,
      closeChat,
      toggleMinimize,
      setReply,
      sendReply,
      sendCannedReply,
      loadMessages,
      pendingReplyCount,
      dockUnreadCount,
      supportNeedsAttention,
      acknowledgeSupportAttention,
    ]
  );

  return (
    <AdminSupportChatContext.Provider value={value}>{children}</AdminSupportChatContext.Provider>
  );
}

export function useAdminSupportChat() {
  const ctx = useContext(AdminSupportChatContext);
  if (!ctx) {
    throw new Error('useAdminSupportChat debe usarse dentro de AdminSupportChatProvider');
  }
  return ctx;
}

export function useAdminSupportChatOptional() {
  return useContext(AdminSupportChatContext);
}
