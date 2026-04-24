'use client';

import { useEffect, type CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, LifeBuoy, Building2, LogOut, MonitorSmartphone } from 'lucide-react';
import { JcOneFixAppIcon, JcOneFixMark } from '@/components/jc-one-fix-mark';
import { cn } from '@/lib/utils';

type BadgeCounts = { support: number; leads: number };

interface Props {
  badges: BadgeCounts;
  signOut: () => void;
  children: React.ReactNode;
}

const NAV = [
  { href: '/admin/app',           label: 'Inicio',    icon: LayoutDashboard, exact: true },
  { href: '/admin/app/usuarios',  label: 'Usuarios',  icon: Users },
  { href: '/admin/app/soporte',   label: 'Soporte',   icon: LifeBuoy,  badge: true },
  { href: '/admin/app/orgs',      label: 'Orgs',      icon: Building2 },
];

/** Expuesto en CSS para páginas que necesitan altura exacta (chat, modales). */
export const ADMIN_MOBILE_HEADER_PX = 56;
export const ADMIN_MOBILE_TAB_CSS = 'calc(3.75rem + max(env(safe-area-inset-bottom, 0px), 10px))';

export function MobileAdminShell({ badges, signOut, children }: Props) {
  const pathname = usePathname();

  /* Registrar Service Worker para que sea instalable como PWA */
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {/* ignorar error */});
    }
  }, []);

  return (
    <div
      className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[#0f172a]"
      style={
        {
          '--admin-mob-header': `${ADMIN_MOBILE_HEADER_PX}px`,
          '--admin-mob-tab': ADMIN_MOBILE_TAB_CSS,
          /** Sticky secundarios (listas): debajo del notch + barra 3.5rem */
          '--admin-mob-sticky': 'calc(env(safe-area-inset-top, 0px) + 3.5rem)',
        } as CSSProperties
      }
    >

      {/* ── Top bar (safe-area arriba para notch / status bar) ───── */}
      <header className="sticky top-0 z-50 shrink-0 border-b border-white/10 bg-[#0f172a]/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur-sm">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <JcOneFixAppIcon className="h-8 w-8 shrink-0 rounded-lg" />
            <div className="leading-tight">
              <JcOneFixMark tone="onDark" className="text-xs font-bold" />
              <p className="text-[10px] font-medium text-slate-500">SUPER ADMIN</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {badges.support > 0 && (
              <Link
                href="/admin/app/soporte"
                className="flex max-w-[min(100%,11rem)] items-center gap-1.5 truncate rounded-full border border-red-500/40 bg-red-500/15 px-2.5 py-1 text-[11px] font-semibold text-red-400"
              >
                <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-red-500" />
                <span className="truncate">{badges.support} sin responder</span>
              </Link>
            )}
            <Link
              href="/admin"
              title="Abrir panel escritorio"
              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:text-slate-300"
            >
              <MonitorSmartphone className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Content: min-h-0 obligatorio para que overflow-y funcione en flex (Chrome/Samsung). ── */}
      <main
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] touch-pan-y"
        style={{ paddingBottom: 'var(--admin-mob-tab)' }}
      >
        {children}
      </main>

      {/* ── Bottom Nav ──────────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#0f172a]/95 backdrop-blur-sm"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 10px)' }}
      >
        <div className="flex min-h-[3.25rem] items-stretch">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;
            const badgeCount = item.badge ? badges.support : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors',
                  active ? 'text-[#F5C518]' : 'text-slate-500 active:text-slate-300'
                )}
              >
                <div className="relative">
                  <Icon className="h-6 w-6" strokeWidth={active ? 2.5 : 2} />
                  {badgeCount > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-black leading-none text-white">
                      {badgeCount > 9 ? '9+' : badgeCount}
                    </span>
                  )}
                </div>
                <span className={cn('text-[10px] font-semibold', active ? 'text-[#F5C518]' : '')}>
                  {item.label}
                </span>
                {active && (
                  <span className="absolute bottom-1 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-[#F5C518]" />
                )}
              </Link>
            );
          })}

          {/* Salir */}
          <button
            type="button"
            onClick={signOut}
            className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-slate-500 transition-colors active:text-red-400"
          >
            <LogOut className="h-6 w-6" strokeWidth={2} />
            <span className="text-[10px] font-semibold">Salir</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
