'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Home, Wrench, Users, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isCapacitorNativeUserAgent } from '@/lib/capacitor-native';

const NAV = [
  { href: '/dashboard', label: 'Inicio', icon: Home, match: (p: string) => p === '/dashboard' },
  {
    href: '/dashboard/tickets',
    label: 'Órdenes',
    icon: Wrench,
    match: (p: string) => p.startsWith('/dashboard/tickets') || p.startsWith('/dashboard/recepcion'),
  },
  { href: '/dashboard/customers', label: 'Clientes', icon: Users, match: (p: string) => p.startsWith('/dashboard/customers') },
  {
    href: '/dashboard/settings',
    label: 'Ajustes',
    icon: Settings,
    match: (p: string) => p.startsWith('/dashboard/settings'),
  },
] as const;

function useMobileDashboardNav(): boolean {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const sync = () => {
      const ua = navigator.userAgent || '';
      const native =
        Capacitor.isNativePlatform() || isCapacitorNativeUserAgent(ua);
      const narrow = mq.matches;
      setShow(native || narrow);
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return show;
}

/**
 * Barra inferior en móvil (≤767px) y en APK Capacitor: navegación tipo app nativa.
 */
export function CapacitorBottomNav() {
  const pathname = usePathname() || '';
  const show = useMobileDashboardNav();

  if (!show) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[100] flex border-t border-white/10 bg-[#004d40] pb-[max(0.35rem,env(safe-area-inset-bottom,0px))] shadow-[0_-4px_20px_rgba(0,0,0,0.25)] md:hidden"
      aria-label="Navegación principal"
    >
      {NAV.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-semibold transition-colors active:opacity-90',
              active ? 'text-[#F5C518]' : 'text-white/75 active:text-white',
            )}
            prefetch={true}
          >
            <Icon className={cn('h-[1.15rem] w-[1.15rem] shrink-0', active && 'stroke-[2.35]')} aria-hidden />
            <span className="truncate px-0.5">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
