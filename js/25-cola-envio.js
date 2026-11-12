// ===== COLA DE ENVÍO PARA CUANDO LA APP ESTÁ EN SEGUNDO PLANO O CERRADA =====
// Un parte o una tarea guardados sin internet se apuntan en una cola dentro del móvil (IndexedDB, que el service worker también puede leer).
// Cuando vuelve la conexión, el navegador despierta al service worker (Background Sync) y este envía lo apuntado directamente al servidor,
// aunque la app esté en segundo plano o cerrada. La app sigue enviando igual que siempre al abrirse o al volver el internet (segunda vía:
// nada se pierde y nada se envía dos veces con distinto resultado, porque cada envío escribe siempre sobre el mismo documento).
// Si algo falla aquí, nunca se rompe el guardado normal: todo va envuelto y solo se anota el fallo.
var _COLA_BD = 'irv-cola';
var _COLA_TAG = 'irv-enviar';
var _COLA_ESPERA_MS = 20000; // con internet "de mentira" (wifi sin salida) el envío normal no avisa: a los 20 s sin confirmar se pide el envío de fondo
var _COLA_TAREAS_KEY = 'pm_tareas_pendientes_envio'; // claves de las tareas apuntadas (copia síncrona para pintar el aviso de "pendiente de enviar")

function _colaAbrir(){
  return new Promise(function(ok, ko){
    var r = indexedDB.open(_COLA_BD, 2);
    r.onupgradeneeded = function(){
      var d = r.result;
      if(!d.objectStoreNames.contains('partes')) d.createObjectStore('partes', {keyPath: 'clave'});
      if(!d.objectStoreNames.contains('tareas')) d.createObjectStore('tareas', {keyPath: 'clave'});
      if(!d.objectStoreNames.contains('registro')) d.createObjectStore('registro', {keyPath: 'id', autoIncrement: true}); // actividad (la app y el service worker anotan aqui)
    };
    r.onsuccess = function(){ ok(r.result); };
    r.onerror = function(){ ko(r.error); };
  });
}
function _colaOperar(almacen, modo, accion){
  return _colaAbrir().then(function(db){
    return new Promise(function(ok, ko){
      var t = db.transaction(almacen, modo), res;
      res = accion(t.objectStore(almacen));
      t.oncomplete = function(){ db.close(); ok(res && 'result' in res ? res.result : undefined); };
      t.onerror = function(){ db.close(); ko(t.error); };
      t.onabort = function(){ db.close(); ko(t.error); };
    });
  });
}
function _colaTodos(almacen){ return _colaOperar(almacen, 'readonly', function(s){ return s.getAll(); }); }
function _colaPoner(almacen, item){ return _colaOperar(almacen, 'readwrite', function(s){ return s.put(item); }); }
function _colaQuitar(almacen, clave){ return _colaOperar(almacen, 'readwrite', function(s){ return s.delete(clave); }); }

// Datos de la sesión que necesita el service worker para identificarse ante el servidor cuando la app no está abierta.
function _colaSesion(){
  try {
    var u = window.firebase && firebase.auth && firebase.auth().currentUser;
    if(!u || !u.refreshToken) return null;
    var o = firebase.app().options;
    return {uid: u.uid, refreshToken: u.refreshToken, apiKey: o.apiKey, projectId: o.projectId};
  } catch(e){ _fallo('_colaSesion')(e); return null; }
}
// ----- Registro de actividad (para saber que pasa cuando algo no llega) -----
// La app y el service worker anotan aqui lo que hacen; se ve tocando la version en la pantalla de entrada. Se guardan solo las ultimas anotaciones.
function _colaLog(texto){
  try {
    return _colaPoner('registro', {ts: Date.now(), origen: 'app', texto: String(texto).slice(0, 300)}).then(function(){
      return _colaTodos('registro');
    }).then(function(l){
      if(l.length > 80) return Promise.all(l.slice(0, l.length - 60).map(function(x){ return _colaQuitar('registro', x.id); }));
    }).catch(function(){});
  } catch(e){ return Promise.resolve(); }
}
function _colaHora(ms){ var d = new Date(ms); function z(n){ return (n < 10 ? '0' : '') + n; } return z(d.getDate()) + '/' + z(d.getMonth() + 1) + ' ' + z(d.getHours()) + ':' + z(d.getMinutes()) + ':' + z(d.getSeconds()); }
// Resumen en texto: lo que hay apuntado ahora y las ultimas anotaciones (de la app y del service worker)
function _colaResumen(){
  return Promise.all([_colaTodos('partes'), _colaTodos('tareas'), _colaTodos('registro')]).then(function(r){
    var l = r[2].slice(-14).reverse().map(function(x){ return _colaHora(x.ts) + ' ' + (x.origen === 'sw' ? '[SW] ' : '[app] ') + x.texto; });
    return 'EN COLA AHORA: ' + r[0].length + ' parte(s), ' + r[1].length + ' tarea(s)\n'
      + 'Sync de fondo soportado: ' + ((window.SyncManager || (typeof ServiceWorkerRegistration !== 'undefined' && 'sync' in ServiceWorkerRegistration.prototype)) ? 'si' : 'NO') + '  |  En linea: ' + (navigator.onLine === false ? 'no' : 'si') + '\n'
      + '\nULTIMA ACTIVIDAD:\n' + (l.length ? l.join('\n') : '(nada anotado todavia)')
      + (typeof window._textoCargas === 'function' ? '\n\n' + window._textoCargas() : ''); // registro de cargas (js/26-registro-cargas.js)
  }).catch(function(e){ return 'No se pudo leer el registro: ' + e; });
}
function _colaRegistrarSync(){
  try {
    if(!('serviceWorker' in navigator)){ _colaLog('sin service worker: no se puede pedir el envio de fondo'); return; }
    navigator.serviceWorker.ready.then(function(reg){
      if(!(reg.sync && reg.sync.register)){ _colaLog('este navegador no tiene sync de fondo (reg.sync): solo se enviara al abrir la app'); return; }
      return reg.sync.register(_COLA_TAG).then(function(){ _colaLog('envio de fondo pedido (sync registrado)'); });
    }).catch(function(e){ _colaLog('FALLO al pedir el sync: ' + (e && e.message || e)); _fallo('_colaRegistrarSync')(e); });
  } catch(e){ _fallo('_colaRegistrarSync')(e); }
}

// Copia síncrona de las tareas apuntadas, para pintar el aviso en el inicio sin esperar a IndexedDB
function _colaTareasLista(){
  try { return JSON.parse(localStorage.getItem(_COLA_TAREAS_KEY) || '[]'); } catch(e){ return []; }
}
function _colaTareasGuardarLista(l){
  try { localStorage.setItem(_COLA_TAREAS_KEY, JSON.stringify(l)); } catch(e){ _fallo('_colaTareasGuardarLista')(e); }
  if(typeof _pintarPendientesEnvio === 'function') _pintarPendientesEnvio();
}
function _colaNumTareas(){ return _colaTareasLista().length; }

// Se llama ANTES de enviar con el método normal. item.clave identifica el envío (el id del documento en los partes).
function _colaApuntar(almacen, item){
  try {
    item.ses = _colaSesion();
    item.ts = Date.now();
    if(almacen === 'tareas'){
      var l = _colaTareasLista(); if(l.indexOf(item.clave) < 0){ l.push(item.clave); _colaTareasGuardarLista(l); }
    }
    var queda = _colaPoner(almacen, item);
    queda.then(function(){ _colaLog('apuntado ' + (almacen === 'partes' ? 'parte ' : 'tarea ') + item.clave + (item.ses ? ' (con sesion)' : ' (SIN SESION: el envio de fondo no podra identificarse)') + ' | en linea: ' + (navigator.onLine === false ? 'no' : 'si')); }, function(){});
    return queda.catch(_fallo('_colaApuntar ' + almacen));
  } catch(e){ _fallo('_colaApuntar')(e); return Promise.resolve(); }
}
// Se llama cuando el servidor confirma el envío normal: ya no hace falta lo apuntado.
function _colaConfirmar(almacen, clave){
  try {
    if(almacen === 'tareas') _colaTareasGuardarLista(_colaTareasLista().filter(function(k){ return k !== clave; }));
    return _colaQuitar(almacen, clave).then(function(){ _colaLog('confirmado por el servidor y quitado de la cola: ' + clave); }).catch(_fallo('_colaConfirmar ' + almacen));
  } catch(e){ _fallo('_colaConfirmar')(e); return Promise.resolve(); }
}
// Pide el envío de fondo: ya, si no hay conexión; y si hay, a los 20 s si el servidor no ha confirmado todavía.
function _colaVigilar(almacen, clave){
  try {
    if(navigator.onLine === false){ _colaRegistrarSync(); return; }
    setTimeout(function(){
      _colaTodos(almacen).then(function(l){
        if(l.some(function(x){ return x.clave === clave; })) _colaRegistrarSync();
      }).catch(_fallo('_colaVigilar ' + almacen));
    }, _COLA_ESPERA_MS);
  } catch(e){ _fallo('_colaVigilar')(e); }
}

// ----- Tareas: segunda vía (con la app abierta) -----
// Reenvía con el método normal las tareas que siguen apuntadas. Cada una escribe siempre sobre el mismo documento (la tarea nueva lleva su
// id desde el principio y los comentarios se añaden solo si no estaban), así que repetir un envío no duplica nada.
function _colaReenviarTareas(){
  try {
    if(typeof _db === 'undefined' || !_db || !window._sesion) return;
    _colaTodos('tareas').then(function(lista){
      _colaTareasGuardarLista(lista.map(function(x){ return x.clave; }));
      lista.forEach(function(it){
        var ref = _db.collection('tareasPendientes').doc(it.id), p;
        // La tarea nueva solo se crea si todavia no existe (si ya esta, llego antes; no se pisa lo que otros hayan comentado despues)
        if(it.op === 'crear') p = ref.get().then(function(d){ if(!d.exists) return ref.set(it.datos); });
        else p = ref.update(Object.assign({}, it.campos, {comentarios: firebase.firestore.FieldValue.arrayUnion(it.comentario)}));
        p.then(function(){ _colaConfirmar('tareas', it.clave); }).catch(function(err){
          // El servidor lo rechaza (o la tarea ya no existe): no se reintenta mas
          if(err && (err.code === 'permission-denied' || (err.code === 'not-found' && it.op === 'comentar'))) _colaConfirmar('tareas', it.clave);
        });
      });
    }).catch(_fallo('_colaReenviarTareas'));
  } catch(e){ _fallo('_colaReenviarTareas')(e); }
}

// El service worker avisa cuando ha enviado algo: se completa lo que la app hace además de guardar (estado de la orden, contador, agenda) y
// se repinta el aviso de pendientes.
if('serviceWorker' in navigator){
  navigator.serviceWorker.addEventListener('message', function(ev){
    if(!ev.data || ev.data.tipo !== 'irv-cola-enviada') return;
    try {
      _colaLog('el service worker avisa: ha enviado ' + ev.data.n + ' cosa(s)');
      _colaTodos('tareas').then(function(l){ _colaTareasGuardarLista(l.map(function(x){ return x.clave; })); }).catch(_fallo('cola mensaje tareas'));
      if(typeof _reintentarPartesPendientes === 'function') _reintentarPartesPendientes();
    } catch(e){ _fallo('cola mensaje')(e); }
  });
}

// Tocando la version en la pantalla de entrada se ve el registro de actividad (lo apuntado, los envios de fondo y sus resultados).
window.addEventListener('load', function(){
  try {
    var v = document.getElementById('verApp'); if(!v) return;
    v.style.cursor = 'pointer';
    v.addEventListener('click', function(){ _colaResumen().then(function(t){ alert(t); }); });
  } catch(e){ _fallo('verApp registro')(e); }
});
// Dentro de la app (sin cerrar sesion): tocar 3 veces seguidas el nombre de la cabecera ("Manuel Rivero · tecnico") enseña lo mismo.
window.addEventListener('load', function(){
  try {
    var h = document.getElementById('hdr-sub'); if(!h) return;
    var toques = [];
    h.addEventListener('click', function(){
      var ahora = Date.now(); toques = toques.filter(function(t){ return ahora - t < 1500; }); toques.push(ahora);
      if(toques.length >= 3){ toques = []; _colaResumen().then(function(t){ alert(t); }); }
    });
  } catch(e){ _fallo('hdr-sub registro')(e); }
});
