'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { JC_PLAN_AR } from '@/lib/plan-marketing';
import { PUBLIC_TRIAL_DAYS } from '@/lib/org-plan';
import {
  Headphones,
  ShieldCheck,
  Sparkles,
  Zap,
  CalendarCheck,
  Lock,
  Users,
  BarChart3,
  Globe,
  MapPin,
  BookOpen,
  Undo2,
  RefreshCw,
  Smartphone,
  History,
  ArrowRight,
} from 'lucide-react';

const highlightsTrial = [
  {
    icon: ShieldCheck,
    title: 'Sin tarjeta',
    text: 'Entrás, cargás tu Excel y probás. Sin compromiso, sin pedir tarjeta de crédito.',
  },
  {
    icon: Zap,
    title: 'Acceso Total',
    text: 'No te bloqueamos ninguna función. Usá Gemini, facturación y todo desde el día 1.',
  },
  {
    icon: Headphones,
    title: 'Soporte Técnico VIP',
    text: 'Chat directo por WhatsApp con técnicos que entienden tu rubro.',
  },
  {
    icon: Sparkles,
    title: 'IA Gemini Pro',
    text: 'Motor de inteligencia artificial actualizado constantemente por Google.',
  },
  {
    icon: ArrowRight,
    title: 'Migración Gratuita',
    text: 'Si tenés un Excel muy complejo, nosotros te lo subimos al sistema.',
  },
  {
    icon: Globe,
    title: 'Portal del Cliente',
    text: 'Tus clientes pueden ver el estado de su equipo online sin llamarte.',
  },
];

const planFeaturesSimple = [
  { emoji: '✨', text: 'IA Gemini Ilimitada', sub: 'Informes y presupuestos automáticos' },
  { emoji: '📦', text: 'Stock e Inventario', sub: 'Con alertas de reposición diaria' },
  { emoji: '🧾', text: 'Factura AFIP/ARCA', sub: 'Legalidad en un clic' },
  { emoji: '📱', text: 'WhatsApp Automático', sub: 'Avisos al cliente sin mover un dedo' },
  { emoji: '👥', text: 'Técnicos Ilimitados', sub: 'Tu equipo crece, tu cuota no' },
  { emoji: '🏷️', text: 'Etiquetas Térmicas', sub: 'Imprimí códigos de barras para cada equipo' },
  { emoji: '⏰', text: 'Control de Turnos', sub: 'Agenda de reparaciones y horarios de empleados' },
  { emoji: '📤', text: 'Exportación de Datos', sub: 'Bajá tu base a Excel cuando quieras. Son tuyos.' },
  { emoji: '🔄', text: 'Actualizaciones de por vida', sub: 'Acceso inmediato a nuevas funciones de IA' },
  { emoji: '🖥️', text: 'Multidispositivo', sub: 'PC, tablet o celular. Sin pagar extra.' },
  { emoji: '💬', text: 'Chat Interno', sub: 'Comunicación directa entre recepción y técnicos' },
  { emoji: '💰', text: 'Reportes de Caja', sub: 'Sabé cuánto ganás realmente cada día y mes' },
  { emoji: '🚫', text: 'Sin Contratos', sub: 'Pagás mes a mes. Cancelás cuando quieras.' },
  { emoji: '📊', text: 'Ranking de Técnicos', sub: 'Mirá quién repara más y genera más ingresos' },
];

const statsARTrial = [
  { icon: Sparkles, value: '30', label: 'Días gratis' },
  { icon: Users, value: '∞', label: 'Técnicos' },
  { icon: BarChart3, value: '100%', label: 'Funciones' },
  { icon: ShieldCheck, value: '$0', label: 'Sin tarjeta' },
];

/** Copy simplificado para la tarjeta de precios */
const PRICING_CARD_DESC_TRIAL =
  'Todo incluido para tu taller en Argentina. Un precio, todas las funciones, sin límites.';

/** Separa título y cuerpo en líneas tipo "Título: descripción" (solo ": " como separador). */
function parsePlanFeatureLine(line: string): { title: string; body?: string } {
  const i = line.indexOf(': ');
  if (i <= 0) return { title: line };
  const title = line.slice(0, i).trim();
  const body = line.slice(i + 2).trim();
  if (!body) return { title };
  return { title, body };
}

/** "Marca – nombre del plan" → dos líneas para tipografía distinta (en dash, em dash o guion). */
function splitPlanTitle(title: string): { brand: string; tagline: string | null } {
  const parts = title.split(/\s*[–—-]\s+/);
  if (parts.length < 2) return { brand: title.trim(), tagline: null };
  const brand = parts[0]?.trim() ?? title;
  const tagline = parts.slice(1).join(' – ').trim();
  return { brand, tagline: tagline || null };
}

type BillingCycle = 'mensual' | 'anual';

/** Selector Mensual / Anual — misma pieza en las dos columnas de precios. */
function BillingCycleSegmented({
  value,
  onChange,
  className,
  compact = false,
}: {
  value: BillingCycle;
  onChange: (v: BillingCycle) => void;
  className?: string;
  /** Botones más chicos para alinear junto al título del plan. */
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'inline-flex shrink-0 rounded-full border border-white/15 bg-black/40 p-px',
        compact ? 'w-auto' : 'w-full max-w-[220px] sm:max-w-none sm:w-auto',
        className,
      )}
      role="group"
      aria-label="Periodo de facturación al contratar"
    >
      {(['mensual', 'anual'] as const).map((key) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          className={cn(
            'rounded-full font-semibold transition-colors',
            compact
              ? 'min-h-[1.75rem] px-2.5 py-1 text-[11px] sm:min-w-[4.25rem]'
              : 'min-h-[2.25rem] flex-1 px-3 py-1.5 text-xs sm:min-w-[5.75rem] sm:flex-none',
            value === key
              ? 'bg-[#F5C518] text-[#0D1117] shadow-sm'
              : 'text-slate-400 hover:text-slate-200',
          )}
        >
          {key === 'mensual' ? 'Mensual' : 'Anual'}
        </button>
      ))}
    </div>
  );
}

/** Marca «JC ONE FIX»: la palabra ONE en Gold. */
function brandWithGoldOne(brand: string) {
  if (!brand.includes('ONE')) return brand;
  return brand.split(/(ONE)/g).map((part, i) =>
    part === 'ONE' ? (
      <span key={i} className="text-[#F5C518] drop-shadow-[0_0_14px_rgba(245,197,24,0.4)]">
        ONE
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

/** Precios y copy en ARS / AFIP·ARCA. El sitio sigue accesible desde cualquier país. */
export function PricingWithLead() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('mensual');
  const p = JC_PLAN_AR;
  const { brand: planBrand, tagline: planTagline } = splitPlanTitle(p.title);
  /** Solo prueba gratis en landing: CTA a registro; precios visibles para transparencia (mismos que checkout AR). */
  const trialPitch = true;
  const yearlySavingsPct =
    p.priceMonth > 0 && p.priceYear > 0
      ? Math.round(100 - (p.priceYear / (p.priceMonth * 12)) * 100)
      : 0;
  const equivMonthlyFromYear = p.priceYear > 0 ? Math.round(p.priceYear / 12) : 0;
  const highlights = highlightsTrial;
  const statsAR = statsARTrial;

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 items-stretch">
        <div className="flex h-full min-h-0">
          <div className="flex h-full w-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-4 sm:p-5 min-h-[320px] lg:min-h-0">
            <p className="text-[10px] sm:text-xs font-medium uppercase tracking-[0.18em] text-[#F5C518]/90 text-center lg:text-left">
              Planes en pesos (ARS)
            </p>

            <div className="border-b border-white/10 pb-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F5C518] mb-3">Prueba sin riesgo</p>
              <h3 className="font-serif text-xl sm:text-2xl lg:text-[1.65rem] font-bold text-white leading-tight mb-2">
                Probá el <span className="text-[#F5C518]">poder de la IA</span> gratis
              </h3>
            </div>

            <div className="flex flex-1 flex-col gap-2.5 sm:gap-3 min-h-0">
              <ul className="space-y-2">
                {highlights.map((h) => (
                  <li key={h.title} className="flex gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                    <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg bg-[#F5C518]/20 border border-[#F5C518]/30 text-[#F5C518]">
                      <h.icon className="h-4 w-4" strokeWidth={2} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white leading-tight">{h.title}</p>
                      <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 leading-snug">{h.text}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="grid grid-cols-4 gap-1.5">
                {statsAR.map(({ icon: Icon, value, label }) => (
                  <div
                    key={label}
                    className="flex flex-col items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 px-0.5 text-center"
                  >
                    <Icon className="h-4 w-4 text-[#F5C518]/70" strokeWidth={1.5} />
                    <span className="text-sm font-bold text-white tabular-nums">{value}</span>
                    <span className="text-[9px] leading-tight text-slate-500">{label}</span>
                  </div>
                ))}
              </div>

              {/* Sección removida - simplificada */}

              {/* Features simplificados - solo 5 bullets escaneables */}
            </div>

            <div className="mt-auto pt-3 border-t border-white/10 shrink-0">
              <p className="text-xs text-slate-400 mb-3">
                Tus datos están seguros, cifrados y son 100% tuyos. Exportalos cuando quieras.
              </p>
            </div>
          </div>
        </div>

        <div className="flex h-full min-h-0 min-w-0">
          <div className="flex h-full w-full flex-col rounded-2xl border-2 border-[#F5C518]/60 bg-white/[0.03] backdrop-blur-sm shadow-[0_0_48px_rgba(245,197,24,0.15)] p-4 sm:p-5 lg:p-6 ring-1 ring-[#F5C518]/30 min-h-[320px] lg:min-h-0">
            <p className="text-[10px] sm:text-xs font-medium uppercase tracking-[0.18em] text-[#F5C518]/90 text-center lg:text-left mb-3 sm:mb-4">
              Planes en pesos (ARS)
            </p>
            <div className="mb-2 sm:mb-3">
              <div className="flex flex-col gap-2 min-[520px]:flex-row min-[520px]:flex-wrap min-[520px]:items-end min-[520px]:justify-between min-[520px]:gap-x-4 min-[520px]:gap-y-2">
                <h3 className="flex flex-wrap items-baseline gap-x-2 sm:gap-x-3 gap-y-1 min-w-0 min-[520px]:flex-1">
                  <span className="font-serif text-[1.35rem] sm:text-2xl lg:text-[1.75rem] font-bold leading-[1.15] tracking-tight text-white [text-shadow:0_2px_28px_rgba(245,197,24,0.14)]">
                    {brandWithGoldOne(planBrand)}
                  </span>
                  {planTagline ? (
                    <>
                      <span className="text-slate-500/90 font-light shrink-0 hidden sm:inline" aria-hidden>
                        –
                      </span>
                      <span className="text-[0.875rem] sm:text-base font-semibold leading-snug tracking-wide bg-gradient-to-r from-[#F5C518] via-[#D4A915] to-[#F5C518] bg-clip-text text-transparent">
                        {planTagline}
                      </span>
                    </>
                  ) : (
                    <span className="font-serif text-[1.35rem] sm:text-2xl font-bold leading-tight text-white">
                      {brandWithGoldOne(p.title)}
                    </span>
                  )}
                </h3>
                {trialPitch ? (
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-[520px]:justify-end">
                    <BillingCycleSegmented
                      value={billingCycle}
                      onChange={setBillingCycle}
                      compact
                    />
                    {billingCycle === 'mensual' ? (
                      <p className="text-lg sm:text-xl font-bold text-white tabular-nums leading-none whitespace-nowrap">
                        $ {p.priceMonth.toLocaleString('es-AR')}{' '}
                        <span className="text-xs sm:text-sm font-semibold text-slate-400">/ mes</span>
                      </p>
                    ) : (
                      <p className="text-lg sm:text-xl font-bold text-white tabular-nums leading-none whitespace-nowrap">
                        $ {p.priceYear.toLocaleString('es-AR')}{' '}
                        <span className="text-xs sm:text-sm font-semibold text-slate-400">/ año</span>
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
              {trialPitch ? (
                <>
                  {billingCycle === 'mensual' && yearlySavingsPct > 0 ? (
                    <p className="mt-1.5 text-[10px] sm:text-[11px] text-slate-500 leading-tight">
                      Anual: $ {p.priceYear.toLocaleString('es-AR')} ARS · ~{yearlySavingsPct}% menos vs. 12 × mensual.
                    </p>
                  ) : null}
                  {billingCycle === 'anual' ? (
                    <p className="mt-1.5 text-[10px] sm:text-[11px] leading-tight text-slate-500">
                      {yearlySavingsPct > 0 ? (
                        <span className="font-medium text-[#F5C518]/90">~{yearlySavingsPct}% menos</span>
                      ) : null}
                      {yearlySavingsPct > 0 ? ' · ' : null}
                      {equivMonthlyFromYear > 0 ? (
                        <span>~$ {equivMonthlyFromYear.toLocaleString('es-AR')} ARS / mes equivalente.</span>
                      ) : null}
                    </p>
                  ) : null}
                  <p className="text-[11px] sm:text-xs text-slate-400 mt-2 leading-snug max-w-2xl">
                    Prueba sin tarjeta ({PUBLIC_TRIAL_DAYS} días), panel completo. Cuando termine el periodo de prueba, al
                    entrar al panel te llevamos al checkout para elegir mensual o anual y pagar con estos importes (tenés unos
                    días de margen antes de que se pause el acceso).
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-500 mt-2">Elegí el periodo de facturación</p>
              )}
            </div>

            <p className="text-xs sm:text-sm text-slate-400 mb-3 leading-snug border-b border-white/10 pb-3">
              {trialPitch ? PRICING_CARD_DESC_TRIAL : p.desc}
            </p>

            <div className="mb-3 flex-1 min-h-0 flex flex-col">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                {/* Primera columna: primeros 7 items */}
                <ul className="space-y-2">
                  {planFeaturesSimple.slice(0, 7).map((f) => (
                    <li key={f.text} className="flex items-start gap-2">
                      <span className="text-base shrink-0" aria-hidden>{f.emoji}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-200 leading-tight">{f.text}</p>
                        <p className="text-[10px] text-slate-500 leading-tight">{f.sub}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                {/* Segunda columna: últimos 7 items */}
                <ul className="space-y-2">
                  {planFeaturesSimple.slice(7, 14).map((f) => (
                    <li key={f.text} className="flex items-start gap-2">
                      <span className="text-base shrink-0" aria-hidden>{f.emoji}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-200 leading-tight">{f.text}</p>
                        <p className="text-[10px] text-slate-500 leading-tight">{f.sub}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-auto space-y-2.5 pt-3 border-t border-white/10">
              <p className="text-[10px] text-slate-500 text-center">
                Menos de lo que cobrás por un cambio de pin de carga
              </p>
              <Button
                asChild
                className="w-full h-11 sm:h-12 text-base font-semibold bg-[#F5C518] text-[#0D1117] hover:bg-[#D4A915] border-0 shadow-lg shadow-[#F5C518]/25 min-h-[48px]"
              >
                <Link href="/register">¡EMPEZAR MI PRUEBA DE 30 DÍAS!</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
