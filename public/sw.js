/* eslint-disable no-restricted-globals */
/**
 * Service Worker — cache-first para activos estáticos del mismo origen.
 * HTML/API: red a menos que falle (fallback mínimo).
 */
const STATIC_CACHE = 'jcf-static-v1';
const RUNTIME_CACHE = 'jcf-runtime-v1';

const PRECACHE_URLS = [
  '/manifest.json',
  '/nuevologo.png',
  '/logo-jconefix-192.png',
  '/logo-jconefix-512.png',
  '/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== STATIC_CACHE && key !== RUNTIME_CACHE) return caches.delete(key);
            return undefined;
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  const p = url.pathname;
  if (p.startsWith('/_next/static/')) return true;
  if (p.startsWith('/_next/image')) return true;
  if (/\.(png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|eot)$/i.test(p)) return true;
  return PRECACHE_URLS.some((u) => p === u || p.startsWith(u));
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res.ok && res.status === 200) {
      const copy = res.clone();
      const cache = await caches.open(STATIC_CACHE);
      void cache.put(request, copy);
    }
    return res;
  } catch {
    return caches.match('/nuevologo.png');
  }
}

async function networkFirst(request) {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const copy = res.clone();
      const cache = await caches.open(RUNTIME_CACHE);
      void cache.put(request, copy);
    }
    return res;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('Sin conexión', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((c) => c || fetch(request))
  );
});
