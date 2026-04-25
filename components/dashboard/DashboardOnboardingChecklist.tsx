'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronRight, ListChecks, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getActiveOrganizationId } from '@/lib/dashboard-org';
import {
  customersOrgScopeOr,
  fetchActiveOrgMemberUserIds,
  repairTicketsOrgScopeOr,
} from '@/lib/repair-tickets-org-scope';
import {
  readDashboardOnboarding,
  patchDashboardOnboarding,
  isDashboardOnboardingChecklistHidden,
  markDashboardOnboardingChecklistHidden,
  migrateLegacyOnboardingDismissToGlobal,
  isDashboardOnboardingHomeDone,
  markDashboardOnboardingHomeDone,
} from '@/lib/dashboard-onboarding-storage';
import {
  isPanelPuestaEnMarchaDoneInMetadata,
  persistPanelPuestaEnMarchaDone,
} from '@/lib/dashboard-onboarding-remote';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { usePanelUiMode } from '@/components/dashboard/PanelUiModeContext';

type Counts = {
  customers: number;
  tickets: number;
  members: number;
};

export function DashboardOnboardingChecklist() {
  const { mode: panelMode, loading: panelModeLoading } = usePanelUiMode();
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [slice, setSlice] = useState({ dismissed: false, settingsVisited: false });
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  /** Ya persistimos «no mostrar de nuevo» (no depender solo del desmontaje: recarga/cierre de pestaña a veces no lo dispara). */
  const persistedNoRepeatRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setUserId(null);
        setCounts(null);
        return;
      }
      setUserId(user.id);
      const oid = await getActiveOrganizationId(supabase);
      setOrgId(oid);
      migrateLegacyOnboardingDismissToGlobal(user.id);
      const raw = readDashboardOnboarding(user.id, oid);
      const metaDone = isPanelPuestaEnMarchaDoneInMetadata(user);
      const localDone =
        isDashboardOnboardingChecklistHidden(user.id) ||
        raw.dismissed === true ||
        isDashboardOnboardingHomeDone(user.id);
      const hiddenForever = metaDone || localDone;
      if (localDone && !metaDone) {
        void persistPanelPuestaEnMarchaDone(supabase, user);
      }
      setSlice({
        dismissed: hiddenForever,
        settingsVisited: raw.settingsVisited === true,
      });

      if (oid) {
        const memberIds = await fetchActiveOrgMemberUserIds(supabase, oid);
        const ticketOr = repairTicketsOrgScopeOr(oid, memberIds);
        const customerOr = customersOrgScopeOr(oid, memberIds);

        const [cRes, tRes, mRes] = await Promise.all([
          (supabase as any).from('customers').select('id', { count: 'exact', head: true }).or(customerOr),
          (supabase as any).from('repair_tickets').select('id', { count: 'exact', head: true }).or(ticketOr),
          supabase
            .from('organization_members')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', oid)
            .eq('is_active', true),
        ]);

        setCounts({
          customers: typeof cRes.count === 'number' ? cRes.count : 0,
          tickets: typeof tRes.count === 'number' ? tRes.count : 0,
          members: typeof mRes.count === 'number' ? mRes.count : 0,
        });
      } else {
        const [cRes, tRes] = await Promise.all([
          (supabase as any)
            .from('customers')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
          (supabase as any)
            .from('repair_tickets')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
        ]);
        setCounts({
          customers: typeof cRes.count === 'number' ? cRes.count : 0,
          tickets: typeof tRes.count === 'number' ? tRes.count : 0,
          members: 1,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onFocus = () => void load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [load]);

  const steps = useMemo(() => {
    const c = counts ?? { customers: 0, tickets: 0, members: 0 };
    const base = [
      {
        id: 'settings',
        title: 'Revisá tu taller',
        hint: 'Nombre, moneda y datos básicos',
        href: '/dashboard/settings?tab=config_general',
        done: slice.settingsVisited,
      },
      {
        id: 'customer',
        title: 'Cargá un cliente',
        hint: 'Ficha mínima para asociar reparaciones',
        href: '/dashboard/customers/new',
        done: c.customers > 0,
      },
      {
        id: 'ticket',
        title: 'Creá un ticket',
        hint: 'Desde Tickets o Nuevo ingreso / recepción',
        href: '/dashboard/tickets/new',
        done: c.tickets > 0,
      },
    ];
    if (orgId) {
      base.push({
        id: 'team',
        title: 'Sumá a alguien al equipo',
        hint: 'Empleado o usuario con acceso al panel',
        href: '/dashboard/settings?tab=equipo',
        done: c.members > 1,
      });
    }
    return base;
  }, [counts, slice.settingsVisited, orgId]);

  const doneCount = steps.filter((s) => s.done).length;
  const total = steps.length;
  const allDone = total > 0 && doneCount === total;

  useEffect(() => {
    if (loading || !userId || !counts) return;
    if (slice.dismissed) return;
    if (persistedNoRepeatRef.current) return;

    persistedNoRepeatRef.current = true;
    markDashboardOnboardingHomeDone(userId);
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) await persistPanelPuestaEnMarchaDone(supabase, user);
    })();
  }, [loading, userId, counts, slice.dismissed, allDone, supabase]);

  const dismiss = () => {
    if (!userId) return;
    markDashboardOnboardingChecklistHidden(userId);
    patchDashboardOnboarding(userId, orgId, { dismissed: true });
    setSlice((s) => ({ ...s, dismissed: true }));
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) await persistPanelPuestaEnMarchaDone(supabase, user);
    })();
  };

  if (loading || !userId || !counts) return null;
  if (slice.dismissed) return null;
  if (allDone) return null;

  const pct = Math.round((doneCount / total) * 100);

  return (
    <Card className="border-teal-200/80 bg-gradient-to-br from-teal-50/90 to-white shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0d9488]/10 text-[#0d9488]">
              <ListChecks className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base font-semibold text-gray-900">
                Puesta en marcha
              </CardTitle>
              <p className="text-xs text-gray-600 mt-0.5">
                {doneCount} de {total} pasos
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-gray-500"
            onClick={dismiss}
            aria-label="Ocultar guía"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Progress value={pct} className="h-2 mt-3" />
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <ul className="space-y-1.5">
          {steps.map((step, idx) => {
            const cardShell = cn(
              'rounded-lg border text-left transition-colors',
              step.done
                ? 'border-teal-100 bg-teal-50/50 text-gray-700'
                : 'border-gray-200 bg-white hover:border-[#0d9488]/40 hover:bg-teal-50/30'
            );
            const badge = (
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  step.done ? 'bg-[#0d9488] text-white' : 'bg-gray-100 text-gray-500'
                )}
              >
                {step.done ? <Check className="h-4 w-4" /> : idx + 1}
              </span>
            );
            const showRecepcionLink =
              step.id === 'ticket' && panelMode === 'simple' && !panelModeLoading;

            if (showRecepcionLink) {
              return (
                <li key={step.id}>
                  <div className={cn(cardShell, 'px-3 py-2.5')}>
                    <div className="flex items-start gap-3">
                      {badge}
                      <div className="min-w-0 flex-1 space-y-1">
                        <Link href={step.href} className="block">
                          <span className="block text-sm font-medium text-gray-900">{step.title}</span>
                          <span className="block text-xs text-gray-500">{step.hint}</span>
                        </Link>
                        <Link
                          href="/dashboard/recepcion"
                          className="inline-block text-xs font-medium text-[#0d9488] hover:underline"
                        >
                          o Nuevo ingreso
                        </Link>
                      </div>
                      <Link
                        href={step.href}
                        className="mt-0.5 shrink-0 text-gray-400 hover:text-[#0d9488]"
                        aria-label="Ir a nuevo ticket"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </li>
              );
            }

            return (
              <li key={step.id}>
                <Link href={step.href} className={cn('flex items-center gap-3 px-3 py-2.5', cardShell)}>
                  {badge}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-gray-900">{step.title}</span>
                    <span className="block text-xs text-gray-500">{step.hint}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
          <Button type="button" variant="ghost" size="sm" className="text-xs h-8" onClick={() => void load()}>
            Actualizar progreso
          </Button>
          <Link
            href="/dashboard/guide-ar"
            className="text-xs font-medium text-[#0d9488] hover:underline"
          >
            Guía completa del panel
          </Link>
        </div>
        <p className="text-[11px] text-gray-500">
          Podés ocultarla con la X. Solo la primera vez; queda guardado en tu cuenta y no vuelve en el celu ni en la web
          (la guía sigue en <strong>Guía del panel</strong>).
        </p>
      </CardContent>
    </Card>
  );
}
