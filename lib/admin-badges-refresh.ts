/** Dispara actualización de contadores (soporte / leads) en `app/admin/layout.tsx`. */
export const ADMIN_BADGES_REFRESH_EVENT = 'jconefix-admin-badges-refresh';

export function dispatchAdminBadgesRefresh(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(ADMIN_BADGES_REFRESH_EVENT));
}

/** Contador de hilos «pendientes» tal como lo ve el admin (excluye chat abierto expandido). */
export const ADMIN_SUPPORT_DISPLAY_PENDING_EVENT = 'jconefix-admin-support-display-pending';

export function dispatchAdminSupportDisplayPending(count: number): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(ADMIN_SUPPORT_DISPLAY_PENDING_EVENT, { detail: { count } }),
  );
}
