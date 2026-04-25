import './globals.css'; // Redeploy forced v2
import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import { SiteGuard } from '@/components/site-guard';
import { CapacitorNativeIntegrationLazy } from '@/components/capacitor/CapacitorNativeIntegrationGate';
import { getSiteCanonicalUrl } from '@/lib/site-canonical';
import { ARGENTINA_LANDING_PAGES } from '@/lib/seo/argentina-landing-pages';
import { JsonLd } from '@/components/seo/JsonLd';
import { RegisterServiceWorker } from '@/components/pwa/RegisterServiceWorker';

const APP_URL = getSiteCanonicalUrl();
const OG_TITLE = 'JC ONE FIX | Software de Gestión para Talleres de Reparación';
const OG_DESC =
  'El gestor de taller más completo de Argentina. Tickets, inventario, facturación AFIP/ARCA, WhatsApp automático e IA ilimitada. 30 días de prueba gratis.';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  /** Sin canonical global: si fija la home, otras rutas pueden heredar mal la URL canónica en GSC. Cada página (p. ej. `/`) define la suya. */
  title: {
    default: 'JC ONE FIX – Gestor de taller y software de reparación',
    template: '%s | JC ONE FIX',
  },
  description: OG_DESC,
  applicationName: 'JC ONE FIX',
  authors: [{ name: 'JC ONE FIX' }],
  keywords: [
    'gestor de taller',
    'software para taller',
    'software taller Argentina',
    'sistema de gestión de taller',
    'taller de reparación',
    'gestión de talleres',
    'tickets reparación',
    'inventario taller',
    'TPV taller',
    'punto de venta reparación celulares',
    'facturación electrónica taller',
    'AFIP ARCA taller',
    'Monotributo facturación taller',
    'reparación celulares software',
    'taller electrónica',
    'microsoldadura gestión',
    'JC ONE FIX',
    'Jconefix',
    ...ARGENTINA_LANDING_PAGES.flatMap((p) => [p.title, ...p.keywords]),
  ],
  icons: {
    // Sin icono por defecto - el usuario configura su logo desde el panel
  },
  openGraph: {
    type: 'website',
    url: APP_URL,
    siteName: 'JC ONE FIX',
    title: OG_TITLE,
    description: OG_DESC,
    locale: 'es_AR',
    images: [
      {
        url: `${APP_URL}/og-image1.png`,
        width: 1200,
        height: 630,
        alt: 'JC ONE FIX - Software de Gestión para Talleres',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@jconefix',
    title: OG_TITLE,
    description: OG_DESC,
    images: [
      {
        url: `${APP_URL}/og-image1.png`,
        width: 1200,
        height: 630,
        alt: 'JC ONE FIX - Software de Gestión para Talleres',
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    noarchive: true,
    /** Evitar nosnippet global: bloquea fragmentos en SERP y puede afectar rich results (p. ej. HowTo) y solicitudes de indexación. */
    googleBot: {
      index: true,
      follow: true,
      noarchive: true,
    },
  },
  verification: {
    google: 'UNrv7WvZIqB5-HjSweb21QjG0bpkJlVQk92k7FOOxRQ',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'JC ONE FIX',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  height: 'device-height',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
    { media: '(prefers-color-scheme: light)', color: '#0d9488' },
  ],
  colorScheme: 'dark light',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-AR" className="overflow-x-clip" suppressHydrationWarning>
      <head>
        {/* Localización a nivel país (sin coordenadas ni domicilio): refuerza mercado argentino para buscadores */}
        <meta name="geo.region" content="AR" />
        <meta name="geo.placename" content="Argentina" />
        {/* Abre conexión TCP/TLS con Supabase antes de que el JS la necesite */}
        <link rel="preconnect" href="https://fknzxqfmresrkqpkbfil.supabase.co" />
        <link rel="dns-prefetch" href="https://fknzxqfmresrkqpkbfil.supabase.co" />
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
        {/* Favicon dorado circular */}
        <link rel="icon" type="image/png" href="/nuevologo.png" />
        <link rel="shortcut icon" type="image/png" href="/nuevologo.png" />
        <link rel="apple-touch-icon" href="/nuevologo.png" />
        <JsonLd />
        {/* Google Ads Global Site Tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=AW-18084854714"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', 'AW-18084854714');`,
          }}
        />
      </head>
      <body className="min-h-dvh overflow-x-clip font-sans antialiased" suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var u=navigator.userAgent||'';if(u.indexOf('JCOneFixNative')===-1)return;document.documentElement.classList.add('cap-native');document.documentElement.setAttribute('data-capacitor-native','1');var boot=document.getElementById('cap-native-boot');if(boot)boot.style.display='flex';function rm(){var el=document.getElementById('cap-native-boot');if(!el||!el.parentNode)return;el.style.opacity='0';el.style.transition='opacity .52s ease';setTimeout(function(){var x=document.getElementById('cap-native-boot');if(x&&x.parentNode)x.parentNode.removeChild(x);},540);}function soon(){setTimeout(rm,80);}if(document.readyState==='complete')soon();else{window.addEventListener('load',soon,{once:true});document.addEventListener('DOMContentLoaded',function(){setTimeout(rm,500);},{once:true});}setTimeout(rm,2200);setTimeout(rm,7000);}catch(x){}})();`,
          }}
        />
        <div
          id="cap-native-boot"
          className="fixed inset-0 z-[2147483646] flex flex-col items-center justify-center gap-8 bg-[#004d40]"
          style={{ display: 'none' }}
          aria-live="polite"
          aria-busy="true"
          aria-label="Cargando JC ONE FIX"
        >
          {/* Sin rounded-full: el logo es circular en el arte; forzar círculo recortaba mal. */}
          <img
            src="/nuevologo.png?v=4"
            alt=""
            width={220}
            height={220}
            className="h-auto w-[min(58vw,220px)] max-w-[90vw] object-contain drop-shadow-[0_0_40px_rgba(13,148,136,0.22)]"
          />
          <div className="cap-native-spinner" aria-hidden />
        </div>
        <RegisterServiceWorker />
        <CapacitorNativeIntegrationLazy />
        <SiteGuard />
        {children}
        <Toaster
          position="bottom-right"
          richColors
          duration={2800}
          closeButton
          toastOptions={{
            className: 'select-text',
          }}
        />
      </body>
    </html>
  );
}
