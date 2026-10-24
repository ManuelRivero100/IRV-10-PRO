// sw.js — Partes IRV-10 (version con la app dividida en archivos)
// Cada version de la app se registra como sw.js?v=<version>, asi cada version tiene su propia cache
// y los archivos (js/css) de una version nunca se mezclan con los de otra.
var VERSION = new URL(self.location.href).searchParams.get('v') || 'sin-version';
var CACHE = 'irv10-' + VERSION;

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      // La lista de archivos sale del propio index.html, para no olvidar ninguno nunca.
      return fetch('./index.html', {cache: 'no-store'}).then(function(r){
        if(!r.ok) throw new Error('index.html ' + r.status);
        var copia = r.clone();
        return Promise.all([r.text(), c.put('./index.html', copia)]).then(function(res){
          var archivos = ['./'];
          var re = /(?:src|href)="((?:js|css)\/[^"]+)"/g, m;
          while((m = re.exec(res[0]))) archivos.push(m[1]);
          // Todo o nada: si falta un archivo de codigo, la instalacion falla y sigue la version anterior.
          return Promise.all(archivos.map(function(u){ return c.add(u); })).then(function(){
            return Promise.all(['./manifest.json', './icon.png'].map(function(u){ return c.add(u).catch(function(){}); }));
          });
        });
      });
    })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url = new URL(req.url);

  // Abrir la app: siempre la ultima version si hay internet; sin internet, la guardada.
  if(req.mode === 'navigate'){
    var conCb = req.url + (req.url.indexOf('?') >= 0 ? '&' : '?') + '_sw=' + Date.now();
    e.respondWith(
      fetch(conCb, {cache: 'no-store'}).then(function(r){
        var copia = r.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copia); });
        return r;
      }).catch(function(){
        return caches.match(req).then(function(r){
          return r || caches.match('./index.html').then(function(x){ return x || caches.match('./'); });
        });
      })
    );
    return;
  }

  // Servicios de otros sitios (Firebase, PDF...): los gestiona el navegador.
  if(url.origin !== self.location.origin) return;

  // Archivos propios (js, css, iconos): los de la version, guardados. Llevan ?v=<version>, asi que nunca quedan viejos.
  e.respondWith(
    caches.match(req).then(function(r){
      return r || fetch(req).then(function(resp){
        if(resp && resp.ok){
          var copia = resp.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copia); });
        }
        return resp;
      });
    })
  );
});
