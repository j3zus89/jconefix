/**
 * Genera recursos Android (splash + launcher) desde:
 *   1) public/android-brand-logo.png  (prioridad)
 *   2) public/icon.svg                (fallback)
 *
 * Splash: fondo negro + logo centrado (contain dentro del recuadro SPLASH_LOGO_BOX_FRAC).
 *
 * Ejecutar: npm run android:assets && npm run cap:sync
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const brandPng = path.join(root, 'public', 'android-brand-logo.png');
const svgPath = path.join(root, 'public', 'icon.svg');
const res = path.join(root, 'android', 'app', 'src', 'main', 'res');

const useBrandPng = fs.existsSync(brandPng);
/** Alineado con values/colors.xml → cap_splash_background */
const SPLASH_BG = '#000000';
/** Icono adaptativo: negro como el disco del logo JC (evita halo en bordes del PNG) */
const LAUNCHER_BG = '#000000';
/** Logo splash: recuadro interno (contain + centrado). Menor = logo más chico. */
const SPLASH_LOGO_BOX_FRAC = 0.4;
/**
 * Zona segura adaptive icon (~66dp/108dp). El logo circular no debe llenar todo el mipmap
 * o lo recortan máscaras squircle en algunos launchers.
 */
const LAUNCHER_LOGO_FRAC = 0.4;

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
    alpha: 1,
  };
}

function splashBackgroundSvg(w, h) {
  const s = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="${SPLASH_BG}"/></svg>`;
  return Buffer.from(s);
}

function openLogoPipeline() {
  if (useBrandPng) {
    return sharp(brandPng).ensureAlpha().trim({ threshold: 8 });
  }
  return sharp(fs.readFileSync(svgPath), { density: 300 });
}

async function splash(folder, w, h) {
  const dest = path.join(res, folder, 'splash.png');
  const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
  const boxW = Math.round(w * SPLASH_LOGO_BOX_FRAC);
  const boxH = Math.round(h * SPLASH_LOGO_BOX_FRAC);

  const logoLayer = await openLogoPipeline()
    .resize(boxW, boxH, {
      fit: 'contain',
      position: 'center',
      background: transparent,
    })
    .png()
    .toBuffer();

  const meta = await sharp(logoLayer).metadata();
  const lw = meta.width ?? boxW;
  const lh = meta.height ?? boxH;
  const left = Math.round((w - lw) / 2);
  const top = Math.round((h - lh) / 2);

  await sharp(splashBackgroundSvg(w, h))
    .composite([{ input: logoLayer, left, top }])
    .png({ compressionLevel: 9 })
    .toFile(dest);

  console.log(`  ✓ ${folder}/splash.png  ${w}×${h}`);
}

async function launcher(folder, size) {
  const dest = path.join(res, folder);
  if (!fs.existsSync(dest)) return;

  const pipeline = openLogoPipeline();
  const inner = Math.round(size * LAUNCHER_LOGO_FRAC);
  const padT = Math.floor((size - inner) / 2);
  const padL = Math.floor((size - inner) / 2);
  const bg = hexToRgb(LAUNCHER_BG);
  const buf = await pipeline
    .resize(inner, inner, {
      fit: 'contain',
      position: 'center',
      background: bg,
    })
    .extend({
      top: padT,
      bottom: size - inner - padT,
      left: padL,
      right: size - inner - padL,
      background: bg,
    })
    .png({ compressionLevel: 9 })
    .toBuffer();

  await fs.promises.writeFile(path.join(dest, 'ic_launcher.png'), buf);
  await fs.promises.writeFile(path.join(dest, 'ic_launcher_round.png'), buf);
  await fs.promises.writeFile(path.join(dest, 'ic_launcher_foreground.png'), buf);
  console.log(`  ✓ ${folder}/ic_launcher*.png  ${size}×${size}`);
}

/** Icono del splash nativo API 31+ (máscara circular del sistema; fondo = windowSplashScreenIconBackgroundColor). */
async function splashBrandIcon() {
  const nodpi = path.join(res, 'drawable-nodpi');
  fs.mkdirSync(nodpi, { recursive: true });
  const dest = path.join(nodpi, 'splash_brand_icon.png');
  const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
  const ICON = 432;
  await openLogoPipeline()
    .resize(ICON, ICON, { fit: 'contain', position: 'center', background: transparent })
    .ensureAlpha()
    .png({ compressionLevel: 9 })
    .toFile(dest);
  console.log(`  ✓ drawable-nodpi/splash_brand_icon.png  (${ICON}×${ICON}, alpha)`);
}

const portSplashes = [
  { dpi: 'mdpi', w: 320, h: 480 },
  { dpi: 'hdpi', w: 480, h: 800 },
  { dpi: 'xhdpi', w: 720, h: 1280 },
  { dpi: 'xxhdpi', w: 960, h: 1600 },
  { dpi: 'xxxhdpi', w: 1280, h: 1920 },
];

const launcherSizes = [
  { folder: 'mipmap-mdpi', size: 48 },
  { folder: 'mipmap-hdpi', size: 72 },
  { folder: 'mipmap-xhdpi', size: 96 },
  { folder: 'mipmap-xxhdpi', size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 },
];

console.log(useBrandPng ? `\n📎 Fuente: public/android-brand-logo.png\n` : `\n📎 Fuente: public/icon.svg\n`);
console.log(`🎨 Splash: fondo ${SPLASH_BG} + logo fit contain\n`);

console.log('🖼  Splash portrait');
for (const d of portSplashes) await splash(`drawable-port-${d.dpi}`, d.w, d.h);

console.log('\n🖼  Splash landscape');
for (const d of portSplashes) await splash(`drawable-land-${d.dpi}`, d.h, d.w);

console.log('\n🖼  Splash default (1080×1920)');
await splash('drawable', 1080, 1920);

console.log('\n📱 Launcher icons');
for (const { folder, size } of launcherSizes) await launcher(folder, size);

console.log('\n🎯 Splash API 31+ (animated icon)');
await splashBrandIcon();

console.log('\nDone — npm run cap:sync\n');
