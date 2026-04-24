import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LandingSiteHeader } from '@/components/landing/LandingSiteHeader';
import { MarketingFooter } from '@/components/landing/marketing-footer';
import {
  getRubroSlugs,
  isRubroSlug,
  RUBROS,
  type RubroSlug,
} from '@/lib/seo/rubros-static';
import { getSiteCanonicalUrl } from '@/lib/site-canonical';

const base = getSiteCanonicalUrl();

export function generateStaticParams(): { slug: RubroSlug }[] {
  return getRubroSlugs().map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: raw } = await params;
  if (!isRubroSlug(raw)) return {};
  const r = RUBROS[raw];
  const url = `${base}/rubros/${raw}`;
  const title = `${r.metaTitle} | Jconefix`;
  const desc = r.metaDescription;
  return {
    title: { absolute: title },
    description: desc,
    alternates: { canonical: url, languages: { 'es-AR': url, 'x-default': url } },
    openGraph: {
      type: 'article',
      url,
      siteName: 'JC ONE FIX',
      title,
      description: desc,
      locale: 'es_AR',
      images: [
        {
          url: `${base}/api/og?v=7`,
          width: 1200,
          height: 630,
          alt: `Software de servicio técnico ${r.h1Label} — Jconefix`,
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: [{ url: `${base}/api/og?v=7`, width: 1200, height: 630, alt: title }],
    },
  };
}

function rubroWebPageJsonLd(slug: RubroSlug) {
  const r = RUBROS[slug];
  const url = `${base}/rubros/${slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Software para servicio técnico de ${r.h1Label} en Argentina`,
    description: r.metaDescription,
    url,
    isPartOf: { '@type': 'WebSite', name: 'JC ONE FIX', url: base },
    publisher: { '@type': 'Organization', name: 'JC ONE FIX', url: base },
  };
}

export default async function RubroPage({ params }: Props) {
  const { slug: raw } = await params;
  if (!isRubroSlug(raw)) notFound();
  const r = RUBROS[raw];

  return (
    <div className="min-h-screen bg-[#050a12] text-white">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(rubroWebPageJsonLd(raw)) }}
      />
      <LandingSiteHeader />
      <main className="relative mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        <nav className="text-xs text-slate-500 mb-8">
          <Link href="/" className="hover:text-[#F5C518]">
            Inicio
          </Link>
          <span className="mx-2">/</span>
          <span className="text-slate-400">Rubros</span>
          <span className="mx-2">/</span>
          <span className="text-slate-300">{r.h1Label}</span>
        </nav>

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F5C518] mb-3">
          Jconefix · Argentina
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white leading-tight">
          Software para Servicio Técnico de {r.h1Label} en Argentina
        </h1>
        <p className="mt-6 text-slate-300 leading-relaxed text-base">{r.intro}</p>

        <ul className="mt-10 space-y-8">
          {r.painPoints.map((p) => (
            <li key={p.title} className="border-l-2 border-[#F5C518]/50 pl-5">
              <h2 className="text-lg font-semibold text-white">{p.title}</h2>
              <p className="mt-2 text-slate-400 text-sm leading-relaxed">{p.body}</p>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-slate-300 leading-relaxed">{r.closing}</p>

        <div className="mt-12 flex flex-wrap gap-4">
          <Button asChild className="bg-[#F5C518] text-[#0D1117] hover:bg-[#D4A915] font-semibold">
            <Link href="/register">Probar 30 días gratis</Link>
          </Button>
          <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10">
            <Link href="/soluciones">Más soluciones por rubro</Link>
          </Button>
        </div>
      </main>
      <MarketingFooter variant="dark" />
    </div>
  );
}
