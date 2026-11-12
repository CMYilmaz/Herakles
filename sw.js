/* Herakles Service Worker: speichert die App komplett lokal, damit sie ohne Netz startet. */
const CACHE = 'herakles-v2.9.0';
const FILES = ['./', 'index.html', 'app.css', 'library.js', 'anim.js', 'core.js', 'app.js', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => (k.startsWith('herakles-') || k.startsWith('satzwerk-')) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });

// Cache zuerst: schneller Start, funktioniert im Flugmodus. Updates kommen beim nächsten Online-Start.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      if (req.mode === 'navigate') return caches.match('index.html');
      return fetch(req);
    })
  );
});
