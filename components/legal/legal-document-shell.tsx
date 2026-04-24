import Link from 'next/link';
import type { ReactNode } from 'react';

export function LegalDocumentShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0D1117] text-slate-300">
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-3xl px-5 py-4 sm:px-8">
          <Link
            href="/"
            className="text-xs font-medium text-[#F5C518] transition-colors hover:text-[#D4A915]"
          >
            ← Volver al inicio
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-12">
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
        <p className="mt-2 text-xs text-slate-500">Última actualización: {updated}</p>
        <article className="mt-10 space-y-6 text-sm leading-relaxed text-slate-400">{children}</article>
      </main>
    </div>
  );
}
