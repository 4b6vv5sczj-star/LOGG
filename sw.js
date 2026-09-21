const CACHE='logg-v0.3.0-20260921';
const CORE=['./','./index.html','./styles.css?v=0.3.0','./app.js?v=0.3.0','./config.js?v=0.3.0','./manifest.webmanifest?v=0.3.0','./icons/icon-180.png','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)))});
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);await self.clients.claim()})()));
self.addEventListener('message',e=>{if(e.data==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(u.origin!==self.location.origin)return;e.respondWith((async()=>{try{const r=await fetch(e.request,{cache:'no-store'});if(r.ok){const c=await caches.open(CACHE);c.put(e.request,r.clone())}return r}catch{return (await caches.match(e.request))||(e.request.mode==='navigate'?caches.match('./index.html'):Response.error())}})())});
