'use strict';
const CACHE = 'punch-walk-v17';
// App shell — must all cache or the install is pointless.
const SHELL_ASSETS = [
  './punch-tool.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];
// Floor plans — real filenames are "1st Floor.png"… (space, URL-encoded here).
// Cached best-effort so one missing/oversized image can't fail the whole install.
const FLOOR_ASSETS = [
  './floor-plans/complete/1st%20Floor.png',
  './floor-plans/complete/2nd%20Floor.png',
  './floor-plans/complete/3rd%20Floor.png',
  './floor-plans/complete/4th%20Floor.png',
  './floor-plans/complete/5th%20Floor.png',
  './floor-plans/complete/6th%20Floor.png',
  './floor-plans/complete/7th%20Floor.png',
  './floor-plans/complete/8th%20Floor.png',
  './floor-plans/complete/9th%20Floor.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      // Shell must cache (fail loudly if it can't); floor plans are best-effort
      // so one missing/oversized image never breaks the offline install.
      .then(c => c.addAll(SHELL_ASSETS)
        .then(() => Promise.allSettled(FLOOR_ASSETS.map(u => c.add(u)))))
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
