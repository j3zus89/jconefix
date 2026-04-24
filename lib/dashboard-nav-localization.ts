import type { NavItem, SettingsNavBlock } from '@/components/dashboard/dashboard-nav-config';

/**
 * Etiquetas del menú para talleres en Argentina (organización AR o moneda ARS).
 * España y el resto de regiones conservan los textos originales.
 */
export function localizeDashboardNavForArgentina(items: NavItem[]): NavItem[] {
  return items.map((item) => {
    const cloned: NavItem = {
      ...item,
      children: item.children?.map((c) => ({ ...c })),
      settingsBlocks: item.settingsBlocks?.map((b): SettingsNavBlock =>
        b.kind === 'link'
          ? { kind: 'link', item: { ...b.item } }
          : {
              kind: 'group',
              id: b.id,
              label: b.label,
              items: b.items.map((x) => ({ ...x })),
            }
      ),
    };

    if (cloned.href === '/dashboard/inventory') {
      cloned.label = 'Depósito';
    }

    if (cloned.href === '/dashboard/finanzas' && cloned.children) {
      for (const c of cloned.children) {
        if (c.href === '/dashboard/invoices') c.label = 'Mis Ventas';
        if (c.href === '/dashboard/expenses') c.label = 'Mis Compras';
        if (c.href === '/dashboard/finanzas') c.label = 'Archivo de Facturas';
      }
    }

    if (cloned.settingsBlocks) {
      for (const b of cloned.settingsBlocks) {
        if (b.kind === 'group') {
          if (b.id === 'hardware') b.label = 'Impresoras y periféricos';
          if (b.id === 'refaccion') b.label = 'Repuestos';
          if (b.id === 'incentivos') b.label = 'Comisiones (programas)';
        } else if (b.item.href === '/dashboard/guide' || b.item.href === '/dashboard/guide-ar') {
          b.item.href = '/dashboard/guide-ar';
        }
      }
    }

    return cloned;
  });
}
