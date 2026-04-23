#!/usr/bin/env node
/**
 * Post-build prerender script.
 *
 * Serves the built `dist/` folder locally, visits every route with a
 * headless Playwright browser, waits for React to hydrate and for
 * react-helmet-async to flush meta tags into <head>, then saves a
 * static HTML snapshot at `dist/<route>/index.html`.
 *
 * This gives us real per-route <title>, <meta description>, OG tags,
 * canonical URLs, and JSON-LD structured data in the raw HTML response —
 * which is what non-JS crawlers (Bing, DuckDuckGo, GPTBot, PerplexityBot,
 * ClaudeBot, Google-Extended, etc.) need to index content.
 *
 * Run:  node scripts/prerender.mjs
 * Wired via:  "build": "vite build && node scripts/prerender.mjs"
 */
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PORT = 4173;

// Routes to prerender. Keep in sync with src/main.jsx + public/sitemap.xml.
const ROUTES = [
  '/',
  '/about',
  '/book',
  '/craft',
  '/lab-vs-natural',
  '/faq',
  '/privacy',
  '/terms',
  '/category/necklaces',
  '/category/rings',
  '/category/earrings',
  '/category/bracelets',
  '/category/watches',
  '/location/opal-grand',
  '/location/opal-sol',
  '/location/jupiter-beach',
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

function safeJoin(root, url) {
  const decoded = decodeURIComponent(url.split('?')[0]);
  const joined = path.normalize(path.join(root, decoded));
  if (!joined.startsWith(root)) return null;
  return joined;
}

function createStaticServer(root) {
  return http.createServer(async (req, res) => {
    try {
      const filePath = safeJoin(root, req.url === '/' ? '/index.html' : req.url);
      if (!filePath) {
        res.writeHead(403).end('Forbidden');
        return;
      }
      let target = filePath;
      try {
        const stat = await fs.stat(target);
        if (stat.isDirectory()) target = path.join(target, 'index.html');
      } catch {
        // Not found — SPA fallback to index.html so client router can take over.
        target = path.join(root, 'index.html');
      }
      const ext = path.extname(target).toLowerCase();
      const body = await fs.readFile(target);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(body);
    } catch (err) {
      res.writeHead(500).end(String(err));
    }
  });
}

async function prerender() {
  try {
    await fs.access(path.join(DIST, 'index.html'));
  } catch {
    console.error('[prerender] dist/index.html not found. Run `vite build` first.');
    process.exit(1);
  }

  const server = createStaticServer(DIST);
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`[prerender] Static server listening on http://localhost:${PORT}`);

  let browser;
  try {
    browser = await chromium.launch();
  } catch (err) {
    console.error('[prerender] Failed to launch Playwright Chromium.');
    console.error('[prerender] Run:  npx playwright install chromium');
    console.error(err?.message || err);
    server.close();
    process.exit(1);
  }

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (compatible; OpalPrerender/1.0; +https://theopalgems.com)',
    viewport: { width: 1280, height: 900 },
  });

  let ok = 0;
  let failed = 0;

  for (const route of ROUTES) {
    const url = `http://localhost:${PORT}${route}`;
    const page = await context.newPage();
    try {
      // Short-circuit long-running side effects while we snapshot.
      await page.addInitScript(() => {
        // Skip the luxury intro screen so it doesn't appear in snapshot.
        try { window.localStorage.setItem('prerender', '1'); } catch {}
      });

      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      // Allow helmet to flush and any async data fetches to settle.
      await page.waitForFunction(
        () => document.title && document.title.length > 0,
        { timeout: 15000 }
      ).catch(() => {});
      await page.waitForTimeout(600);

      const html = await page.content();

      const outDir =
        route === '/' ? DIST : path.join(DIST, route.replace(/^\/+/, ''));
      await fs.mkdir(outDir, { recursive: true });
      const outFile = path.join(outDir, 'index.html');
      await fs.writeFile(outFile, html, 'utf8');
      console.log(`[prerender] ✓ ${route}  →  ${path.relative(ROOT, outFile)}`);
      ok++;
    } catch (err) {
      console.error(`[prerender] ✗ ${route}  (${err?.message || err})`);
      failed++;
    } finally {
      await page.close();
    }
  }

  await context.close();
  await browser.close();
  server.close();

  console.log(`\n[prerender] Done. ${ok} ok, ${failed} failed, ${ROUTES.length} total.`);
  if (failed > 0) process.exit(1);
}

prerender().catch((err) => {
  console.error('[prerender] Fatal:', err);
  process.exit(1);
});
