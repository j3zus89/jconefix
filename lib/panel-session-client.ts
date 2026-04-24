const STORAGE_KEY = 'jc_panel_session_client_key';

/** Clave estable por navegador para identificar la sesión del panel en `user_panel_sessions`. */
export function getOrCreatePanelSessionClientKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    let k = window.localStorage.getItem(STORAGE_KEY)?.trim();
    if (!k || k.length < 8) {
      k =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `ps-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
      window.localStorage.setItem(STORAGE_KEY, k);
    }
    return k;
  } catch {
    return `mem-${Date.now()}`;
  }
}
