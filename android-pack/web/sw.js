// Service Worker - 活动雷达
const CACHE_NAME = 'activity-radar-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './data/activities.json'
];

function shouldNetworkFirst(url, request) {
  return request.mode === 'navigate' || url.pathname.endsWith('.json');
}

async function putInCache(request, response) {
  if (!response || !response.ok) return;
  if (response.type !== 'basic' && response.type !== 'cors') return;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  } catch (_) {}
}

async function networkFirst(request, fallbackUrls = []) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      putInCache(request, response);
      return response;
    }
  } catch (_) {}
  for (const url of fallbackUrls) {
    const hit = await caches.match(url);
    if (hit) return hit;
  }
  const cached = await caches.match(request);
  return cached || Response.error();
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) putInCache(request, response);
  return response;
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (shouldNetworkFirst(url, event.request)) {
    event.respondWith(networkFirst(event.request, ['./', './index.html']));
    return;
  }
  event.respondWith(cacheFirst(event.request));
});
