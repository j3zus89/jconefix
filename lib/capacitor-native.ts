/** Debe coincidir con `appendUserAgent` en capacitor.config.ts */
export const CAPACITOR_NATIVE_UA_MARK = 'JCOneFixNative/';

export function isCapacitorNativeUserAgent(ua: string): boolean {
  return ua.includes(CAPACITOR_NATIVE_UA_MARK);
}

/** Solo en el cliente; usa el User-Agent que añade Capacitor en Android. */
export function isCapacitorNativeBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return isCapacitorNativeUserAgent(navigator.userAgent);
}
