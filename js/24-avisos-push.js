// ===== AVISOS EN EL MÓVIL (notificaciones push) =====
// El técnico activa los avisos una vez en cada móvil. La suscripción (qué móvil es y a quién avisar) se guarda en la colección
// dispositivosPush; la función "avisos" del servidor le manda un aviso cuando se le asigna una orden o una tarea, aunque la app esté
// cerrada. El service worker (sw.js) muestra el aviso y pone el número en el icono. Cada vez que el técnico abre la app se vuelve a
// guardar su suscripción (por si el móvil la renovó) y se cierran los avisos que quedaran en la barra.
var _PUSH_CLAVE_PUBLICA = 'BGN6U_pFjvxglqvqhCwzE6zsXJks636whioHB9O08xfr36PQ7BdmVceoeFhDDARi7PjFAkEPpXXSCCaSsnkmsFw';
var _pushNombre = '';

function _pushSoportado(){ return ('serviceWorker' in navigator) && ('PushManager' in window) && ('Notification' in window); }
function _pushEsIos(){ return /iPhone|iPad|iPod/.test(navigator.userAgent); }
function _pushInstalada(){ return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
function _pushClaveABytes(b64){
  var relleno = '='.repeat((4 - b64.length % 4) % 4), crudo = atob((b64 + relleno).replace(/-/g, '+').replace(/_/g, '/')), r = new Uint8Array(crudo.length);
  for(var i = 0; i < crudo.length; i++) r[i] = crudo.charCodeAt(i);
  return r;
}
// Identificador corto y estable del móvil, sacado de la dirección de su suscripción.
function _pushIdDispositivo(endpoint){
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint)).then(function(h){
    return Array.prototype.map.call(new Uint8Array(h).slice(0, 12), function(b){ return ('0' + b.toString(16)).slice(-2); }).join('');
  });
}
function _pushGuardar(sub, nombre){
  var j = sub.toJSON();
  return _pushIdDispositivo(j.endpoint).then(function(id){
    return _db.collection('dispositivosPush').doc(id).set({
      tecnico: nombre, endpoint: j.endpoint, keys: j.keys, actualizado: Date.now(), agente: String(navigator.userAgent).slice(0, 140)
    }, {merge: true});
  });
}
function _pushTarjeta(html){
  var c = $('pushCard'); if(!c) return;
  if(!html){ c.style.display = 'none'; c.innerHTML = ''; return; }
  c.innerHTML = '<div class="card"><div class="card-title">&#128276; Avisos en este móvil</div>' + html + '</div>';
  c.style.display = 'block';
}
function _pushOcultarTarjeta(){ _pushTarjeta(''); }
function _pushCerrarAvisos(){
  navigator.serviceWorker.ready.then(function(reg){ return reg.getNotifications(); })
    .then(function(lista){ lista.forEach(function(n){ n.close(); }); }).catch(function(){});
}
// Los avisos de la barra se cierran SOLO cuando el tecnico vuelve a la app desde fuera (entonces ya los ha visto): al abrirla y cada vez que
// pasa de oculta a visible. Un aviso que llega con la app abierta se queda en la barra hasta que lo toque o lo quite.
document.addEventListener('visibilitychange', function(){
  if(document.visibilityState === 'visible' && _pushSoportado() && Notification.permission === 'granted') _pushCerrarAvisos();
});
if(document.visibilityState === 'visible' && _pushSoportado() && Notification.permission === 'granted') _pushCerrarAvisos();
// Se llama cada vez que el técnico (con asignaciones) ve su inicio: muestra el botón para activar los avisos si hace falta, o deja la
// suscripción guardada al día si ya están activados.
function _pushRefrescar(nombre){
  _pushNombre = nombre || _pushNombre;
  if(!_pushSoportado()){
    _pushTarjeta(_pushEsIos() && !_pushInstalada()
      ? '<p style="font-size:.85rem;color:var(--text2);">En iPhone los avisos solo funcionan con la app añadida a la pantalla de inicio (botón Compartir &rarr; Añadir a pantalla de inicio) y iOS 16.4 o superior.</p>'
      : '');
    return;
  }
  if(Notification.permission === 'denied'){
    _pushTarjeta('<p style="font-size:.85rem;color:var(--text2);">Los avisos están bloqueados en este móvil. Para recibirlos, permite las notificaciones de IRV-10 en los ajustes del móvil.</p>');
    return;
  }
  navigator.serviceWorker.ready.then(function(reg){ return reg.pushManager.getSubscription(); }).then(function(sub){
    if(Notification.permission === 'granted' && sub){
      _pushTarjeta('');
      _pushGuardar(sub, _pushNombre).catch(_fallo('_pushGuardar dispositivosPush.set'));
      return; // los avisos de la barra ya NO se cierran aqui (esto se ejecuta en cada redibujado de la pantalla de inicio)
    }
    _pushTarjeta('<p style="font-size:.85rem;color:var(--text2);margin-bottom:10px;">Activa los avisos para que te llegue una notificación, y un número en el icono de la app, cuando te asignen una orden o una tarea, aunque la app esté cerrada.</p>'
      + '<button class="btn btn-p btn-full" onclick="_pushActivar()">&#128276; Activar avisos</button>');
  }).catch(function(){});
}
// Solo se llama desde el botón: el móvil exige que el permiso se pida tras un toque del usuario.
function _pushActivar(){
  if(!_pushSoportado() || !_pushNombre) return;
  Notification.requestPermission().then(function(p){
    if(p !== 'granted'){ _pushRefrescar(_pushNombre); return; }
    return navigator.serviceWorker.ready.then(function(reg){
      return reg.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: _pushClaveABytes(_PUSH_CLAVE_PUBLICA)});
    }).then(function(sub){ return _pushGuardar(sub, _pushNombre); }).then(function(){
      _toast('Avisos activados en este móvil.'); _pushTarjeta('');
    });
  }).catch(function(){ _toast('No se pudieron activar los avisos. Comprueba tu conexión e inténtalo de nuevo.', _AVISO_ROJO); });
}

// Al tocar un aviso de la barra, el service worker trae la app al frente y le manda este mensaje (o la abre con ?aviso=1&para=...&t=... si
// estaba cerrada). Cada aviso dice a quien va dirigido: 'tecnico' (le pasa como tecnico) o 'admin' (sale en su panel de administrador).
//  - Aviso de tecnico: se abre siempre en rol tecnico (si estaba como administrador, pasa a tecnico sin PIN).
//  - Aviso de administrador: si ya esta como administrador se abre directo; si esta como tecnico se pide el PIN y, al ponerlo, se abre.
// El destino sale del titulo: tareas -> pantalla de Tareas; registro de horas -> Horas adicionales; lo demas -> inicio (asignaciones y
// panel de avisos). Si esta rellenando un parte no se le mueve de sitio ni se le pide nada.
var _avisoDestinoPend = null;
function _destinoDeAviso(titulo){
  var t = String(titulo || '');
  if(/^Registro de horas/i.test(t)) return 'horas';
  if(/tarea/i.test(t)) return 'tareas';
  return 'inicio';
}
function _abrirDestinoAviso(dest){
  try {
    if(dest === 'tareas' && typeof abrirTareas === 'function'){ abrirTareas(); return; }
    if(dest === 'horas' && typeof abrirHoras === 'function'){ abrirHoras(); return; }
    goTo('w-clientes');
  } catch(e){ _fallo('_abrirDestinoAviso')(e); }
}
// Tras cambiar de rol (con o sin PIN) se abre el destino pendiente, si se pidio hace poco
function _ejecutarDestinoAvisoPend(){
  var p = _avisoDestinoPend; _avisoDestinoPend = null;
  if(p && (Date.now() - p.ts) < 180000) setTimeout(function(){ _abrirDestinoAviso(p.dest); }, 300);
}
function _irAlAvisoPush(para, titulo){
  try {
    var s = window._sesion;
    if(!s || !localStorage.getItem('irv_sesion')) return;
    if(typeof _parteTieneContenidoSinGuardar === 'function' && _parteTieneContenidoSinGuardar()) return;
    var dest = _destinoDeAviso(titulo);
    if(para === 'admin' && s.rol !== 'admin' && s.multiRol){
      _avisoDestinoPend = { dest: dest, ts: Date.now() };
      pedirPinCambioRol();
      return;
    }
    if(para === 'tecnico' && s.rol === 'admin' && s.multiRol){
      _entrarConRol(s.nombre, 'tecnico', true);
      _avisoDestinoPend = { dest: dest, ts: Date.now() };
      _ejecutarDestinoAvisoPend();
      return;
    }
    _abrirDestinoAviso(dest);
  } catch(e){ _fallo('_irAlAvisoPush')(e); }
}
if('serviceWorker' in navigator){
  navigator.serviceWorker.addEventListener('message', function(ev){
    if(ev.data && ev.data.tipo === 'irv-aviso-click') _irAlAvisoPush(ev.data.para, ev.data.titulo);
  });
}
if(/[?&]aviso=1(&|$)/.test(location.search)){
  var _avisoQs = location.search;
  try { history.replaceState(null, '', location.pathname); } catch(e){ _fallo('avisoUrl')(e); }
  setTimeout(function(){
    var mp = /[?&]para=([a-z]+)/.exec(_avisoQs), mt = /[?&]t=([^&]*)/.exec(_avisoQs), tit = '';
    try { tit = mt ? decodeURIComponent(mt[1]) : ''; } catch(e){ tit = ''; }
    _irAlAvisoPush(mp ? mp[1] : '', tit);
  }, 3500);
}