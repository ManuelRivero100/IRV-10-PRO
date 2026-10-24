// ===== STORAGE =====
function getH(){ return JSON.parse(localStorage.getItem('pm_v4')||'[]'); }
function setH(d){ localStorage.setItem('pm_v4',JSON.stringify(d)); }
// Devuelve, con sus índices originales, los partes de una orden concreta (pedido+centro)
// dentro de h, ordenados por fecha real (más antiguo primero) — nunca por el orden en que
// se guardaron localmente, que puede no coincidir si un parte se sincroniza o se crea
// fuera de orden cronológico. No modifica h ni localStorage, solo lee y devuelve una copia.
function _partesDeOrdenOrdenados(pedido, centro, h){
  return h.map(function(r,idx){ return {r:r,idx:idx}; })
    .filter(function(x){ return x.r.pedido===pedido && x.r.centro===centro; })
    .sort(function(a,b){ return (a.r.fecha||'').localeCompare(b.r.fecha||''); });
}
function getHVisible(){
  var h=getH();
  if(window._sesion && window._sesion.rol==='tecnico'){
    var miNombre=window._sesion.nombre.toLowerCase();
    h=h.filter(function(r){ return r.tecnicos && r.tecnicos.some(function(t){ return t.toLowerCase()===miNombre; }); });
  }
  return h;
}

// ===== AGENDA DE TIENDAS (Mercadona por ahora) =====
function getAgenda(){ return JSON.parse(localStorage.getItem('pm_agenda')||'{}'); }
function setAgenda(d){ localStorage.setItem('pm_agenda',JSON.stringify(d)); }
// Materiales flotantes: introducidos por un admin (o un técnico con el permiso activado)
// cuando el material no existe en el catálogo — quedan pendientes de que un admin los
// asigne a una sección/subsección concreta, momento en el que pasan a ser parte real y
// permanente del catálogo. Mientras están pendientes, se guardan aquí como copia local
// (espejo de la colección materialesFlotantes en Firestore), para que la búsqueda de
// materiales los reconozca al instante sin depender de una consulta en el momento.
function getMaterialesFlotantes(){ return JSON.parse(localStorage.getItem('pm_mat_flotante')||'[]'); }
function setMaterialesFlotantes(d){ localStorage.setItem('pm_mat_flotante',JSON.stringify(d)); }
function agendaKey(clienteId,centro){ return (clienteId||'mercadona')+'_'+(centro||''); }
// ID fijo para una incidencia (centro+pedido, SIN cliente): el número de pedido/IRV es
// irrepetible sin importar el cliente (lo genera la propia app para sustituir la falta de un
// número oficial), así que la clave no debe distinguir por cliente — si dos clientes acabaran
// compartiendo el mismo número por error, deben verse como la misma incidencia, no como dos
// independientes. Además, con un ID fijo, guardar dos veces (p.ej. tras un corte de conexión
// que hizo fallar el primer intento) siempre aterriza en el MISMO documento — nunca puede
// crear una incidencia paralela.
function incidenciaId(centro,pedido){ return ((centro||'')+'_'+(pedido||'')).replace(/[\/\s]/g,'-'); }
// Registro simple de última modificación (quién/cuándo/por qué) para poder investigar más
// tarde un estado inesperado en una incidencia, sin necesitar un historial completo — solo
// se guarda el último cambio, se sobreescribe en cada escritura.
function _marcaModificacion(razon){
  return {
    ultimaModificacionPor: (window._sesion&&window._sesion.nombre)||'',
    ultimaModificacionFecha: Date.now(),
    ultimaModificacionRazon: razon
  };
}
function agendaBuscar(clienteId,centro){
  if(!centro) return null;
  var a=getAgenda();
  return a[agendaKey(clienteId,centro)]||null;
}
function _completarAgendaFaltantes(clienteId, centro, km, tr){
  if(!centro || !km) return; // nada que completar
  if(typeof _db === 'undefined' || !_db) return;
  clienteId=clienteId||'mercadona';
  var k=agendaKey(clienteId,centro);
  var local=getAgenda();
  var entry=local[k];
  if(!entry) return; // si no existe la entrada, la crea _subirAgendaEntry por separado
  if(entry.km) return; // ya tiene km — nunca sobreescribir un dato que ya está correcto
  var docId=k.replace(/[\/\s]/g,'-');
  _db.collection('agenda').doc(docId).update({ km: km, tr: tr||'' }).then(function(){
    entry.km=km; entry.tr=tr||''; local[k]=entry; setAgenda(local);
  }).catch(_fallo('_completarAgendaFaltantes agenda.update'));
}
function _subirAgendaEntry(clienteId,centro,tienda,dir,tel,km,tr){
  clienteId=clienteId||'mercadona';
  if(!centro) return;
  if(!dir && !tel) return; // sin datos útiles, no merece la pena crear la entrada
  if(typeof _db === 'undefined' || !_db) return;
  var k=agendaKey(clienteId,centro);
  var local=getAgenda();
  if(local[k]) return; // ya la tenemos local, no hace falta ni consultar Firestore
  var docId=k.replace(/[\/\s]/g,'-');
  var ref=_db.collection('agenda').doc(docId);
  ref.get().then(function(snap){
    if(snap.exists) {
      var a=getAgenda(); a[k]=snap.data(); setAgenda(a); // ya existía en Firestore, la adoptamos local
      return;
    }
    var esAdmin=window._sesion && window._sesion.rol==='admin';
    var data={clienteId:clienteId,centro:centro,tienda:tienda||'',dir:dir||'',tel:tel||'',km:km||'',tr:tr||'',creadoPor:(window._sesion&&window._sesion.nombre)||'',fechaCreacion:Date.now(),estado:esAdmin?'aceptada':'pendiente',vistaAdmin:false};
    ref.set(data).then(function(){
      var a=getAgenda(); a[k]=data; setAgenda(a);
    }).catch(_fallo('_subirAgendaEntry #1'));
  }).catch(_fallo('_subirAgendaEntry #2'));
}

// Km/despl. entre dos tiendas concretas cuando se va de una a otra "Con enlace" — dato
// exclusivo de esa PAREJA de tiendas (no de cada tienda por separado, eso ya lo tiene la
// Agenda). Es el mismo en los dos sentidos, así que la clave usa los dos centros ordenados:
// A→B y B→A siempre caen en la misma ficha, sin duplicar ni tener que guardarlo dos veces.
function getEnlaces(){ return JSON.parse(localStorage.getItem('pm_enlaces')||'{}'); }
function setEnlaces(d){ localStorage.setItem('pm_enlaces',JSON.stringify(d)); }
function parEnlaceKey(clienteId,centroA,centroB){
  clienteId=clienteId||'mercadona';
  var par=[String(centroA||'').trim(), String(centroB||'').trim()].sort();
  return (clienteId+'_'+par[0]+'_'+par[1]).replace(/[\/\s]/g,'-');
}
function enlaceBuscar(clienteId,centroA,centroB){
  if(!centroA||!centroB) return null;
  var e=getEnlaces();
  return e[parEnlaceKey(clienteId,centroA,centroB)]||null;
}
function _sincronizarEnlacesDesdeFirestore(){
  if(typeof _db === 'undefined' || !_db) return;
  _db.collection('enlacesTiendas').get().then(function(snap){
    var e=getEnlaces();
    var cambiado=false;
    snap.forEach(function(doc){
      var d=doc.data();
      if(JSON.stringify(e[doc.id])!==JSON.stringify(d)){ e[doc.id]=d; cambiado=true; }
    });
    if(cambiado) setEnlaces(e);
  }).catch(_fallo('_sincronizarEnlacesDesdeFirestore'));
}
function _subirEnlaceEntry(clienteId,centroA,centroB,tiendaDestino,km,tr){
  clienteId=clienteId||'mercadona';
  if(!centroA||!centroB) return;
  if(typeof _db === 'undefined' || !_db) return;
  var k=parEnlaceKey(clienteId,centroA,centroB);
  var local=getEnlaces();
  if(local[k]) return; // ya la tenemos, no sobreescribir una pareja ya guardada
  var data={clienteId:clienteId,centroA:centroA,centroB:centroB,tiendaDestino:tiendaDestino||'',km:km||'',tr:tr||'',creadoPor:(window._sesion&&window._sesion.nombre)||'',fechaCreacion:Date.now()};
  _db.collection('enlacesTiendas').doc(k).set(data).then(function(){
    local[k]=data; setEnlaces(local);
  }).catch(_fallo('_subirEnlaceEntry enlacesTiendas.set'));
}

// Siguiente número IRV global (único en toda la app, sin importar el cliente).
// Además del historial local de este móvil, se tiene en cuenta un contador compartido en
// Firestore (config/contadorIRV) que se sincroniza periódicamente — así, aunque este
// dispositivo lleve tiempo sin sincronizar, no repite un número que otro técnico ya usó
// desde otro móvil. Sigue funcionando sin conexión igual que siempre (usa la última copia
// local del contador que tenga).
function nextIRV(){
  var h=getH();
  var max=0;
  h.forEach(function(r){
    if(r.pedido&&r.pedido.startsWith('IRV-')){
      var n=parseInt(r.pedido.replace('IRV-',''),10)||0;
      if(n>max) max=n;
    }
    if(r.actObras&&r.actObras.startsWith('IRV-')){
      var n2=parseInt(r.actObras.replace('IRV-',''),10)||0;
      if(n2>max) max=n2;
    }
  });
  var siguienteGlobal = +(localStorage.getItem('pm_siguiente_irv')||0);
  var next = Math.max(max+1, siguienteGlobal);
  return 'IRV-'+('000'+next).slice(-4);
}

// Sincroniza hacia este móvil el contador compartido del siguiente número IRV disponible.
function _sincronizarContadorIRV(){
  if(typeof _db === 'undefined' || !_db) return;
  _db.collection('config').doc('contadorIRV').get().then(function(doc){
    if(!doc.exists) return;
    var remoto = doc.data().siguiente||0;
    var local = +(localStorage.getItem('pm_siguiente_irv')||0);
    if(remoto>local) localStorage.setItem('pm_siguiente_irv', String(remoto));
  }).catch(_fallo('_sincronizarContadorIRV config.get'));
}

// Avisa a Firestore de que se ha usado un número IRV, para adelantar el contador
// compartido si hace falta (nunca lo retrocede). Transacción atómica: si dos técnicos
// avisan casi a la vez, no se pisan entre sí. No bloquea el guardado del parte — se llama
// igual que _actualizarIncidenciaPorOrden, en segundo plano.
function _avanzarContadorIRV(pedidoIRV){
  if(typeof _db === 'undefined' || !_db || !pedidoIRV) return;
  var n = parseInt(pedidoIRV.replace('IRV-',''),10);
  if(!n) return;
  var ref = _db.collection('config').doc('contadorIRV');
  _db.runTransaction(function(t){
    return t.get(ref).then(function(doc){
      var actual = (doc.exists && doc.data().siguiente) || 0;
      if(n+1>actual) t.set(ref, {siguiente:n+1});
    });
  }).then(function(){
    var local = +(localStorage.getItem('pm_siguiente_irv')||0);
    if(n+1>local) localStorage.setItem('pm_siguiente_irv', String(n+1));
  }).catch(_fallo('_avanzarContadorIRV'));
}

