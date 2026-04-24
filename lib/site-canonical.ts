import type { Metadata } from 'next';

/** Dominio público por defecto (build sin `NEXT_PUBLIC_SITE_URL`, emails, fallbacks). */
export const DEFAULT_PUBLIC_SITE_URL = 'https://jconefix.com.ar';

function isProductionDeploy(): boolean {
  return (
    process.env.VERCEL_ENV === 'production' ||
    process.env.CONTEXT === 'production'
  );
}

function isUnsafeCanonicalHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '[::1]' ||
    h === '::1' ||
    h.endsWith('.local')
  );
}

/** URL canónica del sitio público (OG, sitemaps, JSON-LD). */
export function getSiteCanonicalUrl(): string {
  if (isProductionDeploy()) {
    return DEFAULT_PUBLIC_SITE_URL;
  }

  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!env) return DEFAULT_PUBLIC_SITE_URL;

  let candidate = env.replace(/\/$/, '');
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }
  try {
    const parsed = new URL(candidate);
    if (!parsed.hostname || isUnsafeCanonicalHost(parsed.hostname)) {
      return DEFAULT_PUBLIC_SITE_URL;
    }
    const path = parsed.pathname.replace(/\/$/, '');
    return path ? `${parsed.origin}${path}` : parsed.origin;
  } catch {
    return DEFAULT_PUBLIC_SITE_URL;
  }
}

/** Hreflang para sitio solo Argentina (es-AR + x-default). Refuerza país/idioma frente a Google. */
export function getArgentinaAlternates(canonicalUrl: string): NonNullable<Metadata['alternates']> {
  return {
    canonical: canonicalUrl,
    languages: {
      'es-AR': canonicalUrl,
      'x-default': canonicalUrl,
    },
  };
}
