// Self-destroying Service Worker to purge old caches and ensure users get fresh assets immediately
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => {
      return self.clients.claim();
    }).then(() => {
      return self.registration.unregister();
    }).then(() => {
      return self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    }).then((clients) => {
      for (const client of clients) {
        try { client.navigate(client.url); } catch (_) {}
      }
    }).catch(() => {})
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
