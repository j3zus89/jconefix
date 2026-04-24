import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LandingSiteHeader } from '@/components/landing/LandingSiteHeader';
import { MarketingFooter } from '@/components/landing/marketing-footer';
import { PreciosPaymentTrustBar } from '@/components/landing/precios-payment-trust';
import { JC_PLAN_AR } from '@/lib/plan-marketing';
import { formatPrecioListadoArs } from '@/lib/pricing-config';
import { PUBLIC_TRIAL_DAYS } from '@/lib/org-plan';
import { getArgentinaAlternates, getSiteCanonicalUrl } from '@/lib/site-canonical';
import { cn } from '@/lib/utils';

/** Registro con origen: el formulario enfoca el primer campo para completar más rápido. */
const REGISTER_QUICK_HREF = '/register?from=precios';

const PRECIOS_META_TITLE = 'Jconefix | 30 días de prueba real sin tarjeta 🇦🇷';

function getPreciosMetaDescription(): string {
  const pm = formatPrecioListadoArs(JC_PLAN_AR.priceMonth);
  return `Accedé al gestor de taller más completo de Argentina por ${pm}/mes. Incluye Facturación ARCA, asistente Gemini en el panel (clave del taller), WhatsApp al cliente y más. Probá el plan Premium Full gratis por ${PUBLIC_TRIAL_DAYS} días.`;
}

const PRECIOS_TRANSPARENCY_NOTE =
  'Mantenemos las tarifas en pesos al día para sostener servidores, soporte y mejoras del producto. En un contexto económico cambiante, la cuota mensual puede actualizarse: si ocurre, lo publicamos en el sitio y en tu cuenta con la debida antelación, antes de que aplique a tu próxima renovación mensual. El plan anual es un solo pago por doce meses: quien ya lo abonó mantiene ese precio durante todo el período contratado, sin sorpresas en el medio.';

export async function generateMetadata(): Promise<Metadata> {
  const base = getSiteCanonicalUrl();
  const pageUrl = `${base}/precios`;
  const description = getPreciosMetaDescription();
  return {
    title: { absolute: PRECIOS_META_TITLE },
    description,
    alternates: getArgentinaAlternates(pageUrl),
    keywords: [
      'precio software taller Argentina',
      'Jconefix precio',
      'plan premium taller',
      'gestión taller ARS',
      'facturación ARCA software precio',
      'prueba gratis taller 30 días',
    ],
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-snippet': -1,
        'max-image-preview': 'large',
        'max-video-preview': -1,
      },
    },
    openGraph: {
      title: PRECIOS_META_TITLE,
      description,
      url: pageUrl,
      siteName: 'JC ONE FIX',
      locale: 'es_AR',
      type: 'website',
      images: [
        {
          url: `${base}/api/og?v=7&title=${encodeURIComponent('Precios — Premium Full')}`,
          width: 1200,
          height: 630,
          alt: 'Precios Plan Premium Full — JC ONE FIX',
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: PRECIOS_META_TITLE,
      description,
      images: [`${base}/api/og?v=7&title=${encodeURIComponent('Precios — Premium Full')}`],
    },
  };
}

const NO_EXTRA_CHARGES = [
  'Número de técnicos o usuarios operativos',
  'Sedes o ubicaciones adicionales',
  'Cantidad de tickets u órdenes de reparación',
  'Actualizaciones y mejoras futuras del producto',
] as const;

function parsePlanFeatureLine(line: string): { title: string; body?: string } {
  const i = line.indexOf(': ');
  if (i <= 0) return { title: line };
  const title = line.slice(0, i).trim();
  const body = line.slice(i + 2).trim();
  if (!body) return { title };
  return { title, body };
}

function buildPreciosSchemaJsonLd() {
  const base = getSiteCanonicalUrl();
  const pageUrl = `${base}/precios`;
  const metaDescription = getPreciosMetaDescription();
  const priceValidUntil = `${new Date().getFullYear() + 1}-12-31`;
  const offerId = `${pageUrl}#offer`;
  const productName = 'Jconefix Premium Full';

  const mainOffer = {
    '@type': 'Offer' as const,
    '@id': offerId,
    url: pageUrl,
    name: 'Suscripción mensual — Jconefix Premium Full',
    price: String(JC_PLAN_AR.priceMonth),
    priceCurrency: JC_PLAN_AR.currency,
    priceValidUntil,
    availability: 'https://schema.org/InStock',
    eligibleRegion: { '@type': 'Country' as const, name: 'AR' },
    seller: { '@type': 'Organization' as const, name: 'Jconefix', url: base },
    priceSpecification: [
      {
        '@type': 'UnitPriceSpecification' as const,
        price: String(JC_PLAN_AR.priceMonth),
        priceCurrency: JC_PLAN_AR.currency,
        unitText: 'MONTH',
      },
      {
        '@type': 'UnitPriceSpecification' as const,
        price: '0',
        priceCurrency: JC_PLAN_AR.currency,
        referenceQuantity: {
          '@type': 'QuantitativeValue' as const,
          value: PUBLIC_TRIAL_DAYS,
          unitCode: 'DAY',
        },
      },
    ],
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        '@id': `${pageUrl}#software`,
        name: productName,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: pageUrl,
        description: metaDescription,
        offers: { '@id': offerId },
      },
      {
        '@type': 'Product',
        '@id': `${pageUrl}#product`,
        name: productName,
        description: metaDescription,
        sku: 'jconefix-premium-full-ar',
        brand: { '@type': 'Brand', name: 'Jconefix' },
        category: 'Software de gestión de taller',
        url: pageUrl,
        image: [`${base}/nuevologo.png`],
        offers: { '@id': offerId },
      },
      mainOffer,
    ],
  };
}

export default function PreciosPage() {
  const monthTotal = JC_PLAN_AR.priceMonth * 12;
  const annualDiscountPct = Math.round((1 - JC_PLAN_AR.priceYear / monthTotal) * 100);
  const annualPerMonth = Math.round(JC_PLAN_AR.priceYear / 12);
  const productJsonLd = buildPreciosSchemaJsonLd();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <div className="min-h-screen bg-[#050a12] text-white">
        <LandingSiteHeader />
        <main className="mx-auto max-w-6xl px-4 pb-20 pt-[5.5rem] sm:px-6 sm:pt-24 lg:px-8 lg:pt-28">
          <header className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-[#F5C518]">
              Plan Premium Full
            </p>
            <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.5rem] lg:leading-tight">
              Prueba real de {PUBLIC_TRIAL_DAYS} días, sin tarjeta y con el gestor completo
            </h1>
            <p className="mt-4 text-pretty text-base text-white/80 sm:text-lg">
              Activá tickets, clientes, inventario, TPV, informes, ARCA/AFIP y todo lo que ves en el panel.
              Sin pedir tarjeta: medí el flujo en tu taller antes de pagar.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href={REGISTER_QUICK_HREF}>
                <Button className="rounded-full bg-[#F5C518] px-6 text-base font-semibold text-[#0D1117] hover:bg-[#D4A915]">
                  Prueba gratis {PUBLIC_TRIAL_DAYS} días — registro rápido
                </Button>
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-white/25 px-5 py-2.5 text-sm font-semibold text-white/95 hover:border-white/45"
              >
                Ya tengo cuenta
              </Link>
            </div>
          </header>

          <section
            className="mt-14 grid gap-6 md:grid-cols-2"
            aria-labelledby="precios-heading"
          >
            <h2 id="precios-heading" className="sr-only">
              Precios mensual y anual
            </h2>
            <article className="rounded-2xl border border-white/15 bg-white/[0.04] p-6 shadow-lg backdrop-blur sm:p-8">
              <h3 className="text-lg font-semibold text-white">Facturación mensual</h3>
              <p className="mt-1 text-sm text-white/65">Cancelás cuando quieras según términos vigentes.</p>
              <p className="mt-6 flex flex-wrap items-baseline gap-2">
                <span className="text-4xl font-bold tracking-tight text-[#F5C518] sm:text-5xl">
                  {formatPrecioListadoArs(JC_PLAN_AR.priceMonth)}
                </span>
                <span className="text-white/75">/ mes</span>
              </p>
              <p className="mt-2 text-sm text-white/70">
                Precio en pesos argentinos ({JC_PLAN_AR.currency}). {JC_PLAN_AR.headerNote}
              </p>
            </article>
            <article className="relative rounded-2xl border border-[#F5C518]/40 bg-[#0d1824] p-6 shadow-[0_0_0_1px_rgba(245,197,24,0.12)] sm:p-8">
              <span className="absolute right-4 top-4 rounded-full bg-[#F5C518] px-3 py-1 text-xs font-bold text-[#0D1117]">
                Ahorrá ~{annualDiscountPct}%
              </span>
              <h3 className="text-lg font-semibold text-white">Pago anual anticipado</h3>
              <p className="mt-1 text-sm text-white/65">
                Un solo pago al año: descuento aproximado del {annualDiscountPct}% respecto de abonar 12 meses a
                precio de lista mensual.
              </p>
              <p className="mt-6 flex flex-wrap items-baseline gap-2">
                <span className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                  {formatPrecioListadoArs(JC_PLAN_AR.priceYear)}
                </span>
                <span className="text-white/75">/ año</span>
              </p>
              <p className="mt-2 text-sm text-[#F5C518]/90">
                Equivale a {formatPrecioListadoArs(annualPerMonth)} por mes facturado de forma anual (
                {formatPrecioListadoArs(monthTotal)} si pagás 12 veces el valor mensual).
              </p>
            </article>
          </section>

          <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-relaxed text-white/50 sm:text-sm">
            {PRECIOS_TRANSPARENCY_NOTE}
          </p>

          <section className="mt-16" aria-labelledby="sin-cargos-heading">
            <h2 id="sin-cargos-heading" className="text-center text-2xl font-bold text-white sm:text-3xl">
              Sin cargos extra por
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-white/75">
              Un precio claro para el plan completo: lo que ves en la lista de funciones está incluido en la
              licencia, sin letras chicas por volumen operativo.
            </p>
            <ul className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-2">
              {NO_EXTRA_CHARGES.map((label) => (
                <li
                  key={label}
                  className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm sm:text-base"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#F5C518]" aria-hidden />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-20" aria-labelledby="funciones-heading">
            <h2 id="funciones-heading" className="text-center text-2xl font-bold text-white sm:text-3xl">
              {JC_PLAN_AR.features.length} funciones del Plan Premium Full
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-white/75">
              Incluye Gemini en tickets (clave de tu taller), presupuestos por WhatsApp con plantilla o IA, WhatsApp al
              cliente, multi-sede unificada, impresión QZ Tray y nodo, ARCA/AFIP en panel y el flujo completo en texto.
            </p>
            <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {JC_PLAN_AR.features.map((line) => {
                const { title, body } = parsePlanFeatureLine(line);
                return (
                  <li
                    key={line}
                    className={cn(
                      'rounded-xl border border-white/10 bg-white/[0.04] p-4 text-left',
                      'shadow-sm transition-colors hover:border-white/20',
                    )}
                  >
                    <div className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#F5C518]" aria-hidden />
                      <div>
                        <h3 className="font-semibold leading-snug text-white">{title}</h3>
                        {body ? <p className="mt-1.5 text-sm leading-relaxed text-white/70">{body}</p> : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="mt-16 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center">
            <p className="text-lg font-semibold text-white">¿Listo para probarlo en tu taller?</p>
            <p className="mt-2 text-sm text-white/70">
              {PUBLIC_TRIAL_DAYS} días con el panel completo, sin tarjeta.
            </p>
            <Link href={REGISTER_QUICK_HREF} className="mt-6 inline-block">
              <Button className="rounded-full bg-[#F5C518] px-8 text-base font-semibold text-[#0D1117] hover:bg-[#D4A915]">
                Prueba gratis {PUBLIC_TRIAL_DAYS} días — registro rápido
              </Button>
            </Link>
          </section>
        </main>
        <PreciosPaymentTrustBar />
        <MarketingFooter />
      </div>
    </>
  );
}
