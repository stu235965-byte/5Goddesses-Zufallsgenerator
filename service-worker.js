const CACHE='5goddesses-pwa-v79';
const CORE=[
  './',
  './index.html',
  './style.css',
  './generator.js',
  './deckbuilder.js',
  './game-engine.js',
  './battlefield.js',
  './pwa.js',
  './5goddesses-datenbank.js',
  './manifest.webmanifest'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

function isAppCode(request){
  if(request.mode==='navigate')return true;
  try{
    const u=new URL(request.url);
    if(u.origin!==self.location.origin)return false;
    return /\.(?:html|js|css|webmanifest)$/i.test(u.pathname);
  }catch(_){return false;}
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;

  // v1.61: App-Code immer zuerst aus dem Netz holen.
  // Damit bleiben index.html, JS und CSS nach GitHub-Pages-Updates nicht
  // in einem alten PWA-Cache hängen. Offline fällt es auf den Cache zurück.
  if(isAppCode(request)){
    event.respondWith(
      fetch(request,{cache:'no-store'})
        .then(response=>{
          if(response && response.ok){
            const copy=response.clone();
            caches.open(CACHE).then(cache=>cache.put(request,copy));
          }
          return response;
        })
        .catch(()=>caches.match(request).then(r=>r||caches.match('./index.html')))
    );
    return;
  }

  // Kartenbilder und sonstige statische Assets bleiben cache-first.
  event.respondWith(
    caches.match(request).then(cached=>{
      if(cached)return cached;
      return fetch(request).then(response=>{
        if(response && response.ok){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(request,copy));
        }
        return response;
      });
    })
  );
});
