import { getSiteCanonicalUrl } from '@/lib/site-canonical';
import type { CompararPageDef } from '@/lib/comparar-pages';

export function CompararJsonLd({ page }: { page: CompararPageDef }) {
  const base = getSiteCanonicalUrl();
  const url = `${base}/comparar/${page.slug}`;

  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.h1,
    description: page.metaDescription,
    url,
    inLanguage: 'es-AR',
    isPartOf: {
      '@type': 'WebSite',
      name: 'JC ONE FIX',
      url: base,
    },
    dateModified: page.updated,
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${base}/` },
      { '@type': 'ListItem', position: 2, name: 'Comparar', item: `${base}/comparar` },
      { '@type': 'ListItem', position: 3, name: page.h1, item: url },
    ],
  };

  const faq =
    page.faqs.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: page.faqs.map((f) => ({
            '@type': 'Question',
            name: f.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: f.answer,
            },
          })),
        }
      : null;

  const graph = [webPage, breadcrumb, ...(faq ? [faq] : [])];

  const payload = {
    '@context': 'https://schema.org',
    '@graph': graph,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
