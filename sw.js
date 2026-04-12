const CACHE = 'bb-v1';
const LOCAL = ['./', './index.html', './manifest.json', './icon.svg'];
const CDN   = ['https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js'];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE).then(async c => {
            await c.addAll(LOCAL);
            for (const url of CDN) {
                try { await c.add(url); } catch (_) {}
            }
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    // Only handle GET requests
    if (event.request.method !== 'GET') return;
    event.respondWith(
        caches.match(event.request).then(cached => {
            const network = fetch(event.request).then(res => {
                if (res.ok) {
                    const clone = res.clone();
                    caches.open(CACHE).then(c => c.put(event.request, clone));
                }
                return res;
            });
            // Cache-first for local assets, network-first for CDN
            const isLocal = LOCAL.some(u => event.request.url.endsWith(u.replace('./', '')));
            return isLocal ? (cached || network) : (network.catch(() => cached));
        })
    );
});
