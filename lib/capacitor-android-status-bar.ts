import { Capacitor } from '@capacitor/core';

/** Verde header panel / APK (alineado a tema Android y capacitor.config). */
export const CAP_NATIVE_STATUSBAR_BRAND = '#004d40';

/** Login sin header aún: mismo verde de marca para cero franjas blancas. */
export const CAP_NATIVE_STATUSBAR_LOGIN = '#004d40';

/** Convierte `rgb()` / `rgba()` de getComputedStyle a `#rrggbb` para el plugin StatusBar. */
export function rgbCssToHex(rgb: string): string | null {
  const m = rgb.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!m) return null;
  const r = Number(m[1]);
  const g = Number(m[2]);
  const b = Number(m[3]);
  if ([r, g, b].some((n) => Number.isNaN(n) || n < 0 || n > 255)) return null;
  return (
    '#' +
    [r, g, b]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
  );
}

export function readPanelHeaderStatusBarHex(): string | null {
  const header = document.querySelector('header[data-cap-safe-top]');
  if (!header) return null;
  const bg = getComputedStyle(header).backgroundColor;
  return rgbCssToHex(bg);
}

export async function applyAndroidStatusBarColor(hex: string): Promise<void> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: hex });
  } catch {
    /* plugin opcional */
  }
}

/** Color del header del panel si existe; si no, verde de marca. */
export function resolveAndroidStatusBarColor(): string {
  return readPanelHeaderStatusBarHex() ?? CAP_NATIVE_STATUSBAR_BRAND;
}

export async function syncAndroidStatusBarFromDom(): Promise<void> {
  await applyAndroidStatusBarColor(resolveAndroidStatusBarColor());
}
