/** @type {import('next').NextConfig} */

const fs = require('fs');
const path = require('path');

// Solo en monorepo local (lockfile en el padre). En Vercel con Root Directory = `project`
// no existe ese padre en el bundle: forzar `..` rompe el deploy (ENOENT path0/path0/.next/...).
const parentDir = path.join(__dirname, '..');
const hasParentLockfile =
  fs.existsSync(path.join(parentDir, 'package-lock.json')) ||
  fs.existsSync(path.join(parentDir, 'pnpm-lock.yaml')) ||
  fs.existsSync(path.join(parentDir, 'yarn.lock'));

const securityHeaders = [
  // Evita que la web se incruste en iframes (clickjacking)
  { key: 'X-Frame-Options', value: 'DENY' },
  // Evita MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Controla la información de referencia enviada
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Fuerza HTTPS por 1 año; incluye subdominios
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  // Deshabilita APIs sensibles salvo en el propio origen. `camera=()` bloquea getUserMedia sin prompt.
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(), geolocation=(), usb=(), bluetooth=(), screen-wake-lock=()',
  },
  // Protección XSS básica para browsers legacy
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  // DNS prefetch off para evitar fugas de subdominio
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  // noarchive/nosnippet: solo en metadata del layout (HTML), no aquí — si van en /(.*) también
  // afectan /sitemap.xml y Google Search Console puede fallar al leer el sitemap.
  // CSP: restringe orígenes de recursos — ajustado a los CDNs que usa la app
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Scripts: Next (hydration), Vercel, PayPal SDK, Mercado Pago SDK/checkout
      [
        'script-src',
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        'https://vercel.live',
        'https://va.vercel-scripts.com',
        'https://www.paypal.com',
        'https://www.sandbox.paypal.com',
        'https://www.paypalobjects.com',
        'https://sdk.mercadopago.com',
        'https://www.mercadopago.com',
        'https://www.mercadopago.com.ar',
        'https://*.mercadopago.com',
        'https://*.mercadopago.com.ar',
      ].join(' '),
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      [
        'img-src',
        "'self'",
        'data:',
        'blob:',
        'https://images.unsplash.com',
        'https://*.supabase.co',
        'https://*.supabase.in',
        'https://ui-avatars.com',
        'https://www.paypalobjects.com',
        'https://www.mercadopago.com',
        'https://www.mercadopago.com.ar',
        'https://*.mercadopago.com',
        'https://*.mercadolibre.com',
        'https://*.mercadolibre.com.ar',
      ].join(' '),
      [
        'connect-src',
        "'self'",
        'https://*.supabase.co',
        'https://*.supabase.in',
        'wss://*.supabase.co',
        'https://vitals.vercel-insights.com',
        'https://va.vercel-scripts.com',
        'https://api.paypal.com',
        'https://www.paypal.com',
        'https://www.sandbox.paypal.com',
        'https://api.mercadopago.com',
        'https://www.mercadopago.com',
        'https://www.mercadopago.com.ar',
        'https://*.mercadopago.com',
        'https://*.mercadopago.com.ar',
        'https://*.mercadolibre.com',
        'https://*.mercadolibre.com.ar',
        'ws://localhost:*',
        'wss://localhost:*',
        'ws://127.0.0.1:*',
        'wss://127.0.0.1:*',
        'ws://localhost.qz.io:*',
        'wss://localhost.qz.io:*',
      ].join(' '),
      [
        'frame-src',
        "'self'",
        'https://www.paypal.com',
        'https://www.sandbox.paypal.com',
        'https://www.paypalobjects.com',
        'https://player.vimeo.com',
        'https://www.mercadopago.com',
        'https://www.mercadopago.com.ar',
        'https://*.mercadopago.com',
        'https://*.mercadopago.com.ar',
        'https://*.mercadolibre.com',
        'https://*.mercadolibre.com.ar',
      ].join(' '),
      "frame-ancestors 'none'",
      "object-src 'none'",
      "worker-src 'self' blob:",
      "base-uri 'self'",
      [
        'form-action',
        "'self'",
        'https://www.paypal.com',
        'https://www.sandbox.paypal.com',
        'https://www.mercadopago.com',
        'https://www.mercadopago.com.ar',
        'https://*.mercadopago.com',
        'https://*.mercadopago.com.ar',
      ].join(' '),
    ].join('; '),
  },
];

// Headers extra para el panel privado: sin caché y sin indexación
const dashboardHeaders = [
  { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
  { key: 'Pragma', value: 'no-cache' },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet' },
];

const nextConfig = {
  ...(hasParentLockfile ? { outputFileTracingRoot: parentDir } : {}),
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Excluir maia-bot del build de Vercel
  webpack: (config, { isServer }) => {
    // Ignorar completamente el directorio maia-bot usando externals
    if (!config.externals) {
      config.externals = [];
    }
    if (Array.isArray(config.externals)) {
      config.externals.push(/maia-bot/);
    }
    // Asegurar que maia-bot no se resuelva
    config.resolve.alias = {
      ...config.resolve.alias,
      'maia-bot$': false,
    };
    return config;
  },
  /**
   * Capacitor solo corre en cliente / APK. Si Webpack lo mete en el bundle RSC del servidor,
   * a veces genera `vendor-chunks/@capacitor.js` y falla en rutas como /comparar/[slug].
   */
  serverExternalPackages: [
    '@capacitor/core',
    '@capacitor/splash-screen',
    '@capacitor/status-bar',
  ],
  images: { unoptimized: true },

  // Elimina console.log/debug del bundle de producción (mantiene error y warn)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },

  // Optimiza imports de librerías grandes con barrel files (reduce JS bundle significativamente)
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'framer-motion',
      'date-fns',
      '@radix-ui/react-accordion',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-popover',
    ],
  },

  // No exponer la cabecera X-Powered-By (ligera mejora de seguridad y headers)
  poweredByHeader: false,

  async headers() {
    return [
      {
        // Aplica headers de seguridad a todas las rutas
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        // Panel privado: sin caché, sin indexación
        source: '/dashboard/:path*',
        headers: dashboardHeaders,
      },
      {
        // Área de admin: idem
        source: '/admin/:path*',
        headers: dashboardHeaders,
      },
      {
        // Sitemap: sin s-maxage largo — CDNs servían XML viejo sin /ayuda ni /soluciones.
        source: '/sitemap.xml',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate, s-maxage=60' },
        ],
      },
      {
        source: '/sitemap-ayuda.xml',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate, s-maxage=0' },
        ],
      },
      {
        source: '/robots.txt',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=300, s-maxage=3600' }],
      },
    ];
  },

  async redirects() {
    return [
      // Una sola URL canónica: si Google entra por el dominio Vercel, debe consolidar señales en .com.ar
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'jconefix.vercel.app' }],
        destination: 'https://jconefix.com.ar/:path*',
        permanent: true,
      },
      { source: '/favicon.ico', destination: '/nuevologo.png', permanent: false },
      { source: '/dashboard/knowledge', destination: '/dashboard', permanent: false },
      { source: '/sitemap-ayuda', destination: '/sitemap-ayuda.xml', permanent: true },
    ];
  },

  /** Misma página de guía con ?ar=1; la URL visible sigue siendo /dashboard/guide-ar */
  async rewrites() {
    return [
      { source: '/dashboard/guide-ar', destination: '/dashboard/guide?ar=1' },
    ];
  },
};

module.exports = nextConfig;
