/* Static-only offline helper. No page, admin or API responses are cached. */
'use strict';
const CACHE = 'ab-pwa-static-v1';
const STATIC = new Set([
  '/assets/favicon-192.png',
  '/assets/favicon-512.png',
  '/assets/pwa-maskable-512.png',
  '/assets/favicon-180.png'
]);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([...STATIC])));
  // No skipWaiting: an update waits for existing app tabs to close.
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('ab-pwa-static-') && key !== CACHE)
      .map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Positive allowlist, not a broad denylist. Even query variants bypass cache.
  // Navigations (including /admin), API/login, videos and third parties remain
  // entirely browser/network managed. This is not a full offline copy.
  if (request.mode === 'navigate' || url.search || !STATIC.has(url.pathname)) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && response.type === 'basic' &&
        /^image\//i.test(response.headers.get('Content-Type') || '') &&
        !/no-store|private/i.test(response.headers.get('Cache-Control') || '') &&
        !response.redirected) {
      await cache.put(request, response.clone());
    }
    return response;
  }));
});
