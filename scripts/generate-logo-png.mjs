/**
 * Genera PNG del logo desde public/jc-one-fix-logo.png (PWA / descarga).
 * Ejecutar: node scripts/generate-logo-png.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const logoPath = path.join(root, 'public', 'jc-one-fix-logo.png');

const sizes = [
  { w: 512, h: 512, out: 'logo-jconefix.png' },
  { w: 512, h: 512, out: 'logo-jconefix-512.png' },
  { w: 192, h: 192, out: 'logo-jconefix-192.png' },
  { w: 1024, h: 1024, out: 'logo-jconefix-1024.png' },
];

const input = fs.readFileSync(logoPath);
for (const { w, h, out } of sizes) {
  const dest = path.join(root, 'public', out);
  await sharp(input).resize(w, h, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9 }).toFile(dest);
  console.log('Wrote', dest);
}
