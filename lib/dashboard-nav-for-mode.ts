import {
  dashboardMainNav,
  type NavItem,
  type NavSubItem,
} from '@/components/dashboard/dashboard-nav-config';
import { localizeDashboardNavForArgentina } from '@/lib/dashboard-nav-localization';

/** Submenú Reparaciones en modo panel sencillo. */
function simpleReparaciones(): NavSubItem[] {
  return [
    { href: '/dashboard/recepcion', label: 'Nuevo ingreso' },
    { href: '/dashboard/tickets', label: 'Tickets' },
  ];
}

/** Clientes en modo sencillo. */
function simpleClientes(): NavSubItem[] {
  return [
    { href: '/dashboard/customers', label: 'Clientes' },
    { href: '/dashboard/customers/new', label: 'Nuevo cliente' },
  ];
}

/** POS mínimo en modo sencillo. */
function simplePos(): NavSubItem[] {
  return [
    { href: '/dashboard/pos', label: 'Nueva venta' },
    { href: '/dashboard/pos/sales', label: 'Historial de ventas' },
  ];
}

/**
 * Menú principal según modo. En `simple` se ocultan Inventario, Informes y Gastos
 * y se acortan submenús (misma app, menos ruido).
 * `isArgentina`: etiquetas locales (Mis Ventas, Depósito, etc.) si la org es AR / ARS.
 */
export function getDashboardNavForMode(mode: 'full' | 'simple', isArgentina = false): NavItem[] {
  let out: NavItem[];

  if (mode === 'full') {
    out = dashboardMainNav;
  } else {
    out = dashboardMainNav
      .map((item): NavItem | null => {
        if (item.href === '/dashboard/inventory') return null;
        if (item.href === '/dashboard/reports') return null;
        if (item.href === '/dashboard/finanzas') {
          return {
            ...item,
            children: [
              {
                href: '/dashboard/invoices',
                label: isArgentina ? 'Mis Ventas' : 'Facturas emitidas',
              },
              {
                href: '/dashboard/expenses',
                label: isArgentina ? 'Mis Compras' : 'Comprobantes de gasto',
              },
            ],
          };
        }

        if (item.href === '/dashboard/tickets') {
          return { ...item, children: simpleReparaciones() };
        }
        if (item.href === '/dashboard/customers') {
          return { ...item, children: simpleClientes() };
        }
        if (item.href === '/dashboard/pos') {
          return { ...item, children: simplePos() };
        }

        return item;
      })
      .filter((x): x is NavItem => x != null);
  }

  if (isArgentina) return localizeDashboardNavForArgentina(out);
  return out;
}
