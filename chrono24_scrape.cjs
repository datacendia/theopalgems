const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const out = {
    url: '',
    pages: 3,
    pageSize: 60,
    delayMs: 700,
    outFile: path.join(process.cwd(), 'chrono24_export.csv')
  };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--url') out.url = argv[++i] || '';
    else if (a === '--pages') out.pages = Number(argv[++i] || out.pages);
    else if (a === '--delayMs') out.delayMs = Number(argv[++i] || out.delayMs);
    else if (a === '--out') out.outFile = argv[++i] || out.outFile;
  }

  if (!out.url) {
    throw new Error('Missing --url');
  }
  if (!Number.isFinite(out.pages) || out.pages < 1) out.pages = 1;
  if (!Number.isFinite(out.delayMs) || out.delayMs < 0) out.delayMs = 0;

  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function withPage(baseUrl, page) {
  const u = new URL(baseUrl);
  // Chrono24 appears to accept a 1-based page parameter.
  u.searchParams.set('page', String(page));
  return u.toString();
}

function normalizeWhitespace(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

function csvEscape(value) {
  const s = value == null ? '' : String(value);
  if (/[\r\n,\"]/g.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function toCsv(rows, headers) {
  const lines = [];
  lines.push(headers.join(','));
  for (const r of rows) {
    lines.push(headers.map((h) => csvEscape(r[h])).join(','));
  }
  return lines.join('\n') + '\n';
}

function extractOg(html, property) {
  const re = new RegExp(
    `<meta\\s+[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["'][^>]*>`,
    'i'
  );
  const m = html.match(re);
  return m ? m[1] : '';
}

function extractJsonLdObjects(html) {
  const out = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    const raw = (m[1] || '').trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) out.push(...parsed);
      else out.push(parsed);
    } catch {
      // Ignore malformed JSON-LD blocks
    }
  }
  return out;
}

function pickFirst(obj, paths) {
  for (const p of paths) {
    const parts = p.split('.');
    let cur = obj;
    let ok = true;
    for (const part of parts) {
      if (cur && Object.prototype.hasOwnProperty.call(cur, part)) cur = cur[part];
      else {
        ok = false;
        break;
      }
    }
    if (ok && cur != null) return cur;
  }
  return undefined;
}

function extractListingUrlsFromSearch(html) {
  // Find Chrono24 listing URLs like: https://www.chrono24.com/rolex/...--id123456.htm
  const urls = new Set();
  const re = /https?:\/\/www\.chrono24\.com\/[a-z0-9\-]+\/[\s\S]*?--id\d+\.htm/gi;
  let m;
  while ((m = re.exec(html))) {
    const url = m[0].replace(/\s/g, '');
    urls.add(url);
  }

  // Also capture relative ones just in case.
  const rel = /\/(?:rolex|cartier|audemarspiguet|patekphilippe)\/[\w\W]*?--id\d+\.htm/gi;
  while ((m = rel.exec(html))) {
    const u = 'https://www.chrono24.com' + m[0].replace(/\s/g, '');
    urls.add(u);
  }

  return Array.from(urls);
}

function extractSearchSnippets(html) {
  // Best-effort: map listingUrl -> {price, shipping, country, title}
  // The fetched content (via our tooling) includes repeated blocks like:
  // Brand Model\nTitle\n$Price\n+ $X for shipping\nUS
  // We'll scan around each URL occurrence.
  const out = new Map();
  const urlRe = /(https:\/\/www\.chrono24\.com\/[a-z0-9\-]+\/[\s\S]*?--id\d+\.htm)/gi;
  let m;
  while ((m = urlRe.exec(html))) {
    const url = (m[1] || '').replace(/\s/g, '');
    const start = Math.max(0, m.index - 800);
    const end = Math.min(html.length, m.index + 800);
    const chunk = html.slice(start, end);

    // Attempt to pull a price like $12,345 or Price on request
    const priceMatch = chunk.match(/\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/);
    const price = priceMatch ? priceMatch[0].replace(/\s/g, '') : (chunk.includes('Price on request') ? 'Price on request' : '');

    const shipMatch = chunk.match(/\+\s*\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?\s*for\s*shipping/i);
    const shipping = shipMatch ? normalizeWhitespace(shipMatch[0]) : (chunk.match(/Free shipping/i) ? 'Free shipping' : '');

    // Country often appears as a 2-letter code like US
    const countryMatch = chunk.match(/\bUS\b|\bDE\b|\bCH\b|\bGB\b|\bFR\b|\bIT\b|\bES\b|\bJP\b|\bHK\b|\bAE\b/);
    const country = countryMatch ? countryMatch[0] : '';

    out.set(url, { price, shipping, country });
  }
  return out;
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
    }
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return await res.text();
}

function deriveBrandModelFromTitle(title) {
  const t = normalizeWhitespace(title);
  const parts = t.split(' ');
  const brand = parts[0] || '';
  const model = parts.slice(1).join(' ');
  return { brand, model };
}

function parseListingDetailsFromHtml(html) {
  const ogTitle = extractOg(html, 'og:title');
  const ogImage = extractOg(html, 'og:image');

  const jsonlds = extractJsonLdObjects(html);
  const product =
    jsonlds.find((o) => o && (o['@type'] === 'Product' || (Array.isArray(o['@type']) && o['@type'].includes('Product')))) ||
    jsonlds.find((o) => o && o['@type'] === 'Offer') ||
    {};

  const brand =
    (typeof pickFirst(product, ['brand.name']) === 'string' && pickFirst(product, ['brand.name'])) ||
    (typeof product.brand === 'string' && product.brand) ||
    '';

  const model =
    (typeof pickFirst(product, ['model']) === 'string' && pickFirst(product, ['model'])) ||
    (typeof pickFirst(product, ['name']) === 'string' && pickFirst(product, ['name'])) ||
    '';

  const reference =
    (typeof pickFirst(product, ['mpn']) === 'string' && pickFirst(product, ['mpn'])) ||
    (typeof pickFirst(product, ['sku']) === 'string' && pickFirst(product, ['sku'])) ||
    '';

  const year =
    (typeof pickFirst(product, ['productionDate']) === 'string' && pickFirst(product, ['productionDate'])) ||
    '';

  let condition = '';
  const offer = pickFirst(product, ['offers']) || {};
  const itemCondition = pickFirst(offer, ['itemCondition']);
  if (typeof itemCondition === 'string') condition = itemCondition;

  return {
    ogTitle: normalizeWhitespace(ogTitle),
    imageUrl: ogImage,
    brand: normalizeWhitespace(brand),
    model: normalizeWhitespace(model),
    reference: normalizeWhitespace(reference),
    year: normalizeWhitespace(year),
    condition: normalizeWhitespace(condition)
  };
}

function parseTitleFallback(ogTitle) {
  // Often: "Rolex Submariner Date - UNWORN 2024 126610LN Submariner Date 41mm Black"
  const t = normalizeWhitespace(ogTitle);
  const left = t.split(' - ')[0] || t;
  return left;
}

async function main() {
  const args = parseArgs(process.argv);

  console.log(`Scraping Chrono24...`);
  console.log(`- URL: ${args.url}`);
  console.log(`- Pages: ${args.pages}`);
  console.log(`- DelayMs: ${args.delayMs}`);
  console.log(`- Output: ${args.outFile}`);

  const allListingUrls = new Set();
  const searchMetaByUrl = new Map();

  for (let p = 1; p <= args.pages; p++) {
    const pageUrl = withPage(args.url, p);
    console.log(`Fetching search page ${p}: ${pageUrl}`);

    const html = await fetchHtml(pageUrl);

    const urls = extractListingUrlsFromSearch(html);
    const snippets = extractSearchSnippets(html);

    for (const u of urls) {
      allListingUrls.add(u);
      const sn = snippets.get(u);
      if (sn) searchMetaByUrl.set(u, sn);
    }

    console.log(`- Found ${urls.length} listing URLs on page ${p}`);

    if (args.delayMs) await sleep(args.delayMs);
  }

  const listingUrls = Array.from(allListingUrls);
  console.log(`Total unique listing URLs: ${listingUrls.length}`);

  const rows = [];
  for (let i = 0; i < listingUrls.length; i++) {
    const listingUrl = listingUrls[i];
    console.log(`(${i + 1}/${listingUrls.length}) Fetching listing: ${listingUrl}`);

    let html = '';
    try {
      html = await fetchHtml(listingUrl);
    } catch (e) {
      console.warn(`- Failed to fetch listing: ${e.message}`);
      continue;
    }

    const details = parseListingDetailsFromHtml(html);
    const fallbackTitle = details.ogTitle ? parseTitleFallback(details.ogTitle) : '';
    const derived = deriveBrandModelFromTitle(fallbackTitle);

    const searchMeta = searchMetaByUrl.get(listingUrl) || {};

    const brand = details.brand || derived.brand;
    const model = details.model || derived.model;

    rows.push({
      brand,
      model,
      title: details.ogTitle || fallbackTitle,
      price: searchMeta.price || '',
      shipping: searchMeta.shipping || '',
      location_country: searchMeta.country || '',
      year: details.year || '',
      condition: details.condition || '',
      reference: details.reference || '',
      listingUrl,
      imageUrl: details.imageUrl || ''
    });

    if (args.delayMs) await sleep(args.delayMs);
  }

  const headers = [
    'brand',
    'model',
    'title',
    'price',
    'shipping',
    'location_country',
    'year',
    'condition',
    'reference',
    'listingUrl',
    'imageUrl'
  ];

  const csv = toCsv(rows, headers);
  fs.writeFileSync(args.outFile, csv, 'utf8');

  console.log(`Done. Wrote ${rows.length} rows to ${args.outFile}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
