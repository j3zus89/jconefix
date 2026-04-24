import type { Metadata } from 'next';
import Link from 'next/link';
import { LandingSiteHeader } from '@/components/landing/LandingSiteHeader';
import { MarketingFooter } from '@/components/landing/marketing-footer';
import { getRubroSlugs, RUBROS } from '@/lib/seo/rubros-static';
import { getSiteCanonicalUrl } from '@/lib/site-canonical';

const base = getSiteCanonicalUrl();
const url = `${base}/rubros`;

export const metadata: Metadata = {
  title: { absolute: 'Software de taller por rubro en Argentina | Jconefix' },
  description:
    'Páginas por especialidad: celulares, computación, refrigeración y electrónica. Órdenes de reparación, stock, facturación ARCA y WhatsApp con JC ONE FIX.',
  alternates: { canonical: url, languages: { 'es-AR': url, 'x-default': url } },
  openGraph: {
    title: 'Software de taller por rubro en Argentina | Jconefix',
    description:
      'Soluciones para servicio técnico: smartphones, PC, refrigeración y electrónica general.',
    url,
    siteName: 'JC ONE FIX',
    locale: 'es_AR',
    type: 'website',
    images: [{ url: `${base}/api/og?v=7`, width: 1200, height: 630, alt: 'Jconefix — software de taller' }],
  },
};

export default function RubrosIndexPage() {
  const slugs = getRubroSlugs();
  return (
    <div className="min-h-screen bg-[#050a12] text-white">
      <LandingSiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold">Software de taller por rubro</h1>
        <p className="mt-4 text-slate-400 leading-relaxed">
          Elegí tu especialidad para ver cómo Jconefix encaja en tu día a día en Argentina.
        </p>
        <ul className="mt-10 space-y-4">
          {slugs.map((slug) => {
            const r = RUBROS[slug];
            return (
              <li key={slug}>
                <Link
                  href={`/rubros/${slug}`}
                  className="block rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 transition-colors hover:border-[#F5C518]/40 hover:bg-white/[0.06]"
                >
                  <span className="font-semibold text-white">Servicio técnico de {r.h1Label}</span>
                  <p className="mt-1 text-sm text-slate-500">{r.metaDescription.slice(0, 120)}…</p>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
      <MarketingFooter variant="dark" />
    </div>
  );
}
