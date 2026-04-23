#!/usr/bin/env node
/**
 * Generate sitemap.xml from a single source of truth.
 *
 * Writes to `public/sitemap.xml` (so it gets copied into `dist/` by Vite
 * during build, and can also be served by `npm run dev`).
 *
 * To extend when inventory expands (Piece Passport, per-location categories,
 * etc.), add entries to the ROUTES array or import from a data file.
 *
 * Run:  node scripts/generate-sitemap.mjs
 * Wired via:  "prebuild" or manually in package.json scripts.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const OUT = path.join(PUBLIC_DIR, 'sitemap.xml');

const SITE_URL = 'https://theopalgems.com';
const TODAY = new Date().toISOString().split('T')[0];

// Single source of truth for indexable URLs.
// priority: 1.0 (highest) → 0.1 (lowest). changefreq: always|hourly|daily|weekly|monthly|yearly|never.
const ROUTES = [
  // Core
  { path: '/',                           priority: '1.0', changefreq: 'weekly' },
  { path: '/about',                      priority: '0.7', changefreq: 'monthly' },
  { path: '/book',                       priority: '0.9', changefreq: 'monthly' },
  { path: '/craft',                      priority: '0.8', changefreq: 'monthly' },
  { path: '/lab-vs-natural',             priority: '0.7', changefreq: 'monthly' },
  { path: '/faq',                        priority: '0.5', changefreq: 'monthly' },

  // Categories
  { path: '/category/necklaces',         priority: '0.8', changefreq: 'weekly' },
  { path: '/category/rings',             priority: '0.8', changefreq: 'weekly' },
  { path: '/category/earrings',          priority: '0.8', changefreq: 'weekly' },
  { path: '/category/bracelets',         priority: '0.8', changefreq: 'weekly' },
  { path: '/category/watches',           priority: '0.8', changefreq: 'weekly' },

  // Locations
  { path: '/location/opal-grand',        priority: '0.9', changefreq: 'monthly' },
  { path: '/location/opal-sol',          priority: '0.9', changefreq: 'monthly' },
  { path: '/location/jupiter-beach',     priority: '0.9', changefreq: 'monthly' },

  // Legal
  { path: '/privacy',                    priority: '0.3', changefreq: 'yearly' },
  { path: '/terms',                      priority: '0.3', changefreq: 'yearly' },
];

// NOTE: /search and /* (404) are intentionally excluded — they use <meta name="robots" content="noindex">.

function buildXml(routes) {
  const urls = routes
    .map(({ path: p, priority, changefreq }) => {
      const loc = `${SITE_URL}${p}`;
      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

async function run() {
  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  const xml = buildXml(ROUTES);
  await fs.writeFile(OUT, xml, 'utf8');
  console.log(`[sitemap] ✓ Wrote ${ROUTES.length} URLs to ${path.relative(ROOT, OUT)}`);
}

run().catch((err) => {
  console.error('[sitemap] Fatal:', err);
  process.exit(1);
});
