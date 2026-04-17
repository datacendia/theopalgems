const fs = require('fs');
const path = require('path');
const https = require('https');

function parseArgs(argv) {
  const out = { csv: [], outDir: './chrono24_images', concurrency: 6, timeoutMs: 45000 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--csv') out.csv.push(argv[++i]);
    else if (a === '--outDir') out.outDir = argv[++i];
    else if (a === '--concurrency') out.concurrency = Number(argv[++i] || out.concurrency);
    else if (a === '--timeoutMs') out.timeoutMs = Number(argv[++i] || out.timeoutMs);
  }
  return out;
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        const next = line[i + 1];
        if (next === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === ',') {
        out.push(cur);
        cur = '';
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out;
}

function readCsvRows(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  const idxImage = headers.indexOf('imageUrl');
  const idxListing = headers.indexOf('listingUrl');
  if (idxImage === -1) throw new Error(`No imageUrl column found in ${filePath}`);

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCsvLine(lines[i]);
    rows.push({
      imageUrl: (vals[idxImage] || '').trim(),
      listingUrl: idxListing !== -1 ? (vals[idxListing] || '').trim() : ''
    });
  }
  return rows;
}

function inferManufacturerFromCsvPath(csvPath) {
  const base = path.basename(csvPath).toLowerCase();
  const m = base.match(/manu_(\d+)/);
  return m ? m[1] : 'unknown';
}

function inferListingId(listingUrl, imageUrl) {
  const fromListing = (listingUrl || '').match(/id(\d+)/i);
  if (fromListing) return `id${fromListing[1]}`;
  const fromImage = (imageUrl || '').match(/\/((?:id)?\d+)-/i);
  if (fromImage) return fromImage[1].startsWith('id') ? fromImage[1] : `id${fromImage[1]}`;
  return 'noid';
}

function requestBuffer(url, timeoutMs, redirectDepth = 0) {
  return new Promise((resolve, reject) => {
    if (redirectDepth > 5) return reject(new Error(`Too many redirects: ${url}`));

    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      const status = res.statusCode || 0;
      const location = res.headers.location;
      if (status >= 300 && status < 400 && location) {
        res.resume();
        const next = location.startsWith('http') ? location : new URL(location, url).toString();
        requestBuffer(next, timeoutMs, redirectDepth + 1).then(resolve).catch(reject);
        return;
      }

      if (status < 200 || status >= 300) {
        res.resume();
        reject(new Error(`HTTP ${status} for ${url}`));
        return;
      }

      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => resolve({
        buffer: Buffer.concat(chunks),
        contentType: (res.headers['content-type'] || '').toString()
      }));
    });

    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Timeout after ${timeoutMs}ms: ${url}`));
    });
  });
}

function extFromContentTypeOrUrl(contentType, url) {
  const ct = (contentType || '').toLowerCase();
  if (ct.includes('image/jpeg') || ct.includes('image/jpg')) return 'jpg';
  if (ct.includes('image/png')) return 'png';
  if (ct.includes('image/webp')) return 'webp';
  if (ct.includes('image/gif')) return 'gif';

  const u = (url || '').toLowerCase();
  const m = u.match(/\.(jpg|jpeg|png|webp|gif)(?:\?|$)/);
  if (m) return m[1] === 'jpeg' ? 'jpg' : m[1];
  return 'jpg';
}

async function withConcurrency(items, limit, worker) {
  const queue = items.slice();
  const workers = new Array(Math.max(1, limit)).fill(0).map(async () => {
    while (queue.length) {
      const item = queue.shift();
      if (!item) return;
      await worker(item);
    }
  });
  await Promise.all(workers);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.csv.length) {
    console.log('Usage: node download_chrono_images.cjs --csv .\\chrono24_export_manu_18.csv --csv .\\chrono24_export_manu_43.csv [--outDir .\\chrono24_images] [--concurrency 6]');
    process.exit(1);
  }

  fs.mkdirSync(args.outDir, { recursive: true });

  const tasks = [];
  for (const csvPath of args.csv) {
    const manu = inferManufacturerFromCsvPath(csvPath);
    const rows = readCsvRows(csvPath);
    for (const r of rows) {
      if (!r.imageUrl) continue;
      const listingId = inferListingId(r.listingUrl, r.imageUrl);
      tasks.push({ manu, listingId, imageUrl: r.imageUrl });
    }
  }

  const byUrl = new Map();
  for (const t of tasks) {
    if (!byUrl.has(t.imageUrl)) byUrl.set(t.imageUrl, t);
  }
  const unique = Array.from(byUrl.values());

  const counts = new Map();
  function nextIndex(key) {
    const n = (counts.get(key) || 0) + 1;
    counts.set(key, n);
    return String(n).padStart(2, '0');
  }

  let done = 0;
  let skipped = 0;
  let failed = 0;

  await withConcurrency(unique, args.concurrency, async (t) => {
    const key = `${t.manu}_${t.listingId}`;
    const idx = nextIndex(key);

    try {
      const { buffer, contentType } = await requestBuffer(t.imageUrl, args.timeoutMs);
      const ext = extFromContentTypeOrUrl(contentType, t.imageUrl);
      const fileName = `manu_${t.manu}_${t.listingId}_${idx}.${ext}`;
      const outPath = path.join(args.outDir, fileName);

      if (fs.existsSync(outPath)) {
        skipped++;
      } else {
        fs.writeFileSync(outPath, buffer);
      }

      done++;
      if (done % 10 === 0 || done === unique.length) {
        console.log(`Downloaded ${done}/${unique.length} (skipped: ${skipped}, failed: ${failed})`);
      }
    } catch (e) {
      failed++;
      done++;
      console.warn(`Failed (${done}/${unique.length}) ${t.imageUrl}: ${e.message || e}`);
    }
  });

  console.log(`Finished. Unique URLs: ${unique.length}. Saved to: ${path.resolve(args.outDir)}. Skipped: ${skipped}. Failed: ${failed}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
