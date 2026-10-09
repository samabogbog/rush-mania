/* Update this version when changing the shell. Updates wait for every old app window to close. */
const CACHE='mossvale-pwa-v1';
const OFFLINE='/offline.html';
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll([OFFLINE,'/pwa/icon-192.png','/pwa/icon-512.png']))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('mossvale-pwa-')&&key!==CACHE).map(key=>caches.delete(key))))));
async function remember(request,response){
 if(!response.ok||response.type!=='basic'||response.headers.get('Cache-Control')?.includes('no-store'))return;
 const length=Number(response.headers.get('Content-Length'));if(length>4*1024*1024)return;
 const cache=await caches.open(CACHE);await cache.put(request,response.clone());const keys=await cache.keys();for(const key of keys.slice(0,Math.max(0,keys.length-160)))if(new URL(key.url).pathname!==OFFLINE)await cache.delete(key);
}
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname==='/api'||url.pathname.startsWith('/api/')||request.headers.has('Authorization'))return;
 if(request.mode==='navigate'){
  // Fetch HTML fresh; never keep a signed-in page or substitute cached account data.
  event.respondWith(fetch(request).catch(async()=>await caches.match(OFFLINE)||Response.error()));return;
 }
 const hashed=/^\/assets\/[^/]+-[A-Za-z0-9_-]{8,}\.(?:js|css|woff2?)$/.test(url.pathname);
 const icon=/^\/(?:icons|pwa)\/[^?]+\.(?:png|webp|svg)$/.test(url.pathname);
 if(!hashed&&!icon)return;
 event.respondWith((async()=>{const cached=await caches.match(request);if(cached)return cached;const response=await fetch(request);event.waitUntil(remember(request,response));return response})());
});
