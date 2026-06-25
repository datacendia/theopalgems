// Copy every product image the site displays that has a WHITE background
// into a folder named "require AI update".
//
// Detection: sample the border pixels of each image. If the border is
// predominantly near-white (and not transparent), it's a white-background shot.
//
// Usage:  node scripts/copy-white-bg-images.mjs
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'require AI update');

const { kiraProducts } = await import('../src/data/kiraProducts.js');

// ── helpers ──────────────────────────────────────────────────────────────
function slug(s) {
  return String(s || '').trim().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'item';
}

async function loadBuffer(img) {
  if (/^https?:/.test(img)) {
    const res = await fetch(img, { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  // local path like /assets/kira/x.jpg  ->  public/assets/kira/x.jpg
  return fs.readFile(path.join(ROOT, 'public', img.replace(/^\//, '')));
}

// Returns { white:boolean, transparent:boolean, whitePct, transPct }
async function classify(buf) {
  const W = 64, H = 64;
  const { data } = await sharp(buf).ensureAlpha().resize(W, H, { fit: 'fill' })
    .raw().toBuffer({ resolveWithObject: true });
  const idx = (x, y) => (y * W + x) * 4;
  let white = 0, colored = 0, transparent = 0, total = 0;
  const isBorder = (x, y) => x < 2 || x >= W - 2 || y < 2 || y >= H - 2;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!isBorder(x, y)) continue;
      total++;
      const i = idx(x, y);
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a < 100) { transparent++; continue; }
      if (r >= 230 && g >= 230 && b >= 230) white++;
      else colored++;
    }
  }
  const whitePct = white / total;
  const transPct = transparent / total;
  const opaque = white + colored;
  const isWhite = transPct < 0.30 && opaque > 0 && (white / opaque) >= 0.82;
  return { white: isWhite, transparent: transPct >= 0.5, whitePct, transPct };
}

// ── gather unique displayed images ───────────────────────────────────────
const seen = new Set();
const items = [];
for (const p of kiraProducts) {
  const img = p.image || p.link || '';
  if (!img || seen.has(img)) continue;
  seen.add(img);
  items.push({ id: p.name, name: p.description, category: p.category, img });
}

await fs.mkdir(OUT_DIR, { recursive: true });

const whiteBg = [], transparent = [], colored = [], failed = [];
let n = 0;
for (const it of items) {
  n++;
  try {
    const buf = await loadBuffer(it.img);
    const c = await classify(buf);
    if (c.white) {
      const ext = (it.img.match(/\.(jpe?g|png|webp)/i)?.[1] || 'jpg').toLowerCase();
      const fname = `${it.id}_${slug(it.name)}.${ext.replace('jpeg', 'jpg')}`;
      await fs.writeFile(path.join(OUT_DIR, fname), buf);
      whiteBg.push({ ...it, fname });
    } else if (c.transparent) {
      transparent.push(it);
    } else {
      colored.push(it);
    }
  } catch (e) {
    failed.push({ ...it, err: e.message });
  }
  process.stdout.write(`\r  scanned ${n}/${items.length}`);
}
process.stdout.write('\n\n');

console.log(`WHITE BACKGROUND  → copied ${whiteBg.length} to "require AI update/"`);
whiteBg.forEach(w => console.log(`   ${w.id.toString().padEnd(10)} ${w.category.padEnd(11)} ${w.name}`));
console.log(`\nTRANSPARENT (no bg, skipped): ${transparent.length}`);
console.log(`NON-WHITE bg (skipped):       ${colored.length}`);
if (failed.length) {
  console.log(`\nFAILED to load: ${failed.length}`);
  failed.forEach(f => console.log(`   ${f.id}  ${f.err}  (${f.img.slice(0, 60)})`));
}
console.log(`\nOutput folder: ${OUT_DIR}`);
