'use client';

import type { PanelLoginReportSource } from '@/lib/auth/panel-login-types';

/**
 * Notifica al servidor un login completo (sesión ya en cookies).
 * Usa sendBeacon cuando hay para que sobreviva a la navegación inmediata.
 */
export function reportSuccessfulLogin(source: PanelLoginReportSource): void {
  if (typeof window === 'undefined') return;

  const payload = JSON.stringify({
    source,
    device: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  });
  const url = '/api/auth/report-panel-login';

  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      const ok = navigator.sendBeacon(url, blob);
      if (ok) return;
    }
  } catch {
    /* fallback fetch */
  }

  void fetch(url, {
    method: 'POST',
    credentials: 'include',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });
}
