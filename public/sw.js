const CACHE_NAME = 'tk-site-guide-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.jpg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        console.warn('[PWA SW] Pre-caching asset failed: ', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[PWA SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Only handle standard GET requests (skip chrome extensions or server APIs)
  if (e.request.method !== 'GET' || e.request.url.includes('/api/')) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // If we got a valid response, clone and cache it
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            // Check if we should cache this request (don't cache external/chrome-extension requests)
            if (e.request.url.startsWith(self.location.origin)) {
              cache.put(e.request, responseToCache);
            }
          });
        }
        return response;
      })
      .catch(() => {
        // If offline or network fails, try cache
        return caches.match(e.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return null;
        });
      })
  );
});
