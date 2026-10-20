const CACHE = 'portfolio-v6';
const PRECACHE_URLS = [
  '/404.html',
  '/styles.css',
  '/css/tokens.css',
  '/css/base.css',
  '/css/layout.css',
  '/css/components.css',
  '/css/pages.css',
  '/css/utilities.css',
  '/favicon.svg',
  '/favicon.ico',
  '/scripts/rs-chat-widget.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
      );
    })
  );
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Never intercept non-GET requests (e.g. POST /api/track-resume)
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Never cache API routes
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Ignore non-http/https schemes
  if (!url.protocol.startsWith('http')) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/404.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch((err) => {
        if (cached) return cached;
        throw err;
      });

      if (cached) {
        // Stale-while-revalidate: serve cached instantly, refresh in background.
        network.catch(() => {});
        return cached;
      }
      return network;
    })
  );
});

