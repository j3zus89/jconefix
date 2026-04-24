import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllCompararPages } from '@/lib/comparar-pages';
import { getArgentinaAlternates, getSiteCanonicalUrl } from '@/lib/site-canonical';

const base = getSiteCanonicalUrl();

export const metadata: Metadata = {
  title: 'Comparar: software de taller, AFIP y alternativas',
  description:
    'Guías y comparaciones para elegir gestión de taller: Excel vs software, facturación electrónica en Argentina, reparación de electrónica y más.',
  alternates: getArgentinaAlternates(`${base}/comparar`),
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
    title: 'Comparar — JC ONE FIX',
    description:
      'Guías sobre software de taller, AFIP/ARCA y alternativas prácticas para talleres de reparación.',
    url: `${base}/comparar`,
    locale: 'es_AR',
    type: 'website',
  },
};

export default function CompararIndexPage() {
  const pages = getAllCompararPages();

  const indexJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Comparar y guías — JC ONE FIX',
    description:
      'Listado de guías y comparaciones sobre gestión de taller y facturación electrónica en Argentina.',
    url: `${base}/comparar`,
    inLanguage: 'es-AR',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: pages.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: p.h1,
        url: `${base}/comparar/${p.slug}`,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(indexJsonLd) }}
      />
      <article>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Comparar y guías
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Contenido pensado para quien busca <strong>software de gestión de taller</strong>,{' '}
          <strong>facturación AFIP / ARCA</strong> en Argentina o <strong>alternativas a Excel</strong> en reparación de
          electrónica. Cada página es una lectura única; no son plantillas automáticas.
        </p>
        <ul className="mt-8 space-y-4">
          {pages.map((p) => (
            <li
              key={p.slug}
              className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <Link href={`/comparar/${p.slug}`} className="block group">
                <h2 className="text-base font-semibold text-slate-900 group-hover:text-primary">{p.h1}</h2>
                <p className="mt-2 text-sm text-slate-600 line-clamp-2">{p.metaDescription}</p>
                <span className="mt-2 inline-block text-xs font-medium text-primary">Leer guía →</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-sm leading-relaxed text-slate-600">
          <strong className="text-slate-800">Importar tu historial:</strong>{' '}
          <Link href="/ayuda/importar-datos-taller" className="font-medium text-[#0d9488] hover:underline">
            Guía para importar clientes y órdenes desde Excel
          </Link>{' '}
          (mapeo de columnas, validación y deduplicación en el panel).
        </p>
        <p className="mt-4 text-xs text-slate-500">
          ¿Querés probar el producto?{' '}
          <Link href="/" className="font-medium text-primary hover:underline">
            Ir al inicio y ver planes
          </Link>
          .
        </p>
      </article>
    </>
  );
}
