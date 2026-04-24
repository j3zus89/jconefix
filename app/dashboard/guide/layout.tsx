import type { Metadata } from 'next';

/** La guía vive detrás del login; evitamos indexación para no competir con /ayuda. */
export const metadata: Metadata = {
  title: 'Guía de usuario del panel',
  description:
    'Manual integrado de JC ONE FIX: clientes, órdenes, inventario, facturación y configuración para talleres en Argentina.',
  robots: { index: false, follow: false },
};

export default function DashboardGuideLayout({ children }: { children: React.ReactNode }) {
  return children;
}
