'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Info,
  LifeBuoy,
  Loader2,
  MessagesSquare,
  Minus,
  Paperclip,
  PencilLine,
  Send,
  Settings2,
  Smile,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { adminFetch } from '@/lib/auth/adminFetch';
import { cn } from '@/lib/utils';
import { supportThreadShowsPending, useAdminSupportChat } from '@/contexts/AdminSupportChatContext';
import { useDocumentTitleBlink } from '@/lib/use-document-title-blink';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PanelChatMessageBlock, PanelChatComposer } from '@/components/dashboard/PanelChatShell';
import { SupportAssistantMascot } from '@/components/dashboard/SupportAssistantMascot';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { CANNED_REPLY_SECTIONS } from '@/lib/admin-support-canned-replies';
import { useSupportUserTypingListener } from '@/hooks/useSupportUserTypingListener';
import { createClient } from '@/lib/supabase/client';
import { useSignedAttachmentUrls } from '@/lib/hooks/useSignedAttachmentUrls';

const CHAT_WIDTH = 336;
const CHAT_GAP = 12;
const EDGE_INSET = 16;
/** Espacio sobre el FAB (56px + márgenes): ventanas siempre ancladas al pie. */
const BOTTOM_ABOVE_FAB = 92;
/** Por encima del widget (z ~100); los Popovers del UI usan z-50 y quedaban tapados. */
const DOCK_POPOVER_Z = 'z-[10050]';
const DOCK_TOOLTIP_Z = 'z-[10050]';

const EMOJI_GRID = [
  '👋',
  '🙂',
  '😊',
  '🙏',
  '💪',
  '🤝',
  '👍',
  '👎',
  '✅',
  '❌',
  '⭐',
  '💯',
  '🔧',
  '🛠️',
  '⚙️',
  '📱',
  '💻',
  '🖥️',
  '📎',
  '📋',
  '📝',
  '✉️',
  '📧',
  '📞',
  '🔔',
  '⏱️',
  '⌛',
  '🚀',
  '💡',
  '⚠️',
  '❗',
  '❓',
  'ℹ️',
  '🔍',
  '🎯',
  '📌',
  '🔑',
  '🆗',
  '🙌',
  '✨',
  '💬',
  '🆘',
];

function userColor(userId: string): string {
  const palette = [
    'bg-blue-500',
    'bg-violet-500',
    'bg-pink-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-indigo-500',
    'bg-rose-500',
    'bg-cyan-600',
  ];
  let h = 0;
  for (let i = 0; i < userId.length; i++) {
    h = (h << 5) - h + userId.charCodeAt(i);
    h |= 0;
  }
  return palette[Math.abs(h) % palette.length];
}

function BubbleAvatar({
  src,
  name,
  colorClass,
  size = 'sm',
  shape = 'circle',
}: {
  src?: string | null;
  name: string;
  colorClass: string;
  size?: 'sm' | 'md' | 'lg';
  shape?: 'circle' | 'rounded';
}) {
  const [err, setErr] = useState(false);
  const initial = (name?.trim()?.[0] || '?').toUpperCase();
  const dim =
    size === 'lg' ? 'h-9 w-9 text-[11px]' : size === 'md' ? 'h-8 w-8 text-xs' : 'h-7 w-7 text-[10px]';
  const imgSizes = size === 'lg' ? '36px' : size === 'md' ? '32px' : '28px';
  const round = shape === 'rounded' ? 'rounded-xl' : 'rounded-full';
  if (src && !err) {
    return (
      <div
        className={cn(
          'relative shrink-0 overflow-hidden ring-2 ring-white/90 shadow-sm',
          dim,
          round
        )}
      >
        <Image
          src={src}
          alt=""
          fill
          className="object-cover"
          sizes={imgSizes}
          unoptimized
          onError={() => setErr(true)}
        />
      </div>
    );
  }
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center font-bold text-white ring-2 ring-white/90 shadow-sm',
        dim,
        round,
        colorClass
      )}
    >
      {initial}
    </div>
  );
}

function formatShortTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

/** Taller “activo”: actividad reciente en el hilo (misma heurística que antes). */
function isWorkshopActive(threadLastAt: string): boolean {
  const diffMin = (Date.now() - new Date(threadLastAt).getTime()) / 60000;
  return diffMin < 12;
}

function activitySubtitle(threadLastAt: string, esperandoMinimized: boolean, _userLabel: string): string {
  const t = new Date(threadLastAt).getTime();
  const diffMin = (Date.now() - t) / 60000;
  if (diffMin < 12) {
    return esperandoMinimized ? 'Esperando tu respuesta' : 'Activo ahora';
  }
  if (diffMin < 1440) {
    return `Últ. actividad hace ${Math.round(diffMin)} min`;
  }
  return 'Inactivo (+24 h)';
}

function countUnreadUserMessages(
  minimized: boolean,
  messages: { id: string; sender: string }[],
  lastReadMessageId: string | null
): number {
  if (!minimized) return 0;
  if (messages.length === 0) return 0;
  if (!lastReadMessageId) {
    return messages.filter((m) => m.sender === 'user').length;
  }
  const i = messages.findIndex((m) => m.id === lastReadMessageId);
  if (i < 0) {
    return messages.filter((m) => m.sender === 'user').length;
  }
  return messages.slice(i + 1).filter((m) => m.sender === 'user').length;
}

export function AdminSupportChatDock() {
  const {
    threads,
    threadsLoading,
    openWindows,
    windows,
    openChat,
    closeChat,
    toggleMinimize,
    setReply,
    sendReply,
    sendCannedReply,
    pendingReplyCount,
    dockUnreadCount,
    supportNeedsAttention,
    acknowledgeSupportAttention,
    refreshThreads,
  } = useAdminSupportChat();

  const [fabOpen, setFabOpen] = useState(false);

  const fabTotal = pendingReplyCount + dockUnreadCount;
  useDocumentTitleBlink(
    supportNeedsAttention,
    `💬 Nuevo mensaje · Soporte (${fabTotal || 1})`
  );

  const uploadForUser = useCallback(
    async (userId: string, file: File) => {
      const maxBytes = Math.floor(2.5 * 1024 * 1024);
      if (file.size > maxBytes) {
        toast.error('La imagen no puede superar 2,5 MB');
        return;
      }
      const okType = /^image\/(jpeg|png|webp)$/i.test(file.type || '');
      if (!okType) {
        toast.error('Solo se permiten JPG, PNG o WebP');
        return;
      }
      const fd = new FormData();
      fd.append('file', file);
      const res = await adminFetch('/api/admin/support-chat/attachment', {
        method: 'POST',
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error || 'No se pudo subir el archivo');
        return;
      }
      const path = json.path as string;
      if (!path) {
        toast.error('Sin ruta de adjunto');
        return;
      }
      try {
        await sendReply(userId, path);
        toast.success('Adjunto enviado');
      } catch {
        toast.error('No se pudo enviar el adjunto');
      }
    },
    [sendReply]
  );

  const nOpen = openWindows.length;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="pointer-events-none fixed bottom-0 right-0 z-[100] flex flex-col items-end gap-0 p-4">
        <Popover
          open={fabOpen}
          onOpenChange={(o) => {
            setFabOpen(o);
            if (o) acknowledgeSupportAttention();
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              style={{ pointerEvents: 'auto' }}
              className={cn(
                'relative flex h-14 w-14 items-center justify-center rounded-full transition-transform hover:scale-105',
                'bg-gradient-to-br from-[#F5C518] to-[#D4A915] text-white',
                'shadow-2xl shadow-black/35 ring-2 ring-white/40 backdrop-blur-sm'
              )}
              aria-label="Soporte en vivo"
            >
              <LifeBuoy className="h-6 w-6" />
              {fabTotal > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-[#D4A915] bg-red-500 px-1 text-[10px] font-bold text-white shadow-lg">
                  {fabTotal > 99 ? '99+' : fabTotal}
                </span>
              ) : null}
            </button>
          </PopoverTrigger>
          <PopoverContent
            className={cn(
              DOCK_POPOVER_Z,
              'w-80 overflow-hidden rounded-2xl border border-white/40 bg-white/95 p-0 shadow-2xl shadow-black/25 ring-1 ring-black/5 backdrop-blur-xl hover:!scale-100'
            )}
            align="end"
            side="top"
            sideOffset={12}
            style={{ pointerEvents: 'auto' }}
          >
            <div className="border-b border-slate-200/60 bg-gradient-to-r from-teal-50/90 to-white/80 px-3 py-2.5 backdrop-blur-sm">
              <p className="text-xs font-semibold text-slate-800">Conversaciones</p>
              <p className="text-[10px] text-slate-500">Abre un widget abajo a la derecha (estilo mensajería)</p>
            </div>
            <div className="max-h-72 overflow-y-auto bg-white/50">
              {threadsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              ) : threads.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-slate-500">Sin conversaciones aún.</p>
              ) : (
                threads.map((th) => (
                  <button
                    key={th.user_id}
                    type="button"
                    className="flex w-full items-start gap-2 border-b border-slate-100/80 px-3 py-2.5 text-left transition-colors hover:bg-teal-50/90"
                    onClick={() => {
                      openChat(th);
                      setFabOpen(false);
                    }}
                  >
                    <BubbleAvatar
                      src={th.user_avatar}
                      name={th.user_name}
                      colorClass={userColor(th.user_id)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-semibold text-slate-900">
                          {th.organization_name
                            ? `${th.user_name} · ${th.organization_name}`
                            : th.user_name}
                        </span>
                        {supportThreadShowsPending(th, windows) ? (
                          <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">
                            Pendiente
                          </span>
                        ) : null}
                      </div>
                      <p className="line-clamp-2 text-[10px] text-slate-500">{th.last_preview}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
            <div className="border-t border-slate-200/60 bg-white/60 p-2 backdrop-blur-sm">
              <Link
                href="/admin/support"
                className="block rounded-lg py-2 text-center text-xs font-medium text-[#F5C518] hover:bg-teal-50/80"
                onClick={() => setFabOpen(false)}
              >
                Bandeja de soporte →
              </Link>
              <button
                type="button"
                className="mt-1 w-full rounded-lg py-1.5 text-[10px] text-slate-500 hover:bg-slate-100/80"
                onClick={() => void refreshThreads()}
              >
                Actualizar lista
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {openWindows.map((userId, stackIdx) => {
          const w = windows[userId];
          if (!w) return null;
          const fromRight =
            EDGE_INSET + (nOpen - 1 - stackIdx) * (CHAT_WIDTH + CHAT_GAP);
          return (
            <div
              key={userId}
              className="pointer-events-auto"
              style={{
                position: 'fixed',
                right: fromRight,
                bottom: BOTTOM_ABOVE_FAB,
                width: CHAT_WIDTH,
                maxWidth: 'calc(100vw - 32px)',
                zIndex: 110 + stackIdx,
              }}
            >
              <FloatingChatWindow
                windowState={w}
                onMinimize={() => toggleMinimize(userId)}
                onClose={() => closeChat(userId)}
                onReplyChange={(t) => setReply(userId, t)}
                onSend={() => {
                  void sendReply(userId).catch(() => toast.error('No se pudo enviar'));
                }}
                onSendCanned={async (text) => {
                  await sendCannedReply(userId, text);
                }}
                onUpload={(file) => void uploadForUser(userId, file)}
              />
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

function FloatingChatWindow({
  windowState: w,
  onMinimize,
  onClose,
  onReplyChange,
  onSend,
  onSendCanned,
  onUpload,
}: {
  windowState: {
    thread: import('@/contexts/AdminSupportChatContext').SupportThread;
    minimized: boolean;
    messages: import('@/contexts/AdminSupportChatContext').SupportMsg[];
    userProfile: { name: string; avatar_url: string | null } | null;
    loadingMessages: boolean;
    reply: string;
    sending: boolean;
    lastReadMessageId: string | null;
    userLastReadMessageId: string | null;
  };
  onMinimize: () => void;
  onClose: () => void;
  onReplyChange: (t: string) => void;
  onSend: () => void;
  onSendCanned: (text: string) => Promise<void>;
  onUpload: (f: File) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [cannedOpen, setCannedOpen] = useState(false);
  const [cannedQuery, setCannedQuery] = useState('');
  const { thread, minimized, messages, userProfile, loadingMessages, reply, sending, lastReadMessageId, userLastReadMessageId } = w;

  const supabase = createClient();
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

  const userIsTyping = useSupportUserTypingListener(thread.user_id, !minimized);

  const filteredCannedSections = useMemo(() => {
    const q = cannedQuery.trim().toLowerCase();
    if (!q) return CANNED_REPLY_SECTIONS;
    return CANNED_REPLY_SECTIONS.map((s) => ({
      ...s,
      items: s.items.filter((item) => item.toLowerCase().includes(q)),
    })).filter((s) => s.items.length > 0);
  }, [cannedQuery]);

  const handleCannedSendNow = useCallback(
    async (text: string) => {
      if (sending) return;
      try {
        await onSendCanned(text);
        setCannedOpen(false);
        setCannedQuery('');
        toast.success(`Enviado a ${thread.user_name.trim() || 'usuario'}`);
      } catch {
        toast.error('No se pudo enviar');
      }
    },
    [onSendCanned, sending, thread.user_name],
  );

  const workshopName = thread.organization_name || userProfile?.name || thread.user_name;
  const country = thread.organization_country?.trim();
  const active = isWorkshopActive(thread.last_at);
  const statusSub = activitySubtitle(thread.last_at, minimized && thread.esperando_respuesta, thread.user_name);
  const typingLabel = (thread.user_name || 'Usuario').trim() || 'Usuario';

  const unreadMin = useMemo(
    () => countUnreadUserMessages(minimized, messages, lastReadMessageId),
    [minimized, messages, lastReadMessageId]
  );

  useEffect(() => {
    if (minimized) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, minimized, loadingMessages]);

  const clientReadIdx = useMemo(() => {
    const id = userLastReadMessageId;
    if (!id) return -1;
    const i = messages.findIndex((m) => m.id === id);
    return i;
  }, [messages, userLastReadMessageId]);

  const shellClass = cn(
    'flex flex-col overflow-hidden rounded-2xl border border-white/50',
    'bg-white/80 shadow-2xl shadow-black/30 ring-1 ring-black/[0.06] backdrop-blur-xl'
  );

  if (minimized) {
    return (
      <div className={shellClass}>
        <div
          className={cn(
            'flex cursor-pointer items-center justify-between gap-1 px-2 py-2 text-white transition-colors',
            unreadMin > 0
              ? 'bg-gradient-to-r from-red-900/95 via-rose-800/95 to-amber-900/90 ring-2 ring-red-400/70'
              : 'bg-gradient-to-r from-[#D4A915]/95 to-[#F5C518]/95'
          )}
          onClick={onMinimize}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2 pl-1">
            <BubbleAvatar
              src={userProfile?.avatar_url ?? thread.user_avatar}
              name={userProfile?.name ?? thread.user_name}
              colorClass={userColor(thread.user_id)}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-xs font-semibold">{workshopName}</span>
                {unreadMin > 0 ? (
                  <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow">
                    {unreadMin > 99 ? '99+' : unreadMin}
                  </span>
                ) : null}
              </div>
              {country ? (
                <p className="truncate text-[10px] text-white/80">{country}</p>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              className="rounded p-1 hover:bg-white/15"
              onClick={(e) => {
                e.stopPropagation();
                onMinimize();
              }}
              aria-label="Expandir"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded p-1 hover:bg-white/15"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        shellClass,
        'h-[min(580px,calc(100dvh-88px))] max-h-[min(580px,calc(100dvh-88px))]'
      )}
    >
      {/* Cabecera inteligente: taller, país, estado activo */}
      <div className="flex shrink-0 items-stretch gap-0 border-b border-slate-200/60 bg-gradient-to-r from-[#0a3d39]/95 via-[#F5C518]/92 to-[#115e59]/95 text-white backdrop-blur-md">
        <div className="flex min-w-0 flex-1 items-center gap-2 py-2.5 pl-3 pr-1">
          <BubbleAvatar
            src={userProfile?.avatar_url ?? thread.user_avatar}
            name={userProfile?.name ?? thread.user_name}
            colorClass={userColor(thread.user_id)}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold leading-tight">{workshopName}</p>
              <span
                className={cn(
                  'h-2 w-2 shrink-0 rounded-full ring-2 ring-white/40',
                  active ? 'bg-[#F5C518] shadow-[0_0_8px_rgba(245,197,24,0.9)]' : 'bg-slate-400'
                )}
                title={active ? 'Taller activo' : 'Sin actividad reciente'}
              />
            </div>
            <p className="truncate text-[10px] text-white/85">
              {userIsTyping ? (
                <span className="font-medium text-emerald-200">{typingLabel} está escribiendo…</span>
              ) : (
                <>
                  {[country || null, statusSub].filter(Boolean).join(' · ')}
                  {thread.user_name !== workshopName ? ` · ${thread.user_name}` : ''}
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 pr-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="rounded-lg p-1.5 hover:bg-white/10" aria-label="Datos de organización">
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              className={cn(DOCK_TOOLTIP_Z, 'max-w-[220px] border-slate-200 text-xs')}
            >
              <p className="font-semibold text-slate-900">Organización</p>
              <p className="mt-1 text-slate-600">
                <span className="text-slate-400">Plan:</span> {thread.organization_plan_label || '—'}
              </p>
              <p className="text-slate-600">
                <span className="text-slate-400">País:</span> {thread.organization_country || '—'}
              </p>
              {thread.organization_id ? (
                <Link
                  href={`/admin/organizations/${thread.organization_id}`}
                  className="mt-2 inline-block text-[11px] font-medium text-[#F5C518] hover:underline"
                >
                  Abrir ficha →
                </Link>
              ) : null}
            </TooltipContent>
          </Tooltip>
          {thread.organization_id ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={`/admin/organizations/${thread.organization_id}`}
                  className="rounded-lg p-1.5 text-white hover:bg-white/10"
                  aria-label="Ficha de la organización"
                >
                  <Settings2 className="h-4 w-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom" className={DOCK_TOOLTIP_Z}>
                Ir a la organización
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="p-1.5 text-white/30">
              <Building2 className="h-4 w-4" />
            </span>
          )}
          <button type="button" className="rounded-lg p-1.5 hover:bg-white/10" onClick={onMinimize} aria-label="Minimizar">
            <Minus className="h-4 w-4" />
          </button>
          <button type="button" className="rounded-lg p-1.5 hover:bg-white/10" onClick={onClose} aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-white px-3 py-3"
      >
        {loadingMessages ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-7 w-7 animate-spin text-slate-300" />
          </div>
        ) : (
          messages.map((m, idx) => {
            const isAdmin = m.sender === 'admin';
            const isBotReply = isAdmin && m.is_bot_message === true;
            const adminLabel =
              isAdmin && !isBotReply
                ? m.admin_sender_display_name?.trim() || 'Equipo'
                : isBotReply
                  ? 'MARI'
                  : 'Soporte';
            const adminAvatar =
              isAdmin && !isBotReply ? (
                <BubbleAvatar
                  src={m.admin_sender_avatar_url}
                  name={adminLabel}
                  colorClass="bg-primary"
                  size="lg"
                  shape="rounded"
                />
              ) : isBotReply ? (
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-primary ring-2 ring-white/90 shadow-sm">
                  <SupportAssistantMascot fill title="MARI" />
                </div>
              ) : undefined;
            const avSrc = userProfile?.avatar_url ?? thread.user_avatar;
            const avName = userProfile?.name ?? thread.user_name;
            const t = formatShortTime(m.created_at);
            const seenByClient = clientReadIdx >= 0 && idx <= clientReadIdx;
            const clientAvatar = (
              <BubbleAvatar
                src={avSrc}
                name={avName}
                colorClass={userColor(thread.user_id)}
                size="lg"
                shape="rounded"
              />
            );
            const attPath = m.attachment_url?.trim() ?? '';
            const attUrl = supportSignedAttachments[m.id];
            const body = (
              <>
                <p className="whitespace-pre-wrap break-words leading-snug">{m.body}</p>
                {attPath ? (
                  !attUrl ? (
                    <p className="mt-2 text-[11px] text-slate-400">Cargando adjunto…</p>
                  ) : /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(attPath) ? (
                    <a href={attUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                      <div
                        className={cn(
                          'relative mt-1 h-32 w-full max-w-[220px] overflow-hidden rounded-xl border',
                          isAdmin ? 'border-white/25' : 'border-slate-200'
                        )}
                      >
                        <Image src={attUrl} alt="" fill className="object-cover" unoptimized />
                      </div>
                    </a>
                  ) : (
                    <a
                      href={attUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'mt-2 inline-block text-[11px] font-semibold underline',
                        isAdmin ? 'text-white/90' : 'text-primary'
                      )}
                    >
                      Ver adjunto
                    </a>
                  )
                ) : null}
              </>
            );
            return (
              <PanelChatMessageBlock
                key={m.id}
                variant={isAdmin ? 'outgoing' : 'incoming'}
                senderName={isAdmin ? adminLabel : avName}
                timeShort={t}
                readReceipt={isAdmin ? (seenByClient ? 'read' : 'delivered') : undefined}
                avatar={isAdmin ? adminAvatar : clientAvatar}
              >
                {body}
              </PanelChatMessageBlock>
            );
          })
        )}
      </div>

      <div className="shrink-0 bg-white">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) onUpload(f);
          }}
        />
        <PanelChatComposer
          value={reply}
          onChange={onReplyChange}
          onSend={onSend}
          multiline
          placeholder={`Escribe a ${(() => {
            const u = thread.user_name.trim() || 'Usuario';
            return u.length > 28 ? `${u.slice(0, 25)}…` : u;
          })()}…`}
          disabled={sending}
          sending={sending}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              onSend();
            }
          }}
          leading={
            <>
              <Popover
                modal={false}
                open={cannedOpen}
                onOpenChange={(o) => {
                  setCannedOpen(o);
                  if (!o) setCannedQuery('');
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-amber-600 hover:bg-amber-50"
                    title="Plantillas de soporte (ganar tiempo, pedir datos…)"
                    aria-label="Respuestas automáticas"
                  >
                    <MessagesSquare className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className={cn(
                    DOCK_POPOVER_Z,
                    'w-[min(22rem,calc(100vw-1.5rem))] max-h-[min(90vh,560px)] overflow-hidden rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xl backdrop-blur-xl hover:!scale-100 flex flex-col gap-2'
                  )}
                  align="start"
                  side="top"
                  sideOffset={8}
                  collisionPadding={16}
                >
                  <div className="shrink-0 space-y-1">
                    <p className="text-[11px] font-semibold text-slate-800">Respuestas automáticas</p>
                    <p className="text-[10px] leading-snug text-slate-500">
                      <Send className="mr-1 inline h-3 w-3 text-[#F5C518]" aria-hidden />
                      envía al usuario al instante.
                      <PencilLine className="mx-1 inline h-3 w-3 text-slate-400" aria-hidden />
                      pega en el cuadro para editar antes de enviar.
                    </p>
                    <Input
                      value={cannedQuery}
                      onChange={(e) => setCannedQuery(e.target.value)}
                      placeholder="Buscar frase…"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
                    {filteredCannedSections.length === 0 ? (
                      <p className="py-8 text-center text-[11px] text-slate-500">Nada coincide con la búsqueda.</p>
                    ) : (
                      filteredCannedSections.map((section) => (
                        <Collapsible key={section.id} defaultOpen={section.defaultOpen}>
                          <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200/90 bg-slate-50 px-2.5 py-2 text-left text-[11px] font-semibold text-slate-800 outline-none transition-colors hover:bg-slate-100 data-[state=open]:rounded-b-none data-[state=open]:border-b-0">
                            <span className="min-w-0 flex-1 leading-tight">{section.label}</span>
                            <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                          </CollapsibleTrigger>
                          <CollapsibleContent className="overflow-hidden">
                            <div className="space-y-1.5 rounded-b-lg border border-t-0 border-slate-200/90 bg-white px-2 py-2">
                              {section.description ? (
                                <p className="text-[10px] leading-snug text-slate-500">{section.description}</p>
                              ) : null}
                              <div className="space-y-1.5">
                                {section.items.map((item, idx) => (
                                  <div
                                    key={`${section.id}-${idx}`}
                                    className="flex gap-1 rounded-lg border border-slate-100 bg-slate-50/90 p-1.5"
                                  >
                                    <p className="min-w-0 flex-1 text-[11px] leading-snug text-slate-700">{item}</p>
                                    <div className="flex shrink-0 flex-col gap-0.5">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-[#F5C518]"
                                            disabled={sending}
                                            onClick={() => void handleCannedSendNow(item)}
                                            aria-label={`Enviar a ${thread.user_name.trim() || 'usuario'} ahora`}
                                          >
                                            <Send className="h-3.5 w-3.5" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="left" className={DOCK_TOOLTIP_Z}>
                                          Enviar ya
                                        </TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-slate-500"
                                            onClick={() => {
                                              onReplyChange(item);
                                              setCannedOpen(false);
                                              setCannedQuery('');
                                            }}
                                            aria-label="Pegar en el cuadro para editar"
                                          >
                                            <PencilLine className="h-3.5 w-3.5" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="left" className={DOCK_TOOLTIP_Z}>
                                          Pegar en el cuadro
                                        </TooltipContent>
                                      </Tooltip>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              <Popover modal={false}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-500" title="Emojis">
                    <Smile className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className={cn(
                    DOCK_POPOVER_Z,
                    'w-auto max-w-[min(100vw-2rem,20rem)] rounded-xl border border-slate-200/90 bg-white p-2 shadow-2xl backdrop-blur-xl hover:!scale-100'
                  )}
                  align="start"
                  side="top"
                  sideOffset={8}
                  collisionPadding={16}
                >
                  <div className="grid max-h-[240px] grid-cols-6 gap-0.5 overflow-y-auto pr-0.5">
                    {EMOJI_GRID.map((em) => (
                      <button
                        key={em}
                        type="button"
                        className="rounded-lg p-1.5 text-lg hover:bg-slate-100"
                        onClick={() => onReplyChange(`${reply}${em}`)}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-600"
                title="Adjuntar imagen (JPG, PNG, WebP · máx. 2,5 MB)"
                onClick={() => fileRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </>
          }
          helperText={<p className="text-center text-[9px] text-slate-400">Ctrl+Enter para enviar · JC ONE FIX</p>}
        />
      </div>
    </div>
  );
}
