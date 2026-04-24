import type { ReactNode } from 'react';
import Link from 'next/link';
import { JcOneFixMark, JcOneFixAppIcon } from '@/components/jc-one-fix-mark';

export default function SolucionesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#050a12] text-slate-200">
      <header className="border-b border-white/10 bg-[#050a12]/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-white hover:text-[#F5C518] transition-colors">
            <JcOneFixAppIcon className="h-8 w-8 rounded-lg p-1" />
            <JcOneFixMark tone="onDark" className="text-sm font-bold" />
          </Link>
          <nav className="flex items-center gap-3 text-xs font-medium">
            <Link href="/soluciones" className="text-slate-400 hover:text-[#F5C518] transition-colors">
              Soluciones
            </Link>
            <Link href="/#pricing" className="text-slate-400 hover:text-[#F5C518] transition-colors">
              Precios
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-[#F5C518] px-3 py-1.5 text-[#0D1117] hover:bg-[#D4A915] transition-colors"
            >
              Prueba gratis
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
