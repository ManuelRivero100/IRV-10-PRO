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
    e.respondWith(
      caches.open(CACHE).then(function(c){
        return Promise.all([
          c.match('./index.html').then(function(r){ return r || c.match('./'); }),
          c.match('./__instalada').then(function(m){ return m ? m.text().then(function(t){ return Date.now() - (+t || 0); }) : Infinity; })
        ]);
      }).then(function(x){
        var guardada = x[0], edad = x[1];
        if(guardada && edad < EDAD_MAX_MS) return guardada;
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
    data: {n: n, para: d.para === 'admin' || d.para === 'tecnico' ? d.para : '', titulo: String(d.titulo || '')}
  })];
  if(self.navigator && self.navigator.setAppBadge){
    tareas.push((n > 0 ? self.navigator.setAppBadge(n) : self.navigator.setAppBadge()).catch(function(){}));
  }
  e.waitUntil(Promise.all(tareas));
});

// Al tocar un aviso hay que ver la app SIEMPRE. Si ya hay una ventana, se le pide ponerse al frente y se le avisa para que vaya al inicio; en
// algunos moviles Android eso responde "hecho" sin traerla al frente, asi que se comprueba medio segundo despues y, si no esta visible, se
// pide abrir la app (eso si la trae al frente, este abierta o cerrada). Si no hay ninguna ventana (app cerrada) se abre directamente.
var URL_AVISO = './?aviso=1';
function _urlAviso(dato){
  return URL_AVISO + (dato && dato.para ? '&para=' + dato.para : '') + (dato && dato.titulo ? '&t=' + encodeURIComponent(dato.titulo) : '');
}
function _hayVentanaVisible(lista){
  for(var i = 0; i < lista.length; i++){ if(lista[i].visibilityState === 'visible') return true; }
  return false;
}
function _abrirAppDesdeAviso(dato){
  var opciones = {type: 'window', includeUncontrolled: true};
  return self.clients.matchAll(opciones).then(function(lista){
    if(!lista.length) return self.clients.openWindow(_urlAviso(dato));
    var c = lista[0];
    for(var i = 0; i < lista.length; i++){ if(lista[i].visibilityState === 'visible' || lista[i].focused){ c = lista[i]; break; } }
    return Promise.resolve().then(function(){ return c.focus(); }).then(function(w){
      try { (w || c).postMessage({tipo: 'irv-aviso-click', para: dato.para || '', titulo: dato.titulo || ''}); } catch(x) {}
      return new Promise(function(ok){ setTimeout(ok, 500); }).then(function(){
        return self.clients.matchAll(opciones);
      }).then(function(otra){
        if(!_hayVentanaVisible(otra)) return self.clients.openWindow(_urlAviso(dato));
      });
    }, function(){
      return self.clients.openWindow(_urlAviso(dato));
    });
  });
}

self.addEventListener('notificationclick', function(e){
  var dato = e.notification.data || {};
  e.notification.close();
  e.waitUntil(_abrirAppDesdeAviso(dato).catch(function(){ return self.clients.openWindow(_urlAviso(dato)); }));
});

// ===== Envio de partes y tareas pendientes con la app en segundo plano o cerrada (Background Sync) =====
// La app apunta en IndexedDB ('irv-cola') lo que va a enviar (js/25-cola-envio.js) y pide un "sync". Cuando vuelve internet el navegador
// despierta este service worker, que envia lo apuntado al servidor por su API REST usando la sesion del tecnico (el "refresh token" que la app
// guarda con cada envio). Lo enviado se quita de la cola; lo que falle se queda y se reintenta, y ademas la app lo envia ella sola al abrirse.
// Cada envio escribe siempre sobre el mismo documento, asi que repetirlo no duplica nada.
var COLA_BD = 'irv-cola';
function colaAbrir(){
  return new Promise(function(ok, ko){
    var r = indexedDB.open(COLA_BD, 2);
    r.onupgradeneeded = function(){
      var d = r.result;
      if(!d.objectStoreNames.contains('partes')) d.createObjectStore('partes', {keyPath: 'clave'});
      if(!d.objectStoreNames.contains('tareas')) d.createObjectStore('tareas', {keyPath: 'clave'});
      if(!d.objectStoreNames.contains('registro')) d.createObjectStore('registro', {keyPath: 'id', autoIncrement: true});
    };
    r.onsuccess = function(){ ok(r.result); };
    r.onerror = function(){ ko(r.error); };
  });
}
function colaTodos(db, almacen){
  return new Promise(function(ok, ko){ var q = db.transaction(almacen, 'readonly').objectStore(almacen).getAll(); q.onsuccess = function(){ ok(q.result); }; q.onerror = function(){ ko(q.error); }; });
}
function colaQuitar(db, almacen, clave){
  return new Promise(function(ok, ko){ var t = db.transaction(almacen, 'readwrite'); t.objectStore(almacen).delete(clave); t.oncomplete = function(){ ok(); }; t.onerror = function(){ ko(t.error); }; });
}
// Valores al formato del servidor (API REST de Firestore)
function colaValor(v){
  if(v === null) return {nullValue: null};
  if(typeof v === 'boolean') return {booleanValue: v};
  if(typeof v === 'number'){ if(!isFinite(v)) return {nullValue: null}; return Number.isInteger(v) ? {integerValue: String(v)} : {doubleValue: v}; }
  if(typeof v === 'string') return {stringValue: v};
  if(Array.isArray(v)) return {arrayValue: {values: v.filter(function(x){ return x !== undefined; }).map(colaValor)}};
  if(typeof v === 'object') return {mapValue: {fields: colaCampos(v)}};
  return {nullValue: null};
}
function colaCampos(o){
  var f = {};
  Object.keys(o).forEach(function(k){ if(o[k] !== undefined) f[k] = colaValor(o[k]); });
  return f;
}
function colaRuta(k){ return /^[A-Za-z_][A-Za-z_0-9]*$/.test(k) ? k : '`' + k.replace(/\\/g, '\\\\').replace(/`/g, '\\`') + '`'; }
// Cambia el "refresh token" de la sesion por un token de acceso valido (uno por sesion y envio)
function colaToken(ses, cache){
  if(cache[ses.refreshToken]) return cache[ses.refreshToken];
  cache[ses.refreshToken] = fetch('https://securetoken.googleapis.com/v1/token?key=' + encodeURIComponent(ses.apiKey), {
    method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(ses.refreshToken)
  }).then(function(r){ if(!r.ok) throw new Error('token ' + r.status); return r.json(); }).then(function(j){ return j.id_token; });
  return cache[ses.refreshToken];
}
function colaBase(ses){ return 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(ses.projectId) + '/databases/(default)/documents'; }
function colaPeticion(url, token, cuerpo, metodo){
  return fetch(url, {method: metodo, headers: {'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'}, body: JSON.stringify(cuerpo)}).then(function(r){
    if(r.ok) return r;
    return r.text().then(function(t){ var e = new Error('firestore ' + r.status + ' ' + t.slice(0, 160)); e.estado = r.status; throw e; });
  });
}
// Parte: se escriben solo los campos que trae (igual que el guardado normal con "merge")
function colaEnviarParte(it, token){
  var campos = colaCampos(it.datos);
  var mascara = Object.keys(campos).map(function(k){ return 'updateMask.fieldPaths=' + encodeURIComponent(colaRuta(k)); }).join('&');
  return colaPeticion(colaBase(it.ses) + '/partes/' + encodeURIComponent(it.docId) + (mascara ? '?' + mascara : ''), token, {fields: campos}, 'PATCH');
}
// Tarea nueva: solo si todavia no existe (si ya existe es que llego, y no se pisa lo que otros hayan comentado despues).
// Comentario o cierre: cambia sus campos y anade el comentario solo si no estaba (arrayUnion), sobre una tarea que debe existir.
function colaEnviarTarea(it, token){
  if(it.op === 'crear') return colaPeticion(colaBase(it.ses) + '/tareasPendientes/' + encodeURIComponent(it.id) + '?currentDocument.exists=false', token, {fields: colaCampos(it.datos)}, 'PATCH');
  var campos = colaCampos(it.campos);
  var escritura = {
    update: {name: 'projects/' + it.ses.projectId + '/databases/(default)/documents/tareasPendientes/' + it.id, fields: campos},
    updateMask: {fieldPaths: Object.keys(campos).map(colaRuta)},
    updateTransforms: [{fieldPath: 'comentarios', appendMissingElements: {values: [colaValor(it.comentario)]}}],
    currentDocument: {exists: true}
  };
  return colaPeticion(colaBase(it.ses) + ':commit', token, {writes: [escritura]}, 'POST');
}
function colaAvisar(n){
  if(!n) return Promise.resolve();
  return self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(function(l){
    l.forEach(function(c){ try { c.postMessage({tipo: 'irv-cola-enviada', n: n}); } catch(x) {} });
  });
}
// Anota en el registro (lo ve la app tocando la version en la pantalla de entrada) lo que ha hecho este envio. Nunca debe estropear el envio.
function colaAnotar(notas){
  return colaAbrir().then(function(db){
    return new Promise(function(ok){
      var t = db.transaction('registro', 'readwrite'), st = t.objectStore('registro');
      notas.forEach(function(x){ st.put({ts: Date.now(), origen: 'sw', texto: String(x).slice(0, 300)}); });
      t.oncomplete = function(){ db.close(); ok(); }; t.onerror = t.onabort = function(){ db.close(); ok(); };
    });
  }).catch(function(){});
}
function colaEnviarTodo(){
  var notas = ['sync recibido: el navegador despierta al service worker'];
  return colaAbrir().then(function(db){
    return Promise.all([colaTodos(db, 'partes'), colaTodos(db, 'tareas')]).then(function(r){
      notas.push('en cola: ' + r[0].length + ' parte(s), ' + r[1].length + ' tarea(s)');
      var trabajo = [];
      r[0].forEach(function(it){ trabajo.push({almacen: 'partes', it: it, enviar: colaEnviarParte}); });
      r[1].forEach(function(it){ trabajo.push({almacen: 'tareas', it: it, enviar: colaEnviarTarea}); });
      if(!trabajo.length){ db.close(); return 0; }
      var cache = {}, enviados = 0, fallos = 0, cadena = Promise.resolve();
      trabajo.forEach(function(w){
        cadena = cadena.then(function(){
          if(!w.it.ses || !w.it.ses.refreshToken || !w.it.ses.apiKey || !w.it.ses.projectId){ fallos++; notas.push('SIN SESION apuntada: ' + w.almacen + ' ' + w.it.clave + ' (lo enviara la app al abrirse)'); return; }
          return colaToken(w.it.ses, cache).then(function(tok){ return w.enviar(w.it, tok); }).then(function(){
            enviados++; notas.push('ENVIADO ' + w.almacen + ' ' + w.it.clave); return colaQuitar(db, w.almacen, w.it.clave);
          }).catch(function(e){
            var yaEnviada = e && e.estado === 409 && w.almacen === 'tareas' && w.it.op === 'crear';  // ya existia: llego antes
            var tareaBorrada = e && e.estado === 404 && w.almacen === 'tareas' && w.it.op === 'comentar'; // la tarea ya no existe: no hay donde comentar
            if(yaEnviada || tareaBorrada){ if(yaEnviada) enviados++; notas.push((yaEnviada ? 'YA EXISTIA ' : 'TAREA BORRADA, se descarta ') + w.almacen + ' ' + w.it.clave); return colaQuitar(db, w.almacen, w.it.clave); }
            fallos++; notas.push('ERROR ' + w.almacen + ' ' + w.it.clave + ': ' + (e && e.message || e));
          });
        });
      });
      return cadena.then(function(){
        db.close();
        return colaAvisar(enviados).then(function(){ if(fallos) throw new Error('quedan ' + fallos + ' sin enviar'); return enviados; });
      });
    });
  }).then(function(n){
    notas.push('fin: ' + n + ' enviado(s)');
    return colaAnotar(notas).then(function(){ return n; });
  }, function(e){
    notas.push('fin con fallo: ' + (e && e.message || e) + ' (el navegador reintentara mas tarde)');
    return colaAnotar(notas).then(function(){ throw e; });
  });
}self.addEventListener('sync', function(e){
  if(e.tag === 'irv-enviar') e.waitUntil(colaEnviarTodo()); // si falla algo, la promesa rechaza y el navegador vuelve a intentarlo mas tarde
});