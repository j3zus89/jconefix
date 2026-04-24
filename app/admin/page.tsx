'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Building2, Users, Ticket, AlertTriangle, ArrowRight, RefreshCw,
  LifeBuoy, MessageCircle, Clock, CheckCircle2, XCircle, Zap, Plus,
  TrendingUp, CalendarDays, Activity, Loader2, Server, Sparkles, Megaphone, ServerCrash,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { adminFetch } from '@/lib/auth/adminFetch';
import NewOrganizationModal from '@/app/admin/dashboard/components/NewOrganizationModal';

/* ── Types ──────────────────────────────────────────────────── */
type Kpi = {
  orgs_total: number; orgs_active: number; orgs_trial: number;
  orgs_suspended: number; users_total: number; tickets_total: number;
  tickets_7d: number; trials_expiring_7d: number; last_updated: string;
  orgs_registered_last_7d: { day: string; count: number }[];
  mrr_estimate_ars_monthly: number;
  mrr_active_paying_orgs: number;
  mrr_active_unlimited_orgs: number;
};

type SystemPulse = {
  groq: { configured: boolean; ok: boolean | null; ms: number | null; status: number | null; detail?: string };
  gemini: { configured: boolean; ok: boolean | null; ms: number | null; status: number | null; detail?: string };
  supabase: { ok: boolean; ms: number; detail?: string };
  polish_calls_today: number | null;
  last_updated: string;
};
type OrgRow = {
  id: string; name: string; slug: string; subscription_status: string;
  subscription_plan: string; trial_ends_at: string | null; owner_email: string | null;
  active_users: number; total_tickets: number; pending_tickets: number;
};
type SupportThread = {
  user_id: string; org_name: string | null; last_message: string;
  last_at: string; esperando_respuesta: boolean; message_count: number;
};
type Lead = {
  id: string; created_at: string; contact_name: string; shop_name: string;
  plan_label: string; contact_phone?: string; contact_email?: string;
};

/* ── Helpers ────────────────────────────────────────────────── */
function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

function statusPill(status: string) {
  const map: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    trial: 'bg-blue-100 text-blue-700',
    suspended: 'bg-red-100 text-red-700',
  };
  return (
    <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase', map[status] ?? 'bg-gray-100 text-gray-600')}>
      {status}
    </span>
  );
}

function daysUntil(iso: string | null) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

function formatArsMonthly(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function shortDayLabel(isoDay: string) {
  const [y, m, d] = isoDay.split('-').map(Number);
  if (!y || !m || !d) return isoDay;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

/* ── Stat pill ──────────────────────────────────────────────── */
function StatPill({ label, value, icon: Icon, color = 'default', href }:
  { label: string; value: string | number; icon: any; color?: 'default' | 'green' | 'blue' | 'amber' | 'red'; href?: string }) {
  const colors = {
    default: 'bg-white border-slate-200 text-slate-700',
    green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    red: 'bg-red-50 border-red-200 text-red-700',
  };
  const body = (
    <div className={cn('flex items-center gap-3 px-4 py-3 rounded-xl border transition-shadow hover:shadow-sm', colors[color])}>
      <Icon className="h-4 w-4 shrink-0 opacity-70" />
      <div>
        <p className="text-2xl font-bold leading-none tabular-nums">{value}</p>
        <p className="text-[11px] opacity-80 mt-0.5 font-medium uppercase tracking-wide">{label}</p>
      </div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

/* ── Main ───────────────────────────────────────────────────── */
export default function CommandCenter() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<Kpi | null>(null);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showNewOrg, setShowNewOrg] = useState(false);
  /** Usuarios con heartbeat reciente en el panel (cliente). */
  const [panelOnlineCount, setPanelOnlineCount] = useState<number | null>(null);
  const [pulse, setPulse] = useState<SystemPulse | null>(null);
  const [extendingTrialId, setExtendingTrialId] = useState<string | null>(null);
  const [trialExtendMsg, setTrialExtendMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [kpiRes, orgRes, supRes, leadsRes] = await Promise.all([
        adminFetch('/api/admin/kpis'),
        adminFetch('/api/admin/get-organizations'),
        adminFetch('/api/admin/support-chat'),
        adminFetch('/api/admin/commercial-signup-requests'),
      ]);
      const [kpiJson, orgJson, supJson, leadsJson] = await Promise.all([
        kpiRes.json(), orgRes.json(), supRes.json(), leadsRes.json(),
      ]);
      if (!kpiRes.ok) throw new Error(kpiJson.error || 'Error KPIs');
      if (!orgRes.ok) throw new Error(orgJson.error || 'Error organizaciones');
      if (!supRes.ok) throw new Error(supJson.error || 'Error soporte');
      if (!leadsRes.ok) throw new Error(leadsJson.error || 'Error leads');
      setKpis(kpiJson.data);
      setOrgs(orgJson.data || []);
      setThreads(supJson.threads || []);
      setLeads(leadsJson.data || []);
      try {
        const onRes = await adminFetch('/api/admin/panel-online-users');
        const onJson = await onRes.json();
        if (onRes.ok) setPanelOnlineCount((onJson.data?.users || []).length);
        else setPanelOnlineCount(null);
      } catch {
        setPanelOnlineCount(null);
      }
      try {
        const pulseRes = await adminFetch('/api/admin/system-pulse');
        const pulseJson = await pulseRes.json();
        setPulse(pulseRes.ok ? pulseJson.data : null);
      } catch {
        setPulse(null);
      }
    } catch (e: any) {
      setError(e?.message || 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  /* Derived */
  const pendingThreads = useMemo(() => threads.filter(t => t.esperando_respuesta), [threads]);
  const attentionOrgs = useMemo(() => {
    return orgs.filter(o => {
      if (o.subscription_status === 'suspended') return true;
      if (o.subscription_status === 'trial' && o.trial_ends_at) {
        const days = daysUntil(o.trial_ends_at);
        return days !== null && days <= 5;
      }
      return false;
    });
  }, [orgs]);

  const urgentCount = pendingThreads.length + attentionOrgs.length;

  const extendTrialByDays = async (orgId: string, days: number) => {
    setTrialExtendMsg(null);
    setExtendingTrialId(orgId);
    try {
      const res = await adminFetch('/api/admin/update-organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          action: 'update_trial',
          updates: { trial_extend_days: days },
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'No se pudo extender la prueba');
      await load();
      setTrialExtendMsg('Prueba extendida correctamente.');
    } catch (e: unknown) {
      setTrialExtendMsg(e instanceof Error ? e.message : 'Error al extender la prueba');
    } finally {
      setExtendingTrialId(null);
    }
  };

  const regSeries = kpis?.orgs_registered_last_7d ?? [];
  const regMax = Math.max(1, ...regSeries.map((d) => d.count));

  return (
    <div className="w-full min-w-0 max-w-none space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Inicio
            {urgentCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold align-middle">
                {urgentCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {kpis?.last_updated ? `Actualizado ${relativeTime(kpis.last_updated)}` : 'Cargando...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setTrialExtendMsg(null);
              load();
            }}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm text-slate-600 disabled:opacity-50">
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            Actualizar
          </button>
          <button onClick={() => setShowNewOrg(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F5C518] hover:bg-[#D4A915] text-white text-sm font-semibold">
            <Plus className="h-4 w-4" />
            Nueva organización
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {!loading && panelOnlineCount !== null && (
        <Link
          href="/admin/panel-online"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200/90 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950 shadow-sm transition-colors hover:bg-emerald-50"
        >
          <span className="inline-flex items-center gap-2 font-medium">
            <Activity className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              <strong className="tabular-nums">{panelOnlineCount}</strong>{' '}
              {panelOnlineCount === 1 ? 'usuario con el panel abierto' : 'usuarios con el panel abierto'} (últimos 3 min)
            </span>
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#F5C518]">
            Ver detalle <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      )}

      {/* Urgent banner */}
      {!loading && urgentCount > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-amber-800 font-medium flex-1">
            {[
              pendingThreads.length > 0 && `${pendingThreads.length} mensaje${pendingThreads.length > 1 ? 's' : ''} sin responder`,
              attentionOrgs.length > 0 && `${attentionOrgs.length} organización${attentionOrgs.length > 1 ? 'es' : ''} requieren atención`,
            ].filter(Boolean).join(' · ')}
          </span>
          {pendingThreads.length > 0 && (
            <Link href="/admin/support" className="text-[#F5C518] font-semibold hover:underline shrink-0 flex items-center gap-1">
              Responder <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        <StatPill label="Organizaciones" value={loading ? '—' : kpis?.orgs_total ?? 0} icon={Building2} href="/admin/organizations" />
        <StatPill label="Activas" value={loading ? '—' : kpis?.orgs_active ?? 0} icon={CheckCircle2} color="green" href="/admin/organizations?filter=active" />
        <StatPill label="En prueba" value={loading ? '—' : kpis?.orgs_trial ?? 0} icon={Clock} color="blue" href="/admin/organizations?filter=trial" />
        <StatPill label="Usuarios" value={loading ? '—' : kpis?.users_total ?? 0} icon={Users} href="/admin/users" />
        <StatPill
          label="MRR estimado"
          value={loading ? '—' : formatArsMonthly(kpis?.mrr_estimate_ars_monthly ?? 0)}
          icon={TrendingUp}
          color="green"
        />
      </div>

      {!loading && trialExtendMsg && (
        <div
          className={cn(
            'rounded-lg border px-3 py-2 text-sm',
            trialExtendMsg.includes('correctamente')
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          )}
        >
          {trialExtendMsg}
        </div>
      )}

      {/* Infra + altas */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <Server className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-800">Infra y APIs</span>
            {pulse?.last_updated && (
              <span className="text-[11px] text-slate-400 ml-auto">{relativeTime(pulse.last_updated)}</span>
            )}
          </div>
          {loading ? (
            <p className="text-sm text-slate-400">Cargando pulso…</p>
          ) : !pulse ? (
            <p className="text-sm text-slate-500">No se pudo cargar el pulso del sistema.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              <li className="flex flex-wrap items-center gap-2 justify-between">
                <span className="text-slate-600">Groq (pulir IA)</span>
                <span className="inline-flex items-center gap-2">
                  {!pulse.groq.configured ? (
                    <span className="text-amber-700 text-xs font-medium">Sin clave</span>
                  ) : pulse.groq.ok ? (
                    <span className="text-emerald-700 text-xs font-semibold">OK · {pulse.groq.ms} ms</span>
                  ) : (
                    <span className="text-red-600 text-xs font-medium" title={pulse.groq.detail}>
                      Error{pulse.groq.status ? ` ${pulse.groq.status}` : ''}
                    </span>
                  )}
                </span>
              </li>
              <li className="flex flex-wrap items-center gap-2 justify-between">
                <span className="text-slate-600">Gemini (presupuesto / soporte)</span>
                <span className="inline-flex items-center gap-2">
                  {!pulse.gemini.configured ? (
                    <span className="text-amber-700 text-xs font-medium">Sin clave</span>
                  ) : pulse.gemini.ok ? (
                    <span className="text-emerald-700 text-xs font-semibold">OK · {pulse.gemini.ms} ms</span>
                  ) : (
                    <span className="text-red-600 text-xs font-medium" title={pulse.gemini.detail}>
                      Error{pulse.gemini.status ? ` ${pulse.gemini.status}` : ''}
                    </span>
                  )}
                </span>
              </li>
              <li className="flex flex-wrap items-center gap-2 justify-between">
                <span className="text-slate-600">Supabase (DB)</span>
                {pulse.supabase.ok ? (
                  <span className="text-emerald-700 text-xs font-semibold">OK · {pulse.supabase.ms} ms</span>
                ) : (
                  <span className="text-red-600 text-xs" title={pulse.supabase.detail}>
                    Error
                  </span>
                )}
              </li>
              <li className="flex flex-wrap items-center gap-2 justify-between border-t border-slate-100 pt-2 mt-1">
                <span className="inline-flex items-center gap-1.5 text-slate-600">
                  <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                  Pulidos IA hoy (UTC)
                </span>
                <span className="tabular-nums font-semibold text-slate-800">
                  {pulse.polish_calls_today === null ? '—' : pulse.polish_calls_today}
                </span>
              </li>
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-800">Altas de organización (7 días, UTC)</span>
          </div>
          {loading ? (
            <p className="text-sm text-slate-400">Cargando…</p>
          ) : (
            <div className="flex items-end justify-between gap-1 min-h-[7.5rem] pt-2">
              {regSeries.map((b) => {
                const px = Math.round((b.count / regMax) * 72);
                const h = b.count > 0 ? Math.max(8, px) : 3;
                return (
                <div key={b.day} className="flex-1 flex flex-col items-center gap-1 min-w-0 h-[5.5rem] justify-end">
                  <div
                    className="w-full max-w-[36px] mx-auto rounded-t bg-[#F5C518]/80 hover:bg-[#D4A915] transition-colors"
                    style={{ height: h }}
                    title={`${b.count} el ${b.day}`}
                  />
                  <span className="text-[9px] text-slate-500 truncate w-full text-center leading-tight">
                    {shortDayLabel(b.day)}
                  </span>
                </div>
                );
              })}
            </div>
          )}
          {!loading && kpis && (
            <p className="text-xs text-slate-500 mt-2">
              MRR aproximado según lista pública en ARS ({kpis.mrr_active_paying_orgs} activas con cuota;{' '}
              {kpis.mrr_active_unlimited_orgs} activas ilimitadas sin sumar).
            </p>
          )}
        </div>
      </div>

      {/* Two columns: Support + Leads */}
      <div className="grid lg:grid-cols-2 gap-4">

        {/* Support pending */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <LifeBuoy className="h-4 w-4 text-[#F5C518]" />
              <span className="text-sm font-semibold text-slate-800">Soporte</span>
              {pendingThreads.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {pendingThreads.length}
                </span>
              )}
            </div>
            <Link href="/admin/support" className="text-xs text-[#F5C518] font-semibold hover:underline flex items-center gap-1">
              Ver todo <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">Cargando...</div>
          ) : pendingThreads.length === 0 && threads.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Sin mensajes. Todo al día.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {(pendingThreads.length > 0 ? pendingThreads : threads).slice(0, 4).map((t) => (
                <li key={t.user_id}>
                  <Link href="/admin/support"
                    className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className={cn('mt-0.5 h-2 w-2 rounded-full shrink-0 mt-2', t.esperando_respuesta ? 'bg-red-500' : 'bg-slate-300')} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {t.org_name || 'Sin org'}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{t.last_message}</p>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0">{relativeTime(t.last_at)}</span>
                  </Link>
                </li>
              ))}
              {threads.length === 0 && pendingThreads.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-slate-400">Sin mensajes recientes.</li>
              )}
            </ul>
          )}

          {!loading && pendingThreads.length === 0 && threads.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50">
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Sin mensajes pendientes — todo respondido.
              </p>
            </div>
          )}
        </div>

        {/* Leads */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#F5C518]" />
              <span className="text-sm font-semibold text-slate-800">Leads comerciales</span>
              {leads.length > 0 && (
                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {leads.length}
                </span>
              )}
            </div>
            <Link href="/admin/leads" className="text-xs text-[#F5C518] font-semibold hover:underline flex items-center gap-1">
              Ver todo <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">Cargando...</div>
          ) : leads.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <MessageCircle className="h-8 w-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Sin leads todavía.</p>
              <p className="text-xs text-slate-400 mt-1">Aparecerán cuando alguien rellene el formulario web.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {leads.slice(0, 4).map((lead) => (
                <li key={lead.id}>
                  <Link href="/admin/leads"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-[#F5C518]/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-[#F5C518]">
                        {(lead.contact_name || lead.shop_name || '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{lead.contact_name || lead.shop_name}</p>
                      <p className="text-xs text-slate-500">{lead.plan_label} · {lead.shop_name}</p>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0">{relativeTime(lead.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Attention orgs */}
      {!loading && attentionOrgs.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-amber-100 bg-amber-50">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-900">Organizaciones que requieren atención</span>
            </div>
            <Link href="/admin/organizations" className="text-xs text-[#F5C518] font-semibold hover:underline">Ver todas</Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {attentionOrgs.map((o) => {
              const days = daysUntil(o.trial_ends_at);
              return (
                <li key={o.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{o.name}</p>
                    <p className="text-xs text-slate-500">{o.owner_email}</p>
                  </div>
                  {statusPill(o.subscription_status)}
                  {o.subscription_status === 'trial' && days !== null && (
                    <span className={cn('text-xs font-semibold', days <= 2 ? 'text-red-600' : 'text-amber-600')}>
                      {days <= 0 ? 'Expirado' : `${days}d restantes`}
                    </span>
                  )}
                  {o.subscription_status === 'trial' && (
                    <button
                      type="button"
                      aria-label="Añadir 3 días a la prueba"
                      disabled={extendingTrialId === o.id}
                      onClick={() => extendTrialByDays(o.id, 3)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 shrink-0"
                    >
                      {extendingTrialId === o.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        '+3 d'
                      )}
                    </button>
                  )}
                  <Link href={`/admin/organizations/${o.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#F5C518] hover:underline shrink-0">
                    Gestionar <ArrowRight className="h-3 w-3" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Bottom grid: quick stats + recent tickets */}
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Ticket className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Tickets</span>
          </div>
          <p className="text-3xl font-bold text-slate-800 tabular-nums">{loading ? '—' : kpis?.tickets_total ?? 0}</p>
          <p className="text-xs text-slate-500 mt-1">Total · {loading ? '—' : kpis?.tickets_7d ?? 0} últimos 7 días</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Trials expiran</span>
          </div>
          <p className={cn('text-3xl font-bold tabular-nums', (kpis?.trials_expiring_7d ?? 0) > 0 ? 'text-amber-600' : 'text-slate-800')}>
            {loading ? '—' : kpis?.trials_expiring_7d ?? 0}
          </p>
          <p className="text-xs text-slate-500 mt-1">En los próximos 7 días</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Suspendidas</span>
          </div>
          <p className={cn('text-3xl font-bold tabular-nums', (kpis?.orgs_suspended ?? 0) > 0 ? 'text-red-600' : 'text-slate-800')}>
            {loading ? '—' : kpis?.orgs_suspended ?? 0}
          </p>
          <p className="text-xs text-slate-500 mt-1">Organizaciones suspendidas</p>
        </div>
      </div>

      {/* Quick nav cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { href: '/admin/organizations', label: 'Gestionar orgs', icon: Building2, desc: 'Planes, estados y licencias' },
          { href: '/admin/broadcast', label: 'Aviso global', icon: Megaphone, desc: 'Banner para todos los talleres' },
          { href: '/admin/system-logs', label: 'Logs IA', icon: ServerCrash, desc: 'Errores Groq y cuotas' },
          { href: '/admin/users', label: 'Usuarios', icon: Users, desc: 'Reset, ban y búsqueda' },
          { href: '/admin/audit', label: 'Auditoría', icon: Zap, desc: 'Historial de acciones' },
          { href: '/admin/analytics', label: 'Analytics', icon: TrendingUp, desc: 'Métricas del sistema' },
        ].map((a) => (
          <Link key={a.href} href={a.href}
            className="rounded-xl border border-slate-200 bg-white px-4 py-4 hover:shadow-sm hover:border-[#F5C518]/30 transition-all group">
            <a.icon className="h-5 w-5 text-slate-400 group-hover:text-[#F5C518] mb-2 transition-colors" />
            <p className="text-sm font-semibold text-slate-800">{a.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{a.desc}</p>
          </Link>
        ))}
      </div>

      <NewOrganizationModal
        isOpen={showNewOrg}
        onClose={() => setShowNewOrg(false)}
        onSuccess={async () => { setShowNewOrg(false); await load(); }}
      />
    </div>
  );
}
