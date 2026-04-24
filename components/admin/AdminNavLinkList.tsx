'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { AdminNavItem } from '@/lib/admin-nav-items';

export function AdminNavLinkList({
  items,
  pathname,
  onNavigate,
  linkClassName,
}: {
  items: AdminNavItem[];
  pathname: string;
  onNavigate?: () => void;
  linkClassName?: string;
}) {
  return (
    <>
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + '/');
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
              active
                ? 'bg-[#F5C518] text-white shadow-lg shadow-[#F5C518]/20'
                : 'text-slate-400 hover:text-white hover:bg-white/10',
              linkClassName
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge && item.badge > 0 ? (
              <span
                className={cn(
                  'inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-[10px] font-bold',
                  active ? 'bg-white text-[#F5C518]' : 'bg-red-500 text-white'
                )}
              >
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </>
  );
}
