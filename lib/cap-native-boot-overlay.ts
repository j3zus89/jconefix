/**
 * Quita el overlay de arranque (#cap-native-boot) del root layout en la APK WebView.
 * Debe ser idempotente: puede llamarse desde el script inline, React y SplashScreen.hide.
 */
export function removeCapNativeBootOverlay(): void {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('cap-native-boot');
  if (!el?.parentNode) return;

  el.style.opacity = '0';
  el.style.transition = 'opacity 0.52s ease';
  window.setTimeout(() => {
    const again = document.getElementById('cap-native-boot');
    if (again?.parentNode) again.parentNode.removeChild(again);
  }, 540);
}
