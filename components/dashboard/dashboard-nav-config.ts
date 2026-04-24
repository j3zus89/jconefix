import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Wrench,
  Users,
  Package,
  ChartBar as BarChart3,
  ShoppingCart,
  Landmark,
  Settings,
} from 'lucide-react';

export type NavSubItem = { href: string; label: string; query?: Record<string, string> };

/** Bloques del submenú de Ajustes: enlace suelto o grupo acordeón. */
export type SettingsNavBlock =
  | { kind: 'link'; item: NavSubItem }
  | { kind: 'group'; id: string; label: string; items: NavSubItem[] };

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  children?: NavSubItem[];
  /** Si existe, el menú de Configuración usa acordeones en lugar de «children» plano. */
  settingsBlocks?: SettingsNavBlock[];
};

/** Estructura del desplegable Configuración (orden y agrupación). */
export const settingsNavBlocks: SettingsNavBlock[] = [
  {
    kind: 'group',
    id: 'cuenta',
    label: 'Cuenta',
    items: [
      { href: '/dashboard/settings', label: 'Perfil', query: { tab: 'perfil' } },
      { href: '/dashboard/settings', label: 'Sesiones activas', query: { tab: 'sesiones' } },
      { href: '/dashboard/settings', label: 'Facturación', query: { tab: 'facturacion_cuenta' } },
    ],
  },
  {
    kind: 'group',
    id: 'apariencia',
    label: 'Apariencia',
    items: [
      { href: '/dashboard/settings', label: 'Personalización visual', query: { tab: 'personalizacion_visual' } },
    ],
  },
  {
    kind: 'link',
    item: { href: '/dashboard/settings', label: 'Configuración general', query: { tab: 'config_general' } },
  },
  {
    kind: 'group',
    id: 'empleados',
    label: 'Empleados',
    items: [
      { href: '/dashboard/settings', label: 'Equipo y accesos', query: { tab: 'equipo' } },
      { href: '/dashboard/settings', label: 'Comisiones', query: { tab: 'comisiones' } },
      { href: '/dashboard/settings', label: 'Roles', query: { tab: 'roles' } },
      { href: '/dashboard/settings', label: 'Permisos de roles', query: { tab: 'permisos_roles' } },
      { href: '/dashboard/settings', label: 'Controles de seguridad', query: { tab: 'seguridad' } },
    ],
  },
  {
    kind: 'group',
    id: 'impuesto',
    label: 'Impuesto',
    items: [
      { href: '/dashboard/settings', label: 'Configuración', query: { tab: 'config_impuestos' } },
      { href: '/dashboard/settings', label: 'Margen de IVA', query: { tab: 'margen_iva' } },
    ],
  },
  {
    kind: 'group',
    id: 'hardware',
    label: 'Hardware',
    items: [
      { href: '/dashboard/settings', label: 'Bandeja QZ', query: { tab: 'bandeja_qz' } },
      { href: '/dashboard/settings', label: 'Nodo de impresión', query: { tab: 'nodo_impresion' } },
    ],
  },
  {
    kind: 'group',
    id: 'integraciones',
    label: 'Integraciones',
    items: [
      { href: '/dashboard/settings', label: 'Correo y WhatsApp', query: { tab: 'email_sms' } },
      { href: '/dashboard/settings', label: 'Portal cliente', query: { tab: 'portal_cliente' } },
      { href: '/dashboard/settings', label: 'Editor de plantillas', query: { tab: 'editor_plantillas' } },
    ],
  },
  {
    kind: 'group',
    id: 'refaccion',
    label: 'Refacción',
    items: [
      { href: '/dashboard/settings', label: 'Categorías de reparación', query: { tab: 'categorias_reparacion' } },
      { href: '/dashboard/settings', label: 'Entradas y reparaciones', query: { tab: 'tickets_repairs' } },
      { href: '/dashboard/settings', label: 'Estado del ticket', query: { tab: 'estado_ticket' } },
      { href: '/dashboard/settings', label: 'Tipos de tareas', query: { tab: 'tipos_tareas' } },
      { href: '/dashboard/settings', label: 'Pre/Post condición', query: { tab: 'pre_post_condicion' } },
    ],
  },
  {
    kind: 'group',
    id: 'inventario',
    label: 'Inventario',
    items: [
      { href: '/dashboard/settings', label: 'Configuración', query: { tab: 'config_inventario' } },
      { href: '/dashboard/settings', label: 'Categorías de productos', query: { tab: 'categorias_productos' } },
      { href: '/dashboard/settings', label: 'Fabricantes', query: { tab: 'fabricantes' } },
    ],
  },
  {
    kind: 'group',
    id: 'ventas',
    label: 'Ventas',
    items: [
      { href: '/dashboard/settings', label: 'POS', query: { tab: 'pos_config' } },
      { href: '/dashboard/settings', label: 'Facturas', query: { tab: 'facturas' } },
      { href: '/dashboard/settings', label: 'Métodos de pago', query: { tab: 'metodos_pago' } },
      { href: '/dashboard/settings', label: 'Cómo nos conocieron', query: { tab: 'como_enteraron' } },
    ],
  },
  {
    kind: 'group',
    id: 'clientes',
    label: 'Clientes',
    items: [
      { href: '/dashboard/settings', label: 'Importar desde Excel', query: { tab: 'importar_excel' } },
      { href: '/dashboard/settings', label: 'GDPR', query: { tab: 'gdpr' } },
    ],
  },
  {
    kind: 'group',
    id: 'incentivos',
    label: 'Incentivos',
    items: [
      { href: '/dashboard/settings', label: 'Lealtad', query: { tab: 'lealtad' } },
      { href: '/dashboard/settings', label: 'Tarjetas regalo', query: { tab: 'tarjetas_regalo' } },
    ],
  },
  {
    kind: 'link',
    item: { href: '/dashboard/guide-ar', label: '📖 Guía de usuario' },
  },
];

/** Devuelve el id del grupo que contiene la pestaña activa (para abrir el acordeón). */
export function settingsGroupIdForTab(tab: string | null | undefined): string | null {
  const t = tab || 'config_general';
  for (const block of settingsNavBlocks) {
    if (block.kind !== 'group') continue;
    if (block.items.some((i) => (i.query?.tab ?? 'config_general') === t)) return block.id;
  }
  return null;
}

function flattenSettingsBlocks(blocks: SettingsNavBlock[]): NavSubItem[] {
  const out: NavSubItem[] = [];
  for (const b of blocks) {
    if (b.kind === 'link') out.push(b.item);
    else out.push(...b.items);
  }
  return out;
}

/** Todos los destinos de ajustes (p. ej. para comprobar que no falta ninguna pestaña). */
export const settingsNavAllItems: NavSubItem[] = flattenSettingsBlocks(settingsNavBlocks);

/** Menú principal del dashboard (sin chat: solo widget flotante). */
export const dashboardMainNav: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Inicio',
    icon: LayoutDashboard,
  },
  {
    href: '/dashboard/tickets',
    label: 'Reparaciones',
    icon: Wrench,
    children: [
      { href: '/dashboard/recepcion', label: 'Recepción (nuevo ingreso)' },
      { href: '/dashboard/tickets', label: 'Administrar tickets' },
      { href: '/dashboard/tickets/new', label: 'Nuevo ticket' },
      { href: '/dashboard/entries', label: 'Administrar entradas' },
      { href: '/dashboard/estimates', label: 'Presupuestos' },
      { href: '/dashboard/warranty', label: 'Garantías' },
    ],
  },
  {
    href: '/dashboard/customers',
    label: 'Clientes',
    icon: Users,
    children: [
      { href: '/dashboard/customers', label: 'Todos los clientes' },
      { href: '/dashboard/customers/new', label: 'Nuevo cliente' },
      { href: '/dashboard/customers/leads', label: 'Clientes potenciales' },
    ],
  },
  {
    href: '/dashboard/inventory',
    label: 'Inventario',
    icon: Package,
    children: [
      { href: '/dashboard/inventory/parts', label: 'Repuestos' },
      {
        href: '/dashboard/inventory/repair-services',
        label: 'Servicio de reparación',
      },
      { href: '/dashboard/inventory/purchase_orders', label: 'Órdenes de compra' },
      { href: '/dashboard/inventory/suppliers', label: 'Proveedores' },
      { href: '/dashboard/inventory/transfers', label: 'Transferencias' },
    ],
  },
  {
    href: '/dashboard/pos',
    label: 'Punto de venta',
    icon: ShoppingCart,
    children: [
      { href: '/dashboard/pos', label: 'Nueva venta' },
      { href: '/dashboard/pos/sales', label: 'Historial de ventas' },
      { href: '/dashboard/pos/cash_drawer', label: 'Caja registradora' },
    ],
  },
  {
    href: '/dashboard/reports',
    label: 'Informes',
    icon: BarChart3,
    children: [
      { href: '/dashboard/reports', label: 'Resumen general' },
      { href: '/dashboard/reports/revenue', label: 'Ingresos' },
      { href: '/dashboard/reports/repairs', label: 'Reparaciones' },
      { href: '/dashboard/reports/technicians', label: 'Técnicos' },
    ],
  },
  {
    href: '/dashboard/finanzas',
    label: 'Finanzas',
    icon: Landmark,
    children: [
      { href: '/dashboard/invoices', label: 'Facturas emitidas (ventas)' },
      { href: '/dashboard/expenses', label: 'Facturas recibidas (gastos)' },
      { href: '/dashboard/devoluciones', label: 'Devoluciones al cliente' },
      { href: '/dashboard/expenses/categories', label: 'Categorías de gasto' },
      { href: '/dashboard/finanzas', label: 'Centro de documentación' },
    ],
  },
  {
    href: '/dashboard/settings',
    label: 'Configuración',
    icon: Settings,
    settingsBlocks: settingsNavBlocks,
  },
];
