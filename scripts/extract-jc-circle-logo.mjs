/**
 * Genera public/jc-one-fix-logo.png (512×512, PNG transparente) y public/android-brand-logo.png (misma imagen).
 *
 * · Lienzo casi cuadrado (logo con esquinas blancas / tablero): quita blanco, recentra el disco+JC y aplica máscara circular.
 * · Lienzo ancho (tarjeta): recorte + máscara como antes.
 *
 * Uso: node scripts/extract-jc-circle-logo.mjs [entrada]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outPath = path.join(root, 'public', 'jc-one-fix-logo.png');
const androidBrandPath = path.join(root, 'public', 'android-brand-logo.png');

const assetsDir = path.join(
  process.env.USERPROFILE || '',
  '.cursor',
  'projects',
  'c-Users-srgon-CascadeProjects-project',
  'assets',
);

const candidates = [
  path.join(
    assetsDir,
    'c__Users_srgon_AppData_Roaming_Cursor_User_workspaceStorage_d6b1405a2010b14ba5d3f1f49ba754e9_images_1000161033_imgupscaler.ai_General_4K-8462979a-b2c5-4805-b952-bef449818869.png',
  ),
  path.join(
    assetsDir,
    'c__Users_srgon_AppData_Roaming_Cursor_User_workspaceStorage_d6b1405a2010b14ba5d3f1f49ba754e9_images_1000161033_imgupscaler.ai_General_4K-689ef3e7-cdea-4b90-a0d8-bedb3d948f2b.png',
  ),
  path.join(
    assetsDir,
    'c__Users_srgon_AppData_Roaming_Cursor_User_workspaceStorage_d6b1405a2010b14ba5d3f1f49ba754e9_images_image-413660f1-5793-45b2-886e-6f959db61f32.png',
  ),
];

function pickDefaultInput() {
  const arg0 = process.argv[2];
  if (arg0 && fs.existsSync(arg0)) return arg0;
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

/** Fondo claro (blanco / gris muy claro del lienzo). */
function isBackgroundLight(r, g, b) {
  if (r > 233 && g > 233 && b > 233) return true;
  const avg = (r + g + b) / 3;
  return avg > 210 && Math.abs(r - g) < 25 && Math.abs(g - b) < 25;
}

function applyCircularAlpha(data, w, h, radiusPx, featherPx) {
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const out = Buffer.from(data);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const d = Math.hypot(x - cx, y - cy);
      let a = out[i + 3] / 255;
      if (d > radiusPx + featherPx) {
        a = 0;
      } else if (d > radiusPx) {
        a *= 1 - (d - radiusPx) / featherPx;
      }
      out[i + 3] = Math.round(Math.max(0, Math.min(1, a)) * 255);
    }
  }
  return out;
}

/** Radio hasta el fondo claro (rayos desde el centro). */
function outerRadiusFromRays(data, w, h, channels) {
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const dirs = 72;
  const dists = [];
  const pix = (x, y) => {
    const xi = Math.max(0, Math.min(w - 1, x));
    const yi = Math.max(0, Math.min(h - 1, y));
    const i = (yi * w + xi) * channels;
    return [data[i], data[i + 1], data[i + 2], channels === 4 ? data[i + 3] : 255];
  };
  for (let k = 0; k < dirs; k++) {
    const ang = (k / dirs) * Math.PI * 2;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    let lastFg = 0;
    for (let t = 1; t < Math.min(w, h) * 0.55; t++) {
      const x = Math.round(cx + t * dx);
      const y = Math.round(cy + t * dy);
      const [r, g, b, a] = pix(x, y);
      const fg = a > 8 && !isBackgroundLight(r, g, b);
      if (fg) lastFg = t;
      else if (lastFg > 0 && t > lastFg + 4) break;
    }
    dists.push(lastFg);
  }
  dists.sort((a, b) => a - b);
  return dists[Math.floor(dists.length * 0.12)] || Math.min(w, h) * 0.48;
}

/**
 * Lienzo cuadrado: pad simétrico → RGBA → blanco a transparente → recentrar por centroide → máscara circular.
 */
async function processSquareAsset(inputPath, iw, ih) {
  const S = Math.max(iw, ih);
  const padL = Math.floor((S - iw) / 2);
  const padT = Math.floor((S - ih) / 2);
  const padR = S - iw - padL;
  const padB = S - ih - padT;

  let { data, info } = await sharp(inputPath)
    .extend({
      left: padL,
      right: padR,
      top: padT,
      bottom: padB,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const ch = 4;

  for (let i = 0; i < data.length; i += ch) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (isBackgroundLight(r, g, b)) {
      data[i + 3] = 0;
    } else if (data[i + 3] > 0) {
      data[i + 3] = 255;
    }
  }

  let sx = 0;
  let sy = 0;
  let n = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * ch;
      if (data[i + 3] < 16) continue;
      sx += x;
      sy += y;
      n++;
    }
  }

  const centX = n > 0 ? sx / n : (w - 1) / 2;
  const centY = n > 0 ? sy / n : (h - 1) / 2;
  const ox = Math.round((w - 1) / 2 - centX);
  const oy = Math.round((h - 1) / 2 - centY);

  const shifted = Buffer.alloc(w * h * ch, 0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx0 = x - ox;
      const sy0 = y - oy;
      if (sx0 < 0 || sy0 < 0 || sx0 >= w || sy0 >= h) continue;
      const si = (sy0 * w + sx0) * ch;
      const di = (y * w + x) * ch;
      shifted[di] = data[si];
      shifted[di + 1] = data[si + 1];
      shifted[di + 2] = data[si + 2];
      shifted[di + 3] = data[si + 3];
    }
  }
  data = shifted;

  const rOuter = outerRadiusFromRays(data, w, h, ch);
  const half = Math.min(w, h) / 2;
  const feather = Math.max(1.2, half * 0.018);
  const radiusPx = Math.min(rOuter - feather - 0.5, half - feather - 0.25);
  const masked = applyCircularAlpha(data, w, h, Math.max(1, radiusPx), feather);

  return { buffer: masked, width: w, height: h };
}

/** Lienzo ancho tipo tarjeta (logo centrado en franja). */
async function processWideAsset(inputPath, iw, ih) {
  const cx = iw / 2;
  const cy = ih / 2;
  const minSide = Math.min(iw, ih);
  const rFactor = 0.135;
  const R = minSide * rFactor;
  const side = Math.ceil(2 * R + 8);
  const left = Math.max(0, Math.round(cx - side / 2));
  const top = Math.max(0, Math.round(cy - side / 2));
  const w = Math.min(side, iw - left);
  const h = Math.min(side, ih - top);

  const cropped = await sharp(inputPath).extract({ left, top, width: w, height: h }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const half = Math.min(cropped.info.width, cropped.info.height) / 2;
  const feather = Math.max(1.5, half * 0.028);
  const masked = applyCircularAlpha(
    cropped.data,
    cropped.info.width,
    cropped.info.height,
    half - feather - 0.25,
    feather,
  );
  return { buffer: masked, width: cropped.info.width, height: cropped.info.height };
}

async function main() {
  const inputPath = pickDefaultInput();
  if (!inputPath) {
    console.error('No se encontró archivo de entrada.');
    process.exit(1);
  }

  const meta = await sharp(inputPath).metadata();
  const iw = meta.width;
  const ih = meta.height;
  const ar = iw / ih;

  const squareish = ar > 0.88 && ar < 1.13;
  const result = squareish
    ? await processSquareAsset(inputPath, iw, ih)
    : await processWideAsset(inputPath, iw, ih);

  const OUT = 512;
  const pngBuf = await sharp(result.buffer, {
    raw: { width: result.width, height: result.height, channels: 4 },
  })
    .resize(OUT, OUT, { kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9 })
    .toBuffer();

  await fs.promises.writeFile(outPath, pngBuf);
  await fs.promises.writeFile(androidBrandPath, pngBuf);

  console.log('OK', outPath);
  console.log('OK', androidBrandPath);
  console.log('   entrada:', inputPath);
  console.log('   modo:', squareish ? 'lienzo cuadrado (blanco→α + centroide + círculo)' : 'lienzo ancho (recorte clásico)');
}

await main();
