'use client';

import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  CreditCard,
  ShieldCheck,
  Zap,
  Star,
  Lock,
  ArrowRight,
  Sparkles,
  LogIn,
} from 'lucide-react';
import { JcOneFixAppIcon, JcOneFixMark } from '@/components/jc-one-fix-mark';
import { JC_PLAN_AR } from '@/lib/plan-marketing';
import { PUBLIC_TRIAL_DAYS } from '@/lib/org-plan';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

type Cycle = 'mensual' | 'anual';

function priceLabel(cycle: Cycle) {
  return cycle === 'anual'
    ? `$ ${JC_PLAN_AR.priceYear.toLocaleString('es-AR')} ARS / año`
    : `$ ${JC_PLAN_AR.priceMonth.toLocaleString('es-AR')} ARS / mes`;
}

function TrustBadge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-1.5 text-slate-500">
      <span className="text-slate-600">{icon}</span>
      <span className="text-[11px]">{text}</span>
    </div>
  );
}

function ArCheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [cycle, setCycle] = useState<Cycle>('mensual');
  const [pricingMode, setPricingMode] = useState<'trial_only' | 'commercial' | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [payBusy, setPayBusy] = useState(false);
  const renewEarly = searchParams.get('renew') === '1';
  const autoPayStartedRef = useRef(false);

  useLayoutEffect(() => {
    const c = searchParams.get('cycle');
    if (c === 'anual') setCycle('anual');
  }, [searchParams]);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session);
      setSessionReady(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setLoggedIn(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const cycleParam = searchParams.get('cycle') === 'anual' ? 'anual' : 'mensual';
    const renew = searchParams.get('renew') === '1';
    const ac = new AbortController();
    const timeoutId = window.setTimeout(() => ac.abort(), 12_000);

    void (async () => {
      try {
        const pricingUrl = renew ? '/api/public/checkout-pricing-mode?renew=1' : '/api/public/checkout-pricing-mode';
        const res = await fetch(pricingUrl, {
          cache: 'no-store',
          signal: ac.signal,
        });
        const j = (await res.json()) as { mode?: string; billingCountry?: string; error?: string };
        if (cancelled) return;

        if (!res.ok) {
          setPricingMode('trial_only');
          return;
        }

        if (j.billingCountry && j.billingCountry !== 'AR') {
          router.replace(`/checkout/plan?cycle=${cycleParam}`);
          return;
        }

        setPricingMode(j.mode === 'commercial' ? 'commercial' : 'trial_only');
      } catch {
        if (!cancelled) setPricingMode('trial_only');
      } finally {
        window.clearTimeout(timeoutId);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      ac.abort();
    };
  }, [router, searchParams]);

  const trialOnly = pricingMode === 'trial_only';
  const price = priceLabel(cycle);

  const monthlyEquiv =
    cycle === 'anual'
      ? `≈ $ ${Math.round(JC_PLAN_AR.priceYear / 12).toLocaleString('es-AR')} / mes`
      : null;

  const savingsPct =
    !trialOnly && JC_PLAN_AR.priceMonth && JC_PLAN_AR.priceYear
      ? Math.round(100 - (JC_PLAN_AR.priceYear / (JC_PLAN_AR.priceMonth * 12)) * 100)
      : null;

  const startMercadoPago = useCallback(async () => {
    setPayBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }
      const res = await fetch('/api/checkout/mercadopago-preference', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ cycle }),
      });
      const json = (await res.json()) as { init_point?: string; error?: string };
      if (!res.ok) throw new Error(json.error || 'No se pudo iniciar el pago');
      if (!json.init_point) throw new Error('Respuesta inválida');
      window.location.href = json.init_point;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setPayBusy(false);
    }
  }, [cycle]);

  useEffect(() => {
    if (!renewEarly || !sessionReady || pricingMode !== 'commercial' || !loggedIn || payBusy) return;
    if (autoPayStartedRef.current) return;
    autoPayStartedRef.current = true;
    void startMercadoPago();
  }, [renewEarly, sessionReady, pricingMode, loggedIn, payBusy, startMercadoPago]);

  if (pricingMode === null || !sessionReady) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-x-clip bg-[#050a12]">
        <Loader2 className="h-8 w-8 animate-spin text-[#a3e635]" />
      </div>
    );
  }

  const checkoutReturnPath = `/checkout/ar?cycle=${cycle}${renewEarly ? '&renew=1' : ''}`;
  const loginHref = `/login?redirect=${encodeURIComponent(checkoutReturnPath)}`;

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#050a12] text-white">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-60 -right-60 h-[600px] w-[600px] rounded-full bg-[#124c48] opacity-40 blur-[130px]" />
        <div className="absolute top-1/2 -left-40 h-[400px] w-[400px] rounded-full bg-[#a3e635]/5 blur-[100px]" />
        <div className="absolute bottom-0 right-1/3 h-80 w-80 rounded-full bg-[#124c48]/60 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(163,230,53,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(163,230,53,0.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <header className="relative z-10 border-b border-white/[0.06] bg-[#050a12]/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/#pricing"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#a3e635] transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Planes
          </Link>
          <div className="flex items-center gap-2.5">
            <JcOneFixAppIcon className="h-8 w-8 rounded-full shadow-lg shadow-[#a3e635]/10" />
            <JcOneFixMark className="text-sm font-bold tracking-tight" />
          </div>
          <Link
            href="/login"
            className="text-sm text-slate-500 hover:text-white transition-colors flex items-center gap-1.5"
          >
            Ingresar
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-lg px-4 py-12 sm:px-6">
        <div className="text-center space-y-3 mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#a3e635]/20 bg-[#a3e635]/[0.07] px-3.5 py-1.5">
            <span className="text-base">🇦🇷</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#a3e635]">Argentina</span>
            <span className="h-3.5 w-px bg-[#a3e635]/30" />
            <Sparkles className="h-3 w-3 text-[#a3e635]" />
            <span className="text-[11px] font-semibold text-[#a3e635]/80">Mercado Pago</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-[1.1]">
            Activá tu plan{' '}
            <span className="text-[#a3e635]">
              <JcOneFixMark className="inline font-black" />
            </span>
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
            {trialOnly
              ? `Todo lo de abajo está incluido en la prueba de ${PUBLIC_TRIAL_DAYS} días: entrá al panel, cargá tu taller y usalo como en el día a día.`
              : JC_PLAN_AR.headerNote}
          </p>
        </div>

        <div className="mb-8">
          {trialOnly ? (
            <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 backdrop-blur-sm">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">Durante la prueba</p>
              <p className="text-sm text-slate-300 leading-relaxed">
                No hace falta elegir mensual o anual todavía: tenés {PUBLIC_TRIAL_DAYS} días con el panel completo. Cuando
                corresponda pagar, vas a ver acá el selector de periodo, el total en ARS y el cobro único vía Mercado Pago
                (con activación automática al confirmarse el pago).
              </p>
            </div>
          ) : (
            <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 backdrop-blur-sm">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-4">Periodo de facturación</p>

              <div className="relative flex rounded-xl bg-black/40 border border-white/[0.06] p-1 gap-1">
                {([
                  {
                    key: 'mensual' as Cycle,
                    label: 'Mensual',
                    sub: `$ ${JC_PLAN_AR.priceMonth.toLocaleString('es-AR')} / mes`,
                  },
                  {
                    key: 'anual' as Cycle,
                    label: 'Anual',
                    sub: `$ ${JC_PLAN_AR.priceYear.toLocaleString('es-AR')} / año`,
                  },
                ] as { key: Cycle; label: string; sub: string }[]).map(({ key, label, sub }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCycle(key)}
                    className={cn(
                      'relative flex-1 rounded-lg py-3 px-2 text-center transition-all duration-300 overflow-hidden',
                      cycle === key ? '' : 'hover:bg-white/5'
                    )}
                  >
                    {cycle === key && (
                      <span className="absolute inset-0 rounded-lg bg-[#a3e635] shadow-[0_0_20px_rgba(163,230,53,0.4)]" />
                    )}
                    <span
                      className={cn(
                        'relative block text-sm font-black tracking-tight',
                        cycle === key ? 'text-[#0a2a10]' : 'text-slate-300'
                      )}
                    >
                      {label}
                      {key === 'anual' && savingsPct && (
                        <span
                          className={cn(
                            'ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                            cycle === key ? 'bg-[#0a2a10]/30 text-[#0a2a10]' : 'bg-[#a3e635]/20 text-[#a3e635]'
                          )}
                        >
                          -{savingsPct}%
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        'relative block text-[11px] font-semibold mt-0.5',
                        cycle === key ? 'text-[#1a4a20]' : 'text-slate-500'
                      )}
                    >
                      {sub}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Total</p>
                  {monthlyEquiv && (
                    <p className="text-[11px] text-[#a3e635]/70 font-medium mt-0.5">{monthlyEquiv}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-white tabular-nums">{price}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {!trialOnly && (
          <>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3 px-0.5">Pago con Mercado Pago</p>
            <div className="rounded-2xl border border-[#009ee3]/40 bg-gradient-to-br from-[#009ee3]/10 to-[#050a12] shadow-[0_0_40px_rgba(0,158,227,0.08)] overflow-hidden">
              <div className="p-5 flex items-center gap-4 border-b border-white/[0.06]">
                <div className="shrink-0 h-12 w-12 rounded-xl flex items-center justify-center border bg-[#009ee3]/20 border-[#009ee3]/40 text-[#009ee3]">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">Mercado Pago</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pagá en pesos; al aprobarse extendemos la licencia 30 o 365 días{' '}
                    <span className="text-slate-400">desde el vencimiento que tengas</span> (si aún queda prueba, esos días
                    se suman al periodo pagado).
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#009ee3]/15 text-[#009ee3] border border-[#009ee3]/20 shrink-0">
                  Único medio
                </span>
              </div>
              <div className="p-5 space-y-3">
                {!loggedIn ? (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-300 leading-relaxed">
                      Iniciá sesión con tu cuenta del panel para generar el checkout. Así Mercado Pago envía el{' '}
                      <code className="text-[11px] bg-white/10 px-1 rounded">external_reference</code> correcto y la
                      licencia se actualiza sola.
                    </p>
                    <Link
                      href={loginHref}
                      className="group flex items-center justify-center gap-2.5 w-full rounded-xl bg-[#009ee3] hover:bg-[#0081c2] text-white font-bold py-3.5 px-4 text-sm transition-all shadow-lg shadow-[#009ee3]/20"
                    >
                      <LogIn className="h-4 w-4" />
                      Iniciar sesión para pagar
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={payBusy}
                      onClick={() => void startMercadoPago()}
                      className="group flex items-center justify-center gap-2.5 w-full rounded-xl bg-[#009ee3] hover:bg-[#0081c2] disabled:opacity-60 text-white font-bold py-3.5 px-4 text-sm transition-all shadow-lg shadow-[#009ee3]/20"
                    >
                      {payBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CreditCard className="h-4 w-4" />
                      )}
                      Pagar {price} con Mercado Pago
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </button>
                    <p className="text-[11px] text-slate-600 leading-relaxed text-center">
                      Serás redirigido a Mercado Pago. El titular de tu taller debe figurar como dueño de la organización
                      en el sistema.
                    </p>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {trialOnly && (
          <div className="mb-8 rounded-2xl border border-[#a3e635]/25 bg-[#a3e635]/[0.06] p-6 text-center space-y-3">
            <p className="text-sm font-semibold text-white">Entrá al panel primero</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              {PUBLIC_TRIAL_DAYS} días con todas las funciones y sin tarjeta: el objetivo es que conozcas el software con
              tus propios datos antes de pensar en contratar.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-xl bg-[#a3e635] px-6 py-3 text-sm font-bold text-[#0a2a10] hover:bg-[#84cc16] transition-colors"
            >
              Empezar prueba gratis
            </Link>
            <div>
              <Link href="/login" className="text-sm text-[#a3e635]/90 hover:text-[#a3e635]">
                Ya tengo cuenta
              </Link>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-5 flex-wrap">
          <TrustBadge icon={<Lock className="h-3 w-3" />} text="Pago seguro" />
          <TrustBadge icon={<ShieldCheck className="h-3 w-3" />} text="Datos protegidos" />
          <TrustBadge icon={<Zap className="h-3 w-3" />} text="Activación automática" />
          <TrustBadge icon={<Star className="h-3 w-3" />} text="Soporte incluido" />
        </div>

        <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 text-center space-y-1.5">
          <p className="text-xs text-slate-500">
            ¿Tenés dudas antes de comprar? Contactanos desde el panel o por los canales públicos de la web.
          </p>
          <p className="text-xs text-slate-600">
            También podés{' '}
            <Link href="/register" className="text-[#a3e635] hover:underline font-medium">
              probar gratis {PUBLIC_TRIAL_DAYS} días
            </Link>{' '}
            sin tarjeta ni compromiso.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function ArCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-screen flex items-center justify-center overflow-x-clip bg-[#050a12]">
          <div className="pointer-events-none fixed inset-0">
            <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-[#124c48] opacity-40 blur-[120px]" />
          </div>
          <div className="relative z-10 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-[#a3e635]" />
            <p className="text-xs text-slate-600">Cargando checkout…</p>
          </div>
        </div>
      }
    >
      <ArCheckoutContent />
    </Suspense>
  );
}
