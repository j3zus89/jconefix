import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Recuperar contraseña | JC ONE FIX',
  description:
    'Recuperá el acceso a tu cuenta de JC ONE FIX. Te enviaremos un enlace seguro a tu correo.',
  openGraph: {
    title: 'Recuperar contraseña | JC ONE FIX',
    description:
      'Recuperá el acceso a tu cuenta de JC ONE FIX. Te enviaremos un enlace seguro a tu correo.',
  },
};

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
