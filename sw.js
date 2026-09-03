const CACHE='activity-radar-v2';
const ASSETS=['./','./index.html','./manifest.json','./icon.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).catch(()=>{}));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(cached=>{const fp=fetch(e.request).then(r=>{if(r&&r.status===200&&r.type==='basic'){const cl=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cl)).catch(()=>{});}return r;}).catch(()=>cached);return cached||fp;}));});