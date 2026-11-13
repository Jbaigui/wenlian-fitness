// App shell 缓存。链接到 ACE 的外部教学页面不会缓存；离线时仍能查看本地要点。
const CACHE_NAME = 'wenlian-app-v1.3.0';
const APP_SHELL = [
  './','./index.html','./styles.css','./app.js','./plan.js','./storage.js','./exercise-guides.js','./movement.js',
  './manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-180.png'
];
self.addEventListener('install',event=>{
  // 更新时绕过浏览器 HTTP 缓存，防止新缓存里仍装入旧版 JS/CSS。
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL.map(path=>new Request(new URL(path,self.registration.scope),{cache:'reload'})))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys = await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith('wenlian-') && key!==CACHE_NAME).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  if (event.request.method!=='GET') return;
  const url = new URL(event.request.url);
  if (url.origin!==self.location.origin) return;
  event.respondWith((async()=>{
    const cache = await caches.open(CACHE_NAME);
    if (event.request.mode==='navigate') {
      try {
        const response = await fetch(event.request);
        if (response.ok) await cache.put('./index.html',response.clone());
        return response;
      } catch {
        return await cache.match('./index.html') || Response.error();
      }
    }
    const found = await cache.match(event.request);
    if (found) return found;
    try {
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request,response.clone());
      return response;
    } catch { return Response.error(); }
  })());
});
