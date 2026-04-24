'use client';

import { useEffect } from 'react';

/**
 * Registra el SW solo en producción (en dev Next HMR y el SW suelen chocar).
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const ctrl = navigator.serviceWorker.controller;
    void navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        if (!ctrl && reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      })
      .catch(() => {
        /* noop: origen file:// o CSP */
      });
  }, []);
  return null;
}
