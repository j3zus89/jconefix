'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, RefreshCw, KeyRound, Ban, Check, X, ChevronDown, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { adminFetch } from '@/lib/auth/adminFetch';
import { isPanelOnline, PANEL_ONLINE_WINDOW_MS } from '@/lib/panel-presence';
import { toast } from 'sonner';

type UserRow = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until?: string | null;
  panel_last_active_at?: string | null;
};

function relTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export default function MobileUsuariosPage() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [newPass, setNewPass] = useState('');
  const [showPassForm, setShowPassForm] = useState(false);
  const qRef = useRef(q);
  qRef.current = q;

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) setLoading(true);
    try {
      const res  = await adminFetch(`/api/admin/users/search?q=${encodeURIComponent(qRef.current)}&perPage=100&t=${Date.now()}`);
      const json = await res.json();
      setRows(json.data?.users ?? []);
    } catch { /* ignorar */ }
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const id = window.setInterval(() => void load({ silent: true }), 30_000);
    return () => window.clearInterval(id);
  }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s.length < 2 ? rows : rows.filter((u) => (u.email ?? '').toLowerCase().includes(s) || u.id.includes(s));
  }, [rows, q]);

  const onlineCount = useMemo(() => filtered.filter((u) => !u.banned_until && isPanelOnline(u.panel_last_active_at)).length, [filtered]);

  const resetPassword = async () => {
    if (!selected || newPass.length < 6) return;
    setSaving(true);
    try {
      const res = await adminFetch('/api/admin/users/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selected.id, newPassword: newPass }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success('Contraseña restablecida');
      setNewPass('');
      setShowPassForm(false);
    } catch (e: any) { toast.error(e?.message ?? 'Error'); }
    setSaving(false);
  };

  const toggleBan = async (ban: boolean) => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await adminFetch('/api/admin/users/toggle-ban', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selected.id, banned: ban }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(ban ? 'Usuario bloqueado' : 'Usuario desbloqueado');
      setSelected(null);
      await load();
    } catch (e: any) { toast.error(e?.message ?? 'Error'); }
    setSaving(false);
  };

  const deleteUser = async () => {
    if (!selected) return;
    if (!confirm(`¿Eliminar para siempre a ${selected.email ?? 'este usuario'}? No se puede deshacer.`)) return;
    setSaving(true);
    try {
      const res = await adminFetch('/api/admin/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: [selected.id] }),
      });
      const json = await res.json();
      if (!res.ok && json.data == null) throw new Error(json.error || 'Error al eliminar');
      const errs: Array<{ id: string; error?: string }> = json.data?.errors ?? [];
      const skipped: string[] = json.data?.skipped ?? [];
      if (skipped.length > 0) {
        toast.error('Esta cuenta está protegida y no se puede eliminar desde aquí.');
        return;
      }
      if (errs.length > 0) {
        toast.error(errs[0]?.error ?? 'No se pudo eliminar');
        return;
      }
      toast.success('Usuario eliminado');
      setSelected(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col">

      {/* Header sticky (alinea con notch + barra del shell) */}
      <div className="sticky top-[var(--admin-mob-sticky)] z-40 border-b border-white/8 bg-[#0f172a] px-4 pb-3 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-base font-bold text-white flex-1">Usuarios</h2>
          <button onClick={() => void load()} className="rounded-lg border border-white/10 p-1.5 active:bg-white/10">
            <RefreshCw className={cn('h-4 w-4 text-slate-400', loading && 'animate-spin')} />
          </button>
        </div>
        {/* Stats pills */}
        <div className="flex gap-2 mb-3">
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-0.5 text-[11px] font-semibold text-emerald-400">
            ● {onlineCount} en panel ahora
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-0.5 text-[11px] font-semibold text-slate-400">
            {filtered.length} total
          </span>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por email o ID…"
            className="w-full rounded-xl bg-white/8 border border-white/10 pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/50"
          />
          {q && (
            <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-slate-500" />
            </button>
          )}
        </div>
      </div>

      {/* List (el scroll lo hace <main> del shell) */}
      <div className="divide-y divide-white/5">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-3 px-4 py-4">
              <div className="h-10 w-10 rounded-full bg-white/5 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-2/3 rounded bg-white/5 animate-pulse" />
                <div className="h-3 w-1/3 rounded bg-white/5 animate-pulse" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">Sin resultados</div>
        ) : (
          filtered.map((u) => {
            const banned   = !!u.banned_until;
            const online   = !banned && isPanelOnline(u.panel_last_active_at);
            const initials = (u.email ?? '?').slice(0, 2).toUpperCase();
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => { setSelected(u); setShowPassForm(false); setNewPass(''); }}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-white/5"
              >
                {/* Avatar */}
                <div className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                  banned   ? 'bg-red-500/20 text-red-400' :
                  online   ? 'bg-emerald-500/20 text-emerald-400' :
                             'bg-white/8 text-slate-400'
                )}>
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{u.email ?? '—'}</p>
                  <p className={cn('text-xs mt-0.5', online ? 'text-emerald-500' : 'text-slate-600')}>
                    {banned ? '🚫 Bloqueado' : online ? '● En panel ahora' : `● ${relTime(u.panel_last_active_at)}`}
                  </p>
                </div>
                <span className="text-[10px] text-slate-600 shrink-0">
                  {relTime(u.last_sign_in_at)}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* ── Bottom sheet: z-index por encima del nav fijo del shell (z-50) ── */}
      {selected && (
        <div
          className="fixed inset-0 z-[200] flex flex-col justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-user-sheet-title"
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden onClick={() => setSelected(null)} />
          <div
            className="relative mx-0 flex max-h-[calc(100dvh-var(--admin-mob-tab)-0.75rem)] min-h-0 w-full flex-col overflow-hidden rounded-t-3xl border-t border-white/15 bg-[#131e2e] shadow-[0_-8px_40px_rgba(0,0,0,0.45)]"
            style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 1.25rem))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-y-contain px-5 pb-1 pt-4 [-webkit-overflow-scrolling:touch] touch-pan-y">
              {/* Handle */}
              <div className="mx-auto h-1 w-10 shrink-0 rounded-full bg-white/20" />

              {/* User info */}
              <div className="flex items-start gap-3">
                <div className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-base font-black',
                  selected.banned_until ? 'bg-red-500/20 text-red-400' :
                  isPanelOnline(selected.panel_last_active_at) ? 'bg-emerald-500/20 text-emerald-400' :
                  'bg-white/8 text-slate-400'
                )}>
                  {(selected.email ?? '?').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p id="mobile-user-sheet-title" className="text-sm font-semibold text-white break-all">{selected.email ?? '—'}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {isPanelOnline(selected.panel_last_active_at)
                      ? '● Conectado al panel ahora'
                      : `Última actividad: ${relTime(selected.panel_last_active_at)}`}
                  </p>
                </div>
                <button type="button" onClick={() => setSelected(null)} className="shrink-0 rounded-full p-2 active:bg-white/10" aria-label="Cerrar">
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>

              <div className="h-px bg-white/8" />

              {/* Reset password */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowPassForm((v) => !v)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-left active:bg-white/8"
                >
                  <KeyRound className="h-5 w-5 shrink-0 text-[#0d9488]" />
                  <span className="flex-1 text-sm font-medium text-slate-200">Resetear contraseña</span>
                  <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-500 transition-transform', showPassForm && 'rotate-180')} />
                </button>
                {showPassForm && (
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      placeholder="Nueva contraseña (mín. 6)"
                      type="password"
                      autoComplete="new-password"
                      className="min-h-[44px] w-full flex-1 rounded-xl border border-white/10 bg-white/8 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40"
                    />
                    <button
                      type="button"
                      onClick={() => void resetPassword()}
                      disabled={saving || newPass.length < 6}
                      className="min-h-[44px] shrink-0 rounded-xl bg-[#0d9488] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 active:bg-[#0f766e]"
                    >
                      {saving ? '…' : 'Aplicar'}
                    </button>
                  </div>
                )}
              </div>

              {/* Ban / Unban */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void toggleBan(true)}
                  disabled={saving}
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-3 text-sm font-semibold text-red-400 disabled:opacity-50 active:bg-red-500/20"
                >
                  <Ban className="h-4 w-4 shrink-0" />
                  Bloquear
                </button>
                <button
                  type="button"
                  onClick={() => void toggleBan(false)}
                  disabled={saving}
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-sm font-semibold text-emerald-400 disabled:opacity-50 active:bg-emerald-500/20"
                >
                  <Check className="h-4 w-4 shrink-0" />
                  Desbloquear
                </button>
              </div>

              <button
                type="button"
                onClick={() => void deleteUser()}
                disabled={saving}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm font-semibold text-red-300 disabled:opacity-50 active:bg-red-950/60"
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                Eliminar usuario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
