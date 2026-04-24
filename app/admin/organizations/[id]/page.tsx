'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Users,
  Ticket,
  Package,
  ScrollText,
  Wrench,
  Save,
  RefreshCw,
  KeyRound,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { adminFetch } from '@/lib/auth/adminFetch';
import {
  adminPlanSelectValue,
  formatOrgDateLong,
  formatOrgDateTimeShort,
  formatPlanPeriodLabel,
  licenseDefaultsForPlan,
  normalizeBillingCycle,
  PUBLIC_TRIAL_DAYS,
  trialRemainingHint,
  type BillingCycle,
  type PlanType,
} from '@/lib/org-plan';
import { extractMagicLinkActionUrl } from '@/lib/admin-magic-link';

type Org = {
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
  settings?: any;
  features?: any;
};

type Member = {
  source: 'member' | 'technician';
  id: string;
  user_id: string | null;
  name: string | null;
  email: string | null;
  role: string;
  is_active: boolean;
  avatar_url: string | null;
  color?: string;
  phone?: string;
  created_at: string;
};

/** Valor para input `datetime-local` en hora local del navegador. */
function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function TabButton({ active, onClick, children }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-2 text-sm font-medium rounded-lg transition-colors',
        active ? 'bg-[#0d9488]/10 text-[#0d9488]' : 'text-gray-600 hover:bg-gray-100'
      )}
    >
      {children}
    </button>
  );
}

export default function OrgDetailPage() {
  const params = useParams();
  const orgId = params?.id as string;
  const sp = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [org, setOrg] = useState<Org | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [tab, setTab] = useState<'overview' | 'license' | 'members' | 'audit' | 'support'>('overview');
  const [error, setError] = useState<string | null>(null);

  const [orgName, setOrgName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [notes, setNotes] = useState('');
  const [banner, setBanner] = useState('');
  const [plan, setPlan] = useState<PlanType>('profesional');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('mensual');
  const [renewLicenseFromToday, setRenewLicenseFromToday] = useState(true);
  const [applyPlanPreset, setApplyPlanPreset] = useState(true);
  const [status, setStatus] = useState<'active' | 'trial' | 'suspended'>('trial');
  const [maxUsers, setMaxUsers] = useState<number>(5);
  const [maxTickets, setMaxTickets] = useState<number | null>(100);
  const [licenseUnlimited, setLicenseUnlimited] = useState(false);
  const [trialExtendDaysInput, setTrialExtendDaysInput] = useState('');
  const [trialEndDatetimeLocal, setTrialEndDatetimeLocal] = useState('');
  const [syncTrialLicenseExpires, setSyncTrialLicenseExpires] = useState(true);
  const [savingTrial, setSavingTrial] = useState(false);
  const [memberToggleBusy, setMemberToggleBusy] = useState<string | null>(null);
  const [polishMonthLimitInput, setPolishMonthLimitInput] = useState('');
  const [savingPolishQuota, setSavingPolishQuota] = useState(false);

  const togglePanelMemberActive = async (memberRowId: string, next: boolean) => {
    setMemberToggleBusy(memberRowId);
    setError(null);
    try {
      const res = await adminFetch('/api/admin/organizations/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberRowId, is_active: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setMemberToggleBusy(null);
    }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [orgRes, memRes, auditRes] = await Promise.all([
        adminFetch(`/api/admin/organizations/get?id=${encodeURIComponent(orgId)}&t=${Date.now()}`),
        adminFetch(`/api/admin/organizations/members?id=${encodeURIComponent(orgId)}&t=${Date.now()}`),
        adminFetch(`/api/admin/audit/list?orgId=${encodeURIComponent(orgId)}&limit=25&t=${Date.now()}`),
      ]);

      const orgJson = await orgRes.json();
      const memJson = await memRes.json();
      const auditJson = await auditRes.json();

      if (!orgRes.ok) throw new Error(orgJson.error || 'Error org');
      if (!memRes.ok) throw new Error(memJson.error || 'Error members');
      if (!auditRes.ok) throw new Error(auditJson.error || 'Error audit');

      const o = orgJson.data as Org;
      setOrg(o);
      setMembers(memJson.data || []);
      setAudit(auditJson.data || []);

      setOrgName(o?.name || '');
      setNotes(o?.settings?.super_admin_notes || '');
      setBanner(o?.settings?.super_admin_banner || '');
      setPlan(adminPlanSelectValue(o.plan_type, o.subscription_plan));
      setBillingCycle(normalizeBillingCycle(o.billing_cycle));
      setStatus((o.subscription_status as any) || 'trial');
      const def = licenseDefaultsForPlan(adminPlanSelectValue(o.plan_type, o.subscription_plan));
      setMaxUsers(typeof o.max_users === 'number' ? o.max_users : def.max_users ?? 99999);
      setMaxTickets(o.max_tickets ?? null);
      setLicenseUnlimited(!!o.license_unlimited);
      setTrialEndDatetimeLocal(toDatetimeLocalValue(o.trial_ends_at));
      setTrialExtendDaysInput('');
      const lim = (o?.settings as Record<string, unknown> | null)?.polish_ai_monthly_limit;
      if (typeof lim === 'number' && lim > 0) setPolishMonthLimitInput(String(lim));
      else if (typeof lim === 'string' && /^\d+$/.test(lim.trim())) setPolishMonthLimitInput(lim.trim());
      else setPolishMonthLimitInput('');
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orgId) load();
  }, [orgId]);

  useEffect(() => {
    const t = sp.get('tab');
    if (t === 'license' || t === 'members' || t === 'audit' || t === 'support' || t === 'overview') {
      setTab(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const headline = useMemo(() => {
    if (!org) return '';
    return `${org.name} /${org.slug}`;
  }, [org]);

  const saveLicense = async () => {
    setSaving(true);
    try {
      const res = await adminFetch('/api/admin/update-organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          action: 'update_license',
          updates: {
            plan_type: plan,
            billing_cycle: billingCycle,
            subscription_status: status,
            max_users: maxUsers,
            max_tickets: maxTickets,
            apply_plan_defaults: applyPlanPreset,
            renew_license_from_today: renewLicenseFromToday,
            license_unlimited: licenseUnlimited,
            settings: {
              super_admin_notes: notes,
              super_admin_banner: banner,
            },
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error guardando');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const savePolishMonthlyQuota = async () => {
    setSavingPolishQuota(true);
    setError(null);
    try {
      const t = polishMonthLimitInput.trim();
      let v: number | null = null;
      if (t) {
        const n = parseInt(t, 10);
        if (!Number.isFinite(n) || n < 1) {
          throw new Error('Indicá un entero ≥ 1 o dejá vacío para quitar el tope mensual por taller.');
        }
        v = n;
      }
      const res = await adminFetch('/api/admin/update-organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          action: 'update_license',
          updates: {
            settings: { polish_ai_monthly_limit: v },
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSavingPolishQuota(false);
    }
  };

  const saveTrial = async () => {
    const hasLocal = trialEndDatetimeLocal.trim().length >= 16;
    const extend = parseInt(trialExtendDaysInput.trim(), 10);
    if (!hasLocal && (Number.isNaN(extend) || extend < 1)) {
      setError('Indica días a añadir a la prueba o una fecha y hora de fin.');
      return;
    }
    setSavingTrial(true);
    setError(null);
    try {
      const updates: Record<string, unknown> = {
        sync_trial_license_expires: syncTrialLicenseExpires,
      };
      if (hasLocal) {
        updates.trial_ends_at = new Date(trialEndDatetimeLocal).toISOString();
      } else {
        updates.trial_extend_days = extend;
      }
      const res = await adminFetch('/api/admin/update-organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, action: 'update_trial', updates }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error guardando prueba');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setSavingTrial(false);
    }
  };

  const saveOrgName = async () => {
    const trimmed = orgName.trim();
    if (!trimmed) return;
    setSavingName(true);
    setError(null);
    try {
      const res = await adminFetch('/api/admin/update-organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, action: 'update_org', updates: { name: trimmed } }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setSavingName(false);
    }
  };

  const generateOwnerLink = async () => {
    setSaving(true);
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
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          /* ignore */
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/admin/organizations" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2 truncate">
            {loading ? 'Cargando...' : headline}
          </h1>
          {org?.owner_email && (
            <p className="text-sm text-gray-500 mt-1">Owner: {org.owner_email}</p>
          )}
          {org && (
            <div className="mt-2 space-y-2 text-sm">
              <p className="text-[#0d9488] font-medium">
                {formatPlanPeriodLabel(org.plan_type, org.billing_cycle)}
              </p>
              {org.license_unlimited && (
                <p className="flex items-start gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-violet-900">
                  <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    <span className="font-semibold">Licencia interna ilimitada.</span> El acceso al taller no se corta por
                    fechas de prueba ni de licencia (solo si suspendes la organización).
                  </span>
                </p>
              )}
              <p className="text-gray-600">
                <span className="text-gray-500">Alta en panel: </span>
                <span className="font-medium text-gray-800">{formatOrgDateTimeShort(org.created_at)}</span>
              </p>
              {!org.license_unlimited && org.subscription_status === 'trial' && org.trial_ends_at && (
                <p className="text-gray-700">
                  <span className="text-gray-500">Prueba gratuita ({PUBLIC_TRIAL_DAYS} días) hasta: </span>
                  <span className="font-semibold">{formatOrgDateTimeShort(org.trial_ends_at)}</span>
                  <span className="block text-xs text-teal-700 font-medium mt-0.5">
                    {trialRemainingHint(org.trial_ends_at)}
                  </span>
                </p>
              )}
              {!org.license_unlimited &&
                org.subscription_status === 'trial' &&
                org.license_expires_at &&
                org.trial_ends_at &&
                new Date(org.license_expires_at).getTime() !== new Date(org.trial_ends_at).getTime() && (
                  <p className="text-amber-800 text-sm">
                    <span className="text-gray-600">Licencia (distinta del trial): </span>
                    {formatOrgDateTimeShort(org.license_expires_at)}
                  </p>
                )}
              {!org.license_unlimited &&
                org.subscription_status !== 'trial' &&
                org.effective_status !== 'trial' &&
                org.license_expires_at && (
                  <p className="text-gray-600">
                    <span className="text-gray-500">Licencia / periodo hasta: </span>
                    {formatOrgDateLong(org.license_expires_at)}
                  </p>
                )}
            </div>
          )}
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm"
          disabled={loading}
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-wrap gap-2">
        <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>
          <Building2 className="h-4 w-4 inline mr-2" />
          Overview
        </TabButton>
        <TabButton active={tab === 'license'} onClick={() => setTab('license')}>
          <Wrench className="h-4 w-4 inline mr-2" />
          Licencia
        </TabButton>
        <TabButton active={tab === 'members'} onClick={() => setTab('members')}>
          <Users className="h-4 w-4 inline mr-2" />
          Members
        </TabButton>
        <TabButton active={tab === 'audit'} onClick={() => setTab('audit')}>
          <ScrollText className="h-4 w-4 inline mr-2" />
          Auditoría
        </TabButton>
        <TabButton active={tab === 'support'} onClick={() => setTab('support')}>
          <KeyRound className="h-4 w-4 inline mr-2" />
          Soporte
        </TabButton>
      </div>

      {tab === 'overview' && org && (
        <div className="space-y-4">
          {/* Nombre de la organización — editable */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
            <div className="text-xs font-semibold text-amber-800 mb-2 uppercase tracking-wide">Nombre visible en el panel del cliente</div>
            <div className="flex items-center gap-2">
              <input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Nombre de la empresa…"
                className="flex-1 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-300"
              />
              <button
                type="button"
                onClick={saveOrgName}
                disabled={savingName || !orgName.trim() || orgName.trim() === org.name}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {savingName ? 'Guardando…' : 'Guardar nombre'}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-amber-700">
              Este nombre aparece en el menú superior del panel (actualmente: <strong>{org.name}</strong>). Si dice "Mi Taller", cámbialo aquí.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="text-xs text-gray-500">Usuarios activos</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">{org.active_users}</div>
              <div className="text-xs text-gray-400 mt-1">Límite: {org.max_users}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="text-xs text-gray-500">Tickets</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">{org.total_tickets}</div>
              <div className="text-xs text-gray-400 mt-1">{org.pending_tickets} pendientes</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="text-xs text-gray-500">Clientes</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">{org.total_customers}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="text-xs text-gray-500">Inventario</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">{org.total_inventory_items}</div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-900">Actividad reciente</div>
                <div className="text-xs text-gray-500 mt-1">
                  Último ticket:{' '}
                  {org.last_ticket_date ? new Date(org.last_ticket_date).toLocaleString('es-ES') : '—'}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1"><Ticket className="h-3.5 w-3.5" /> {org.completed_tickets} completados</span>
                <span className="inline-flex items-center gap-1"><Package className="h-3.5 w-3.5" /> {org.total_inventory_items} items</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'license' && org && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <div className="rounded-xl border border-violet-200/80 bg-gradient-to-br from-violet-50/90 to-white p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={licenseUnlimited}
                    onChange={(e) => setLicenseUnlimited(e.target.checked)}
                    className="mt-1 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                  />
                  <span>
                    <span className="font-semibold text-gray-900">Licencia interna sin caducidad (fundadores / socios)</span>
                    <span className="block text-xs text-gray-600 mt-1 leading-relaxed">
                      Activa esto para tu organización JC ONE FIX y la de Erico (u otras cuentas internas): no aplican
                      bloqueos por <code className="text-[11px] bg-white/80 px-1 rounded">trial_ends_at</code> ni{' '}
                      <code className="text-[11px] bg-white/80 px-1 rounded">license_expires_at</code> en el acceso al
                      dashboard. Sigue aplicándose <strong>suspendido</strong> o <strong>cancelado</strong>.
                    </span>
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setLicenseUnlimited(true);
                    setStatus('active');
                    setPlan('profesional');
                    setBillingCycle('mensual');
                    setApplyPlanPreset(true);
                    setRenewLicenseFromToday(false);
                    setMaxTickets(null);
                    setMaxUsers(999999);
                  }}
                  className="text-xs font-semibold text-violet-700 hover:text-violet-900 underline-offset-2 hover:underline"
                >
                  Rellenar preset: JC ONE FIX activo, sin tocar fechas de licencia (revisa y pulsa Guardar licencia)
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-sky-200/80 bg-sky-50/50 p-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wide text-sky-900">Pulir con IA (Groq) — cuota por mes</div>
            <p className="text-[11px] text-sky-900/85 leading-relaxed">
              Contador mensual <strong className="font-semibold">UTC</strong> por taller (suma de todos los miembros
              activos). Vacío = solo aplican los límites globales por usuario. Ideal para planes con IA limitada vs.
              ilimitada.
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[8rem]">
                <label className="text-[10px] font-semibold text-sky-900">Máx. pulidos / mes (org)</label>
                <input
                  type="number"
                  min={1}
                  max={999999}
                  placeholder="Sin tope por org"
                  value={polishMonthLimitInput}
                  onChange={(e) => setPolishMonthLimitInput(e.target.value.replace(/[^\d]/g, ''))}
                  className="mt-1 w-full rounded-lg border border-sky-200 bg-white px-2 py-1.5 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => void savePolishMonthlyQuota()}
                disabled={savingPolishQuota}
                className="rounded-lg bg-sky-700 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-50"
              >
                {savingPolishQuota ? 'Guardando…' : 'Guardar cuota'}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200/90 bg-gray-50/30 p-4 shadow-sm">
            <div className="flex items-start gap-3 border-b border-gray-200/80 pb-3 mb-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0d9488]/15 text-[#0f766e]">
                <Wrench className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Licencia comercial</h3>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Plan facturado, caducidad de licencia pagada, límites de uso y estado (activo / prueba / suspendido).
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600">Plan comercial</label>
              <select
                value={plan}
                onChange={(e) => {
                  const p = e.target.value as PlanType;
                  setPlan(p);
                  if (applyPlanPreset) {
                    const d = licenseDefaultsForPlan(p);
                    setMaxUsers(d.max_users ?? 99999);
                  }
                }}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="profesional">JC ONE FIX (49€/mes o 490€/año) — ilimitado</option>
                <option value="basico">Histórico con límites (solo migración)</option>
              </select>
              <label className="mt-2 flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyPlanPreset}
                  onChange={(e) => setApplyPlanPreset(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Al guardar, aplicar límites y funciones estándar de este plan (max. usuarios, informes, SMS)
              </label>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">Periodo de facturación</label>
              <select
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="mensual">Mensual (+30 días de licencia desde hoy si renuevas)</option>
                <option value="anual">Anual (+365 días de licencia desde hoy si renuevas)</option>
              </select>
              <label className="mt-2 flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={renewLicenseFromToday}
                  onChange={(e) => setRenewLicenseFromToday(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Recalcular fecha de caducidad de la licencia desde hoy según el periodo
              </label>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">Estado</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="active">Activo</option>
                <option value="trial">Prueba</option>
                <option value="suspended">Suspendido</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">Máx. usuarios</label>
              <input
                type="number"
                value={maxUsers}
                onChange={(e) => setMaxUsers(parseInt(e.target.value || '0', 10))}
                disabled={applyPlanPreset}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
              />
              {applyPlanPreset && (
                <p className="text-[11px] text-gray-500 mt-1">Controlado por el plan; desmarca la casilla para personalizar.</p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">Máx. tickets/mes</label>
              <input
                type="number"
                value={maxTickets ?? ''}
                onChange={(e) => setMaxTickets(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                placeholder="null = ilimitado"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-600">Notas internas (SUPER_ADMIN)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-600">Banner (se mostrará en el tenant)</label>
              <input
                value={banner}
                onChange={(e) => setBanner(e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="Ej: Mantenimiento hoy 02:00-03:00"
              />
            </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-4 pt-2 border-t border-gray-200/80">
              <button
                type="button"
                onClick={saveLicense}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0d9488] hover:bg-[#0f766e] text-white text-sm font-medium disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Guardando…' : 'Guardar licencia'}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-sky-200/90 bg-gradient-to-br from-sky-50/80 to-white p-4 shadow-sm">
            <div className="flex items-start gap-3 border-b border-sky-200/60 pb-3 mb-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Período de prueba gratuita</h3>
                <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                  El alta pública usa <strong>{PUBLIC_TRIAL_DAYS} días</strong> por defecto. Aquí puedes{' '}
                  <strong>dar más días</strong> a un cliente concreto o <strong>fijar la fecha/hora de fin</strong> sin
                  cambiar la regla global del sitio.
                </p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <p className="text-xs text-gray-700 bg-white/80 rounded-lg border border-sky-100 px-3 py-2">
                <span className="text-gray-500">Fin de prueba actual: </span>
                <span className="font-semibold text-gray-900">
                  {org.trial_ends_at ? formatOrgDateTimeShort(org.trial_ends_at) : '—'}
                </span>
                {org.trial_ends_at && (
                  <span className="block mt-1 text-sky-800 font-medium">{trialRemainingHint(org.trial_ends_at)}</span>
                )}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600">Añadir días a la prueba</label>
                  <input
                    type="number"
                    min={1}
                    max={730}
                    value={trialExtendDaysInput}
                    onChange={(e) => setTrialExtendDaysInput(e.target.value)}
                    placeholder="Ej: 7"
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Se suman desde el momento <strong>más tardío</strong> entre ahora y el fin de prueba actual (así no
                    acortas una prueba vigente).
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">O fijar fin exacto (fecha y hora local)</label>
                  <input
                    type="datetime-local"
                    value={trialEndDatetimeLocal}
                    onChange={(e) => setTrialEndDatetimeLocal(e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Si rellenas este campo, <strong>tiene prioridad</strong> sobre “Añadir días” al guardar.
                  </p>
                </div>
              </div>
              <label className="flex items-start gap-2 text-xs text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncTrialLicenseExpires}
                  onChange={(e) => setSyncTrialLicenseExpires(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-sky-600"
                />
                <span>
                  Actualizar también <code className="text-[10px] bg-white px-1 rounded border">license_expires_at</code>{' '}
                  para que coincida con el fin de prueba (recomendado en cuentas en prueba).
                </span>
              </label>
              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200/80 rounded-lg px-3 py-2">
                Para que el middleware aplique el plazo de prueba, el <strong>estado</strong> debe ser{' '}
                <strong>Prueba</strong> (cámbialo en “Licencia comercial” y guarda licencia, o desde el listado de
                organizaciones).
              </p>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={saveTrial}
                  disabled={savingTrial}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium disabled:opacity-60"
                >
                  <Clock className="h-4 w-4" />
                  {savingTrial ? 'Guardando…' : 'Guardar período de prueba'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'members' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Empleados de esta organización</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Incluye miembros del panel y técnicos/recepcionistas registrados.
              </p>
            </div>
            <span className="text-xs text-gray-400">{members.length} personas</span>
          </div>
          {members.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
              <Users className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No hay empleados registrados en esta organización.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {members.map((m) => {
                const initials = m.name
                  ? m.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                  : (m.email?.[0] || '?').toUpperCase();
                const roleLabel: Record<string, string> = {
                  owner: 'Propietario', admin: 'Administrador',
                  technician: 'Técnico', receptionist: 'Recepcionista',
                  member: 'Miembro',
                };
                const sourceBadge = m.source === 'technician'
                  ? { label: 'Técnico registrado', cls: 'bg-amber-100 text-amber-800 border-amber-200' }
                  : { label: 'Panel access', cls: 'bg-blue-100 text-blue-800 border-blue-200' };
                return (
                  <div key={m.id} className={cn('flex items-start gap-3 rounded-xl border bg-white p-4', !m.is_active && 'opacity-60')}>
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt={m.name || ''} className="h-10 w-10 rounded-full object-cover ring-2 ring-gray-100 shrink-0" />
                    ) : (
                      <div
                        className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ring-2 ring-gray-100"
                        style={{ backgroundColor: m.color || '#0d9488' }}
                      >
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {m.name || m.email || m.user_id?.slice(0, 12) || '—'}
                          </p>
                          {m.email && m.name && (
                            <p className="text-xs text-gray-500 truncate">{m.email}</p>
                          )}
                          {(m as any).phone && (
                            <p className="text-xs text-gray-400">{(m as any).phone}</p>
                          )}
                        </div>
                        <span className={cn('shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded border', sourceBadge.cls)}>
                          {sourceBadge.label}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                          {roleLabel[m.role] || m.role}
                        </span>
                        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                          m.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500')}>
                          {m.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          Alta: {new Date(m.created_at).toLocaleDateString('es-ES')}
                        </span>
                        {m.source === 'member' && m.role !== 'owner' && (
                          <button
                            type="button"
                            disabled={memberToggleBusy === m.id}
                            onClick={() => void togglePanelMemberActive(m.id, !m.is_active)}
                            className="text-[10px] font-semibold px-2 py-1 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50"
                          >
                            {memberToggleBusy === m.id
                              ? '…'
                              : m.is_active
                                ? 'Desactivar acceso al panel'
                                : 'Activar acceso al panel'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'audit' && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acción</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {audit.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-gray-500">
                    Sin eventos
                  </td>
                </tr>
              ) : (
                audit.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(a.created_at).toLocaleString('es-ES')}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{a.action}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <pre className="whitespace-pre-wrap break-words">{a.details ? JSON.stringify(a.details, null, 2) : '—'}</pre>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'support' && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          <div className="text-sm font-semibold text-gray-900">Herramientas de soporte</div>
          <div className="text-sm text-gray-500">
            Enlace mágico de Supabase para el dueño: abre el panel en una pestaña nueva y también se copia al portapapeles.
          </div>
          <button
            onClick={generateOwnerLink}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium disabled:opacity-60"
          >
            <KeyRound className="h-4 w-4 text-gray-500" />
            Suplantar dueño (pestaña + portapapeles)
          </button>
        </div>
      )}
    </div>
  );
}

