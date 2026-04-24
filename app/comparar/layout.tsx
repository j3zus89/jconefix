import Link from 'next/link';
import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Comparar y guías',
  description:
    'Guías y comparaciones sobre software de gestión de taller, facturación AFIP/ARCA en Argentina y alternativas a planillas.',
  robots: { index: true, follow: true },
};

export default function CompararLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header data-web-chrome className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="text-sm font-bold tracking-tight text-slate-900 hover:text-primary">
            JC ONE FIX
          </Link>
          <nav className="flex items-center gap-4 text-xs font-medium text-slate-600">
            <Link href="/comparar" className="hover:text-primary">
              Comparar
            </Link>
            <Link href="/login" className="hover:text-primary">
              Ingresar
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
      <footer data-web-chrome className="border-t border-slate-200/80 bg-white py-6 text-center text-[11px] text-slate-500">
        <Link href="/privacidad" className="hover:underline">
          Privacidad
        </Link>
        <span className="mx-2">·</span>
        <Link href="/terminos" className="hover:underline">
          Términos
        </Link>
        <span className="mx-2">·</span>
        <Link href="/" className="hover:underline">
          Inicio
        </Link>
      </footer>
    </div>
  );
}
