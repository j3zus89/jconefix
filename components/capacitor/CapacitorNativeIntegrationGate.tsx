'use client';

import dynamic from 'next/dynamic';

/**
 * Carga Capacitor solo en el cliente. Evita que Webpack exija `vendor-chunks/@capacitor.js`
 * en el servidor (RSC), donde a veces falta el chunk y rompe rutas como /comparar/[slug].
 */
export const CapacitorNativeIntegrationLazy = dynamic(
  () =>
    import('@/components/capacitor/CapacitorNativeIntegration').then((mod) => ({
      default: mod.CapacitorNativeIntegration,
    })),
  { ssr: false, loading: () => null }
);
