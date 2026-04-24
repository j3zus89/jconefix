'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Eye, EyeOff, Sparkles, Package, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { JcOneFixMark, JcOneFixAppIcon } from '@/components/jc-one-fix-mark';
import { PUBLIC_TRIAL_DAYS } from '@/lib/org-plan';
import { reportSuccessfulLogin } from '@/lib/auth/report-login-client';

const HERO_SLIDE_MS = 9000;

function setRegionCookieArgentina() {
  document.cookie = `jc_region=AR; path=/; max-age=31536000; samesite=lax`;
}

export default function RegisterTrialPage() {
  const router = useRouter();
  const fullNameRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [shopName, setShopName] = useState('');
  const [password, setPassword] = useState('');
  const [fromPrecios, setFromPrecios] = useState(false);
  const [heroSlide, setHeroSlide] = useState(0);

  useEffect(() => {
    const from = new URLSearchParams(window.location.search).get('from');
    if (from !== 'precios') return;
    setFromPrecios(true);
    const t = window.setTimeout(() => fullNameRef.current?.focus(), 100);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setHeroSlide((s) => (s + 1) % 3);
    }, HERO_SLIDE_MS);
    return () => window.clearInterval(id);
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/public/register-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email,
          shop_name: shopName,
          password,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(j.error || 'No se pudo completar el registro');
      }

      const supabase = createClient();
      const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signErr) {
        toast.success('Cuenta creada. Inicia sesión con tu email y contraseña.');
        router.push('/login');
        return;
      }

      setRegionCookieArgentina();
      toast.success(`¡Listo! Tienes ${PUBLIC_TRIAL_DAYS} días de prueba completos.`);
      reportSuccessfulLogin('panel');
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cap-native-page-fill min-h-screen flex flex-col lg:flex-row bg-[#050a12] text-white relative overflow-x-hidden pb-[env(safe-area-inset-bottom,0px)]">
      {/* Aurora ambient — misma familia que login */}
      <div
        data-web-chrome
        className="pointer-events-none fixed inset-0 z-0 opacity-90"
      >
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-[#F5C518]/20 blur-[120px]" />
        <div className="absolute top-1/3 -left-32 h-80 w-80 rounded-full bg-[#F5C518]/10 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-[#F5C518]/10 blur-[90px]" />
      </div>

      {/* Columna formulario — centrada en su mitad */}
      <div className="relative z-10 flex flex-1 flex-col justify-center px-6 sm:px-10 lg:px-12 lg:pr-16 xl:px-16 xl:pr-24 2xl:pr-32 py-14 lg:py-12 border-b lg:border-b-0 lg:border-r border-white/10">
        <div className="max-w-md w-full mx-auto lg:mx-auto">
          <Link
            href="/"
            data-web-chrome
            className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-slate-500 hover:text-[#F5C518] transition-colors mb-10"
          >
            <span aria-hidden>←</span> Volver al inicio
          </Link>

          <div className="rounded-2xl border border-white/10 bg-[#070f18]/75 backdrop-blur-xl p-8 sm:p-10 shadow-2xl shadow-black/40">
            <div className="flex items-center gap-3 mb-8">
              <JcOneFixAppIcon className="h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem] transition-all" />
              <div>
                <JcOneFixMark tone="onDark" className="text-xl sm:text-2xl font-bold tracking-tight" />
                <p className="text-[11px] uppercase tracking-widest text-slate-500 mt-1">Prueba gratis</p>
              </div>
            </div>

            <div className="mb-8">
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white leading-tight mb-2">
                Creá tu taller en segundos
              </h1>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                {PUBLIC_TRIAL_DAYS} días de acceso completo al panel para talleres en{' '}
                <span className="text-slate-200 font-medium">Argentina</span>: moneda ARS, campos fiscales y ARCA/AFIP cuando los
                actives. Mismo email y contraseña para entrar.
              </p>
            </div>

            {fromPrecios && (
              <div className="mb-6 rounded-lg border border-[#F5C518]/35 bg-[#F5C518]/10 px-3 py-2 text-xs font-medium text-[#F5C518] sm:text-sm">
                Registro rápido desde Precios: cuatro campos y entrás al panel. Sin tarjeta para la prueba.
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-slate-300 font-medium text-sm">
                  Tu nombre
                </Label>
                <Input
                  ref={fullNameRef}
                  id="fullName"
                  required
                  className="h-12 rounded-xl border-white/15 bg-white/5 text-white placeholder:text-slate-500 focus-visible:border-[#F5C518]/50 focus-visible:ring-[#F5C518]/25 shadow-inner"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nombre y apellidos"
                  autoComplete="name"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shopName" className="text-slate-300 font-medium text-sm">
                  Nombre del taller
                </Label>
                <Input
                  id="shopName"
                  required
                  className="h-12 rounded-xl border-white/15 bg-white/5 text-white placeholder:text-slate-500 focus-visible:border-[#F5C518]/50 focus-visible:ring-[#F5C518]/25 shadow-inner"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="Ej. Reparaciones García"
                  autoComplete="organization"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300 font-medium text-sm">
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  className="h-12 rounded-xl border-white/15 bg-white/5 text-white placeholder:text-slate-500 focus-visible:border-[#F5C518]/50 focus-visible:ring-[#F5C518]/25 shadow-inner"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  autoComplete="email"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300 font-medium text-sm">
                  Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    className="h-12 rounded-xl border-white/15 bg-white/5 text-white placeholder:text-slate-500 focus-visible:border-[#F5C518]/50 focus-visible:ring-[#F5C518]/25 shadow-inner pr-12"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#F5C518] transition-colors no-ui-hover-grow"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 rounded-full bg-[#F5C518] text-[#0D1117] hover:bg-[#D4A915] font-semibold border-0 shadow-lg shadow-[#F5C518]/20 min-h-[48px]"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Empezar prueba gratis
              </Button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 text-xs uppercase tracking-widest text-slate-500 bg-[#070f18]">o</span>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center space-y-2">
              <p className="text-sm text-slate-300 font-medium">¿Ya tenés cuenta?</p>
              <Link
                href="/login"
                className="inline-flex text-sm font-semibold text-[#F5C518] hover:text-[#D4A915] underline-offset-2 hover:underline"
              >
                Iniciar sesión
              </Link>
              <p className="text-xs text-slate-500">Nombre, taller, email y contraseña — acceso automático al panel.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Panel artístico — igual que login, solo LG+ */}
      <div
        data-web-chrome
        className="hidden lg:flex relative z-10 flex-1 min-h-0 items-stretch justify-center overflow-hidden"
      >
        <div className="absolute inset-0 bg-[#050a12]" />
        {/* Malla de luz */}
        <div
          className="absolute inset-0 opacity-90"
          style={{
            backgroundImage: `
              radial-gradient(ellipse 100% 60% at 75% 15%, rgba(245, 197, 24, 0.14), transparent 55%),
              radial-gradient(ellipse 70% 50% at 10% 85%, rgba(245, 197, 24, 0.15), transparent 50%),
              radial-gradient(circle at 50% 110%, rgba(10, 15, 24, 0.9), transparent 45%)
            `,
          }}
        />
        {/* Haz cónico lento */}
        <div
          className="absolute -top-[20%] left-1/2 h-[140%] w-[180%] -translate-x-1/2 opacity-[0.12] motion-safe:animate-[spin_140s_linear_infinite] blur-3xl"
          style={{
            background: 'conic-gradient(from 200deg at 50% 50%, #F5C518, transparent 25%, #0D1117 45%, transparent 60%, #F5C518 85%)',
          }}
        />
        {/* Rejilla fina perspectiva */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)
            `,
            backgroundSize: '64px 64px',
            maskImage: 'radial-gradient(ellipse 90% 70% at 50% 40%, black 20%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 40%, black 20%, transparent 75%)',
          }}
        />

        {/* SVG orgánico */}
        <svg
          className="absolute bottom-0 right-0 w-[85%] h-[70%] text-[#F5C518]/25 pointer-events-none"
          viewBox="0 0 600 500"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <defs>
            <linearGradient id="loginStroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F5C518" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#D4A915" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#0D1117" stopOpacity="0.4" />
            </linearGradient>
          </defs>
          <path
            d="M40 420 C 180 280, 120 120, 320 80 S 520 200, 560 360"
            stroke="url(#loginStroke)"
            strokeWidth="1.2"
            className="motion-safe:animate-[pulse_6s_ease-in-out_infinite]"
          />
          <path
            d="M80 460 Q 260 300, 440 340 T 580 180"
            stroke="currentColor"
            strokeWidth="0.6"
            opacity="0.35"
          />
          <circle cx="320" cy="80" r="3" fill="#F5C518" opacity="0.6" />
          <circle cx="560" cy="360" r="2" fill="#fff" opacity="0.3" />
        </svg>

        {/* Tipografía monumental */}
        <div
          className="absolute -right-8 top-1/2 -translate-y-1/2 pointer-events-none select-none font-serif font-bold text-[clamp(8rem,18vw,14rem)] leading-none text-transparent opacity-[0.07]"
          style={{ WebkitTextStroke: '1px rgba(255,255,255,0.35)' }}
          aria-hidden
        >
          O
        </div>

        {/* Anillos y marco flotante */}
        <div className="absolute top-[12%] left-[18%] h-40 w-40 rounded-full border border-[#F5C518]/20 motion-safe:animate-[spin_90s_linear_infinite_reverse]" />
        <div className="absolute top-[22%] left-[22%] h-24 w-24 rounded-full border border-white/10" />
        <div
          className="absolute bottom-[18%] right-[12%] h-72 w-72 rounded-full border border-white/[0.07]"
          style={{
            boxShadow: '0 0 80px rgba(163, 230, 53, 0.06), inset 0 0 60px rgba(18, 76, 72, 0.15)',
          }}
        />

        {/* Contenido narrativo — 3 slides con crossfade */}
        <div className="relative z-10 flex flex-1 flex-col justify-center px-12 xl:px-20 py-16">
          <div className="relative w-full max-w-xl min-h-[min(52vh,28rem)]">
            {/* Slide 0 — Flujo / tickets */}
            <div
              className={`absolute inset-0 flex flex-col justify-center transition-opacity ease-in-out ${
                heroSlide === 0 ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'
              }`}
              style={{ transitionDuration: '1.4s' }}
              aria-hidden={heroSlide !== 0}
            >
              <div className="inline-flex items-center gap-2 self-start rounded-full border border-[#F5C518]/35 bg-[#F5C518]/10 px-4 py-2 mb-8 backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-[#F5C518]" />
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F5C518]/95">Todo en uno</span>
              </div>
              <blockquote className="font-serif text-3xl xl:text-[2.15rem] leading-[1.2] text-white/95 mb-8">
                Tu taller organizado desde el primer{' '}
                <span className="text-[#F5C518] not-italic">día uno</span>: tickets, stock y clientes en un solo lugar.
              </blockquote>
              <p className="text-slate-400 text-base leading-relaxed max-w-md mb-10 border-l-2 border-[#F5C518]/40 pl-5">
                Creá tu cuenta en <JcOneFixMark tone="onDark" className="font-semibold" /> y empezá a gestionar tu negocio sin complicaciones.
              </p>
              <div
                className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-transparent p-6 backdrop-blur-md shadow-2xl max-w-md rotate-[-1.5deg]"
                style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.45), 0 0 1px rgba(245,197,24,0.25)' }}
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#F5C518]/20 border border-white/10 flex items-center justify-center">
                      <span className="text-[#F5C518] text-lg font-bold font-serif">1</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Registro rápido</p>
                      <p className="text-xs text-slate-500">4 campos y listo</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#F5C518] shadow-[0_0_8px_#F5C518]" />
                    <span className="h-2 w-2 rounded-full bg-white/20" />
                    <span className="h-2 w-2 rounded-full bg-white/20" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-2 rounded-full bg-gradient-to-r from-[#F5C518]/50 to-transparent w-4/5" />
                  <div className="h-2 rounded-full bg-white/10 w-3/5" />
                  <div className="h-2 rounded-full bg-white/5 w-2/5" />
                </div>
                <p className="mt-5 text-[10px] uppercase tracking-[0.25em] text-slate-500">Bienvenido · al panel</p>
              </div>
            </div>

            {/* Slide 1 — Inventario */}
            <div
              className={`absolute inset-0 flex flex-col justify-center transition-opacity ease-in-out ${
                heroSlide === 1 ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'
              }`}
              style={{ transitionDuration: '1.4s' }}
              aria-hidden={heroSlide !== 1}
            >
              <div className="inline-flex items-center gap-2 self-start rounded-full border border-[#F5C518]/35 bg-[#F5C518]/10 px-4 py-2 mb-8 backdrop-blur-sm">
                <Package className="h-4 w-4 text-[#F5C518]" />
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F5C518]/95">Stock en tiempo real</span>
              </div>
              <blockquote className="font-serif text-3xl xl:text-[2.15rem] leading-[1.2] text-white/95 mb-8">
                Controlá tu inventario desde el primer{' '}
                <span className="text-[#F5C518] not-italic">momento</span>.
              </blockquote>
              <p className="text-slate-400 text-base leading-relaxed max-w-md mb-10 border-l-2 border-[#F5C518]/40 pl-5">
                Alertas de stock mínimo, traslados entre almacenes y órdenes de compra desde el mismo panel{' '}
                <JcOneFixMark tone="onDark" className="font-semibold" />.
              </p>
              <div
                className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-transparent p-6 backdrop-blur-md shadow-2xl max-w-md rotate-[1deg]"
                style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.45), 0 0 1px rgba(245,197,24,0.25)' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-white">Stock inicial</p>
                  <span className="text-[10px] uppercase tracking-wider text-amber-400/90">Listo para usar</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Pantallas disponibles</span>
                      <span className="text-[#F5C518]">Catálogo incluido</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-[#F5C518]/80 to-[#F5C518]/30" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Servicios configurados</span>
                      <span className="text-[#F5C518]">900+ ítems</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full w-[90%] rounded-full bg-gradient-to-r from-[#F5C518]/60 to-transparent" />
                    </div>
                  </div>
                </div>
                <p className="mt-5 text-[10px] uppercase tracking-[0.25em] text-slate-500">Inventario · sincronizado</p>
              </div>
            </div>

            {/* Slide 2 — Comunicación / cliente */}
            <div
              className={`absolute inset-0 flex flex-col justify-center transition-opacity ease-in-out ${
                heroSlide === 2 ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'
              }`}
              style={{ transitionDuration: '1.4s' }}
              aria-hidden={heroSlide !== 2}
            >
              <div className="inline-flex items-center gap-2 self-start rounded-full border border-[#F5C518]/35 bg-[#F5C518]/10 px-4 py-2 mb-8 backdrop-blur-sm">
                <MessageCircle className="h-4 w-4 text-[#F5C518]" />
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F5C518]/95">Cliente al centro</span>
              </div>
              <blockquote className="font-serif text-3xl xl:text-[2.15rem] leading-[1.2] text-white/95 mb-8">
                Cada mensaje en el <span className="text-[#F5C518] not-italic">mismo hilo</span>: ticket, correo y avisos bajo control.
              </blockquote>
              <p className="text-slate-400 text-base leading-relaxed max-w-md mb-10 border-l-2 border-[#F5C518]/40 pl-5">
                Estados de reparación, recogida y facturación con el tono profesional de tu taller — todo enlazado en{' '}
                <JcOneFixMark tone="onDark" className="font-semibold" />.
              </p>
              <div
                className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-transparent p-6 backdrop-blur-md shadow-2xl max-w-md -rotate-[1deg]"
                style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.45), 0 0 1px rgba(245,197,24,0.25)' }}
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="h-9 w-9 rounded-full bg-[#F5C518]/20 border border-white/10 flex-shrink-0 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-[#F5C518]">JC</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500 mb-1">Notificación automática</p>
                    <p className="text-sm text-white/95 leading-snug">
                      Tu cuenta está activa. Empezá a cargar tickets y gestionar tu taller.
                    </p>
                  </div>
                </div>
                <div className="rounded-lg bg-black/25 border border-white/5 px-3 py-2.5">
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#F5C518] animate-pulse" />
                    Sistema listo · {PUBLIC_TRIAL_DAYS} días de prueba
                  </div>
                </div>
                <p className="mt-5 text-[10px] uppercase tracking-[0.25em] text-slate-500">Comunicación · trazable</p>
              </div>
            </div>
          </div>

          {/* Indicadores */}
          <div className="mt-10 flex items-center justify-center gap-2" role="tablist" aria-label="Cambiar mensaje">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={heroSlide === i}
                aria-label={`Mensaje ${i + 1} de 3`}
                onClick={() => setHeroSlide(i)}
                className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
                  heroSlide === i ? 'w-8 bg-[#F5C518] shadow-[0_0_12px_rgba(245,197,24,0.35)]' : 'w-1.5 bg-white/20 hover:bg-white/35'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
