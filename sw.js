// Change this number whenever you upload a new index.html, so phones pick up the update.
const CACHE = 'chimedza-v11';

// The page itself must be saved for the app to work offline. If it cannot be saved,
// installation fails and is retried later, instead of pretending to be ready.
async function precache() {
  const c = await caches.open(CACHE);
  const r = await fetch('./index.html', { cache: 'reload' });
  if (!r.ok) throw new Error('index.html not found');
  await c.put('./index.html', r.clone());
  await c.put('./', r.clone());
  await Promise.all(['./manifest.json', './icon-192.png', './icon-512.png'].map(f => c.add(f).catch(() => null)));
}

self.addEventListener('install', e => {
  e.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Serve the saved copy first (works with no internet) and refresh it quietly when online.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req, { ignoreSearch: true });
    const update = fetch(req).then(res => {
      if (res && res.ok) c.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(update); return hit; }
    const res = await update;
    if (res) return res;
    if (req.mode === 'navigate') {
      const page = await c.match('./index.html');
      if (page) return page;
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  })());
});
