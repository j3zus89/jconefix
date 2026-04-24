import type { Metadata } from 'next';

/**
 * Ayuda pública: robots explícitos con snippets permitidos (refuerza frente al layout raíz y a HowTo / rich results).
 */
export const metadata: Metadata = {
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

export default function AyudaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
