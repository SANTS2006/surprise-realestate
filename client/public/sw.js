// Service worker: makes the app installable and lets the shell open offline.
// It never caches the API, chat sockets or anything authenticated — only the
// static app files — so a signed-out device can never see someone's data.
const VERSION = 'v1';
const SHELL_CACHE = `shell-${VERSION}`;
const ASSET_CACHE = `assets-${VERSION}`;
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.addAll([OFFLINE_URL, '/manifest.webmanifest', '/icon-192.png'])).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => ![SHELL_CACHE, ASSET_CACHE].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) return;

  // Pages: always try the network (fresh deploys, live data); fall back to the offline page.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Built assets are fingerprinted, so cache-first is safe; other static files revalidate.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(ASSET_CACHE).then((c) => c.put(request, copy)); }
        return res;
      }))
    );
    return;
  }

  event.respondWith(
    fetch(request).then((res) => {
      if (res.ok && /\.(png|jpg|svg|ico|webmanifest|woff2?)$/.test(url.pathname)) {
        const copy = res.clone(); caches.open(SHELL_CACHE).then((c) => c.put(request, copy));
      }
      return res;
    }).catch(() => caches.match(request))
  );
});
