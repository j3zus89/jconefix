import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Registro gratuito | 30 días de prueba JC ONE FIX',
  description:
    'Creá tu cuenta gratis y empezá a gestionar tu taller. 30 días de prueba completa con tickets, stock y facturación AFIP.',
  openGraph: {
    title: 'Registro gratuito | 30 días de prueba JC ONE FIX',
    description:
      'Creá tu cuenta gratis y empezá a gestionar tu taller. 30 días de prueba completa con tickets, stock y facturación AFIP.',
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
