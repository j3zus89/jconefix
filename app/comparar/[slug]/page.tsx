import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getCompararOgHeadline, getCompararPage, getCompararSlugs } from '@/lib/comparar-pages';
import { getArgentinaAlternates, getSiteCanonicalUrl } from '@/lib/site-canonical';
import { CompararJsonLd } from '@/components/comparar/CompararJsonLd';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const base = getSiteCanonicalUrl();

export function generateStaticParams() {
  return getCompararSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = getCompararPage(slug);
  if (!page) {
    return { title: 'No encontrado', robots: { index: false, follow: true } };
  }

  const canonical = `${base}/comparar/${page.slug}`;
  const ogHeadline = getCompararOgHeadline(page);
  const ogImageUrl = `${base}/api/og?v=8&title=${encodeURIComponent(ogHeadline)}`;

  return {
    title: { absolute: page.metaTitle },
    description: page.metaDescription,
    alternates: getArgentinaAlternates(canonical),
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      url: canonical,
      locale: 'es_AR',
      type: 'article',
      modifiedTime: page.updated,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: ogHeadline,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: page.metaTitle,
      description: page.metaDescription,
      images: [ogImageUrl],
    },
    /** Indexación explícita + Googlebot con snippets (Search Console / rich results). */
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
  };
}

export default async function CompararSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = getCompararPage(slug);
  if (!page) notFound();

  return (
    <>
      <CompararJsonLd page={page} />
      <article itemScope itemType="https://schema.org/Article">
        <nav className="mb-6 text-xs text-slate-500">
          <Link href="/" className="hover:text-primary">
            Inicio
          </Link>
          <span className="mx-1.5">/</span>
          <Link href="/comparar" className="hover:text-primary">
            Comparar
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-slate-700">{page.h1}</span>
        </nav>

        <header className="border-b border-slate-200/80 pb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl" itemProp="headline">
            {page.h1}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600" itemProp="description">
            {page.lead}
          </p>
          <p className="mt-2 text-[11px] text-slate-400">
            Actualizado: {new Date(page.updated).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </header>

        {page.comparisonTable && page.comparisonTable.length > 0 ? (
          <section className="mt-8" aria-labelledby="comparativa-heading">
            <h2 id="comparativa-heading" className="text-lg font-semibold tracking-tight text-slate-900">
              Tabla comparativa
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Resumen orientativo: Jconefix frente a un enfoque clásico de gestión ({page.competitorLabel ?? 'otro software'}).
              Las celdas describen tendencias habituales en el mercado, no una auditoría de un producto concreto.
            </p>
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="w-[22%] font-semibold text-slate-900">Aspecto</TableHead>
                    <TableHead className="font-semibold text-[#F5C518]">Jconefix</TableHead>
                    <TableHead className="font-semibold text-slate-800">
                      {page.competitorLabel ?? 'Otro enfoque'}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {page.comparisonTable.map((row) => (
                    <TableRow key={row.aspect}>
                      <TableCell className="align-top font-medium text-slate-900">{row.aspect}</TableCell>
                      <TableCell className="align-top text-slate-700">{row.jconefix}</TableCell>
                      <TableCell className="align-top text-slate-600">{row.competitor}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        ) : null}

        {page.whyChange ? (
          <Card className="mt-8 border-[#F5C518]/25 bg-gradient-to-br from-[#f0fdfa] to-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-slate-900">{page.whyChange.title}</CardTitle>
              <CardDescription className="text-slate-600">
                Evolución tecnológica: menos fricción entre taller, cliente y AFIP/ARCA.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {page.whyChange.paragraphs.map((para, i) => (
                <p key={i} className="text-[15px] leading-relaxed text-slate-700">
                  {para}
                </p>
              ))}
              <div className="pt-2">
                <Link
                  href="/register"
                  className="inline-flex h-10 items-center justify-center rounded-md bg-[#F5C518] px-4 text-sm font-medium text-white transition-colors hover:bg-[#F5C518]"
                >
                  Probar Jconefix gratis
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="mt-8 space-y-8">
          {page.sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">{s.title}</h2>
              <div className="mt-3 space-y-3">
                {s.paragraphs.map((para, i) => (
                  <p key={i} className="text-[15px] leading-relaxed text-slate-700">
                    {para}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {page.faqs.length > 0 ? (
          <section className="mt-10 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Preguntas frecuentes{page.comparisonTable ? ' y migración' : ''}
            </h2>
            <dl className="mt-4 space-y-5">
              {page.faqs.map((f) => (
                <div key={f.question}>
                  <dt className="text-sm font-medium text-slate-900">{f.question}</dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        <aside className="mt-10 rounded-xl border border-[#F5C518]/20 bg-[#f0fdfa]/80 p-4 text-sm text-slate-700">
          <p className="font-medium text-slate-900">Migrar desde Excel u otro sistema</p>
          <p className="mt-1.5 leading-relaxed text-slate-600">
            Guía paso a paso para importar clientes y órdenes con el asistente del panel:{' '}
            <Link href="/ayuda/importar-datos-taller" className="font-semibold text-[#F5C518] hover:underline">
              Importar datos del taller desde Excel
            </Link>
            .
          </p>
        </aside>

        <div className="mt-8 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-200 pt-8">
          <Link
            href="/comparar"
            className="text-sm font-medium text-primary hover:underline"
          >
            ← Ver todas las guías
          </Link>
          <Link
            href="/ayuda/importar-datos-taller"
            className="text-sm font-medium text-slate-600 hover:text-primary hover:underline"
          >
            Ayuda: importar Excel
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-slate-600 hover:text-primary hover:underline"
          >
            Ir al sitio principal
          </Link>
        </div>
      </article>
    </>
  );
}
