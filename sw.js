'use strict';
const CACHE = 'punch-walk-v3';
const CORE_ASSETS = [
  './punch-tool.html'
  // manifest and icons are generated inline — no separate files needed
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Never intercept Autodesk API or auth calls — always go to network
  if (url.hostname.includes('autodesk.com')) return;
  // Never intercept SharePoint auth
  if (url.pathname.includes('/_api/') || url.pathname.includes('/_layouts/')) return;
  // Only handle GET
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        // Cache floor plan images on first access so they work offline
        if (res.ok && /\.(jpg|jpeg|png|gif|webp)$/i.test(url.pathname)) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => {
        // Offline fallback: return cached app shell for navigation requests
        if (e.request.mode === 'navigate') {
          return caches.match('./punch-tool.html');
        }
      });
    })
  );
});
