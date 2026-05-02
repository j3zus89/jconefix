'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { JcOneFixMark, JcOneFixAppIcon } from '@/components/jc-one-fix-mark';
import { createClient } from '@/lib/supabase/client';
import { reportSuccessfulLogin } from '@/lib/auth/report-login-client';
import { getLocationConfig, spanishLatAmCountriesForSelect } from '@/lib/location-config';
import { PRICING_USD } from '@/lib/checkout-pricing';
import type { CheckoutCycle } from '@/lib/checkout-pricing';
import { cn } from '@/lib/utils';
import { PayPalPremiumDirectEmbed, type PremiumDirectRegistrationPayload } from './PayPalPremiumDirectEmbed';

const COUNTRY_OPTIONS = spanishLatAmCountriesForSelect().filter((c) => c.iso !== 'AR');

/** Misma regla que `formValid`: formato correo con @ y dominio (evita “josugmail.com” sin @). */
function isPremiumDirectEmailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Landings oscuras: una sola familia visual + `.input-on-dark-surface` en globals.css para autofill de Chrome. */
const INPUT_ON_DARK =
  'input-on-dark-surface h-10 rounded-xl border border-white/15 bg-white/10 text-white placeholder:text-slate-400 caret-white shadow-inner ring-offset-0 focus-visible:border-[#F5C518]/50 focus-visible:ring-2 focus-visible:ring-[#F5C518]/25';
const LABEL_ON_DARK = 'text-slate-300 font-medium text-sm';
const SELECT_TRIGGER_ON_DARK =
  'h-10 rounded-xl border border-white/15 bg-white/10 text-white ring-offset-0 focus-visible:border-[#F5C518]/50 focus-visible:ring-2 focus-visible:ring-[#F5C518]/25 [&>span]:text-inherit';

function syncRegionCookieAfterRegister(countryIso: string) {
  if (typeof window === 'undefined') return;
  const host = window.location.hostname.toLowerCase();
  if (host.endsWith('.com.ar')) {
    document.cookie = `jc_region=AR; path=/; max-age=31536000; samesite=lax`;
    return;
  }
  const iso = (countryIso || 'MX').trim().toUpperCase();
  if (iso.length === 2) {
    document.cookie = `jc_region=${iso}; path=/; max-age=31536000; samesite=lax`;
  }
}

type Props = { initialCycle: CheckoutCycle };

export function PremiumDirectRegisterClient({ initialCycle }: Props) {
  const router = useRouter();
  const [formReady, setFormReady] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [shopName, setShopName] = useState('');
  const [password, setPassword] = useState('');
  const [fiscalId, setFiscalId] = useState('');
  const [countryIso, setCountryIso] = useState('MX');
  const [cycle, setCycle] = useState<CheckoutCycle>(initialCycle);
  const [showPassword, setShowPassword] = useState(false);
  const [busyAfterPay, setBusyAfterPay] = useState(false);

  const fiscalCfg = useMemo(() => getLocationConfig(countryIso), [countryIso]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const m = document.cookie.match(/(?:^|; )jc_region=([^;]+)/);
    const v = m != null && m[1] != null ? m[1].trim() : '';
    if (v && /^[a-zA-Z]{2}$/.test(v) && v.toUpperCase() !== 'AR') {
      setCountryIso(v.toUpperCase());
    }
    setFormReady(true);
  }, []);

  const formValid = useMemo(() => {
    if (!formReady) return false;
    if (fullName.trim().length < 2) return false;
    if (shopName.trim().length < 2) return false;
    if (password.length < 6) return false;
    if (!isPremiumDirectEmailValid(email)) return false;
    if (!countryIso || countryIso === 'AR') return false;
    return true;
  }, [formReady, fullName, shopName, password, email, countryIso]);

  const getPayload = useCallback((): PremiumDirectRegistrationPayload => {
    return {
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      password,
      shop_name: shopName.trim(),
      country_iso: countryIso,
      fiscal_id: fiscalId.trim() || undefined,
      cycle,
    };
  }, [fullName, email, password, shopName, countryIso, fiscalId, cycle]);

  const handlePaidSuccess = useCallback(async () => {
    setBusyAfterPay(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        toast.success(
          'Pago confirmado. Tu cuenta está lista: iniciá sesión con el email y contraseña que elegiste.'
        );
        router.push('/login');
        return;
      }
      syncRegionCookieAfterRegister(countryIso);
      toast.success('¡Bienvenido a JC ONE FIX Premium! Ya tenés IA y límites ampliados.');
      reportSuccessfulLogin('panel');
      window.location.href = '/dashboard';
    } finally {
      setBusyAfterPay(false);
    }
  }, [email, password, countryIso, router]);

  const priceLabel =
    cycle === 'anual'
      ? `US$ ${PRICING_USD.PRECIO_ANUAL.toLocaleString('en-US', { maximumFractionDigits: 0 })} / año`
      : `US$ ${PRICING_USD.PRECIO_MENSUAL.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} / mes`;

  return (
    <div className="cap-native-page-fill min-h-screen flex flex-col lg:flex-row bg-[#050a12] text-white relative overflow-x-hidden pb-[env(safe-area-inset-bottom,0px)]">
      <div
        data-web-chrome
        className="pointer-events-none fixed inset-0 z-0 opacity-90"
      >
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-[#F5C518]/20 blur-[120px]" />
        <div className="absolute top-1/3 -left-32 h-80 w-80 rounded-full bg-[#F5C518]/10 blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col justify-center px-4 sm:px-10 lg:px-12 py-8 md:py-14">
        <div className="max-w-md w-full mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-slate-500 hover:text-[#F5C518] transition-colors mb-6"
          >
            <span aria-hidden>←</span> Volver al inicio
          </Link>

          <div className="rounded-2xl border border-white/10 bg-[#070f18]/75 backdrop-blur-xl p-5 sm:p-10 shadow-2xl shadow-black/40">
            <div className="flex items-center gap-3 mb-6">
              <JcOneFixAppIcon className="h-10 w-10 sm:h-11 sm:w-11 rounded-full" />
              <div>
                <JcOneFixMark tone="onDark" className="text-xl sm:text-2xl font-bold tracking-tight" />
                <p className="text-[11px] uppercase tracking-widest text-[#F5C518] mt-1">Premium · PayPal USD</p>
              </div>
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white leading-tight mb-2">
              Creá tu taller y activá Premium
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Para talleres fuera de Argentina: completá los datos, elegí facturación mensual o anual y pagá con PayPal.
              Recibís <strong className="text-slate-200">30 días extra de regalo</strong> sobre tu primer periodo.
            </p>

            {!formReady ? (
              <div className="space-y-3" aria-busy aria-label="Cargando">
                <div className="h-10 w-full rounded-xl bg-white/10 animate-pulse" />
                <div className="h-10 w-full rounded-xl bg-white/10 animate-pulse" />
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pd-shop" className={LABEL_ON_DARK}>
                      Nombre del taller
                    </Label>
                    <Input
                      id="pd-shop"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      className={INPUT_ON_DARK}
                      autoComplete="organization"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pd-country" className={LABEL_ON_DARK}>
                      País del taller
                    </Label>
                    <Select value={countryIso} onValueChange={setCountryIso}>
                      <SelectTrigger id="pd-country" className={SELECT_TRIGGER_ON_DARK}>
                        <SelectValue placeholder="País" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {COUNTRY_OPTIONS.map((c) => (
                          <SelectItem key={c.iso} value={c.iso}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-slate-500">
                      Argentina usa Mercado Pago:{' '}
                      <Link href="/register" className="text-[#F5C518] hover:underline">
                        registro gratuito
                      </Link>{' '}
                      o{' '}
                      <Link href="/checkout/ar" className="text-[#F5C518] hover:underline">
                        checkout AR
                      </Link>
                      .
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pd-fiscal" className={LABEL_ON_DARK}>
                      {fiscalCfg.fiscalIdLabel}
                    </Label>
                    <Input
                      id="pd-fiscal"
                      value={fiscalId}
                      onChange={(e) => setFiscalId(e.target.value)}
                      className={INPUT_ON_DARK}
                      placeholder={fiscalCfg.idNumberPlaceholder}
                      autoComplete="off"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pd-name" className={LABEL_ON_DARK}>
                      Tu nombre
                    </Label>
                    <Input
                      id="pd-name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={INPUT_ON_DARK}
                      autoComplete="name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pd-email" className={LABEL_ON_DARK}>
                      Email
                    </Label>
                    <Input
                      id="pd-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={cn(
                        INPUT_ON_DARK,
                        email.trim().length > 0 &&
                          !isPremiumDirectEmailValid(email) &&
                          'border-amber-400/60 focus-visible:border-amber-400/80'
                      )}
                      autoComplete="email"
                    />
                    {email.trim().length > 0 && !isPremiumDirectEmailValid(email) ? (
                      <p className="text-[12px] leading-snug text-amber-300/95">
                        Usá un email válido con <strong className="font-semibold">@</strong> y dominio (ej.{' '}
                        <span className="tabular-nums">tu@gmail.com</span>). Sin eso no se puede habilitar PayPal.
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pd-password" className={LABEL_ON_DARK}>
                      Contraseña
                    </Label>
                    <div className="relative">
                      <Input
                        id="pd-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={cn(INPUT_ON_DARK, 'pr-10')}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-200">Periodo de facturación</p>
                    <div
                      className="inline-flex rounded-full border border-white/15 bg-black/40 p-px"
                      role="group"
                      aria-label="Periodo"
                    >
                      {(['mensual', 'anual'] as const).map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setCycle(key)}
                          className={cn(
                            'rounded-full px-4 py-2 text-xs font-semibold transition-colors',
                            cycle === key
                              ? 'bg-[#F5C518] text-[#0D1117]'
                              : 'text-slate-400 hover:text-slate-200'
                          )}
                        >
                          {key === 'mensual' ? 'Mensual' : 'Anual'}
                        </button>
                      ))}
                    </div>
                    <p className="text-sm text-[#F5C518]/90 tabular-nums">{priceLabel}</p>
                  </div>
                </div>

                <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    Al activar tu plan Premium hoy, se te acreditarán automáticamente tus{' '}
                    <strong className="text-slate-200">30 días de prueba gratuita adicionales</strong>. Tu próxima
                    renovación será en{' '}
                    <strong className="text-slate-200">
                      {cycle === 'mensual' ? '60 días' : 'aprox. 13 meses (12 facturados + 1 mes de regalo)'}
                    </strong>
                    .
                  </p>
                </div>

                <div className="mt-6">
                  <PayPalPremiumDirectEmbed
                    formValid={formValid && !busyAfterPay}
                    cycle={cycle}
                    getPayload={getPayload}
                    onPaidSuccess={handlePaidSuccess}
                  />
                </div>

                {busyAfterPay && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Entrando a tu cuenta…
                  </div>
                )}

                <p className="mt-8 text-center text-xs text-slate-500">
                  ¿Solo querés probar gratis?{' '}
                  <Link href="/register" className="text-[#F5C518] hover:underline">
                    Plan Básico Gratis
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
