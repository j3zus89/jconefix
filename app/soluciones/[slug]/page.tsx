import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { MarketingFooter } from '@/components/landing/marketing-footer';
import {
  getArgentinaLandingPage,
  getArgentinaLandingSlugs,
} from '@/lib/seo/argentina-landing-pages';
import { getArgentinaAlternates, getSiteCanonicalUrl } from '@/lib/site-canonical';

const base = getSiteCanonicalUrl();

function Rich({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-white">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export function generateStaticParams() {
  return getArgentinaLandingSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getArgentinaLandingPage(slug);
  if (!page) return { title: 'No encontrado' };

  const canonical = `${base}/soluciones/${page.slug}`;

  return {
    title: page.title,
    description: page.metaDescription,
    keywords: page.keywords,
    alternates: getArgentinaAlternates(canonical),
    openGraph: {
      title: `${page.title} | JC ONE FIX`,
      description: page.metaDescription,
      url: canonical,
      locale: 'es_AR',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${page.title} | JC ONE FIX`,
      description: page.metaDescription,
    },
    robots: { index: true, follow: true },
  };
}

export default async function SolucionLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = getArgentinaLandingPage(slug);
  if (!page) notFound();

  const canonical = `${base}/soluciones/${page.slug}`;

  const breadcrumbJson = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${base}/` },
      { '@type': 'ListItem', position: 2, name: 'Soluciones', item: `${base}/soluciones` },
      { '@type': 'ListItem', position: 3, name: page.title, item: canonical },
    ],
  };

  const webPageJson = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.title,
    description: page.metaDescription,
    url: canonical,
    inLanguage: 'es-AR',
    isPartOf: {
      '@type': 'WebSite',
      name: 'JC ONE FIX',
      url: base,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJson) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJson) }}
      />

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <nav className="mb-8 text-xs text-slate-500">
          <Link href="/" className="hover:text-[#F5C518]">
            Inicio
          </Link>
          <span className="mx-1.5">/</span>
          <Link href="/soluciones" className="hover:text-[#F5C518]">
            Soluciones
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-slate-400 line-clamp-1">{page.title}</span>
        </nav>

        <header className="border-b border-white/10 pb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#F5C518] mb-2">
            Argentina · Talleres · JC ONE FIX
          </p>
          <h1 className="font-serif text-3xl font-bold leading-tight text-white sm:text-4xl">{page.title}</h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            <Rich text={page.intro} />
          </p>
        </header>

        <div className="mt-10 space-y-12">
          {page.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">{section.heading}</h2>
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-400">
                {section.paragraphs.map((para, i) => (
                  <p key={i}>
                    <Rich text={para} />
                  </p>
                ))}
                {section.bullets && section.bullets.length > 0 ? (
                  <ul className="list-disc space-y-2 pl-5 text-slate-400">
                    {section.bullets.map((b, i) => (
                      <li key={i}>
                        <Rich text={b} />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            asChild
            className="bg-[#F5C518] text-[#0D1117] hover:bg-[#D4A915] font-semibold border-0 h-11 px-8"
          >
            <Link href="/register">Empezar prueba gratis</Link>
          </Button>
          <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10 h-11">
            <Link href="/#pricing">Ver precios en pesos</Link>
          </Button>
        </div>

        <p className="mt-8 text-xs text-slate-600">
          También podés comparar con otras opciones en nuestra{' '}
          <Link href="/comparar" className="text-[#F5C518]/90 hover:underline">
            sección Comparar
          </Link>
          .
        </p>
      </article>

      <MarketingFooter variant="dark" />
    </>
  );
}
