'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { syncAndroidStatusBarFromDom } from '@/lib/capacitor-android-status-bar';

/**
 * En el panel, el header usa `var(--panel-header-bg)` (primario del taller).
 * Sincroniza la StatusBar nativa con ese color al navegar o al cambiar tema.
 */
export function CapacitorPanelStatusBarSync() {
  const pathname = usePathname();

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;

    const run = () => void syncAndroidStatusBarFromDom();
    run();

    const obs = new MutationObserver(run);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [
        'class',
        'style',
        'data-app-panel',
        'data-panel-design',
        'data-panel-theme',
      ],
    });

    const t = window.setInterval(run, 2500);
    return () => {
      obs.disconnect();
      window.clearInterval(t);
    };
  }, [pathname]);

  return null;
}
