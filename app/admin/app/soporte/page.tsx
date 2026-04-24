'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, Send, X, MessageCircle, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { adminFetch } from '@/lib/auth/adminFetch';
import { toast } from 'sonner';
import { ADMIN_BADGES_REFRESH_EVENT } from '@/lib/admin-badges-refresh';
import { useSupportUserTypingListener } from '@/hooks/useSupportUserTypingListener';

type Thread = {
  user_id: string;
  org_name: string | null;
  user_email: string | null;
  last_message: string;
  last_at: string;
  esperando_respuesta: boolean;
  message_count: number;
  bot_active?: boolean;
  status?: string;
};

type Msg = {
  id: string;
  sender: string;
  body: string;
  created_at: string;
  is_bot_message?: boolean;
};

function relTime(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export default function MobileSoportePage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading]   = useState(true);
  const [openThread, setOpenThread] = useState<Thread | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgsRef = useRef<Msg[]>([]);
  msgsRef.current = msgs;

  const userIsTyping = useSupportUserTypingListener(
    openThread?.user_id ?? null,
    !!openThread
  );

  const loadThreads = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res  = await adminFetch('/api/admin/support-chat');
      const json = await res.json();
      setThreads(json.threads ?? []);
    } catch { /* ignorar */ }
    setLoading(false);
  }, []);

  useEffect(() => { void loadThreads(); }, [loadThreads]);

  const loadMsgs = useCallback(async (userId: string, quiet = false) => {
    if (!quiet) setMsgLoading(true);
    try {
      const res  = await adminFetch(`/api/admin/support-chat/${userId}`);
      const json = await res.json();
      const next = (json.messages ?? []) as Msg[];
      const prev = quiet ? msgsRef.current : [];
      const prevLast = prev[prev.length - 1]?.id;
      const nextLast = next[next.length - 1]?.id;
      const hasNew = next.length > prev.length || (!!nextLast && nextLast !== prevLast);
      setMsgs(next);
      if (!quiet || hasNew) {
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 50);
      }
    } catch { /* ignorar */ }
    setMsgLoading(false);
  }, []);

  const openChat = (t: Thread) => {
    setOpenThread(t);
    setMsgs([]);
    void loadMsgs(t.user_id);
    pollRef.current = setInterval(() => void loadMsgs(t.user_id, true), 5_000);
  };

  const closeChat = () => {
    setOpenThread(null);
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    void loadThreads(true);
  };

  const sendReply = async () => {
    if (!openThread || !reply.trim() || sending) return;
    const body = reply.trim();
    setSending(true);
    setReply('');
    try {
      const res = await adminFetch('/api/admin/support-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: openThread.user_id, message: body }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error');
      window.dispatchEvent(new Event(ADMIN_BADGES_REFRESH_EVENT));
      await loadMsgs(openThread.user_id, true);
    } catch (e: any) { toast.error(e?.message ?? 'Error al enviar'); setReply(body); }
    setSending(false);
  };

  /* ── Vista lista de hilos ─────────────────────────────────── */
  if (!openThread) {
    const pending  = threads.filter((t) => t.esperando_respuesta);
    const rest     = threads.filter((t) => !t.esperando_respuesta);

    return (
      <div>
        <div className="sticky top-[var(--admin-mob-sticky)] z-40 flex items-center justify-between border-b border-white/8 bg-[#0f172a] px-4 py-3">
          <h2 className="text-base font-bold text-white">Soporte técnico</h2>
          <button onClick={() => void loadThreads()} className="rounded-lg border border-white/10 p-1.5 active:bg-white/10">
            <RefreshCw className={cn('h-4 w-4 text-slate-400', loading && 'animate-spin')} />
          </button>
        </div>

        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 px-4 py-4 border-b border-white/5">
              <div className="h-11 w-11 rounded-full bg-white/5 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/2 rounded bg-white/5 animate-pulse" />
                <div className="h-3 w-3/4 rounded bg-white/5 animate-pulse" />
              </div>
            </div>
          ))
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-600">
            <MessageCircle className="h-10 w-10" />
            <p className="text-sm font-medium">Sin conversaciones</p>
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <div className="px-4 pt-4 pb-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-2">● Esperando respuesta ({pending.length})</p>
                {pending.map((t) => <ThreadCard key={t.user_id} t={t} onClick={() => openChat(t)} />)}
              </div>
            )}
            {rest.length > 0 && (
              <div className="px-4 pt-3">
                {pending.length > 0 && <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-2">Respondidos</p>}
                {rest.map((t) => <ThreadCard key={t.user_id} t={t} onClick={() => openChat(t)} />)}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  /* ── Vista de chat abierto ─────────────────────────────────── */
  return (
    <div
      className="flex min-h-0 flex-col"
      style={{
        height: 'calc(100dvh - var(--admin-mob-sticky) - var(--admin-mob-tab))',
        maxHeight: 'calc(100dvh - var(--admin-mob-sticky) - var(--admin-mob-tab))',
      }}
    >

      {/* Chat header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-[#0f172a] px-3 py-3">
        <button onClick={closeChat} className="rounded-xl p-2 active:bg-white/10">
          <ChevronLeft className="h-5 w-5 text-slate-400" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{openThread.org_name || 'Cliente'}</p>
          <p
            className={cn(
              'text-xs truncate',
              userIsTyping ? 'font-medium text-emerald-400' : 'text-slate-500'
            )}
          >
            {userIsTyping ? 'El cliente está escribiendo…' : openThread.user_email ?? openThread.user_id.slice(0, 8)}
          </p>
        </div>
        {openThread.esperando_respuesta && (
          <span className="rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400">Pendiente</span>
        )}
      </div>

      {/* Messages */}
      <div className="flex min-h-0 flex-1 flex-col-reverse gap-2 overflow-y-auto overscroll-y-contain bg-[#0c1520] px-3 py-3 [-webkit-overflow-scrolling:touch] touch-pan-y">
        <div ref={bottomRef} />
        {msgLoading && <p className="text-center text-xs text-slate-600 py-4">Cargando…</p>}
        {[...msgs].reverse().map((m) => {
          const isAdmin = m.sender === 'admin';
          return (
            <div key={m.id} className={cn('flex gap-2', isAdmin ? 'justify-end' : 'justify-start')}>
              {!isAdmin && (
                <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-slate-300 shrink-0 mt-auto">
                  {(openThread.org_name ?? 'C').slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className={cn(
                'max-w-[78%] rounded-2xl px-3.5 py-2.5',
                isAdmin
                  ? 'rounded-tr-sm bg-[#0d9488] text-white'
                  : 'rounded-tl-sm bg-white/10 text-slate-200'
              )}>
                {m.is_bot_message && !isAdmin && (
                  <p className="text-[9px] font-black uppercase tracking-wider text-[#a3e635] mb-1">MARI</p>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.body}</p>
                <p className={cn('text-[10px] mt-1', isAdmin ? 'text-teal-200/70 text-right' : 'text-slate-600')}>
                  {relTime(m.created_at)}
                </p>
              </div>
              {isAdmin && (
                <div className="h-7 w-7 rounded-full bg-[#0d9488]/30 flex items-center justify-center text-[10px] font-bold text-[#0d9488] shrink-0 mt-auto">
                  J
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div
        className="flex items-end gap-2 border-t border-white/10 bg-[#0f172a] px-3 py-2 shrink-0"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0.5rem))' }}
      >
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendReply(); } }}
          placeholder="Escribe una respuesta…"
          rows={1}
          className="flex-1 resize-none rounded-2xl bg-white/8 border border-white/10 px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/50 max-h-32 leading-snug"
        />
        <button
          onClick={sendReply}
          disabled={!reply.trim() || sending}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0d9488] text-white disabled:opacity-40 active:bg-[#0f766e] transition-all"
        >
          {sending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function ThreadCard({ t, onClick }: { t: Thread; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3.5 py-3.5 text-left mb-2 active:bg-white/[0.07]"
    >
      <div className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-base font-black',
        t.esperando_respuesta ? 'bg-red-500/20 text-red-400' : 'bg-white/8 text-slate-400'
      )}>
        {(t.org_name ?? 'C').slice(0, 1).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-white truncate flex-1">{t.org_name || 'Cliente'}</p>
          <span className="text-[10px] text-slate-600 shrink-0">{relTime(t.last_at)}</span>
        </div>
        <p className="text-xs text-slate-500 truncate mt-0.5">{t.last_message}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
            t.esperando_respuesta
              ? 'bg-red-500/15 text-red-400 border border-red-500/30'
              : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
          )}>
            {t.esperando_respuesta ? '● Pendiente' : '✓ Respondido'}
          </span>
          <span className="text-[10px] text-slate-700">{t.message_count} mensajes</span>
        </div>
      </div>
    </button>
  );
}
