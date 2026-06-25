// Download each product's CURRENT website image (Google Drive) to _matcher_imgs/<id>.jpg
// so the stills matcher can display them reliably. Google Drive throttles/blocks bulk
// hotlinking from non-Google origins, so we fetch them once, server-side, where it works.
//
// Usage: node scripts/fetch_website_images.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.join(__dirname, '..');
const PRODUCTS_FILE = path.join(BASE, 'src', 'data', 'kiraProducts.js');
const OUT_DIR = path.join(BASE, '_matcher_imgs');
fs.mkdirSync(OUT_DIR, { recursive: true });

const srcText = fs.readFileSync(PRODUCTS_FILE, 'utf8');
const re = /name:\s*"([^"]+)",\s*link:\s*"([^"]*)"/g;
const items = [];
let m;
while ((m = re.exec(srcText)) !== null) {
  const [, id, link] = m;
  if (link && /^https?:\/\//i.test(link)) items.push({ id, link });
}

function driveId(link) {
  const a = link.match(/[?&]id=([^&]+)/);
  if (a) return a[1];
  const b = link.match(/\/d\/([^/]+)/);
  return b ? b[1] : null;
}

async function tryDownload(fid, link) {
  const urls = fid
    ? ['https://lh3.googleusercontent.com/d/' + fid + '=w1000',
       'https://drive.google.com/thumbnail?id=' + fid + '&sz=w1000',
       link]
    : [link];
  for (const u of urls) {
    try {
      const res = await fetch(u, { redirect: 'follow' });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.startsWith('image')) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 1000) return buf;
      }
    } catch { /* try next url */ }
  }
  return null;
}

const cache = {};
let ok = 0;
let fail = 0;
const failed = [];
for (const { id, link } of items) {
  const fid = driveId(link);
  let buf = fid ? cache[fid] : null;
  if (!buf) {
    buf = await tryDownload(fid, link);
    if (buf && fid) cache[fid] = buf;
    await new Promise((r) => setTimeout(r, 100));
  }
  if (buf) {
    fs.writeFileSync(path.join(OUT_DIR, id + '.jpg'), buf);
    ok++;
  } else {
    fail++;
    failed.push(id);
  }
}
console.log('Downloaded: ' + ok + ' / ' + items.length + ' website images (failed: ' + fail + ')');
if (failed.length) console.log('Failed ids: ' + failed.join(', '));
console.log('-> ' + OUT_DIR);
