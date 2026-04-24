/** PWA instalada (standalone) o añadida a inicio en iOS Safari. */
export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  const mm = window.matchMedia?.('(display-mode: standalone)');
  if (mm?.matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}
