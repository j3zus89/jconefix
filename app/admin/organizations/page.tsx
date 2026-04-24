'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Building2,
  Clock,
  Filter,
  LogIn,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Ticket,
  Trash2,
  Users,
  ChevronRight,
  ShieldCheck,
  Ban,
} from 'lucide-react';
import NewOrganizationModal from '@/app/admin/dashboard/components/NewOrganizationModal';
import { cn } from '@/lib/utils';
import { adminFetch } from '@/lib/auth/adminFetch';
import { createClient } from '@/lib/supabase/client';
import {
  adminPlanSelectValue,
  formatOrgDateLong,
  formatOrgDateTimeShort,
  formatPlanPeriodLabel,
  normalizeBillingCycle,
  trialRemainingHint,
  type BillingCycle,
  type PlanType,
} from '@/lib/org-plan';
import { extractMagicLinkActionUrl } from '@/lib/admin-magic-link';

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  subscription_status: string;
  subscription_plan: string;
  plan_type?: string | null;
  billing_cycle?: string | null;
  license_expires_at?: string | null;
  license_unlimited?: boolean | null;
  created_at: string;
  trial_ends_at: string | null;
  max_users: number | null;
  max_tickets: number | null;
  owner_email: string | null;
  active_users: number;
  total_tickets: number;
  pending_tickets: number;
  completed_tickets: number;
  total_customers: number;
  total_inventory_items: number;
  last_ticket_date: string | null;
  effective_status: string;
  /** Alguien del equipo con el dashboard abierto (heartbeats recientes). */
  panel_online?: boolean;
  panel_online_users?: number;
  panel_last_seen_at?: string | null;
  polish_month_used?: number;
  polish_month_limit?: number | null;
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
  trial: 'bg-sky-50 text-sky-800 border-sky-200/80',
  suspended: 'bg-rose-50 text-rose-800 border-rose-200/80',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
  expired: 'bg-amber-50 text-amber-900 border-amber-200/80',
  license_expired: 'bg-orange-50 text-orange-900 border-orange-200/80',
};

function statusLabelEs(status: string): string {
  const m: Record<string, string> = {
    active: 'Activo',
    trial: 'Prueba',
    suspended: 'Suspendido',
    cancelled: 'Cancelado',
    expired: 'Prueba vencida',
    license_expired: 'Licencia vencida',
  };
  return m[status] || status;
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border',
        STATUS_STYLES[status] || STATUS_STYLES.active
      )}
      title={status}
    >
      {statusLabelEs(status)}
    </span>
  );
}

function relativePanelActivityEs(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (sec < 45) return 'hace un momento';
  if (sec < 3600) return `hace ${Math.floor(sec / 60)} min`;
  if (sec < 86400) return `hace ${Math.floor(sec / 3600)} h`;
  return `hace ${Math.floor(sec / 86400)} d`;
}

function PanelPresenceLine({
  online,
  onlineUsers,
  lastSeen,
}: {
  online: boolean;
  onlineUsers: number;
  lastSeen: string | null;
}) {
  if (online) {
    return (
      <div
        className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5"
        title={`Usuario(s) con sesión activa en el panel (últimos ~3 min). Heartbeat cada 60 s.`}
      >
        <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.35)]" />
        <span className="truncate text-[10px] font-bold text-emerald-900">
          Panel en línea{onlineUsers > 1 ? ` · ${onlineUsers}` : ''}
        </span>
      </div>
    );
  }
  return (
    <div
      className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-500"
      title={
        lastSeen
          ? `Última actividad en el dashboard: ${new Date(lastSeen).toLocaleString('es-ES')}`
          : 'Nadie de esta organización ha registrado actividad en el panel (o aún no hay tabla de sesiones).'
      }
    >
      <span className="h-2 w-2 shrink-0 rounded-full bg-gray-300" />
      <span className="truncate">{lastSeen ? `Panel fuera · ${relativePanelActivityEs(lastSeen)}` : 'Panel sin señal'}</span>
    </div>
  );
}

function OrgAvatar({ name }: { name: string }) {
  const initial = (name?.trim()?.[0] || '?').toUpperCase();
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#0d9488]/15 to-[#0d9488]/5 text-xs font-bold text-[#0f766e] ring-1 ring-[#0d9488]/20">
      {initial}
    </div>
  );
}

const TABLE_COL_COUNT = 12;

function TableSkeleton() {
  return (
    <tbody className="divide-y divide-gray-100">
      {[1, 2, 3, 4].map((i) => (
        <tr key={i} className="animate-pulse">
          {[...Array(TABLE_COL_COUNT)].map((_, j) => (
            <td key={j} className="px-3 py-3">
              <div className="h-8 rounded bg-gray-100" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

/** Fila en estado de prueba (sigue si la prueba ya pasó: se puede ampliar desde el listado). */
function isTrialRow(o: OrgRow): boolean {
  return !o.license_unlimited && o.subscription_status === 'trial' && !!o.trial_ends_at;
}

function QuickTrialExtend({
  orgId,
  busy,
  enabled,
  onExtend,
}: {
  orgId: string;
  busy: boolean;
  enabled: boolean;
  onExtend: (orgId: string, days: number) => Promise<void>;
}) {
  const [n, setN] = useState('');
  if (!enabled) {
    return <span className="text-[11px] text-gray-400">—</span>;
  }
  const parsed = parseInt(n.trim(), 10);
  const isNeg = Number.isFinite(parsed) && parsed < 0;
  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min={-730}
        max={730}
        placeholder="±días"
        value={n}
        onChange={(e) => setN(e.target.value)}
        className="w-14 rounded border border-gray-200 px-1 py-1 text-[11px] font-medium tabular-nums focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-300"
        title="Días a añadir (positivo) o quitar (negativo)"
      />
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          if (!Number.isFinite(parsed) || parsed === 0) return;
          await onExtend(orgId, parsed);
          setN('');
        }}
        className={cn(
          'shrink-0 rounded-md px-1.5 py-1 text-[10px] font-bold text-white disabled:opacity-50',
          isNeg ? 'bg-amber-500 hover:bg-amber-600' : 'bg-sky-600 hover:bg-sky-700'
        )}
        title={isNeg ? 'Reducir días de prueba' : 'Añadir días de prueba'}
      >
        OK
      </button>
    </div>
  );
}

export default function AdminOrganizationsPage() {
  const sp = useSearchParams();
  const initialSearch = sp.get('search') || '';
  const filter = sp.get('filter') || '';

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<OrgRow[]>([]);
  const [search, setSearch] = useState(initialSearch);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [impersonateOrgId, setImpersonateOrgId] = useState<string | null>(null);
  /** Email del super admin en sesión: no mostrar borrado de la org de la que es titular. */
  const [adminEmailLower, setAdminEmailLower] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const sb = createClient();
      const { data } = await sb.auth.getUser();
      const e = data.user?.email?.trim().toLowerCase();
      setAdminEmailLower(e || null);
    })();
  }, []);

  const canDeleteOrganization = (o: OrgRow) => {
    if (!adminEmailLower || !o.owner_email?.trim()) return true;
    return o.owner_email.trim().toLowerCase() !== adminEmailLower;
  };

  const openOwnerMagicLink = async (orgId: string) => {
    setImpersonateOrgId(orgId);
    setError(null);
    try {
      const res = await adminFetch('/api/admin/users/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      const url = extractMagicLinkActionUrl(json);
      if (!url) throw new Error('No se recibió enlace de acceso');
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setImpersonateOrgId(null);
    }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/get-organizations?t=${Date.now()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      setRows(json.data || []);
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let base = rows;
    if (filter === 'trial_expiring') {
      const now = Date.now();
      const end = now + 7 * 24 * 60 * 60 * 1000;
      base = base.filter((o) => {
        if (o.effective_status !== 'trial' || !o.trial_ends_at) return false;
        const t = new Date(o.trial_ends_at).getTime();
        return t >= now && t <= end;
      });
    } else if (filter === 'trial') {
      base = base.filter((o) => o.effective_status === 'trial' || o.subscription_status === 'trial');
    } else if (filter === 'active') {
      base = base.filter((o) => o.effective_status === 'active');
    } else if (filter === 'suspended') {
      base = base.filter((o) => o.effective_status === 'suspended' || o.subscription_status === 'suspended');
    } else if (filter === 'attention') {
      base = base.filter((o) => o.effective_status === 'expired' || o.effective_status === 'license_expired');
    } else if (filter === 'trial_expired') {
      const now = Date.now();
      base = base.filter((o) => {
        if (o.subscription_status !== 'trial' || !o.trial_ends_at) return false;
        return new Date(o.trial_ends_at).getTime() < now;
      });
    } else if (filter === 'inactive_7d') {
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      base = base.filter((o) => {
        if (o.panel_online) return false;
        if (!o.panel_last_seen_at) return true;
        return new Date(o.panel_last_seen_at).getTime() < cutoff;
      });
    }
    if (!q) return base;
    return base.filter((o) =>
      [o.name, o.slug, o.owner_email || ''].some((v) => v.toLowerCase().includes(q))
    );
  }, [rows, search, filter]);

  const totals = useMemo(() => {
    const trial = rows.filter((o) => o.effective_status === 'trial' || o.subscription_status === 'trial').length;
    const active = rows.filter((o) => o.effective_status === 'active').length;
    const attention = rows.filter((o) => o.effective_status === 'expired' || o.effective_status === 'license_expired')
      .length;
    return { total: rows.length, trial, active, attention };
  }, [rows]);

  const patchOrgLicense = async (orgId: string, plan_type: PlanType, billing_cycle: BillingCycle) => {
    setMutatingId(orgId);
    try {
      const res = await adminFetch('/api/admin/update-organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          action: 'update_license',
          updates: {
            plan_type,
            billing_cycle,
            apply_plan_defaults: true,
            renew_license_from_today: true,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setMutatingId(null);
    }
  };

  const toggleUnlimited = async (orgId: string, current: boolean) => {
    setMutatingId(orgId);
    try {
      const res = await adminFetch('/api/admin/update-organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          action: 'update_license',
          updates: { license_unlimited: !current },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setMutatingId(null);
    }
  };

  const extendTrialFromList = async (orgId: string, days: number) => {
    setMutatingId(orgId);
    setError(null);
    try {
      const res = await adminFetch('/api/admin/update-organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          action: 'update_trial',
          updates: { trial_extend_days: days, sync_trial_license_expires: true },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setMutatingId(null);
    }
  };

  const updateStatus = async (orgId: string, newStatus: string) => {
    setMutatingId(orgId);
    try {
      const res = await adminFetch('/api/admin/update-organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, action: 'update_status', updates: { subscription_status: newStatus } }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setMutatingId(null);
    }
  };

  const suspendOrganizationNow = async (orgId: string, name: string) => {
    if (
      !confirm(
        `Suspender «${name}»: todo el equipo pierde acceso al panel y la IA de pulido hasta que reactives. ¿Confirmar?`
      )
    ) {
      return;
    }
    await updateStatus(orgId, 'suspended');
  };

  const deleteOrg = async (orgId: string) => {
    if (!confirm('¿Eliminar esta organización? Esto borrará datos relacionados con organization_id.')) return;
    setMutatingId(orgId);
    try {
      const res = await adminFetch('/api/admin/update-organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, action: 'delete_org' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setMutatingId(null);
    }
  };

  const filterLink = (key: string | null) => {
    if (!key) return '/admin/organizations';
    return `/admin/organizations?filter=${encodeURIComponent(key)}`;
  };

  const selectClass =
    'h-8 text-xs font-medium border border-gray-200/90 rounded-lg px-2 bg-white shadow-sm hover:border-[#0d9488]/30 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/25 transition-colors disabled:opacity-50';

  return (
    <div className="space-y-6 pb-8">
      <div className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#0d9488] via-[#14b8a6] to-[#0d9488]/60" />
        <div className="p-6 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex gap-4">
              <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0d9488]/10 text-[#0f766e]">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-[1.65rem]">
                    Organizaciones
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#0d9488]/20 bg-[#0d9488]/5 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#0f766e]">
                    <Sparkles className="h-3 w-3" />
                    Multi-tenant
                  </span>
                </div>
                <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-gray-500">
                  Planes, licencias, pruebas y estado operativo. Los cambios de plan renuevan la licencia desde hoy.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={load}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
                disabled={loading}
              >
                <RefreshCw className={cn('h-4 w-4 text-gray-500', loading && 'animate-spin')} />
                Actualizar
              </button>
              <button
                type="button"
                onClick={() => setShowNew(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0d9488] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#0d9488]/20 transition hover:bg-[#0f766e]"
              >
                <Plus className="h-4 w-4" />
                Nueva organización
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Total', value: totals.total, icon: Building2, tone: 'text-gray-600' },
              { label: 'En prueba', value: totals.trial, icon: Clock, tone: 'text-sky-600' },
              { label: 'Activas', value: totals.active, icon: Sparkles, tone: 'text-emerald-600' },
              {
                label: 'Requieren atención',
                value: totals.attention,
                icon: Filter,
                tone: totals.attention > 0 ? 'text-amber-600' : 'text-gray-400',
              },
            ].map(({ label, value, icon: Icon, tone }) => (
              <div
                key={label}
                className="rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 transition hover:border-gray-200 hover:bg-white"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</span>
                  <Icon className={cn('h-4 w-4 shrink-0 opacity-80', tone)} />
                </div>
                <div className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200/90 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 lg:max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, slug o email…"
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-4 text-sm transition placeholder:text-gray-400 focus:border-[#0d9488]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d9488]/20"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <span className="text-xs font-medium text-gray-500">Vista rápida</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { href: filterLink(null), key: '', label: 'Todas' },
                { href: filterLink('trial'), key: 'trial', label: 'En prueba' },
                { href: filterLink('active'), key: 'active', label: 'Activas' },
                { href: filterLink('trial_expiring'), key: 'trial_expiring', label: 'Prueba < 7 días' },
                { href: filterLink('trial_expired'), key: 'trial_expired', label: 'Trial vencido' },
                { href: filterLink('inactive_7d'), key: 'inactive_7d', label: 'Sin panel 7 días' },
                { href: filterLink('attention'), key: 'attention', label: 'A revisar' },
                { href: filterLink('suspended'), key: 'suspended', label: 'Suspendidas' },
              ].map(({ href, key, label }) => (
                <Link
                  key={key || 'all'}
                  href={href}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                    filter === key || (!filter && !key)
                      ? 'bg-[#0d9488] text-white shadow-sm'
                      : 'border border-gray-200 bg-white text-gray-600 hover:border-[#0d9488]/30 hover:text-gray-900'
                  )}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Mostrando <span className="font-semibold text-gray-700">{filtered.length}</span> de {rows.length}{' '}
          organizaciones
          {search.trim() ? ' (búsqueda activa)' : ''}
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-800 shadow-sm">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gradient-to-b from-gray-50 to-gray-50/50">
                <th className="sticky left-0 z-10 bg-gradient-to-b from-gray-50 to-gray-50/50 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Organización
                </th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">
                  Alta
                </th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500 min-w-[7.5rem]">
                  Plan
                </th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">
                  Fin prueba
                </th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">
                  Resto prueba
                </th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">
                  + Días
                </th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">
                  Licencia
                </th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500 min-w-[10rem]">
                  Estado / Panel
                </th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Usuarios
                </th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Tickets
                </th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">
                  Pulir IA (mes)
                </th>
                <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Acciones
                </th>
              </tr>
            </thead>
            {loading ? (
              <TableSkeleton />
            ) : (
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={TABLE_COL_COUNT} className="px-4 py-16 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                          <Building2 className="h-7 w-7" />
                        </div>
                        <p className="mt-4 text-base font-semibold text-gray-800">Sin resultados</p>
                        <p className="mt-1 text-sm text-gray-500">
                          Prueba otra búsqueda o cambia el filtro rápido de arriba.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((o) => (
                    <tr
                      key={o.id}
                      className="group align-middle transition-colors hover:bg-[#0d9488]/[0.03]"
                    >
                      <td className="sticky left-0 z-[1] bg-white px-3 py-2.5 shadow-[1px_0_0_rgba(0,0,0,0.06)] group-hover:bg-[#ecfdf5]/80">
                        <div className="flex gap-2">
                          <OrgAvatar name={o.name} />
                          <div className="min-w-0 max-w-[11rem]">
                            <div className="truncate font-semibold text-gray-900" title={o.name}>
                              {o.name}
                            </div>
                            <div className="truncate font-mono text-[10px] text-gray-500" title={o.slug}>
                              /{o.slug}
                            </div>
                            <div
                              className="truncate text-[10px] text-gray-400"
                              title={o.owner_email || undefined}
                            >
                              {o.owner_email || '—'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-[11px] text-gray-800">
                        <div className="font-medium leading-tight">{formatOrgDateLong(o.created_at)}</div>
                        <div className="text-[10px] text-gray-400 tabular-nums">
                          {new Date(o.created_at).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col gap-1 min-w-[7rem]">
                          <span
                            className="inline-flex w-fit max-w-full truncate rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-bold text-gray-800"
                            title={formatPlanPeriodLabel(o.plan_type, o.billing_cycle)}
                          >
                            {formatPlanPeriodLabel(o.plan_type, o.billing_cycle)}
                          </span>
                          <button
                            type="button"
                            title={o.license_unlimited ? 'Quitar licencia vitalicia' : 'Marcar como vitalicia (sin caducidad)'}
                            disabled={mutatingId === o.id}
                            onClick={() => toggleUnlimited(o.id, !!o.license_unlimited)}
                            className={cn(
                              'inline-flex w-fit items-center gap-0.5 rounded border px-1 py-0.5 text-[9px] font-bold uppercase transition disabled:opacity-50',
                              o.license_unlimited
                                ? 'border-violet-300 bg-violet-100 text-violet-800 hover:bg-violet-200'
                                : 'border-gray-200 bg-gray-50 text-gray-400 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700'
                            )}
                          >
                            <ShieldCheck className="h-2.5 w-2.5" />
                            {o.license_unlimited ? 'Vitalicia' : 'Vitalicia?'}
                          </button>
                          <div className="flex flex-col gap-0.5">
                            <select
                              value={adminPlanSelectValue(o.plan_type, o.subscription_plan)}
                              onChange={(e) =>
                                patchOrgLicense(o.id, e.target.value as PlanType, normalizeBillingCycle(o.billing_cycle))
                              }
                              disabled={mutatingId === o.id}
                              className={cn(selectClass, 'h-7 min-w-0 text-[10px]')}
                              title="Plan — renueva licencia desde hoy"
                            >
                              <option value="profesional">JC ONE FIX</option>
                              <option value="basico">Histórico</option>
                            </select>
                            <select
                              value={normalizeBillingCycle(o.billing_cycle)}
                              onChange={(e) =>
                                patchOrgLicense(
                                  o.id,
                                  adminPlanSelectValue(o.plan_type, o.subscription_plan),
                                  e.target.value as BillingCycle
                                )
                              }
                              disabled={mutatingId === o.id}
                              className={cn(selectClass, 'h-7 min-w-0 text-[10px]')}
                              title="Facturación — renueva desde hoy"
                            >
                              <option value="mensual">Mensual</option>
                              <option value="anual">Anual</option>
                            </select>
                          </div>
                          {o.subscription_plan &&
                            !['basico', 'profesional'].includes(String(o.subscription_plan).toLowerCase()) && (
                              <span className="text-[9px] font-medium text-amber-700 truncate" title={o.subscription_plan}>
                                Hist.: {o.subscription_plan}
                              </span>
                            )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-gray-800 whitespace-nowrap">
                        {isTrialRow(o) && o.trial_ends_at ? (
                          <span className="font-medium">{formatOrgDateTimeShort(o.trial_ends_at)}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[11px] max-w-[6.5rem]">
                        {isTrialRow(o) && o.trial_ends_at ? (
                          <span className="font-semibold text-sky-800 leading-tight">
                            {trialRemainingHint(o.trial_ends_at)}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <QuickTrialExtend
                          orgId={o.id}
                          busy={mutatingId === o.id}
                          enabled={isTrialRow(o)}
                          onExtend={extendTrialFromList}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-[11px] max-w-[8rem]">
                        {o.license_unlimited ? (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 border border-violet-200 px-2 py-0.5 text-[10px] font-bold text-violet-800 w-fit">
                              <ShieldCheck className="h-3 w-3 shrink-0" />
                              Vitalicia
                            </span>
                            <span className="text-[10px] text-violet-600 font-medium">Sin caducidad</span>
                          </div>
                        ) : o.subscription_status === 'active' && o.license_expires_at ? (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800 w-fit">
                              ✓ Activa
                            </span>
                            <span className="text-[10px] text-gray-500">
                              hasta {formatOrgDateLong(o.license_expires_at)}
                            </span>
                          </div>
                        ) : isTrialRow(o) ? (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 border border-sky-200 px-2 py-0.5 text-[10px] font-bold text-sky-800 w-fit">
                              En prueba
                            </span>
                            {o.trial_ends_at && (
                              <span className="text-[10px] text-gray-500">
                                hasta {formatOrgDateLong(o.trial_ends_at)}
                              </span>
                            )}
                          </div>
                        ) : o.subscription_status === 'suspended' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 border border-red-200 px-2 py-0.5 text-[10px] font-bold text-red-700 w-fit">
                            Suspendida
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
                          <select
                            value={o.subscription_status}
                            onChange={(e) => updateStatus(o.id, e.target.value)}
                            disabled={mutatingId === o.id}
                            className={cn(selectClass, 'min-w-[8.5rem]')}
                          >
                            <option value="active">Activo</option>
                            <option value="trial">Prueba</option>
                            <option value="suspended">Suspendido</option>
                          </select>
                          <StatusPill status={o.effective_status || o.subscription_status} />
                        </div>
                        <PanelPresenceLine
                          online={!!o.panel_online}
                          onlineUsers={o.panel_online_users ?? 0}
                          lastSeen={o.panel_last_seen_at ?? null}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                          <div>
                            <div className="text-sm font-bold tabular-nums text-gray-900">{o.active_users}</div>
                            <div className="text-[10px] text-gray-500">
                              / {o.max_users == null ? '∞' : o.max_users}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-start gap-1.5">
                          <Ticket className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-300" />
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{o.total_tickets}</div>
                            <div className="text-[10px] text-gray-500">{o.pending_tickets} pend.</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-[11px] tabular-nums text-gray-800 whitespace-nowrap">
                        <span className="font-semibold">{o.polish_month_used ?? 0}</span>
                        <span className="text-gray-400"> / </span>
                        <span title="Límite mensual por org (settings); vacío = solo límites globales">
                          {o.polish_month_limit != null ? o.polish_month_limit : '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {o.subscription_status !== 'suspended' && o.effective_status !== 'suspended' && (
                            <button
                              type="button"
                              title="Suspender organización (kill switch)"
                              disabled={mutatingId === o.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                void suspendOrganizationNow(o.id, o.name);
                              }}
                              className="inline-flex items-center gap-1 rounded-xl border border-red-300 bg-red-50 px-2 py-2 text-xs font-bold text-red-800 shadow-sm transition hover:bg-red-100 disabled:opacity-50"
                            >
                              <Ban className="h-3.5 w-3.5 shrink-0" />
                              Suspender
                            </button>
                          )}
                          <button
                            type="button"
                            title="Abrir el panel del taller como dueño (magic link, nueva pestaña)"
                            disabled={impersonateOrgId === o.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              void openOwnerMagicLink(o.id);
                            }}
                            className="inline-flex items-center gap-1 rounded-xl border border-violet-200 bg-violet-50 px-2.5 py-2 text-xs font-semibold text-violet-900 shadow-sm transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <LogIn className="h-3.5 w-3.5 shrink-0" />
                            Suplantar
                          </button>
                          <Link
                            href={`/admin/organizations/${o.id}`}
                            className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:border-[#0d9488]/35 hover:bg-[#0d9488]/5 hover:text-[#0f766e]"
                          >
                            Detalle
                            <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => deleteOrg(o.id)}
                            disabled={mutatingId === o.id || !canDeleteOrganization(o)}
                            className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 p-2 text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                            title={
                              canDeleteOrganization(o)
                                ? 'Eliminar organización'
                                : 'No puedes eliminar tu propia organización (titular)'
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            )}
          </table>
        </div>
      </div>

      <NewOrganizationModal
        isOpen={showNew}
        onClose={() => setShowNew(false)}
        onSuccess={async () => {
          setShowNew(false);
          await load();
        }}
      />
    </div>
  );
}

