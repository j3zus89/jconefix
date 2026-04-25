import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Iniciar sesión | Acceso al panel de gestión',
  description:
    'Accedé a tu panel de JC ONE FIX. Gestión de tickets, inventario y clientes para tu taller de reparación.',
  openGraph: {
    title: 'Iniciar sesión | Acceso al panel de gestión',
    description:
      'Accedé a tu panel de JC ONE FIX. Gestión de tickets, inventario y clientes para tu taller de reparación.',
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
