/** Ventana tras la última señal del heartbeat del panel para considerar «en línea». */
export const PANEL_ONLINE_WINDOW_MS = 3 * 60 * 1000;

export function isPanelOnline(panelLastActiveAt: string | null | undefined): boolean {
  if (!panelLastActiveAt) return false;
  const t = new Date(panelLastActiveAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < PANEL_ONLINE_WINDOW_MS;
}
