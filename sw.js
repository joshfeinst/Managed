/* Managed service worker — network-first shell with offline fallback, plus
   stale-while-revalidate for the Google Fonts. Bump CACHE per release. */
const CACHE = 'managed-v0.3';
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  /* ONLY A REAL ANSWER GOES IN THE CACHE. This wrote whatever came back --
     any status, any type -- straight over './index.html'. A 404 from a
     mis-deploy, a 500 from a wobbling host, or the 200-with-a-login-page that
     a hotel or airport captive portal serves for every request, and the
     offline copy of the game became that page. Permanently, because the next
     visit is served from the cache, and the cached "game" is now a portal
     screen with no way back. The one file this worker exists to protect was
     the easiest one to destroy. */
  const worthCaching = r => r && r.ok && r.status === 200 && r.type === 'basic';

  if (url.origin === location.origin) {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          if (worthCaching(r)) {
            /* THE FALLBACK ENTRY HAS TO STAY FRESH TOO. Runtime puts refresh
               only the exact URL requested, and normal navigations request
               './' — so the './index.html' entry the offline fallback serves
               stayed frozen at whatever addAll snapshotted on install day.
               Months later, offline, a link ending in index.html (or any
               evicted URL) handed a current save to that ancient build. A
               document served at either spelling is the same document: cache
               it under both. */
            const p = url.pathname;
            const twin = p.endsWith('/index.html') ? p.slice(0, -'index.html'.length)
                       : p.endsWith('/')           ? p + 'index.html'
                       : null;
            const copy = r.clone(), twinCopy = twin ? r.clone() : null;
            /* HELD OPEN. A put fired and forgotten can be cut off when the
               browser retires the worker after respondWith settles -- on a
               phone, with a file this size, often enough that the offline
               twin stayed at whatever last finished writing. */
            e.waitUntil(caches.open(CACHE).then(c => Promise.all([
              c.put(e.request, copy),
              twin ? c.put(twin, twinCopy) : null
            ])));
          }
          return r;
        })
        .catch(() =>
          caches.match(e.request, { ignoreSearch: true })
            /* the document is the fallback for a DOCUMENT: handing index.html
               to a manifest or icon request offline broke the install/update
               path with a parse error instead of a plain miss */
            .then(m => m || (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
    );
    return;
  }

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.match(e.request).then(m => {
        const net = fetch(e.request)
          .then(r => {
            /* a font comes back opaque from another origin, so `basic` is the
               wrong test here -- but a portal's redirect or error is still not
               a font, and a cached one of those means no text for good */
            if (r && (r.ok || r.type === 'opaque')) {
              const copy = r.clone();
              e.waitUntil(caches.open(CACHE).then(c => c.put(e.request, copy)));
            }
            return r;
          })
          /* nothing cached and no network: a real error, not respondWith(undefined) */
          .catch(() => m || Response.error());
        return m || net;
      })
    );
  }
});
