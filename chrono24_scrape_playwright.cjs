const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

function parseArgs(argv) {
  const out = {
    url: '',
    pages: 10,
    startPage: 1,
    delayMs: 800,
    outFile: path.join(process.cwd(), 'chrono24_export.csv'),
    headful: false
  };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--url') out.url = argv[++i] || '';
    else if (a === '--pages') out.pages = Number(argv[++i] || out.pages);
    else if (a === '--startPage') out.startPage = Number(argv[++i] || out.startPage);
    else if (a === '--delayMs') out.delayMs = Number(argv[++i] || out.delayMs);
    else if (a === '--out') out.outFile = argv[++i] || out.outFile;
    else if (a === '--headful') out.headful = true;
  }

  if (!out.url) throw new Error('Missing --url');
  if (!Number.isFinite(out.pages) || out.pages < 1) out.pages = 1;
  if (!Number.isFinite(out.startPage) || out.startPage < 1) out.startPage = 1;
  if (!Number.isFinite(out.delayMs) || out.delayMs < 0) out.delayMs = 0;
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function withPage(baseUrl, page) {
  const u = new URL(baseUrl);
  u.searchParams.set('page', String(page));
  return u.toString();
}

function normalizeWhitespace(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

function csvEscape(value) {
  const s = value == null ? '' : String(value);
  if (/[\r\n,\"]/g.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function toCsv(rows, headers) {
  const lines = [];
  lines.push(headers.join(','));
  for (const r of rows) lines.push(headers.map((h) => csvEscape(r[h])).join(','));
  return lines.join('\n') + '\n';
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

function readExistingCsv(filePath) {
  try {
    if (!fs.existsSync(filePath)) return { headers: null, rows: [] };
    const raw = fs.readFileSync(filePath, 'utf8');
    const lines = raw.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return { headers: null, rows: [] };
    const headers = parseCsvLine(lines[0]);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = parseCsvLine(lines[i]);
      const row = {};
      for (let h = 0; h < headers.length; h++) row[headers[h]] = vals[h] ?? '';
      rows.push(row);
    }
    return { headers, rows };
  } catch {
    return { headers: null, rows: [] };
  }
}

function countFilledFields(row, headers) {
  let n = 0;
  for (const h of headers) {
    if (h === 'listingUrl') continue;
    const v = row?.[h];
    if (typeof v === 'string' ? v.trim() !== '' : v != null) n++;
  }
  return n;
}

function mergeAndDedupeRows(existingRows, newRows, headers) {
  const byUrl = new Map();

  for (const r of existingRows) {
    const u = (r.listingUrl || '').trim();
    if (!u) continue;
    byUrl.set(u, r);
  }

  for (const r of newRows) {
    const u = (r.listingUrl || '').trim();
    if (!u) continue;
    const prev = byUrl.get(u);
    if (!prev) {
      byUrl.set(u, r);
      continue;
    }

    const prevScore = countFilledFields(prev, headers);
    const nextScore = countFilledFields(r, headers);
    if (nextScore > prevScore) byUrl.set(u, r);
  }

  return Array.from(byUrl.values());
}

function parseBrandModelFromTitle(title) {
  const t = normalizeWhitespace(title);
  const parts = t.split(' ');
  const brand = parts[0] || '';
  const model = parts.slice(1).join(' ');
  return { brand, model };
}

function parsePriceFromText(text) {
  const t = normalizeWhitespace(text);
  const m = t.match(/\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/);
  if (!m) return { price: '', priceCurrency: '' };
  return { price: m[0].replace(/\s/g, ''), priceCurrency: '$' };
}

async function safeClick(page, selector) {
  try {
    const el = await page.$(selector);
    if (!el) return false;
    await el.click({ timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

async function dismissConsent(page) {
  // Chrono24 consent UX changes; try a few common patterns.
  await safeClick(page, 'button:has-text("Accept")');
  await safeClick(page, 'button:has-text("I Agree")');
  await safeClick(page, 'button:has-text("Agree")');
  await safeClick(page, 'button:has-text("Accept all")');
}

async function extractListingUrlsFromSearchPage(page) {
  // Pull all anchor hrefs that look like listing detail pages.
  const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href') || ''));
  const urls = new Set();

  for (const href of hrefs) {
    const h = String(href || '').trim();
    if (!h) continue;

    if (h.includes('--id') && h.endsWith('.htm')) {
      const abs = h.startsWith('http') ? h : `https://www.chrono24.com${h.startsWith('/') ? '' : '/'}${h}`;
      urls.add(abs);
    }
  }

  return Array.from(urls);
}

async function extractSearchMetaFromSearchPage(page) {
  // Best-effort: listing URL -> {price, shipping, country}
  // We use DOM text near the link when available.
  return await page.evaluate(() => {
    const out = {};
    const links = Array.from(document.querySelectorAll('a[href]'))
      .map((a) => ({
        a,
        href: a.getAttribute('href') || ''
      }))
      .filter((x) => x.href.includes('--id') && x.href.endsWith('.htm'));

    for (const { a, href } of links) {
      const url = href.startsWith('http') ? href : `https://www.chrono24.com${href.startsWith('/') ? '' : '/'}${href}`;

      // Walk up a bit to find a card-like container
      let node = a;
      for (let i = 0; i < 6 && node; i++) node = node.parentElement;
      const text = (node && node.innerText) ? node.innerText : a.innerText;

      const priceMatch = text.match(/\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/);
      const price = priceMatch ? priceMatch[0].replace(/\s/g, '') : (text.includes('Price on request') ? 'Price on request' : '');

      let shipping = '';
      const shipMatch = text.match(/\+\s*\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?\s*for\s*shipping/i);
      if (shipMatch) shipping = shipMatch[0].replace(/\s+/g, ' ').trim();
      else if (/Free shipping/i.test(text)) shipping = 'Free shipping';

      // Country often present as a 2-letter code; not perfect.
      const countryMatch = text.match(/\bUS\b|\bDE\b|\bCH\b|\bGB\b|\bFR\b|\bIT\b|\bES\b|\bJP\b|\bHK\b|\bAE\b/);
      const country = countryMatch ? countryMatch[0] : '';

      out[url] = { price, shipping, country };
    }

    return out;
  });
}

async function extractFromJsonLd(page) {
  const blocks = await page.$$eval('script[type="application/ld+json"]', (els) => els.map((e) => e.textContent || ''));
  const parsed = [];
  for (const raw of blocks) {
    const txt = (raw || '').trim();
    if (!txt) continue;
    try {
      const j = JSON.parse(txt);
      if (Array.isArray(j)) parsed.push(...j);
      else parsed.push(j);
    } catch {
      // ignore
    }
  }

  const product = parsed.find((o) => o && (o['@type'] === 'Product' || (Array.isArray(o['@type']) && o['@type'].includes('Product'))));
  const offer = parsed.find((o) => o && (o['@type'] === 'Offer')) || product?.offers || {};

  const brand = product?.brand?.name || (typeof product?.brand === 'string' ? product.brand : '') || '';
  const model = product?.model || product?.name || '';
  const reference = product?.mpn || product?.sku || '';
  const year = product?.productionDate || '';
  const condition = offer?.itemCondition || (product?.offers?.itemCondition || '') || '';
  const price = offer?.price || (typeof offer?.priceSpecification?.price === 'string' ? offer.priceSpecification.price : offer?.priceSpecification?.price) || '';
  const priceCurrency = offer?.priceCurrency || offer?.priceSpecification?.priceCurrency || '';

  return {
    brand: normalizeWhitespace(brand),
    model: normalizeWhitespace(model),
    reference: normalizeWhitespace(reference),
    year: normalizeWhitespace(year),
    condition: normalizeWhitespace(condition),
    price: normalizeWhitespace(price),
    priceCurrency: normalizeWhitespace(priceCurrency)
  };
}

async function scrapeListing(page, listingUrl) {
  await page.goto(listingUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await dismissConsent(page);

  const title = normalizeWhitespace(await page.title());
  const ogTitle = normalizeWhitespace(await page.getAttribute('meta[property="og:title"]', 'content').catch(() => ''));
  const imageUrl = await page.getAttribute('meta[property="og:image"]', 'content').catch(() => '');

  const json = await extractFromJsonLd(page);
  const baseTitle = ogTitle || title;
  const derived = parseBrandModelFromTitle(baseTitle.split(' - ')[0] || baseTitle);

  const titlePrice = parsePriceFromText(baseTitle);

  return {
    title: ogTitle || title,
    imageUrl: imageUrl || '',
    brand: json.brand || derived.brand,
    model: json.model || derived.model,
    year: json.year || '',
    condition: json.condition || '',
    reference: json.reference || '',
    price: json.price || titlePrice.price || '',
    priceCurrency: json.priceCurrency || titlePrice.priceCurrency || ''
  };
}

async function main() {
  const args = parseArgs(process.argv);

  console.log('Chrono24 Playwright Scraper');
  console.log(`- StartPage: ${args.startPage}`);
  console.log(`- Pages: ${args.pages}`);
  console.log(`- DelayMs: ${args.delayMs}`);
  console.log(`- Output: ${args.outFile}`);

  const browser = await chromium.launch({ headless: !args.headful });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
  });

  const page = await context.newPage();

  const listingUrls = new Set();
  const searchMetaByUrl = new Map();

  const endPage = args.startPage + args.pages - 1;
  for (let p = args.startPage; p <= endPage; p++) {
    const pageUrl = withPage(args.url, p);
    console.log(`Fetching search page ${p}: ${pageUrl}`);
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await dismissConsent(page);

    // Give JS a moment to populate listing cards.
    await page.waitForTimeout(1500);

    const metaObj = await extractSearchMetaFromSearchPage(page);
    for (const [u, m] of Object.entries(metaObj)) {
      if (!searchMetaByUrl.has(u)) searchMetaByUrl.set(u, m);
    }

    const urls = await extractListingUrlsFromSearchPage(page);
    console.log(`- Found ${urls.length} listing URLs on page ${p}`);
    urls.forEach((u) => listingUrls.add(u));

    if (args.delayMs) await sleep(args.delayMs);
  }

  const urls = Array.from(listingUrls);
  console.log(`Total unique listing URLs: ${urls.length}`);

  const rows = [];
  const detailPage = await context.newPage();

  for (let i = 0; i < urls.length; i++) {
    const listingUrl = urls[i];
    console.log(`(${i + 1}/${urls.length}) Listing: ${listingUrl}`);

    let details;
    try {
      details = await scrapeListing(detailPage, listingUrl);
    } catch (e) {
      console.warn(`- Failed: ${e.message}`);
      continue;
    }

    const sm = searchMetaByUrl.get(listingUrl) || {};

    let price = '';
    if (details.price && details.priceCurrency === '$') price = details.price;
    else if (details.price && details.priceCurrency) price = `${details.priceCurrency} ${details.price}`;
    else if (details.price) price = details.price;
    else price = sm.price || '';

    rows.push({
      brand: details.brand,
      model: details.model,
      title: details.title,
      price,
      shipping: sm.shipping || '',
      location_country: sm.country || '',
      year: details.year,
      condition: details.condition,
      reference: details.reference,
      listingUrl,
      imageUrl: details.imageUrl
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

  const existing = readExistingCsv(args.outFile);
  const merged = mergeAndDedupeRows(existing.rows, rows, headers);
  fs.writeFileSync(args.outFile, toCsv(merged, headers), 'utf8');
  console.log(`Done. Wrote ${merged.length} rows to ${args.outFile} (${existing.rows.length} existing, ${rows.length} scraped)`);

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
