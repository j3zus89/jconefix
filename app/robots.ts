import type { MetadataRoute } from 'next';
import { getSiteCanonicalUrl } from '@/lib/site-canonical';

export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  const base = getSiteCanonicalUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/admin/'],
      },
    ],
    sitemap: [`${base}/sitemap.xml`, `${base}/sitemap-ayuda.xml`],
  };
}
