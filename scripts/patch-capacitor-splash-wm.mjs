/**
 * Parches idempotentes para @capacitor/splash-screen (Android):
 * 1) showOnLaunch nunca llegaba al overlay legacy (solo API 31 mini-icono).
 * 2) WindowManager.LayoutParams sin MATCH_PARENT encogía el overlay a un recuadro.
 *
 * Ejecutar tras npm install: ya está en postinstall y en cap:sync.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(
  __dirname,
  '..',
  'node_modules',
  '@capacitor',
  'splash-screen',
  'android',
  'src',
  'main',
  'java',
  'com',
  'capacitorjs',
  'plugins',
  'splashscreen',
  'SplashScreen.java',
);

if (!fs.existsSync(target)) {
  console.warn('[patch-capacitor-splash-wm] No se encontró SplashScreen.java, se omite.');
  process.exit(0);
}

let s = fs.readFileSync(target, 'utf8');
let changed = false;

const launchOld = `        SplashScreenSettings settings = new SplashScreenSettings();
        settings.setShowDuration(config.getLaunchShowDuration());
        settings.setAutoHide(config.isLaunchAutoHide());

        // Method can fail if styles are incorrectly set...
        // If it fails, log error & fallback to old method
        try {
            showWithAndroid12API(activity, settings);
            return;
        } catch (Exception e) {
            Logger.warn("Android 12 Splash API failed... using previous method.");
            this.onPreDrawListener = null;
        }

        settings.setFadeInDuration(config.getLaunchFadeInDuration());
        if (config.isUsingDialog()) {
            showDialog(activity, settings, null, true);
        } else {
            show(activity, settings, null, true);
        }
    }`;

const launchNew = `        SplashScreenSettings settings = new SplashScreenSettings();
        settings.setShowDuration(config.getLaunchShowDuration());
        settings.setAutoHide(config.isLaunchAutoHide());

        /*
         * JC ONE FIX: showWithAndroid12API() programa trabajo async y showOnLaunch hace
         * return antes — el overlay legacy (layoutName / splash.png a pantalla completa)
         * NUNCA se ejecutaba. El splash API 31 solo admite un icono pequeño en el centro.
         * Forzamos siempre el overlay legacy + MATCH_PARENT en show().
         */
        settings.setFadeInDuration(config.getLaunchFadeInDuration());
        if (config.isUsingDialog()) {
            showDialog(activity, settings, null, true);
        } else {
            show(activity, settings, null, true);
        }
    }`;

if (s.includes('JC ONE FIX: showWithAndroid12API() programa')) {
  /* ya parcheado */
} else if (s.includes(launchOld)) {
  s = s.replace(launchOld, launchNew);
  changed = true;
} else {
  console.warn('[patch-capacitor-splash-wm] showOnLaunch: bloque original no coincide; revisar versión del plugin.');
}

const wmOld = `        mainHandler.post(() -> {
            WindowManager.LayoutParams params = new WindowManager.LayoutParams();
            params.gravity = Gravity.CENTER;`;

const wmNew = `        mainHandler.post(() -> {
            WindowManager.LayoutParams params = new WindowManager.LayoutParams();
            // JC ONE FIX: sin MATCH_PARENT el overlay queda WRAP_CONTENT y el splash se ve
            // como un recuadro minúsculo en el centro (especialmente con layoutName).
            params.width = WindowManager.LayoutParams.MATCH_PARENT;
            params.height = WindowManager.LayoutParams.MATCH_PARENT;
            params.gravity = Gravity.CENTER;`;

if (s.includes('JC ONE FIX: sin MATCH_PARENT')) {
  /* ya */
} else if (s.includes(wmOld)) {
  s = s.replace(wmOld, wmNew);
  changed = true;
} else {
  console.warn('[patch-capacitor-splash-wm] WindowManager: bloque original no coincide.');
}

const spinOld = `                if (spinnerBar.getParent() != null) {
                    windowManager.removeView(spinnerBar);
                }

                params.height = WindowManager.LayoutParams.WRAP_CONTENT;
                params.width = WindowManager.LayoutParams.WRAP_CONTENT;

                windowManager.addView(spinnerBar, params);`;

const spinNew = `                if (spinnerBar.getParent() != null) {
                    windowManager.removeView(spinnerBar);
                }

                WindowManager.LayoutParams spinParams = new WindowManager.LayoutParams();
                spinParams.height = WindowManager.LayoutParams.WRAP_CONTENT;
                spinParams.width = WindowManager.LayoutParams.WRAP_CONTENT;
                spinParams.gravity = Gravity.CENTER;
                spinParams.flags = activity.getWindow().getAttributes().flags;
                spinParams.format = PixelFormat.TRANSLUCENT;

                windowManager.addView(spinnerBar, spinParams);`;

if (s.includes('windowManager.addView(spinnerBar, spinParams)')) {
  /* ya */
} else if (s.includes(spinOld)) {
  s = s.replace(spinOld, spinNew);
  changed = true;
}

fs.writeFileSync(target, s, 'utf8');
if (changed) {
  console.log('[patch-capacitor-splash-wm] Parches aplicados.');
} else {
  console.log('[patch-capacitor-splash-wm] Sin cambios (ya aplicado o fuente distinta).');
}
