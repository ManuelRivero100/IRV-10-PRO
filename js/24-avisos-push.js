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
  navigator.serviceWorker.ready.then(function(reg){ return reg.getNotifications({tag: 'pendientes'}); })
    .then(function(lista){ lista.forEach(function(n){ n.close(); }); }).catch(function(){});
}
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
      _pushTarjeta(_pushHtmlActivo());
      _pushGuardar(sub, _pushNombre).catch(_fallo('_pushGuardar dispositivosPush.set'));
      _pushCerrarAvisos();
      return;
    }
    _pushTarjeta('<p style="font-size:.85rem;color:var(--text2);margin-bottom:10px;">Activa los avisos para que te llegue una notificación, y un número en el icono de la app, cuando te asignen una orden o una tarea, aunque la app esté cerrada.</p>'
      + '<button class="btn btn-p btn-full" onclick="_pushActivar()">&#128276; Activar avisos</button>');
  }).catch(function(){});
}
// Tarjeta con los avisos ya activados: dos botones de prueba que NO pasan por el servidor, para separar "este móvil no muestra
// notificaciones" de "el aviso no llega". Debajo se escribe el resultado.
function _pushHtmlActivo(){
  return '<p style="font-size:.85rem;color:var(--text2);margin-bottom:10px;">Avisos activados en este móvil.</p>'
    + '<div class="brow"><button class="btn btn-s" onclick="_pushProbar()">Probar aviso</button>'
    + '<button class="btn btn-s" onclick="_pushProbarNumero()">Probar número en el icono</button></div>'
    + '<div id="pushDiag" style="font-size:.75rem;color:var(--text3);margin-top:8px;"></div>';
}
function _pushDiag(txt){ var d = $('pushDiag'); if(d) d.textContent = txt; }
function _pushProbar(){
  navigator.serviceWorker.ready.then(function(reg){
    return reg.showNotification('Prueba de aviso', {body: 'Si ves esto, las notificaciones de este móvil funcionan.', tag: 'prueba', icon: './icon.png', badge: './icon.png'}).then(function(){
      _pushDiag('Aviso pedido al móvil · permiso: ' + Notification.permission + ' · versión de la app: ' + ((reg.active && reg.active.scriptURL.split('?v=')[1]) || '?'));
    });
  }).catch(function(e){ _pushDiag('No se pudo mostrar el aviso: ' + (e && e.message || e)); });
}
function _pushProbarNumero(){
  if(!navigator.setAppBadge){ _pushDiag('Este móvil no admite el número en el icono (no existe setAppBadge).'); return; }
  navigator.setAppBadge(7).then(function(){ _pushDiag('Número 7 puesto en el icono: mira el icono con la app cerrada.'); })
    .catch(function(e){ _pushDiag('No se pudo poner el número: ' + (e && e.message || e)); });
}
// Solo se llama desde el botón: el móvil exige que el permiso se pida tras un toque del usuario.
function _pushActivar(){
  if(!_pushSoportado() || !_pushNombre) return;
  Notification.requestPermission().then(function(p){
    if(p !== 'granted'){ _pushRefrescar(_pushNombre); return; }
    return navigator.serviceWorker.ready.then(function(reg){
      return reg.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: _pushClaveABytes(_PUSH_CLAVE_PUBLICA)});
    }).then(function(sub){ return _pushGuardar(sub, _pushNombre); }).then(function(){
      _toast('Avisos activados en este móvil.'); _pushTarjeta(_pushHtmlActivo());
    });
  }).catch(function(){ _toast('No se pudieron activar los avisos. Comprueba tu conexión e inténtalo de nuevo.', _AVISO_ROJO); });
}
