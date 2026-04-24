'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, RefreshCw, X, ChevronRight, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { adminFetch } from '@/lib/auth/adminFetch';

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  subscription_status: string;
  effective_status: string;
  owner_email: string | null;
  active_users: number;
  total_tickets: number;
  pending_tickets: number;
  trial_ends_at: string | null;
  license_expires_at?: string | null;
  created_at: string;
  last_ticket_date: string | null;
  panel_online?: boolean;
  panel_online_users?: number;
  panel_last_seen_at?: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  active:          'Activo',
  trial:           'Prueba',
  suspended:       'Suspendido',
  cancelled:       'Cancelado',
  expired:         'Prueba vencida',
  license_expired: 'Licencia vencida',
};

const STATUS_STYLE: Record<string, string> = {
  active:          'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  trial:           'bg-sky-500/15 text-sky-400 border-sky-500/30',
  suspended:       'bg-red-500/15 text-red-400 border-red-500/30',
  cancelled:       'bg-slate-500/15 text-slate-400 border-slate-500/30',
  expired:         'bg-amber-500/15 text-amber-400 border-amber-500/30',
  license_expired: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
};

function daysLeft(iso: string | null) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

function relTime(iso: string | null) {
  if (!iso) return '—';
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

type FilterKey = 'all' | 'active' | 'trial' | 'suspended' | 'expired';
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',       label: 'Todas'      },
  { key: 'active',    label: 'Activas'    },
  { key: 'trial',     label: 'En prueba'  },
  { key: 'suspended', label: 'Suspendidas'},
  { key: 'expired',   label: 'Vencidas'   },
];

export default function MobileOrgsPage() {
  const [orgs, setOrgs]   = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ]         = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const qRef = useRef(q);
  qRef.current = q;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await adminFetch(`/api/admin/get-organizations?t=${Date.now()}`);
      const json = await res.json();
      setOrgs(json.data ?? []);
    } catch { /* ignorar */ }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return orgs.filter((o) => {
      const matchQ = !s || o.name.toLowerCase().includes(s) || (o.owner_email ?? '').toLowerCase().includes(s);
      const status = o.effective_status;
      const matchF =
        filter === 'all' ? true :
        filter === 'expired' ? (status === 'expired' || status === 'license_expired') :
        status === filter;
      return matchQ && matchF;
    });
  }, [orgs, q, filter]);

  const counts = useMemo(() => {
    const c: Partial<Record<FilterKey, number>> = { all: orgs.length };
    orgs.forEach((o) => {
      const s = o.effective_status;
      if (s === 'active')    c.active    = (c.active    ?? 0) + 1;
      if (s === 'trial')     c.trial     = (c.trial     ?? 0) + 1;
      if (s === 'suspended') c.suspended = (c.suspended ?? 0) + 1;
      if (s === 'expired' || s === 'license_expired') c.expired = (c.expired ?? 0) + 1;
    });
    return c;
  }, [orgs]);

  return (
    <div>
      {/* Header */}
      <div className="sticky top-[var(--admin-mob-sticky)] z-40 space-y-3 border-b border-white/8 bg-[#0f172a] px-4 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-white flex-1">Organizaciones</h2>
          <button onClick={() => void load()} className="rounded-lg border border-white/10 p-1.5 active:bg-white/10">
            <RefreshCw className={cn('h-4 w-4 text-slate-400', loading && 'animate-spin')} />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o email…"
            className="w-full rounded-xl bg-white/8 border border-white/10 pl-9 pr-8 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none"
          />
          {q && (
            <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-slate-500" />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors',
                filter === key
                  ? 'border-[#0d9488] bg-[#0d9488]/20 text-[#0d9488]'
                  : 'border-white/10 bg-white/5 text-slate-500'
              )}
            >
              {label}
              {counts[key] !== undefined && (
                <span className="ml-1.5 opacity-60">{counts[key]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="px-4 py-3 space-y-2.5">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/5" />
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-600">
            <Building2 className="h-10 w-10" />
            <p className="text-sm font-medium">Sin resultados</p>
          </div>
        ) : (
          filtered.map((org) => {
            const status  = org.effective_status;
            const styleCls = STATUS_STYLE[status] ?? STATUS_STYLE.cancelled;
            const trialing = status === 'trial';
            const days     = trialing ? daysLeft(org.trial_ends_at) : null;

            return (
              <a
                key={org.id}
                href={`/admin/organizations/${org.id}`}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 active:bg-white/[0.07] block"
              >
                {/* Icon */}
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/8 text-base font-black text-slate-300">
                  {org.name.slice(0, 1).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <p className="text-sm font-semibold text-white flex-1 leading-snug">{org.name}</p>
                    <span className={cn('inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold shrink-0', styleCls)}>
                      {STATUS_LABEL[status] ?? status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 truncate mt-0.5">{org.owner_email ?? '—'}</p>

                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {org.panel_online ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Panel en línea{org.panel_online_users && org.panel_online_users > 1 ? ` · ${org.panel_online_users}` : ''}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-600">
                        Panel fuera
                        {org.panel_last_seen_at ? ` · ${relTime(org.panel_last_seen_at)}` : ''}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-500">
                      🎫 {org.pending_tickets > 0
                        ? <span className="text-amber-400 font-semibold">{org.pending_tickets} pendientes</span>
                        : `${org.total_tickets} tickets`}
                    </span>
                    <span className="text-[11px] text-slate-500">👥 {org.active_users} usuarios</span>
                    {trialing && days !== null && (
                      <span className={cn('text-[11px] font-semibold', days <= 3 ? 'text-red-400' : 'text-sky-400')}>
                        ⏱ {days > 0 ? `${days}d de prueba` : 'Prueba vencida'}
                      </span>
                    )}
                    {org.last_ticket_date && (
                      <span className="text-[11px] text-slate-600">
                        Último: {relTime(org.last_ticket_date)}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 text-slate-700 shrink-0 mt-1" />
              </a>
            );
          })
        )}
      </div>
    </div>
  );
}
