import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Building2,
  Users,
  ScrollText,
  LifeBuoy,
  BarChart3,
  Inbox,
  KeyRound,
  BookOpen,
  Activity,
  Megaphone,
  ServerCrash,
} from 'lucide-react';

export type AdminBadgeCounts = { support: number; leads: number };

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: number;
};

export function getAdminNavItems(badges: AdminBadgeCounts): AdminNavItem[] {
  return [
    { href: '/admin', label: 'Inicio', icon: LayoutDashboard, exact: true },
    { href: '/admin/support', label: 'Soporte', icon: LifeBuoy, badge: badges.support },
    { href: '/admin/wiki', label: 'Wiki del Bot', icon: BookOpen },
    { href: '/admin/leads', label: 'Leads', icon: Inbox, badge: badges.leads },
    { href: '/admin/organizations', label: 'Organizaciones', icon: Building2 },
    { href: '/admin/panel-online', label: 'Usuarios en línea', icon: Activity },
    { href: '/admin/broadcast', label: 'Aviso global', icon: Megaphone },
    { href: '/admin/system-logs', label: 'Logs IA', icon: ServerCrash },
    { href: '/admin/users', label: 'Usuarios', icon: Users },
    { href: '/admin/audit', label: 'Auditoría', icon: ScrollText },
    { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/admin/security', label: 'Seguridad', icon: KeyRound },
  ];
}

/** Barra inferior móvil (una mano): accesos principales + «Perfil» → Seguridad. */
export function getAdminMobileBottomNavItems(badges: AdminBadgeCounts): AdminNavItem[] {
  const all = getAdminNavItems(badges);
  const pick = (href: string) => all.find((i) => i.href === href)!;
  return [
    pick('/admin'),
    { ...pick('/admin/support'), label: 'Soporte' },
    pick('/admin/organizations'),
    { ...pick('/admin/security'), label: 'Perfil' },
  ];
}
