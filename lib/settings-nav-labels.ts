import { getDashboardNavForMode } from '@/lib/dashboard-nav-for-mode';

function tabFromItem(item: { query?: Record<string, string> }): string {
  return item.query?.tab ?? 'config_general';
}

/**
 * Etiquetas de sección de Configuración alineadas con `dashboard-nav-config`
 * y `localizeDashboardNavForArgentina` (misma fuente que el menú superior).
 */
export function getSettingsNavTrailForTab(
  tab: string | null | undefined,
  isArgentina: boolean
): { groupLabel: string | null; pageLabel: string } | null {
  const t = (tab || 'config_general').trim();
  const nav = getDashboardNavForMode('full', isArgentina);
  const settings = nav.find((i) => i.href === '/dashboard/settings');
  const blocks = settings?.settingsBlocks;
  if (!blocks) return null;

  for (const block of blocks) {
    if (block.kind === 'link') {
      if (tabFromItem(block.item) === t) {
        return { groupLabel: null, pageLabel: block.item.label };
      }
    } else {
      for (const item of block.items) {
        if (tabFromItem(item) === t) {
          return { groupLabel: block.label, pageLabel: item.label };
        }
      }
    }
  }
  return null;
}
