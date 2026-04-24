/**
 * SVG -> PNG para CapCut / editores que no importan bien SVG.
 * Ejecutar: node scripts/generate-watermark-badge-png.mjs
 */
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const svgPath = path.join(root, 'public', 'brand', 'jc-one-fix-watermark-cover.svg');
const outPath = path.join(root, 'public', 'brand', 'jc-one-fix-watermark-cover.png');

// density alta = texto mas nítido al escalar en CapCut
// 3x del viewBox 640x88 (pildora negra landing)
await sharp(svgPath, { density: 300 })
  .resize(1920, 264, {
    kernel: sharp.kernel.lanczos3,
    fit: 'fill',
  })
  .png({ compressionLevel: 9 })
  .toFile(outPath);

console.log('Wrote', outPath);
