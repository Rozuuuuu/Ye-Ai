/* ─────────────────────────────────────────────────────
   THE ATELIER — AI Fashion Judge
   Service Worker  (service-worker.js)
   Cache-first with network fallback — PWA installable
   ───────────────────────────────────────────────────── */

const CACHE_NAME = 'ai-fashion-judge-v2';

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

/* ── Install: pre-cache app shell ── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  // Activate immediately without waiting for old tabs to close
  self.skipWaiting();
});

/* ── Activate: claim all clients immediately and wipe old caches ── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

/* ── Fetch: Network-First for HTML/Navigation, Cache-First for Assets ── */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // For HTML documents/navigation, ALWAYS try the network first so we don't get stale Vite JS hashes (White Screen bug)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For other assets (CSS, Images, Fonts), use Cache-First Fallback
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          const url = new URL(event.request.url);
          if (
            response.ok &&
            (url.origin === self.location.origin ||
              url.hostname.includes('fonts.googleapis.com') ||
              url.hostname.includes('fonts.gstatic.com'))
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => null);
    })
  );
});
