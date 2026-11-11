const CACHE_NAME = 'aoi-teacher-v2';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './sprites/base.png',
  './sprites/blink.png',
  './sprites/eyes_determined.png',
  './sprites/eyes_happy.png',
  './sprites/eyes_side.png',
  './sprites/eyes_think.png',
  './sprites/eyes_wide.png',
  './sprites/eyes_wink.png',
  './sprites/mouth_mid.png',
  './sprites/mouth_o.png',
  './sprites/mouth_open.png',
  './sprites/mouth_smile.png',
  './sprites/manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
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

/* HTML (the app shell itself) and manifest.json are fetched network-first: while this app is being
   iterated on daily, a stale cached index.html serving an old build -- while looking identical to a
   real regression -- is worse than requiring a network hit. Static, content-stable assets (sprites,
   audio, icons) stay cache-first for real offline support, since those don't change between builds. */
const NETWORK_FIRST = (url) => url.pathname.endsWith('index.html') || url.pathname.endsWith('/') ||
  url.pathname.endsWith('manifest.json');

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (NETWORK_FIRST(url)) {
    event.respondWith(
      fetch(event.request).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return resp;
      }).catch(() => caches.match(event.request))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return resp;
      }).catch(() => cached);
    })
  );
});
