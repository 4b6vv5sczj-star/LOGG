const CACHE = 'logg-v0.2.1-20260921';
const CORE = ['./','./index.html','./styles.css','./app.js','./config.js','./manifest.webmanifest','./icons/icon-180.png','./icons/icon-192.png','./icons/icon-512.png'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // HTML/navigation: always ask the network first so GitHub Pages updates show immediately.
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(event.request, {cache:'no-store'});
        const cache = await caches.open(CACHE);
        cache.put(event.request, fresh.clone());
        return fresh;
      } catch (_) {
        return (await caches.match(event.request)) || (await caches.match('./index.html'));
      }
    })());
    return;
  }

  // App files: network first, cached copy only as offline fallback.
  event.respondWith((async () => {
    try {
      const fresh = await fetch(event.request, {cache:'no-store'});
      const cache = await caches.open(CACHE);
      cache.put(event.request, fresh.clone());
      return fresh;
    } catch (_) {
      return caches.match(event.request);
    }
  })());
});
