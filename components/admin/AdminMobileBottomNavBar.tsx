'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { AdminNavItem } from '@/lib/admin-nav-items';

export function AdminMobileBottomNavBar({ items }: { items: AdminNavItem[] }) {
  const pathname = usePathname() || '';

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[90] flex border-t border-white/10 bg-[#0f172a] pb-[max(0.35rem,env(safe-area-inset-bottom,0px))] pt-0.5 shadow-[0_-6px_24px_rgba(0,0,0,0.35)] md:hidden"
      aria-label="Navegación principal"
    >
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + '/');
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-semibold transition-colors active:opacity-90',
              active ? 'text-[#F5C518]' : 'text-slate-400'
            )}
          >
            <Icon className={cn('h-[1.15rem] w-[1.15rem] shrink-0', active && 'stroke-[2.35]')} aria-hidden />
            <span className="max-w-full truncate leading-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
