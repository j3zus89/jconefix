'use client';

import { useMemo } from 'react';
import { orgLocale } from '@/lib/locale';

export type OrgLocaleData = ReturnType<typeof orgLocale>;

const LOCALE_REFRESH = 'jc-org-locale-refresh';

/** Tras guardar ajustes, fuerza que los consumidores vuelvan a leer (compatibilidad). */
export function notifyOrgLocaleRefresh(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(LOCALE_REFRESH));
}

/**
 * Perfil regional del panel: siempre Argentina (ARS).
 */
export function useOrgLocale(): OrgLocaleData {
  return useMemo(() => orgLocale({ country: 'AR', currency: 'ARS' }), []);
}
