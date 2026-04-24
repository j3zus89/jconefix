import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Contenedor nativo Android que carga la web en producción.
 * El marcador JCOneFixNative en el User-Agent permite estilos/UX solo en la app.
 *
 * IMPORTANTE - allowNavigation usa patrones de HOSTNAME (sin https://):
 *   ✓ 'jconefix.com.ar'       ← correcto
 *   ✗ 'https://jconefix.com.ar' ← falla el matching en Android → abre navegador externo
 *
 * next.config.js redirige jconefix.vercel.app → jconefix.com.ar (301).
 * server.url apunta al destino final para evitar ese salto.
 */
const config: CapacitorConfig = {
  appId: 'com.jconefix.app',
  appName: 'JC ONE FIX',
  webDir: 'www',
  backgroundColor: '#004d40',
  appendUserAgent: ' JCOneFixNative/1',
  android: {
    appendUserAgent: ' JCOneFixNative/1',
    backgroundColor: '#004d40',
    /**
     * Permite contenido mixto por si algún recurso externo carga en HTTP.
     * No afecta a la app propia (toda en HTTPS).
     */
    allowMixedContent: true,
  },
  server: {
    /**
     * Entrada de la APK: login del panel (no la landing pública en /).
     * Con sesión válida, la propia /login o el flujo del cliente pueden redirigir al dashboard.
     */
    url: 'https://jconefix.com.ar/login',
    cleartext: false,
    androidScheme: 'https',
    /**
     * allowNavigation: solo HOSTNAMES o globs, SIN https://
     * HostMask de Capacitor exige mismo nº de segmentos salvo comodín: www. es 4
     * segmentos y NO coincide con jconefix.com.ar (3) → incluir ambos + patrón.
     */
    allowNavigation: [
      'jconefix.vercel.app',
      'jconefix.com.ar',
      'www.jconefix.com.ar',
      '*.jconefix.com.ar',
      '*.vercel.app',
      '*.supabase.co',
      '*.supabase.in',
      'accounts.google.com',
      '*.google.com',
      'www.paypal.com',
      'www.sandbox.paypal.com',
      'api.paypal.com',
      'www.recaptcha.net',
      'www.gstatic.com',
      'vercel.live',
      'va.vercel-scripts.com',
    ],
  },
  plugins: {
    SplashScreen: {
      /** > 0: si es 0 el plugin no entra en showOnLaunch y no ves overlay a pantalla completa. */
      launchShowDuration: 2200,
      /** Respaldo si el JS no llega a llamar hide() (WebView / load colgado). */
      launchAutoHide: true,
      launchFadeOutDuration: 520,
      backgroundColor: '#004d40',
      /** Overlay legacy match_parent: el mini-icono API 31 no puede sustituir esto. */
      layoutName: 'jc_splash_overlay',
      showSpinner: false,
      androidScaleType: 'FIT_CENTER',
    },
    StatusBar: {
      /** Contenido bajo la barra de estado; el header del panel + safe-area cubren el notch. */
      overlaysWebView: true,
      /**
       * En @capacitor/status-bar: LIGHT = iconos claros sobre fondo oscuro (#004d40).
       * (El valor DARK del plugin es para fondos claros — no confundir con “tema oscuro”.)
       */
      style: 'LIGHT',
      backgroundColor: '#004d40',
    },
  },
};

export default config;
