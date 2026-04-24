'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  RefreshCw,
  KeyRound,
  Ban,
  Check,
  Copy,
  Trash2,
  MessageCircle,
  Loader2,
  Send,
  CreditCard,
  LogIn,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { adminFetch } from '@/lib/auth/adminFetch';
import { isPanelOnline, PANEL_ONLINE_WINDOW_MS } from '@/lib/panel-presence';
import { useAdminSupportChatOptional, type SupportThread } from '@/contexts/AdminSupportChatContext';
import { dispatchAdminBadgesRefresh } from '@/lib/admin-badges-refresh';
import { extractMagicLinkActionUrl } from '@/lib/admin-magic-link';

type UserRow = {
  id: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until?: string | null;
  user_metadata?: any;
  /** Última señal del heartbeat del panel (tabla user_panel_sessions), vía API admin */
  panel_last_active_at?: string | null;
};

type SubPaymentRow = {
  id: string;
  created_at: string;
  mercado_pago_payment_id: string;
  transaction_amount: number;
  billing_cycle: string | null;
  payment_type_id: string | null;
  payment_method_id: string | null;
  status: string;
  date_approved: string | null;
};

function formatPanelAgo(iso: string | null | undefined): string {
  if (!iso) return 'Sin actividad en panel';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return new Date(iso).toLocaleString('es-ES');
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Hace menos de 1 min';
  if (m < 60) return `Hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `Hace ${h} h`;
  return new Date(iso).toLocaleString('es-ES');
}

export default function AdminUsersPage() {
  const sp = useSearchParams();
  const initial = sp.get('search') || '';
  const supportCtx = useAdminSupportChatOptional();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState(initial);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [newPass, setNewPass] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [supportMessageBody, setSupportMessageBody] = useState('');
  const [supportMessageSending, setSupportMessageSending] = useState(false);
  const [subPayments, setSubPayments] = useState<SubPaymentRow[]>([]);
  const [subPaymentsLoading, setSubPaymentsLoading] = useState(false);
  const [impersonateUserId, setImpersonateUserId] = useState<string | null>(null);
  const qRef = useRef(q);
  qRef.current = q;

  useEffect(() => {
    setSupportMessageBody('');
  }, [selected?.id]);

  useEffect(() => {
    if (!selected?.id) {
      setSubPayments([]);
      return;
    }
    let cancelled = false;
    setSubPaymentsLoading(true);
    void adminFetch(`/api/admin/users/subscription-payments?userId=${encodeURIComponent(selected.id)}&t=${Date.now()}`)
      .then(async (res) => {
        const j = (await res.json()) as { payments?: SubPaymentRow[] };
        if (!cancelled && res.ok) setSubPayments(j.payments ?? []);
      })
      .finally(() => {
        if (!cancelled) setSubPaymentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected?.id]);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await adminFetch(
        `/api/admin/users/search?q=${encodeURIComponent(qRef.current)}&perPage=200&t=${Date.now()}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      setRows(json.data?.users || []);
      if (silent) setError(null);
    } catch (e: any) {
      if (!silent) setError(e?.message || 'Error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => void load({ silent: true }), 30_000);
    return () => window.clearInterval(id);
  }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((u) =>
      [u.email || '', u.id, u.phone || ''].some((v) => String(v).toLowerCase().includes(s))
    );
  }, [rows, q]);

  const onlineNowCount = useMemo(
    () =>
      filtered.filter(
        (u) => !u.banned_until && isPanelOnline(u.panel_last_active_at ?? null)
      ).length,
    [filtered]
  );

  const resetPassword = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const res = await adminFetch('/api/admin/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selected.id, newPassword: newPass }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      setNewPass('');
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const toggleBan = async (ban: boolean) => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const res = await adminFetch('/api/admin/users/toggle-ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selected.id, banned: ban }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const openUserMagicLink = async (userId: string) => {
    setImpersonateUserId(userId);
    setError(null);
    try {
      const res = await adminFetch('/api/admin/users/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      const url = extractMagicLinkActionUrl(json);
      if (!url) throw new Error('No se recibió enlace de acceso');
      window.open(url, '_blank', 'noopener,noreferrer');
      toast.success('Abriendo sesión en una pestaña nueva…');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error';
      setError(msg);
      toast.error(msg);
    } finally {
      setImpersonateUserId(null);
    }
  };

  const sendSupportMessageToSelected = async () => {
    if (!selected?.id || !supportMessageBody.trim() || supportMessageSending) return;
    const preview = supportMessageBody.trim().slice(0, 140);
    setSupportMessageSending(true);
    try {
      const res = await adminFetch('/api/admin/support-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selected.id,
          body: supportMessageBody.trim(),
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        organizationId?: string | null;
      };
      if (!res.ok) throw new Error(json.error || 'Error');

      toast.success(
        'Enviado. Lo verá en su panel en el icono de soporte técnico (asistente JC ONE FIX).'
      );
      setSupportMessageBody('');
      dispatchAdminBadgesRefresh();

      const nameFromEmail = selected.email?.split('@')[0]?.trim();
      const synthetic: SupportThread = {
        user_id: selected.id,
        organization_id: json.organizationId ?? null,
        organization_name: null,
        organization_country: null,
        organization_plan_label: null,
        last_at: new Date().toISOString(),
        last_preview: preview,
        last_sender: 'admin',
        esperando_respuesta: false,
        user_name: nameFromEmail || selected.email || 'Usuario',
        user_avatar: null,
      };
      supportCtx?.openChat(synthetic);
      await supportCtx?.refreshThreads();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'No se pudo enviar');
    } finally {
      setSupportMessageSending(false);
    }
  };

  const toggleId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds((prev) => {
      const allIds = filtered.map((u) => u.id);
      const allSelected = allIds.every((id) => prev.has(id));
      return allSelected ? new Set() : new Set(allIds);
    });
  };

  const bulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`¿Eliminar ${ids.length} usuario(s)? Esta acción es irreversible.`)) return;

    setSaving(true);
    setError(null);
    try {
      const res = await adminFetch('/api/admin/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: ids }),
      });
      const json = await res.json();
      if (!res.ok && json.data == null) throw new Error(json.error || 'Error al eliminar');

      const skipped: string[] = json.data?.skipped ?? [];
      if (skipped.length > 0) {
        setError(
          `Cuenta(s) protegida(s), no se eliminan: ${skipped.length}. Solo se pueden borrar desde Supabase si aplica.`
        );
        toast.error('Hay cuentas de super admin en la selección; no se eliminan.');
      }

      // Errores parciales (207) o totales: mostrar detalle por usuario
      const errs: Array<{ id: string; error?: string }> = json.data?.errors ?? [];
      if (errs.length > 0) {
        const msgs = errs.map((e) => `• ${e.id}: ${e.error ?? 'error desconocido'}`).join('\n');
        setError(`No se pudieron eliminar ${errs.length} usuario(s):\n${msgs}`);
        toast.error('Revisa el mensaje de error: suele ser una referencia en base de datos (FK).');
      } else if (skipped.length === 0) {
        const n = json.data?.deleted?.length ?? 0;
        if (n > 0) toast.success(`${n} usuario(s) eliminado(s).`);
      }

      setSelectedIds(new Set());
      setSelected(null);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500 mt-1">
            Búsqueda global, reset password y bloqueo.
            <span className="ml-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              {onlineNowCount} en panel ahora
            </span>
            <span className="text-gray-400 font-normal"> · se actualiza cada 30 s · en línea = señal en los últimos {PANEL_ONLINE_WINDOW_MS / 60000} min</span>
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm"
          disabled={loading}
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Actualizar
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por email, id o teléfono..."
              className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5C518]/30"
            />
          </div>
          <button
            onClick={() => void load()}
            className="px-3 py-2 rounded-lg bg-[#F5C518] hover:bg-[#D4A915] text-white text-sm font-medium"
            disabled={loading}
          >
            Buscar
          </button>
          <div className="text-xs text-gray-500">
            {filtered.length} resultado(s) · {selectedIds.size} seleccionado(s)
          </div>
          <button
            onClick={bulkDelete}
            disabled={saving || selectedIds.size === 0}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium disabled:opacity-60"
            title="Eliminar seleccionados"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && filtered.every((u) => selectedIds.has(u.id))}
                    onChange={toggleAll}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Alta</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Último login</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-[7rem]">
                  Suplantar
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                    Cargando...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                    Sin resultados.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const isSelected = selected?.id === u.id;
                  const banned = !!u.banned_until;
                  const online = !banned && isPanelOnline(u.panel_last_active_at ?? null);
                  return (
                    <tr
                      key={u.id}
                      className={cn('cursor-pointer hover:bg-gray-50', isSelected && 'bg-[#F5C518]/5')}
                      onClick={() => setSelected(u)}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(u.id)}
                          onChange={() => toggleId(u.id)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{u.email || '—'}</div>
                        <div className="text-xs text-gray-500">{u.id}</div>
                        {u.phone && <div className="text-xs text-gray-400">{u.phone}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {new Date(u.created_at).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString('es-ES') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 max-w-[11rem]">
                          {banned ? (
                            <span className="inline-flex w-fit items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold border bg-red-50 text-red-700 border-red-200">
                              <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                              Bloqueado
                            </span>
                          ) : (
                            <span
                              className={cn(
                                'inline-flex w-fit items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold border',
                                online
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-slate-50 text-slate-600 border-slate-200'
                              )}
                            >
                              <span
                                className={cn(
                                  'h-2 w-2 rounded-full shrink-0',
                                  online ? 'bg-emerald-500 motion-safe:animate-pulse' : 'bg-slate-300'
                                )}
                              />
                              {online ? 'En panel' : 'Fuera del panel'}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-500 leading-snug">
                            Actividad panel: {formatPanelAgo(u.panel_last_active_at ?? null)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          title="Abrir el panel como este usuario (magic link)"
                          disabled={banned || impersonateUserId === u.id || !u.email}
                          onClick={() => void openUserMagicLink(u.id)}
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2 py-1.5 text-[11px] font-semibold text-violet-900 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {impersonateUserId === u.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <LogIn className="h-3.5 w-3.5" />
                          )}
                          Entrar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-sm font-semibold text-gray-900">Acciones</div>
          <div className="text-xs text-gray-500 mt-1">
            Selecciona un usuario para operar.
          </div>

          {!selected ? (
            <div className="mt-6 text-sm text-gray-500">Ningún usuario seleccionado.</div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="text-xs text-gray-500">Usuario</div>
                <div className="text-sm font-medium text-gray-900 mt-1">{selected.email || '—'}</div>
                {!selected.banned_until && (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full shrink-0',
                        isPanelOnline(selected.panel_last_active_at ?? null)
                          ? 'bg-emerald-500 motion-safe:animate-pulse'
                          : 'bg-slate-300'
                      )}
                    />
                    <span className="text-gray-600">
                      {isPanelOnline(selected.panel_last_active_at ?? null)
                        ? 'Conectado al panel ahora'
                        : 'No conectado al panel (últimos 3 min)'}
                    </span>
                  </div>
                )}
                <p className="text-[11px] text-gray-500 mt-1">
                  Última actividad en panel: {formatPanelAgo(selected.panel_last_active_at ?? null)}
                </p>
                <p className="text-[11px] text-gray-500">
                  Último login (cuenta):{' '}
                  {selected.last_sign_in_at
                    ? new Date(selected.last_sign_in_at).toLocaleString('es-ES')
                    : '—'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => copy(selected.id)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs"
                  >
                    <Copy className="h-3.5 w-3.5 text-gray-500" />
                    Copiar ID
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-violet-950">
                  <LogIn className="h-4 w-4 shrink-0 text-violet-600" />
                  Suplantación (soporte)
                </div>
                <p className="text-[11px] leading-snug text-violet-900/85">
                  Abrí el <strong className="font-medium">panel del taller</strong> como esta cuenta en una pestaña nueva
                  (enlace mágico de Supabase). No hace falta la contraseña. Queda registrado en auditoría.
                </p>
                <button
                  type="button"
                  onClick={() => void openUserMagicLink(selected.id)}
                  disabled={!!selected.banned_until || impersonateUserId === selected.id || !selected.email}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-800 disabled:pointer-events-none disabled:opacity-50"
                >
                  {impersonateUserId === selected.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="h-4 w-4" />
                  )}
                  Abrir panel como este usuario
                </button>
                {!selected.email ? (
                  <p className="text-[11px] text-red-700">Sin email en Auth: no se puede magic link.</p>
                ) : null}
                {selected.banned_until ? (
                  <p className="text-[11px] text-red-700">Usuario bloqueado: desbloqueá antes de suplantar.</p>
                ) : null}
              </div>

              <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-sky-950">
                  <MessageCircle className="h-4 w-4 shrink-0 text-sky-600" />
                  Soporte técnico (su panel)
                </div>
                <p className="text-[11px] leading-snug text-sky-900/80">
                  El mensaje aparece en el <strong className="font-medium">chat de soporte</strong> de su panel (icono del
                  encabezado). Mismo canal que cuando el cliente escribe a apoyo.
                </p>
                <textarea
                  value={supportMessageBody}
                  onChange={(e) => setSupportMessageBody(e.target.value)}
                  placeholder="Escribe el mensaje que debe recibir…"
                  rows={4}
                  maxLength={8000}
                  disabled={!!selected.banned_until || supportMessageSending}
                  className="w-full resize-y rounded-lg border border-sky-200/80 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400/40 disabled:opacity-50"
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-sky-800/70">{supportMessageBody.length} / 8000</span>
                  <button
                    type="button"
                    onClick={() => void sendSupportMessageToSelected()}
                    disabled={
                      !!selected.banned_until ||
                      supportMessageSending ||
                      !supportMessageBody.trim()
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {supportMessageSending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Enviar al chat de soporte
                  </button>
                </div>
                {selected.banned_until ? (
                  <p className="text-[11px] text-red-700">Usuario bloqueado: no se puede enviar.</p>
                ) : null}
              </div>

              <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-violet-950">
                  <CreditCard className="h-4 w-4 text-violet-600 shrink-0" />
                  Pagos Mercado Pago (auditoría)
                </div>
                <p className="text-[11px] text-violet-900/80 leading-snug">
                  Historial según <code className="text-[10px] bg-white/80 px-1 rounded">user_id</code> del titular en
                  cobros (external_reference). La fecha de licencia en Supabase manda para el acceso al panel.
                </p>
                {subPaymentsLoading ? (
                  <div className="flex items-center gap-2 text-xs text-violet-800 py-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Cargando…
                  </div>
                ) : subPayments.length === 0 ? (
                  <p className="text-xs text-violet-800/70">Sin pagos registrados.</p>
                ) : (
                  <ul className="max-h-48 overflow-y-auto divide-y divide-violet-100 rounded-lg border border-violet-100 bg-white text-[11px]">
                    {subPayments.map((p) => (
                      <li key={p.id} className="px-2 py-2 space-y-0.5">
                        <div className="font-mono text-gray-800">{p.mercado_pago_payment_id}</div>
                        <div className="text-gray-600">
                          {Number(p.transaction_amount).toLocaleString('es-AR')} ARS · ciclo {p.billing_cycle || '—'} ·{' '}
                          {p.payment_type_id || 'tipo ?'}
                          {p.payment_method_id ? ` · método ${p.payment_method_id}` : ''}
                        </div>
                        <div className="text-gray-400">
                          {p.date_approved
                            ? new Date(p.date_approved).toLocaleString('es-ES')
                            : new Date(p.created_at).toLocaleString('es-ES')}
                          {' · '}
                          {p.status}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-lg border border-gray-200 p-3 space-y-2">
                <div className="text-xs font-semibold text-gray-600">Reset password</div>
                <input
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="Nueva contraseña (min 6)"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
                <button
                  onClick={resetPassword}
                  disabled={saving || newPass.length < 6}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#F5C518] hover:bg-[#D4A915] text-white text-sm font-medium disabled:opacity-60"
                >
                  <KeyRound className="h-4 w-4" />
                  Reset
                </button>
              </div>

              <div className="rounded-lg border border-gray-200 p-3 space-y-2">
                <div className="text-xs font-semibold text-gray-600">Bloqueo</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleBan(true)}
                    disabled={saving}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium disabled:opacity-60"
                  >
                    <Ban className="h-4 w-4" />
                    Ban
                  </button>
                  <button
                    onClick={() => toggleBan(false)}
                    disabled={saving}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-green-200 bg-green-50 hover:bg-green-100 text-green-700 text-sm font-medium disabled:opacity-60"
                  >
                    <Check className="h-4 w-4" />
                    Unban
                  </button>
                </div>
                <div className="text-xs text-gray-400">
                  Usa `ban_duration` en Supabase Auth (server-side).
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

