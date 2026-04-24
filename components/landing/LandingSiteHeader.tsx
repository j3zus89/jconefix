'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JcOneFixMark, JcOneFixAppIcon } from '@/components/jc-one-fix-mark';
import { cn } from '@/lib/utils';

/** Secciones en la home: prefijo `/` para que funcionen desde /rubros, /comparar, etc. */
const NAV_LINKS = [
  { href: '/#que-incluye', label: 'Qué incluye' },
  { href: '/#modulos-detalle', label: 'Módulos' },
  { href: '/#pricing', label: 'Precios' },
] as const;

export function LandingSiteHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    const onResize = () => {
      if (window.matchMedia('(min-width: 1024px)').matches) setOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const close = () => setOpen(false);

  return (
    <>
      <header
        data-web-chrome
        className="fixed top-0 left-0 right-0 z-50 w-full border-b border-white/10 bg-[#0D1117]/95 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)] backdrop-blur-md supports-[backdrop-filter]:bg-[#0D1117]/88"
      >
        <div className="flex h-[72px] w-full items-center justify-between gap-3 px-4 sm:px-6 lg:h-20 lg:px-12 xl:px-16 2xl:px-24">
          <Link href="/" className="group flex min-w-0 items-center gap-2 sm:gap-2.5" onClick={close}>
            <JcOneFixAppIcon className="h-10 w-10 shrink-0 rounded-xl transition-all group-hover:ring-[#F5C518]/60 sm:h-11 sm:w-11" />
            <div className="min-w-0 text-left leading-tight">
              <JcOneFixMark className="text-sm font-bold tracking-tight sm:text-base" />
            </div>
          </Link>

          <nav
            className="hidden items-center gap-5 text-sm font-semibold text-white/95 drop-shadow-sm lg:flex xl:gap-6"
            aria-label="Principal"
          >
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={`${href}-${label}`} href={href} className="whitespace-nowrap hover:text-[#F5C518] transition-colors">
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="hidden text-sm font-semibold text-white/95 hover:text-white sm:inline-flex px-3 py-2 rounded-full border border-white/25 hover:border-white/45 bg-white/[0.04] transition-colors drop-shadow-sm"
            >
              Iniciar sesión
            </Link>
            <Link href="/register" onClick={close}>
              <Button className="rounded-full bg-[#F5C518] text-[#0D1117] hover:bg-[#D4A915] font-semibold border-0 h-9 px-4 text-xs shadow-lg shadow-[#F5C518]/15 sm:h-10 sm:px-5 sm:text-sm min-h-[48px]">
                Prueba gratis
              </Button>
            </Link>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/[0.06] text-white transition-colors hover:border-white/35 hover:bg-white/10 lg:hidden"
              aria-expanded={open}
              aria-controls="landing-mobile-nav"
              aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div
          id="landing-mobile-nav"
          className={cn(
            'lg:hidden border-t border-white/10 bg-[#0D1117]/98 backdrop-blur-lg transition-[max-height,opacity] duration-300 ease-out overflow-hidden',
            open ? 'max-h-[min(70vh,28rem)] opacity-100' : 'max-h-0 opacity-0 pointer-events-none border-transparent'
          )}
        >
          <nav className="flex max-h-[min(70vh,28rem)] flex-col gap-0 overflow-y-auto overscroll-contain px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]" aria-label="Móvil">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={`m-${href}-${label}`}
                href={href}
                className="rounded-lg px-3 py-3.5 text-base font-semibold text-white/95 hover:bg-white/[0.06] hover:text-[#F5C518] active:bg-white/10"
                onClick={close}
              >
                {label}
              </Link>
            ))}
            <Link
              href="/login"
              className="mt-1 rounded-lg border border-white/20 px-3 py-3.5 text-center text-base font-semibold text-white/95 hover:bg-white/[0.06]"
              onClick={close}
            >
              Iniciar sesión
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
}
