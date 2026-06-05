const CACHE_NAME = 'insight-ai-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).catch(() => {})
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
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Only intercept requests for same-origin static assets
  if (event.request.url.startsWith(self.location.origin) && event.request.method === 'GET') {
    const isHtml = event.request.headers.get('accept')?.includes('text/html') || 
                   event.request.url === self.location.origin + '/' ||
                   event.request.url.endsWith('index.html');

    if (isHtml) {
      // Network-First for HTML entry points: always fetch fresh index.html to read updated script hashes
      event.respondWith(
        fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        }).catch(() => {
          return caches.match(event.request).then((cached) => cached || caches.match('/'));
        })
      );
    } else {
      // Stale-While-Revalidate for other static assets (CSS, JS, images)
      event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          }).catch(() => null);

          return cachedResponse || fetchPromise;
        })
      );
    }
  }
});
