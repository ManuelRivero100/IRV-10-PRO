// sw.js — Partes IRV-10 (version con la app dividida en archivos)
// Cada version de la app se registra como sw.js?v=<version>, asi cada version tiene su propia cache
// y los archivos (js/css) de una version nunca se mezclan con los de otra.
var VERSION = new URL(self.location.href).searchParams.get('v') || 'sin-version';
var CACHE = 'irv10-' + VERSION;
var EDAD_MAX_MS = 3 * 24 * 60 * 60 * 1000; // pasada esta edad la version instalada ya no se abre sin preguntar antes a la red

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
          }).then(function(){
            // Marca de cuando se instalo esta version (la usa la red de seguridad de abrir la app, mas abajo).
            return c.put('./__instalada', new Response(String(Date.now())));
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

  // Abrir la app: SIEMPRE con la version que ya esta instalada en el movil, sin esperar a la red (asi abre al instante aunque haya datos o
  // Wi-Fi sin internet real). La version nueva se baja en silencio cuando hay internet (la propia app registra el sw.js nuevo, ver
  // _comprobarVersionNueva en 17-sesion-sincronizacion.js) y se usa la proxima vez que se abra la app, sin que el tecnico lo note.
  // La copia de la pagina sale SOLO de la cache de esta version, para que la pagina y su codigo sean siempre de la misma version.
  // Red de seguridad: si no hay copia, o la version instalada tiene mas de 3 dias, se pide la ultima a la red (con limite de 4 s si hay
  // copia), para no quedarse nunca atascado en una version vieja.
  if(req.mode === 'navigate'){
    if(!/(\/|\/index\.html)$/.test(url.pathname)) return;
    var conCb = req.url + (req.url.indexOf('?') >= 0 ? '&' : '?') + '_sw=' + Date.now();
    // Una RECARGA (la del cierre diario de las 6:00, donde llega el codigo nuevo) pide primero la ultima version a la red, con limite de 4 s.
    var esRecarga = (req.cache === 'reload' || req.cache === 'no-cache');
    e.respondWith(
      caches.open(CACHE).then(function(c){
        return Promise.all([
          c.match('./index.html').then(function(r){ return r || c.match('./'); }),
          c.match('./__instalada').then(function(m){ return m ? m.text().then(function(t){ return Date.now() - (+t || 0); }) : Infinity; })
        ]);
      }).then(function(x){
        var guardada = x[0], edad = x[1];
        if(guardada && edad < EDAD_MAX_MS && !esRecarga) return guardada;
        return new Promise(function(resolve){
          var resuelto = false;
          var temporizador = guardada ? setTimeout(function(){ if(!resuelto){ resuelto = true; resolve(guardada); } }, 4000) : null;
          fetch(conCb, {cache: 'no-store'}).then(function(r){
            if(!resuelto){ resuelto = true; if(temporizador) clearTimeout(temporizador); resolve(r); }
          }).catch(function(){
            if(temporizador) clearTimeout(temporizador);
            if(resuelto) return;
            resuelto = true; resolve(guardada || Response.error());
          });
        });
      })
    );
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
