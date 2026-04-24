import Link from 'next/link';
import type { Metadata } from 'next';
import { MarketingFooter } from '@/components/landing/marketing-footer';
import { ARGENTINA_LANDING_PAGES } from '@/lib/seo/argentina-landing-pages';
import { getArgentinaAlternates, getSiteCanonicalUrl } from '@/lib/site-canonical';

const base = getSiteCanonicalUrl();
const canonical = `${base}/soluciones`;

export const metadata: Metadata = {
  title: 'Soluciones para talleres en Argentina',
  description:
    'Guías y landing pages por rubro: servicio técnico de celulares, computación, electrodomésticos, microelectrónica y facturación monotributo. Software JC ONE FIX (Jconefix).',
  alternates: getArgentinaAlternates(canonical),
  openGraph: {
    title: 'Soluciones para talleres en Argentina | JC ONE FIX',
    description:
      'Recursos por rubro para posicionar tu taller: celulares, PC, línea blanca, reballing y monotributo con JC ONE FIX.',
    url: canonical,
    locale: 'es_AR',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export default function SolucionesIndexPage() {
  return (
    <>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <nav className="mb-8 text-xs text-slate-500">
          <Link href="/" className="hover:text-[#F5C518]">
            Inicio
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-slate-300">Soluciones</span>
        </nav>

        <h1 className="font-serif text-3xl font-bold text-white sm:text-4xl">
          Soluciones para <span className="text-[#F5C518]">talleres en Argentina</span>
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-400">
          Elegí tu rubro: cada página está pensada para búsquedas específicas (long tail) y explica cómo{' '}
          <strong className="text-slate-200">JC ONE FIX</strong> ayuda con órdenes, stock y facturación en pesos.
        </p>

        <ul className="mt-10 space-y-4">
          {ARGENTINA_LANDING_PAGES.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/soluciones/${p.slug}`}
                className="group block rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 transition-colors hover:border-[#F5C518]/35 hover:bg-white/[0.06]"
              >
                <span className="font-semibold text-white group-hover:text-[#F5C518] transition-colors">
                  {p.title}
                </span>
                <p className="mt-1 text-xs text-slate-500 leading-snug">{p.metaDescription}</p>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-12 rounded-xl border border-[#F5C518]/25 bg-[#F5C518]/20 p-6">
          <p className="text-sm text-slate-300">
            ¿Listo para probar? <Link href="/register" className="font-semibold text-[#F5C518] hover:underline">Registrate</Link>
            {' · '}
            <Link href="/#pricing" className="text-[#F5C518]/90 hover:underline">
              Ver precios en ARS
            </Link>
          </p>
        </div>
      </main>
      <MarketingFooter variant="dark" />
    </>
  );
}
