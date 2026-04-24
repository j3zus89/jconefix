import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Página no encontrada',
  robots: { index: false, follow: true },
};

/**
 * Reemplaza el 404 por defecto de Next (inglés) por un mensaje en español alineado con el sitio.
 */
export default function NotFound() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-6 bg-[#060d14] px-6 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-[#F5C518]">Error 404</p>
      <h1 className="max-w-md text-2xl font-semibold text-white sm:text-3xl">
        No encontramos esta página
      </h1>
      <p className="max-w-md text-sm leading-relaxed text-slate-400">
        La dirección puede estar mal escrita, la página se movió o aún no está publicada en esta versión del
        sitio. Si acabás de actualizar el panel, probá de nuevo más tarde o volvé al inicio.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-[#F5C518] px-6 py-2.5 text-sm font-semibold text-[#0D1117] transition-colors hover:bg-[#D4A915]"
        >
          Ir al inicio
        </Link>
        <Link
          href="/ayuda/importar-datos-taller"
          className="rounded-full border border-white/20 bg-white/5 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
        >
          Guía: importar desde Excel
        </Link>
      </div>
    </div>
  );
}
