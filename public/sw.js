const CACHE_NAME = 'timetablepro-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/logo-only.png',
  '/logo-text.png',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Fallback gracefully if any single asset fails to cache
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests, avoid intercepting auth and dynamic API routes
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Let API requests pass directly to network
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Network-first strategy for html/pages, cache-first for static icons
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|json)$/)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return (
          cachedResponse ||
          fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return networkResponse;
          })
        );
      })
    );
    return;
  }

  // For other requests, network first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
