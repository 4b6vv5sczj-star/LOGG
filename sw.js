const CACHE='logg-v0.10.6';
const FALLBACK=['./index.html','./styles.css?v=0.10.5','./app.js?v=0.10.5','./config.js?v=0.10.5','./home-sailing-yacht.png?v=0.10.5','./core/module-registry.js?v=0.10.5','./modules/meetings/module.js?v=0.10.5','./modules/notes/module.js?v=0.10.5'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FALLBACK)))});
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);await self.clients.claim()})()));
self.addEventListener('message',e=>{if(e.data==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return; const u=new URL(e.request.url); if(u.origin!==self.location.origin)return;
 e.respondWith((async()=>{try{return await fetch(e.request,{cache:'no-store'})}catch{return (await caches.match(e.request))||(e.request.mode==='navigate'?caches.match('./index.html'):Response.error())}})());
});
