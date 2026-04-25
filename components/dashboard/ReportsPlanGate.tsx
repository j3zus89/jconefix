'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { BarChart3, Sparkles } from 'lucide-react';
import { effectiveEntitlements } from '@/lib/org-plan';
import { getActiveOrganizationId } from '@/lib/dashboard-org';

export function ReportsPlanGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(true);

  useEffect(() => {
    const run = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setAllowed(false);
        setReady(true);
        return;
      }

      const orgId = await getActiveOrganizationId(supabase);
      if (!orgId) {
        setAllowed(true);
        setReady(true);
        return;
      }

      const { data: row } = await supabase
        .from('organization_members')
        .select('organizations(plan_type, subscription_plan, max_users, features)')
        .eq('user_id', user.id)
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .maybeSingle();

      const org = row?.organizations as
        | {
            plan_type: string | null;
            subscription_plan: string;
            max_users: number | null;
            features: Record<string, unknown>;
          }
        | null
        | undefined;

      if (!org) {
        setAllowed(true);
        setReady(true);
        return;
      }

      const ent = effectiveEntitlements({
        plan_type: org.plan_type,
        subscription_plan: org.subscription_plan,
        max_users: org.max_users,
        features: org.features,
      });
      setAllowed(ent.advancedReports);
      setReady(true);
    };
    run();
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-6">
        <div className="max-w-lg rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c1520] to-[#050a12] p-8 text-center shadow-2xl shadow-black/40">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#a3e635]/15 ring-1 ring-[#a3e635]/30">
            <BarChart3 className="h-7 w-7 text-[#a3e635]" aria-hidden />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a3e635]/90">Informes</p>
          <h1 className="mt-2 font-serif text-2xl font-bold text-white">Informes avanzados</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Los informes de ingresos, reparaciones y técnicos van con el plan completo{' '}
            <span className="font-semibold text-slate-200">JC ONE FIX</span>. Tu cuenta tiene restricciones antiguas: pide al
            administrador del sistema que actualice tu organización al plan actual.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/dashboard/settings?tab=facturacion_cuenta"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:bg-primary/90"
            >
              <Sparkles className="h-4 w-4" />
              Facturación y cuenta
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-2.5 text-sm font-medium text-white/90 hover:bg-white/5"
            >
              Volver al inicio
            </Link>
          </div>
          <p className="mt-6 text-xs text-slate-600">
            El administrador de tu cuenta puede solicitar el cambio; si eres el dueño, escribe a soporte o actualiza desde
            facturación.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
