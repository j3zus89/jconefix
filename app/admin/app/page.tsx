'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users, Building2, LifeBuoy, TrendingUp, Clock, RefreshCw,
  ChevronRight, Zap, ScrollText, BarChart3,
  BookOpen, KeyRound, Inbox, Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { adminFetch } from '@/lib/auth/adminFetch';

type Kpi = {
  orgs_total: number; orgs_active: number; orgs_trial: number;
  orgs_suspended: number; users_total: number; tickets_total: number;
  tickets_7d: number; trials_expiring_7d: number; last_updated: string;
};
type Thread = { user_id: string; org_name: string | null; last_message: string; last_at: string; esperando_respuesta: boolean };

function relTime(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 13) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function MobileAdminHome() {
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const [snapRes, supRes] = await Promise.all([
        adminFetch('/api/admin/analytics/snapshot'),
        adminFetch('/api/admin/support-chat'),
      ]);
      const [snap, sup] = await Promise.all([snapRes.json(), supRes.json()]);
      if (snap.data) setKpi(snap.data);
      if (sup.threads) setThreads(sup.threads.slice(0, 5));
    } catch { /* ignorar */ }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { void load(); }, []);

  const pending = threads.filter((t) => t.esperando_respuesta);

  return (
    <div className="px-4 py-5 space-y-6">

      {/* Saludo */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#0d9488]">{greeting()}, Jesús</p>
          <h1 className="text-xl font-bold text-white mt-0.5">Panel Admin</h1>
        </div>
        <button
          onClick={() => void load(true)}
          className="rounded-xl border border-white/15 bg-white/5 p-2.5 active:bg-white/10"
        >
          <RefreshCw className={cn('h-4 w-4 text-slate-400', refreshing && 'animate-spin')} />
        </button>
      </div>

      {/* Alertas de soporte */}
      {pending.length > 0 && (
        <Link
          href="/admin/app/soporte"
          className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3.5"
        >
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/20">
            <LifeBuoy className="h-5 w-5 text-red-400" />
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-black text-white">
              {pending.length}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-300">Clientes esperando respuesta</p>
            <p className="text-xs text-red-400/80 truncate mt-0.5">
              {pending[0]?.org_name || 'Cliente'}: {pending[0]?.last_message?.slice(0, 50)}…
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-red-400/60" />
        </Link>
      )}

      {/* KPI Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <KpiCard
            icon={<Building2 className="h-5 w-5" />}
            label="Organizaciones"
            value={kpi?.orgs_total ?? 0}
            sub={`${kpi?.orgs_active ?? 0} activas · ${kpi?.orgs_trial ?? 0} en prueba`}
            color="teal"
            href="/admin/app/orgs"
          />
          <KpiCard
            icon={<Users className="h-5 w-5" />}
            label="Usuarios"
            value={kpi?.users_total ?? 0}
            sub="Total registrados"
            color="blue"
            href="/admin/app/usuarios"
          />
          <KpiCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Tickets (7 días)"
            value={kpi?.tickets_7d ?? 0}
            sub={`${kpi?.tickets_total ?? 0} total`}
            color="lime"
          />
          <KpiCard
            icon={<Clock className="h-5 w-5" />}
            label="Pruebas vencen"
            value={kpi?.trials_expiring_7d ?? 0}
            sub="en los próximos 7 días"
            color={kpi?.trials_expiring_7d && kpi.trials_expiring_7d > 0 ? 'amber' : 'slate'}
          />
        </div>
      )}

      {/* Acciones rápidas */}
      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Acciones rápidas</p>
        <div className="space-y-2">
          <QuickAction href="/admin/app/soporte"   icon={<LifeBuoy className="h-5 w-5 text-[#0d9488]" />}  label="Ver soporte técnico"   badge={pending.length} />
          <QuickAction href="/admin/app/usuarios"  icon={<Users className="h-5 w-5 text-blue-400" />}       label="Gestionar usuarios"  />
          <QuickAction href="/admin/app/orgs"      icon={<Building2 className="h-5 w-5 text-violet-400" />} label="Ver organizaciones"  />
          <QuickAction href="/admin"               icon={<Zap className="h-5 w-5 text-amber-400" />}        label="Abrir panel escritorio" external />
        </div>
      </div>

      {/* Resto del panel (vista escritorio optimizada; scroll horizontal en sidebar si hace falta) */}
      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Más menú (panel completo)
        </p>
        <div className="space-y-2">
          <QuickAction href="/admin/leads"      icon={<Inbox className="h-5 w-5 text-sky-400" />}       label="Leads comerciales" />
          <QuickAction href="/admin/wiki"       icon={<BookOpen className="h-5 w-5 text-emerald-400" />} label="Wiki del bot" />
          <QuickAction href="/admin/analytics"  icon={<BarChart3 className="h-5 w-5 text-violet-400" />} label="Analytics" />
          <QuickAction href="/admin/audit"      icon={<ScrollText className="h-5 w-5 text-amber-400" />} label="Auditoría" />
          <QuickAction href="/admin/security"   icon={<KeyRound className="h-5 w-5 text-rose-400" />} label="Seguridad" />
          <QuickAction href="/admin/plans"      icon={<Layers className="h-5 w-5 text-teal-400" />}    label="Planes / licencias" />
        </div>
      </div>

      {/* Última actividad de soporte */}
      {threads.length > 0 && (
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Soporte reciente</p>
          <div className="space-y-2">
            {threads.map((t) => (
              <Link
                key={t.user_id}
                href="/admin/app/soporte"
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 active:bg-white/[0.06]"
              >
                <div className={cn(
                  'mt-0.5 h-2 w-2 shrink-0 rounded-full',
                  t.esperando_respuesta ? 'bg-red-500 animate-pulse' : 'bg-slate-600'
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {t.org_name || 'Cliente'}
                  </p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{t.last_message}</p>
                </div>
                <span className="text-[10px] text-slate-600 shrink-0 mt-0.5">{relTime(t.last_at)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────── */
type ColorKey = 'teal' | 'blue' | 'lime' | 'amber' | 'slate';
const COLOR: Record<ColorKey, { bg: string; text: string; icon: string }> = {
  teal:  { bg: 'bg-[#0d9488]/15', text: 'text-[#0d9488]', icon: 'text-[#0d9488]' },
  blue:  { bg: 'bg-blue-500/15',  text: 'text-blue-300',  icon: 'text-blue-400'  },
  lime:  { bg: 'bg-[#a3e635]/15', text: 'text-[#a3e635]', icon: 'text-[#a3e635]' },
  amber: { bg: 'bg-amber-500/15', text: 'text-amber-300', icon: 'text-amber-400' },
  slate: { bg: 'bg-white/5',      text: 'text-slate-300', icon: 'text-slate-400' },
};

function KpiCard({
  icon, label, value, sub, color, href,
}: { icon: React.ReactNode; label: string; value: number; sub: string; color: ColorKey; href?: string }) {
  const c = COLOR[color];
  const content = (
    <div className={cn('rounded-2xl border border-white/10 p-4', c.bg)}>
      <div className={cn('mb-2 inline-flex', c.icon)}>{icon}</div>
      <p className={cn('text-2xl font-black tabular-nums', c.text)}>{value.toLocaleString('es-ES')}</p>
      <p className="text-[11px] font-semibold text-white mt-0.5">{label}</p>
      <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{sub}</p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function QuickAction({
  href, icon, label, badge, external,
}: { href: string; icon: React.ReactNode; label: string; badge?: number; external?: boolean }) {
  const Inner = (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 active:bg-white/[0.07]">
      <div className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl bg-white/5">
        {icon}
      </div>
      <span className="flex-1 text-sm font-medium text-slate-200">{label}</span>
      {badge && badge > 0 ? (
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-black text-white">
          {badge}
        </span>
      ) : (
        <ChevronRight className="h-4 w-4 text-slate-600" />
      )}
    </div>
  );
  if (external) return <a href={href} target="_blank" rel="noopener noreferrer">{Inner}</a>;
  return <Link href={href}>{Inner}</Link>;
}
