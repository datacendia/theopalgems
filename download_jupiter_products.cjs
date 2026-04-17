const fs = require('fs');
const path = require('path');
const https = require('https');

const OUT_DIR = path.resolve(__dirname, 'public', 'assets', 'kira', 'jupiter');

const products = [
  {
    name: 'MULTI-SHAPE CIRCLE PENDANT',
    barcode: '113987',
    sku: '113987',
    category: 'necklaces',
    ctw: '2.8',
    gold: '14 KW',
    diamond: 'FVS1',
    price: '2375',
    location: 'JUPITER',
    qty: 1,
    cert: '',
    imageUrl: 'https://s3.us-west-1.amazonaws.com/laravo-cloud/749/Kira%20Uploaded%20Images/KJ00061P.MX-3-21.jpg'
  },
  {
    name: 'TENNIS NECKLACE',
    barcode: '274806',
    sku: '274806',
    category: 'necklaces',
    ctw: '10',
    gold: '14KW',
    diamond: 'FVS1',
    price: '8125',
    location: 'JUPITER',
    qty: 1,
    cert: '',
    imageUrl: 'https://s3.us-west-1.amazonaws.com/laravo-cloud/749/Kira%20Uploaded%20Images/KJ00223N.RD-9.5-21.jpg'
  },
  {
    name: 'ROUND PENDANT NECKLACE',
    barcode: '446311',
    sku: '446311',
    category: 'necklaces',
    ctw: '1.02',
    gold: '14 KY',
    diamond: 'FVS2',
    price: '$1,250',
    location: 'JUPITER',
    qty: 1,
    cert: 'C',
    imageUrl: 'https://s3.us-west-1.amazonaws.com/laravo-cloud/749/Kira%20Uploaded%20Images/KJ00075N.RD-1-22.jpg'
  },
  {
    name: 'ROUND PENDANT NECKLACE',
    barcode: '446311',
    sku: '446311',
    category: 'necklaces',
    ctw: '1.02',
    gold: '14 KW',
    diamond: 'E VS1',
    price: '$1,250',
    location: 'JUPITER',
    qty: 1,
    cert: 'C',
    imageUrl: 'https://s3.us-west-1.amazonaws.com/laravo-cloud/749/Kira%20Uploaded%20Images/KJ00075N.RD-1-21.jpg'
  },
  {
    name: 'CUSHION PENDANT NECKLACE',
    barcode: '114036',
    sku: '114036',
    category: 'necklaces',
    ctw: '1.01',
    gold: '14 KY',
    diamond: 'E VS2',
    price: '$1,250',
    location: 'JUPITER',
    qty: 1,
    cert: 'C',
    imageUrl: 'https://s3.us-west-1.amazonaws.com/laravo-cloud/749/Kira%20Uploaded%20Images/KJ00075N.CE-1-22.jpg'
  },
  {
    name: 'DIAMOND STUDS',
    barcode: '446457',
    sku: '446457',
    category: 'earrings',
    ctw: '2',
    gold: '14 KW',
    diamond: 'FVS1',
    price: '$600',
    location: 'JUPITER',
    qty: 2,
    cert: '',
    imageUrl: 'https://s3.us-west-1.amazonaws.com/laravo-cloud/749/Kira%20Uploaded%20Images/KJ00136E3.RD-1-21.jpg'
  },
  {
    name: 'DIAMOND STUDS',
    barcode: '493056',
    sku: '493056',
    category: 'earrings',
    ctw: '2',
    gold: '14 KW',
    diamond: 'E VS1',
    price: '$1,650',
    location: 'JUPITER',
    qty: 2,
    cert: 'C',
    imageUrl: 'https://s3.us-west-1.amazonaws.com/laravo-cloud/749/Kira%20Uploaded%20Images/KJ00136E3.RD-1-21.jpg'
  },
  {
    name: 'LARGE HOOP EARRINGS',
    barcode: '114241',
    sku: '114241',
    category: 'earrings',
    ctw: '7',
    gold: '14 KW',
    diamond: 'FVS1',
    price: '5500',
    location: 'JUPITER',
    qty: 1,
    cert: '',
    imageUrl: 'https://s3.us-west-1.amazonaws.com/laravo-cloud/749/Kira%20Uploaded%20Images/KJ00200H.RD-7-21.jpg'
  },
  {
    name: 'ROUND HALF BAND',
    barcode: '115093',
    sku: '115093',
    category: 'rings',
    ctw: '1',
    gold: '14KW',
    diamond: 'FVS1',
    price: '1500',
    location: 'JUPITER',
    qty: 1,
    cert: '',
    imageUrl: 'https://s3.us-west-1.amazonaws.com/laravo-cloud/749/Kira%20Uploaded%20Images/KJ01068R.RD-1-21.jpg'
  },
  {
    name: 'ROUND HALF BAND',
    barcode: '115094',
    sku: '115094',
    category: 'rings',
    ctw: '1',
    gold: '14KY',
    diamond: 'FVS1',
    price: '1500',
    location: 'JUPITER',
    qty: 1,
    cert: '',
    imageUrl: 'https://s3.us-west-1.amazonaws.com/laravo-cloud/749/Kira%20Uploaded%20Images/KJ01068R.RD-1-22F.jpg'
  },
  {
    name: 'ROUND ETERNITY BAND',
    barcode: '115180',
    sku: '115180',
    category: 'rings',
    ctw: '5',
    gold: '14 KY',
    diamond: 'FVS1',
    price: '3250',
    location: 'JUPITER',
    qty: 1,
    cert: '',
    imageUrl: 'https://s3.us-west-1.amazonaws.com/laravo-cloud/749/Kira%20Uploaded%20Images/KJ01109T.RD-5-22F.jpg'
  },
  {
    name: 'EMERALD TENNIS BRACELET',
    barcode: '313820',
    sku: '313820',
    category: 'bracelets',
    ctw: '7.5',
    gold: '14 KW',
    diamond: 'F VS1',
    price: '$6,000',
    location: 'JUPITER',
    qty: 1,
    cert: '',
    imageUrl: 'https://s3.us-west-1.amazonaws.com/laravo-cloud/749/Kira%20Uploaded%20Images/KJ01990B.EM-5.25-21.jpg'
  },
  {
    name: 'PEAR TENNIS BRACELET',
    barcode: '38619128',
    sku: '38619128',
    category: 'bracelets',
    ctw: '8.5',
    gold: '14 KW',
    diamond: 'FVS1',
    price: '5315',
    location: 'JUPITER',
    qty: 1,
    cert: '',
    imageUrl: 'https://s3.us-west-1.amazonaws.com/laravo-cloud/749/Kira%20Uploaded%20Images/KJ00368B.PS-8-21.jpg'
  },
  {
    name: 'MULTI SHAPE TENNIS BRACELET',
    barcode: '38619444',
    sku: '38619444',
    category: 'bracelets',
    ctw: '7.7',
    gold: '14 KW',
    diamond: 'FVS1',
    price: '5000',
    location: 'JUPITER',
    qty: 1,
    cert: '',
    imageUrl: 'https://s3.us-west-1.amazonaws.com/laravo-cloud/749/Kira%20Uploaded%20Images/KJ00373B.MX-7.5-21.jpg'
  },
  {
    name: 'TENNIS BRACELET',
    barcode: '38618923',
    sku: '38618923',
    category: 'bracelets',
    ctw: '3',
    gold: '14 KW',
    diamond: 'FVS1',
    price: '3440',
    location: 'JUPITER',
    qty: 1,
    cert: '',
    imageUrl: 'https://s3.us-west-1.amazonaws.com/laravo-cloud/749/Kira%20Uploaded%20Images/KJ00320B.RD-3-21.jpg'
  },
  {
    name: 'TENNIS BRACELET',
    barcode: '38618672',
    sku: '38618672',
    category: 'bracelets',
    ctw: '10',
    gold: '14KY',
    diamond: 'FVS1',
    price: '6500',
    location: 'JUPITER',
    qty: 1,
    cert: '',
    imageUrl: 'https://s3.us-west-1.amazonaws.com/laravo-cloud/749/Kira%20Uploaded%20Images/KJ00316B.RD-10-22.jpg'
  }
];

function safeToken(s) {
  return (s || '')
    .toString()
    .trim()
    .replace(/&/g, 'and')
    .replace(/\+/g, 'plus')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
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
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`Timeout after ${timeoutMs}ms: ${url}`)));
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

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const byUrl = new Map();
  for (const p of products) {
    if (p.imageUrl && !byUrl.has(p.imageUrl)) byUrl.set(p.imageUrl, []);
    if (p.imageUrl) byUrl.get(p.imageUrl).push(p);
  }

  const uniqueUrls = Array.from(byUrl.keys());
  let ok = 0;
  let failed = 0;

  for (let i = 0; i < uniqueUrls.length; i++) {
    const url = uniqueUrls[i];
    const group = byUrl.get(url) || [];
    const first = group[0] || {};
    const baseName = `jupiter_${safeToken(first.barcode || first.sku || String(i + 1))}_${safeToken(first.name || 'product')}`;

    try {
      const { buffer, contentType } = await requestBuffer(url, 45000);
      const ext = extFromContentTypeOrUrl(contentType, url);
      const fileName = `${baseName}.${ext}`;
      const outPath = path.join(OUT_DIR, fileName);
      if (!fs.existsSync(outPath)) fs.writeFileSync(outPath, buffer);
      for (const p of group) {
        p.localImage = `/assets/kira/jupiter/${fileName}`;
      }
      ok++;
      console.log(`(${ok + failed}/${uniqueUrls.length}) Saved ${fileName}`);
    } catch (e) {
      failed++;
      console.warn(`(${ok + failed}/${uniqueUrls.length}) Failed ${url}: ${e.message || e}`);
    }
  }

  const outJsonPath = path.resolve(__dirname, 'jupiter_products_local.json');
  fs.writeFileSync(outJsonPath, JSON.stringify(products, null, 2), 'utf8');
  console.log(`Done. Downloaded: ${ok}. Failed: ${failed}. Wrote mapping: ${outJsonPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
