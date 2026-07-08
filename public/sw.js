/**
 * ZOKU Service Worker — zoku-v3
 *
 * Estratégias:
 * - Navegação/HTML: network-first com fallback offline
 * - Assets estáticos (JS/CSS/fontes/ícones): cache-first
 * - Imagens de posters (Jikan/TMDB): stale-while-revalidate com cache dedicado (máx 200 entradas)
 * - Chamadas de API (Jikan, TMDB, Base44): sempre network (não cachear)
 * - Página offline fallback
 */

const CACHE_VERSION = "zoku-v4";
const CACHE_SHELL = `${CACHE_VERSION}-shell`;
const CACHE_IMAGES = `${CACHE_VERSION}-images`;

const MAX_IMAGE_ENTRIES = 200;

// Shell assets para pré-cache na instalação
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/offline.html",
];

// Domínios de imagens de posters
const IMAGE_HOSTS = [
  "cdn.myanimelist.net",
  "image.tmdb.org",
  "media.base44.com",
];

// ─── INSTALL: pré-cachear shell ───
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_SHELL).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE: limpar caches de versões antigas ───
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── HELPERS ───

function isImageRequest(url) {
  return IMAGE_HOSTS.some((h) => url.hostname.includes(h)) && /\.(jpg|jpeg|png|webp|gif|svg)(\?|$)/i.test(url.pathname);
}

function isStaticAsset(url) {
  // Only cache production build assets (hashed files in /assets/)
  // NEVER cache Vite dev paths or any other JS/CSS — they change on every HMR/rebuild
  return (
    url.pathname.startsWith("/assets/") &&
    (url.pathname.endsWith(".js") ||
     url.pathname.endsWith(".css") ||
     url.pathname.endsWith(".woff") ||
     url.pathname.endsWith(".woff2"))
  );
}

function isApiRequest(url) {
  return (
    url.hostname.includes("api.jikan.moe") ||
    url.hostname.includes("api.themoviedb.org") ||
    url.hostname.includes("base44.com")
  );
}

// Limita o cache de imagens removendo as entradas mais antigas
function trimImageCache(cache) {
  return cache.keys().then((keys) => {
    if (keys.length <= MAX_IMAGE_ENTRIES) return;
    // Remove as (n - MAX) entradas mais antigas
    const toRemove = keys.slice(0, keys.length - MAX_IMAGE_ENTRIES);
    return Promise.all(toRemove.map((req) => cache.delete(req)));
  });
}

// ─── FETCH: estratégias por tipo ───
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== "GET") return;

  // Skip cross-origin API requests entirely (always network)
  if (isApiRequest(url)) return;

  // 1. Navegação/HTML: network-first → cache → offline page
  if (request.mode === "navigate" || (request.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_SHELL).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/offline.html"))
        )
    );
    return;
  }

  // 2. Imagens de posters: stale-while-revalidate
  if (isImageRequest(url)) {
    event.respondWith(
      caches.open(CACHE_IMAGES).then((cache) =>
        cache.match(request).then((cached) => {
          const fetchPromise = fetch(request)
            .then((response) => {
              if (response.ok) {
                cache.put(request, response.clone());
                trimImageCache(cache);
              }
              return response;
            })
            .catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // 3. Assets estáticos: cache-first
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(CACHE_SHELL).then((cache) =>
        cache.match(request).then((cached) => cached || fetch(request).then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        }))
      )
    );
    return;
  }
});
