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

  // Abrir la app: siempre la ultima version si hay internet; sin internet, la guardada. Si la red no responde en 4 s (por ejemplo datos o
  // Wi-Fi conectados pero sin internet real: el fallo no es inmediato como en modo avion y la app se quedaba esperando), se abre la copia
  // guardada; si la peticion llega mas tarde, deja guardada la version nueva para la proxima vez.
  if(req.mode === 'navigate'){
    var conCb = req.url + (req.url.indexOf('?') >= 0 ? '&' : '?') + '_sw=' + Date.now();
    var guardada = function(){
      return caches.match(req).then(function(r){
        return r || caches.match('./index.html').then(function(x){ return x || caches.match('./'); });
      });
    };
    e.respondWith(new Promise(function(resolve){
      var resuelto = false;
      var temporizador = setTimeout(function(){
        guardada().then(function(r){ if(r && !resuelto){ resuelto = true; resolve(r); } });
      }, 4000);
      fetch(conCb, {cache: 'no-store'}).then(function(r){
        if(r.ok){
          var copia = r.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copia); });
        }
        if(!resuelto){ resuelto = true; clearTimeout(temporizador); resolve(r); }
      }).catch(function(){
        clearTimeout(temporizador);
        if(resuelto) return;
        guardada().then(function(r){ resuelto = true; resolve(r || Response.error()); });
      });
    }));
    return;
  }

  // Servicios de otros sitios (Firebase, PDF...): los gestiona el navegador.
  if(url.origin !== self.location.origin) return;

  // La comprobación de versión de la app (?_cb=...) va SIEMPRE a la red y no se guarda: cada una lleva un número distinto, así que
  // guardarla solo llenaba la caché del móvil (unos 15 MB por hora con la app abierta) y nunca se volvía a usar.
  if(url.search.indexOf('_cb=') >= 0){ e.respondWith(fetch(req)); return; }

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

// Avisos (notificaciones push). Los manda la funcion "avisos" del servidor cuando se le asigna algo al tecnico (una orden o una tarea),
// tambien con la app cerrada. El aviso lleva el numero de cosas pendientes: se muestra y se pone en el icono de la app.
// No hay avisos de "ya no tienes nada": cuando el tecnico abre la app, ella sola recalcula el numero y lo quita.
self.addEventListener('push', function(e){
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch(x) { d = {}; }
  var n = +d.n || 0;
  var tareas = [self.registration.showNotification(d.titulo || 'IRV-10', {
    body: d.texto || 'Tienes asignaciones o tareas pendientes.',
    tag: 'aviso-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), // cada aviso queda aparte (con la misma etiqueta cada uno borraba al anterior)
    icon: './icon.png', badge: './icon.png',
    data: {n: n}
  })];
  if(self.navigator && self.navigator.setAppBadge){
    tareas.push((n > 0 ? self.navigator.setAppBadge(n) : self.navigator.setAppBadge()).catch(function(){}));
  }
  e.waitUntil(Promise.all(tareas));
});

self.addEventListener('notificationclick', function(e){
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(function(lista){
      for(var i = 0; i < lista.length; i++){
        if('focus' in lista[i]) return lista[i].focus();
      }
      return self.clients.openWindow('./');
    })
  );
});
