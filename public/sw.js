// Opal Gems service worker
// Strategy: only cache stable static assets (images, fonts, manifest).
// HTML, JS, CSS bundles, and API calls are ALWAYS fetched from the network
// so a new deploy immediately invalidates stale references.

const CACHE_VERSION = 'v3';
const CACHE_NAME = `opal-gems-static-${CACHE_VERSION}`;

// File extensions we consider safe to cache (stable URLs, don't change per deploy).
const CACHEABLE_EXTENSIONS = /\.(png|jpe?g|webp|gif|svg|ico|woff2?|ttf|otf)$/i;

// Paths we never touch — let the browser + server handle them directly.
const BYPASS_PATHS = [
  '/api/',
  '/admin',
  '/.netlify/',
];

self.addEventListener('install', (event) => {
  // Take control immediately so stale SW from previous deploys is replaced.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up any old cache versions
      caches.keys().then((names) =>
        Promise.all(
          names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
        )
      ),
      // Take over any open pages without waiting for reload
      self.clients.claim(),
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GETs
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Ignore cross-origin requests (Supabase, Google Fonts, Resend, etc.)
  if (url.origin !== self.location.origin) return;

  // Bypass admin, API, and Netlify function paths — must always be fresh.
  if (BYPASS_PATHS.some((p) => url.pathname.startsWith(p))) return;

  // For HTML documents: always network, fall back to offline page only if truly offline.
  const acceptsHtml = req.headers.get('accept')?.includes('text/html');
  if (acceptsHtml) {
    event.respondWith(fetch(req).catch(() => caches.match('/')));
    return;
  }

  // For hashed JS/CSS bundles: network-only, never cache (deploy-dependent).
  if (/\.(js|css|mjs)$/i.test(url.pathname)) {
    event.respondWith(fetch(req));
    return;
  }

  // For stable static assets: cache-first with background refresh.
  if (CACHEABLE_EXTENSIONS.test(url.pathname) || url.pathname === '/manifest.json') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(req);
        const networkFetch = fetch(req)
          .then((res) => {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    );
    return;
  }

  // Default: pass-through
});
