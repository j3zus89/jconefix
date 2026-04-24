import { JC_PLAN_AR } from '@/lib/plan-marketing';
import { getSiteCanonicalUrl } from '@/lib/site-canonical';

/** JSON-LD Schema.org SoftwareApplication para JC ONE FIX (Jconefix). */
export function getJcOneFixSoftwareApplicationJsonLd(): Record<string, unknown> {
  const base = getSiteCanonicalUrl();
  const priceValidUntil = `${new Date().getFullYear() + 1}-12-31`;

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'JC ONE FIX',
    alternateName: ['Jconefix', 'JC One Fix'],
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Repair Shop Management Software',
    operatingSystem: 'Web',
    browserRequirements: 'Requires JavaScript. Navegador actualizado (Chrome, Firefox, Safari, Edge).',
    url: base,
    description:
      'Software y gestor de taller de reparación en Argentina (ARS): órdenes de reparación, control de stock, TPV, clientes e integración con ARCA/AFIP para facturación electrónica cuando configurás certificado y punto de venta.',
    featureList: [
      'Orden de reparación',
      'Control de stock',
      'Integración con ARCA/AFIP',
      'Punto de venta y caja',
      'Clientes e historial',
      'Informes del taller',
    ],
    offers: {
      '@type': 'Offer',
      price: String(JC_PLAN_AR.priceMonth),
      priceCurrency: 'ARS',
      availability: 'https://schema.org/InStock',
      url: `${base}/checkout/ar`,
      priceValidUntil,
      seller: {
        '@type': 'Organization',
        name: 'JC ONE FIX',
        url: base,
      },
    },
    provider: {
      '@type': 'Organization',
      name: 'JC ONE FIX',
      url: base,
    },
  };
}
