// ZOKU Service Worker — caches only the static app shell.
// Dynamic data (API, jikan, TMDB, base44) is NEVER cached.
const CACHE_NAME = 'zoku-v2';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Never cache dynamic / API requests
  if (
    event.request.url.includes('/api/') ||
    event.request.url.includes('jikan.moe') ||
    event.request.url.includes('themoviedb.org') ||
    event.request.url.includes('base44') ||
    event.request.url.includes('media.base44.com') ||
    event.request.method !== 'GET'
  ) {
    return; // let the network handle it
  }

  // Static shell: cache-first, fallback to network
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache same-origin GET responses for static assets
        if (response && response.status === 200 && event.request.url.startsWith(self.location.origin)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
        }
        return response;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
