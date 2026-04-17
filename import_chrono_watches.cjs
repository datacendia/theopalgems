const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const out = {
    csv: [],
    imagesDir: './chrono24_images',
    publicWatchesDir: './public/assets/watches',
    outJs: './src/data/watches.js'
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--csv') out.csv.push(argv[++i]);
    else if (a === '--imagesDir') out.imagesDir = argv[++i];
    else if (a === '--publicWatchesDir') out.publicWatchesDir = argv[++i];
    else if (a === '--outJs') out.outJs = argv[++i];
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
  const idxBrand = headers.indexOf('brand');
  const idxModel = headers.indexOf('model');
  const idxTitle = headers.indexOf('title');
  const idxPrice = headers.indexOf('price');
  const idxRef = headers.indexOf('reference');
  const idxYear = headers.indexOf('year');
  const idxCondition = headers.indexOf('condition');
  const idxListing = headers.indexOf('listingUrl');

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCsvLine(lines[i]);
    rows.push({
      brand: (vals[idxBrand] || '').trim(),
      model: (vals[idxModel] || '').trim(),
      title: (vals[idxTitle] || '').trim(),
      price: (vals[idxPrice] || '').trim(),
      reference: idxRef !== -1 ? (vals[idxRef] || '').trim() : '',
      year: idxYear !== -1 ? (vals[idxYear] || '').trim() : '',
      condition: idxCondition !== -1 ? (vals[idxCondition] || '').trim() : '',
      listingUrl: idxListing !== -1 ? (vals[idxListing] || '').trim() : ''
    });
  }

  return rows;
}

function inferListingId(listingUrl) {
  const m = (listingUrl || '').match(/id(\d+)/i);
  return m ? `id${m[1]}` : null;
}

function safeToken(s) {
  const t = (s || '').trim();
  if (!t) return '';
  return t
    .replace(/&/g, 'and')
    .replace(/\+/g, 'plus')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function stripLeadingBrandFromModel(brand, model) {
  const b = safeToken(brand).toLowerCase();
  const m = safeToken(model);
  if (!m) return '';

  const mLower = m.toLowerCase();
  if (!b) return m;

  // Handle common cases like:
  // brand="Audemars Piguet", model="Piguet Royal Oak ..."
  // brand="Patek Philippe", model="Philippe Aquanaut ..."
  const brandParts = b.split(' ').filter(Boolean);
  const tail = brandParts[brandParts.length - 1];

  const prefixes = [
    b,
    tail
  ].filter(Boolean);

  for (const p of prefixes) {
    const pSp = `${p} `;
    if (mLower.startsWith(pSp)) return m.slice(pSp.length).trim();
  }

  return m;
}

function normalizeName(brand, model, title) {
  const cleanModel = safeToken(model).replace(/\s+for\s+.*$/i, '').trim();
  if (cleanModel) return `${brand} ${cleanModel}`.trim();

  const cleanTitle = safeToken(title).replace(/\s+for\s+.*$/i, '').trim();
  if (cleanTitle) return cleanTitle;

  return brand || 'Watch';
}

function buildDescription(row) {
  const parts = [];
  const cond = (row.condition || '').replace(/^https?:\/\//i, '').trim();
  if (cond) parts.push(cond);
  if (row.year) parts.push(row.year);
  if (row.reference) parts.push(`Ref ${row.reference}`);
  return parts.join(' • ');
}

function jsString(s) {
  return JSON.stringify(s ?? '');
}

function loadImagesById(imagesDir) {
  const files = fs.readdirSync(imagesDir).filter((f) => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));
  const byId = new Map();

  for (const f of files) {
    const m = f.match(/_(id\d+)_/i);
    if (!m) continue;
    const id = m[1].toLowerCase();

    if (!byId.has(id)) byId.set(id, []);
    byId.get(id).push(f);
  }

  return byId;
}

function sortBrandKey(brand) {
  const b = (brand || '').toLowerCase();
  if (b.includes('rolex')) return 1;
  if (b.includes('audemars')) return 2;
  if (b.includes('cartier')) return 3;
  if (b.includes('patek')) return 4;
  return 99;
}

function brandHeader(brand) {
  if (brand === 'Rolex') return '// ── Rolex ──';
  if (brand === 'Audemars Piguet') return '// ── Audemars Piguet ──';
  if (brand === 'Cartier') return '// ── Cartier ──';
  if (brand === 'Patek') return '// ── Patek Philippe ──';
  if (brand === 'Patek Philippe') return '// ── Patek Philippe ──';
  return `// ── ${brand || 'Other'} ──`;
}

function canonicalBrand(raw) {
  const b = (raw || '').trim();
  if (!b) return 'Other';
  const bl = b.toLowerCase();
  if (bl === 'patek') return 'Patek Philippe';
  if (bl === 'audemars') return 'Audemars Piguet';
  return b;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.csv.length) {
    console.log('Usage: node import_chrono_watches.cjs --csv .\\chrono24_export_manu_221.csv --csv .\\chrono24_export_manu_18.csv ...');
    process.exit(1);
  }

  fs.mkdirSync(args.publicWatchesDir, { recursive: true });

  const imagesById = loadImagesById(args.imagesDir);

  const all = [];
  for (const csvPath of args.csv) {
    const rows = readCsvRows(csvPath);
    for (const r of rows) {
      const id = inferListingId(r.listingUrl);
      if (!id) continue;
      const brand = canonicalBrand(r.brand);
      all.push({ ...r, brand, listingId: id });
    }
  }

  const byListing = new Map();
  for (const r of all) {
    if (!byListing.has(r.listingId)) byListing.set(r.listingId, r);
  }

  const unique = Array.from(byListing.values());

  const watches = [];
  for (const r of unique) {
    const idLower = r.listingId.toLowerCase();
    const imageFiles = imagesById.get(idLower) || [];
    const imageFile = imageFiles[0];
    if (imageFile) {
      const src = path.join(args.imagesDir, imageFile);
      const dst = path.join(args.publicWatchesDir, imageFile);
      if (!fs.existsSync(dst)) fs.copyFileSync(src, dst);
    }

    const cleanedModel = stripLeadingBrandFromModel(r.brand, r.model);
    const name = normalizeName(r.brand, cleanedModel, r.title);
    const description = buildDescription(r);
    watches.push({
      id: `chrono24-${r.listingId}`,
      brand: r.brand,
      name,
      price: r.price || '',
      description,
      image: imageFile ? `/assets/watches/${imageFile}` : '',
      url: r.listingUrl
    });
  }

  watches.sort((a, b) => {
    const ak = sortBrandKey(a.brand);
    const bk = sortBrandKey(b.brand);
    if (ak !== bk) return ak - bk;
    return a.name.localeCompare(b.name);
  });

  const lines = [];
  lines.push('const watches = [');

  let lastBrand = null;
  for (const w of watches) {
    if (w.brand !== lastBrand) {
      if (lastBrand !== null) lines.push('');
      lines.push(`  ${brandHeader(w.brand)}`);
      lastBrand = w.brand;
    }

    lines.push('  {');
    lines.push(`    id: ${jsString(w.id)},`);
    lines.push(`    brand: ${jsString(w.brand)},`);
    lines.push(`    name: ${jsString(w.name)},`);
    lines.push(`    price: ${jsString(w.price)},`);
    lines.push(`    description: ${jsString(w.description)},`);
    lines.push(`    image: ${jsString(w.image)},`);
    lines.push(`    url: ${jsString(w.url)}`);
    lines.push('  },');
  }

  lines.push('];');
  lines.push('');
  lines.push('export default watches;');
  lines.push('');

  fs.mkdirSync(path.dirname(args.outJs), { recursive: true });
  fs.writeFileSync(args.outJs, lines.join('\n'), 'utf8');

  console.log(`Imported ${watches.length} watches into ${path.resolve(args.outJs)}`);
  console.log(`Copied images into ${path.resolve(args.publicWatchesDir)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
