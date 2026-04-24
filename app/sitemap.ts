import type { MetadataRoute } from 'next';
import { getCompararPage, getCompararSlugs } from '@/lib/comparar-pages';
import { getArgentinaLandingSlugs } from '@/lib/seo/argentina-landing-pages';
import { getRubroSlugs } from '@/lib/seo/rubros-static';
import { getSiteCanonicalUrl } from '@/lib/site-canonical';

/** Evita sitemap.xml “congelado” en build: cada request regenera el XML (CDN del host puede seguir cacheando). */
export const revalidate = 0;
export const dynamic = 'force-dynamic';

const arLang = (url: string) => ({
  alternates: { languages: { 'es-AR': url, 'x-default': url } },
});

/**
 * Sitemap generado para Search Console:
 * - `/comparar` + cada `/comparar/[slug]` vía `getCompararSlugs()` / `getCompararPage` → `lib/comparar-pages.ts`
 * - `/ayuda/importar-datos-taller` (entrada explícita abajo)
 * Al sumar una guía nueva al array `pages`, el XML la incluye sin editar esta lista a mano.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteCanonicalUrl();
  const lastMod = new Date();
  const home = `${base}/`;

  const solucionesIndex = `${base}/soluciones`;
  const solucionesLanding = getArgentinaLandingSlugs().map((slug) => {
    const url = `${base}/soluciones/${slug}`;
    return {
      url,
      lastModified: lastMod,
      changeFrequency: 'monthly' as const,
      priority: 0.82,
      ...arLang(url),
    };
  });

  const comparar = getCompararSlugs().map((slug) => {
    const url = `${base}/comparar/${slug}`;
    const def = getCompararPage(slug);
    const lastModified =
      def?.updated && !Number.isNaN(Date.parse(def.updated)) ? new Date(def.updated) : lastMod;
    return {
      url,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
      ...arLang(url),
    };
  });

  const rubrosIndex = `${base}/rubros`;
  const rubrosPages = getRubroSlugs().map((slug) => {
    const url = `${base}/rubros/${slug}`;
    return {
      url,
      lastModified: lastMod,
      changeFrequency: 'monthly' as const,
      priority: 0.84,
      ...arLang(url),
    };
  });

  const ayudaImportar = `${base}/ayuda/importar-datos-taller`;

  return [
    {
      url: home,
      lastModified: lastMod,
      changeFrequency: 'weekly',
      priority: 1,
      ...arLang(home),
    },
    {
      url: ayudaImportar,
      lastModified: lastMod,
      changeFrequency: 'monthly',
      priority: 0.86,
      ...arLang(ayudaImportar),
    },
    {
      url: `${base}/comparar`,
      lastModified: lastMod,
      changeFrequency: 'weekly',
      priority: 0.85,
      ...arLang(`${base}/comparar`),
    },
    {
      url: `${base}/precios`,
      lastModified: lastMod,
      changeFrequency: 'weekly',
      priority: 0.91,
      ...arLang(`${base}/precios`),
    },
    {
      url: solucionesIndex,
      lastModified: lastMod,
      changeFrequency: 'weekly',
      priority: 0.88,
      ...arLang(solucionesIndex),
    },
    {
      url: rubrosIndex,
      lastModified: lastMod,
      changeFrequency: 'weekly',
      priority: 0.87,
      ...arLang(rubrosIndex),
    },
    ...solucionesLanding,
    ...comparar,
    ...rubrosPages,
  ];
}
