const CACHE = 'portfolio-v2';
const PRECACHE_URLS = [
  '/styles.css',
  '/favicon.svg',
  '/scripts/rs-chat-widget.js'
];

const CHAT_API_PATTERN = /^\/api\/chat/;

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
  const url = new URL(request.url);

  if (CHAT_API_PATTERN.test(url.pathname)) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/404.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
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
