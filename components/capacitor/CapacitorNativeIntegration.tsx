'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { removeCapNativeBootOverlay } from '@/lib/cap-native-boot-overlay';
import { isCapacitorNativeUserAgent } from '@/lib/capacitor-native';
import { syncAndroidStatusBarFromDom } from '@/lib/capacitor-android-status-bar';

const SPLASH_FADE_MS = 520;

function afterFullLoadAndPaint(fn: () => void) {
  const run = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(fn);
    });
  };
  if (document.readyState === 'complete') {
    run();
    return;
  }
  window.addEventListener('load', run, { once: true });
}

async function hideSplashWhenReady() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  // Con server.url remoto, a veces isNativePlatform() es false hasta tarde; el UA sí lleva JCOneFixNative.
  const isNative = Capacitor.isNativePlatform() || isCapacitorNativeUserAgent(ua);
  if (!isNative) return;

  let done = false;
  const hide = async () => {
    if (done) return;
    done = true;
    removeCapNativeBootOverlay();
    try {
      const { SplashScreen } = await import('@capacitor/splash-screen');
      await SplashScreen.hide({ fadeOutDuration: SPLASH_FADE_MS }).catch(() => {});
    } catch {
      /* sin bridge aún */
    }
  };

  afterFullLoadAndPaint(() => void hide());
  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      () => window.setTimeout(() => void hide(), 500),
      { once: true }
    );
  } else {
    window.setTimeout(() => void hide(), 500);
  }
  window.setTimeout(hide, 2800);
  window.setTimeout(hide, 8000);
}

async function configureStatusBar() {
  await syncAndroidStatusBarFromDom();
}

/** Sensación “app”: sin zoom tipo navegador y barra de sistema alineada al shell oscuro. */
function applyNativeWebPresentation() {
  const metaViewport = document.querySelector('meta[name="viewport"]');
  if (metaViewport) {
    metaViewport.setAttribute(
      'content',
      'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no',
    );
  }
  const theme = '#004d40';
  const themeMetas = document.querySelectorAll('meta[name="theme-color"]');
  if (themeMetas.length === 0) {
    const m = document.createElement('meta');
    m.setAttribute('name', 'theme-color');
    m.setAttribute('content', theme);
    document.head.appendChild(m);
  } else {
    themeMetas.forEach((el) => el.setAttribute('content', theme));
  }
}

/**
 * Marca el documento para CSS (safe-area, overscroll), oculta splash nativo y ajusta status bar.
 */
function installNativeInteractionGuards() {
  const blockContextMenu = (e: Event) => {
    e.preventDefault();
  };
  const blockSelectUnlessEditable = (e: Event) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (
      t.closest(
        'input, textarea, select, [contenteditable="true"], .select-text, [data-cap-allow-select]'
      )
    ) {
      return;
    }
    e.preventDefault();
  };
  document.addEventListener('contextmenu', blockContextMenu, { capture: true });
  document.addEventListener('selectstart', blockSelectUnlessEditable, { capture: true });
  return () => {
    document.removeEventListener('contextmenu', blockContextMenu, { capture: true });
    document.removeEventListener('selectstart', blockSelectUnlessEditable, { capture: true });
  };
}

export function CapacitorNativeIntegration() {
  useEffect(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const native =
      Capacitor.isNativePlatform() || (typeof window !== 'undefined' && isCapacitorNativeUserAgent(ua));
    if (!native) return;

    document.documentElement.classList.add('cap-native');
    document.documentElement.setAttribute('data-capacitor-native', '1');
    applyNativeWebPresentation();

    void configureStatusBar();
    void hideSplashWhenReady();
    return installNativeInteractionGuards();
  }, []);

  return null;
}
