const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const out = {
    csv: [],
    imagesDir: './chrono24_images',
    dryRun: false
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--csv') out.csv.push(argv[++i]);
    else if (a === '--imagesDir') out.imagesDir = argv[++i];
    else if (a === '--dryRun') out.dryRun = true;
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

function readCsvMapById(csvPath) {
  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return new Map();

  const headers = parseCsvLine(lines[0]);
  const idxBrand = headers.indexOf('brand');
  const idxModel = headers.indexOf('model');
  const idxListing = headers.indexOf('listingUrl');

  const map = new Map();
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCsvLine(lines[i]);
    const brand = (vals[idxBrand] || '').trim();
    const model = (vals[idxModel] || '').trim();
    const listingUrl = (idxListing !== -1 ? (vals[idxListing] || '').trim() : '');

    const m = listingUrl.match(/id(\d+)/i);
    if (!m) continue;

    const id = `id${m[1]}`;
    if (!map.has(id)) map.set(id, { brand, model });
  }
  return map;
}

function safeToken(s) {
  const t = (s || '').trim();
  if (!t) return '';
  return t
    .replace(/&/g, 'and')
    .replace(/\+/g, 'plus')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
}

function clampBaseName(base, maxLen) {
  if (base.length <= maxLen) return base;
  return base.slice(0, maxLen);
}

function uniquePath(desiredPath) {
  if (!fs.existsSync(desiredPath)) return desiredPath;

  const dir = path.dirname(desiredPath);
  const ext = path.extname(desiredPath);
  const name = path.basename(desiredPath, ext);

  for (let i = 2; i < 1000; i++) {
    const p = path.join(dir, `${name}__${String(i).padStart(2, '0')}${ext}`);
    if (!fs.existsSync(p)) return p;
  }
  throw new Error(`Unable to find unique name for: ${desiredPath}`);
}

function inferManuFromFileName(fileName) {
  const m = fileName.match(/^manu_(\d+)_/i);
  return m ? m[1] : 'unknown';
}

function inferIdFromFileName(fileName) {
  const m = fileName.match(/_(id\d+)_/i);
  return m ? m[1].toLowerCase() : null;
}

function inferSuffixFromFileName(fileName) {
  const m = fileName.match(/_(\d{2})\.[a-z0-9]+$/i);
  return m ? m[1] : '01';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.csv.length) {
    console.log('Usage: node rename_chrono_images.cjs --csv .\\chrono24_export_manu_221.csv --csv .\\chrono24_export_manu_43.csv --imagesDir .\\chrono24_images [--dryRun]');
    process.exit(1);
  }

  const idToMeta = new Map();
  for (const csvPath of args.csv) {
    const m = readCsvMapById(csvPath);
    for (const [id, meta] of m.entries()) {
      if (!idToMeta.has(id)) idToMeta.set(id, meta);
    }
  }

  const imagesDir = args.imagesDir;
  const files = fs.readdirSync(imagesDir).filter((f) => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));

  let renamed = 0;
  let skipped = 0;
  let missing = 0;

  for (const f of files) {
    const id = inferIdFromFileName(f);
    if (!id) {
      skipped++;
      continue;
    }

    const meta = idToMeta.get(id);
    if (!meta) {
      missing++;
      continue;
    }

    const manu = inferManuFromFileName(f);
    const suffix = inferSuffixFromFileName(f);
    const ext = path.extname(f).toLowerCase();

    const brandTok = safeToken(meta.brand);
    const modelTok = safeToken(meta.model);

    const baseParts = [
      `manu_${manu}`,
      brandTok || 'UnknownBrand',
      modelTok || 'UnknownModel',
      id,
      suffix
    ].filter(Boolean);

    let base = baseParts.join('_');
    base = clampBaseName(base, 160);

    const desired = path.join(imagesDir, `${base}${ext}`);
    const src = path.join(imagesDir, f);

    if (path.basename(desired).toLowerCase() === f.toLowerCase()) {
      skipped++;
      continue;
    }

    const dst = uniquePath(desired);

    if (args.dryRun) {
      console.log(`DRY RUN: ${f} -> ${path.basename(dst)}`);
      renamed++;
      continue;
    }

    fs.renameSync(src, dst);
    renamed++;
  }

  console.log(`Done. Files: ${files.length}. Renamed: ${renamed}. Skipped: ${skipped}. Missing CSV meta: ${missing}.`);
  if (args.dryRun) {
    console.log('Dry run only; no files were changed.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
