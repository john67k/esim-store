/* SimNow shell cache. API calls are network-first so order status stays fresh. */
const SHELL = 'simnow-shell-v2';
const ASSETS = [
  '/', '/styles.css', '/common.js', '/home.js', '/logo.svg', '/favicon.svg',
  '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Network-first for the API (and anything under /api).
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(req).then((res) => res).catch(() => caches.match(req)));
    return;
  }
  // Shell: try network, fall back to cache (so deploys go live, offline still works).
  e.respondWith(
    fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(SHELL).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || caches.match('/')))
  );
});
