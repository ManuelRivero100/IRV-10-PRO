
var _loginPendienteNombre = '';
var _loginPendienteRol = '';

// Aislamiento de datos por usuario en dispositivos compartidos: el historial, registro
// global, catálogo y agenda son un único almacén por dispositivo, no separado por quién
// tiene la sesión — así que si entra un usuario distinto al que tenía esos datos, hay que
// limpiarlos y resincronizar de fresco antes de continuar (o bloquear el cambio sin conexión).
var DISPOSITIVO_USUARIO_KEY = 'pm_dispositivo_usuario';
var ULTIMA_VERIFICACION_KEY = 'pm_ultima_verificacion_local';
function _limpiarDatosLocalesCompartidos(){
  // El historial se limpia con cuidado: cualquier parte todavía pendiente de subir a
  // Firestore (trabajo real de un técnico que aún no se ha confirmado guardado) se
  // conserva — nunca se pierde trabajo real por una limpieza de sincronización
  try {
    var h = JSON.parse(localStorage.getItem('pm_v4')||'[]');
    var pendientes = h.filter(function(r){ return r._pendienteSync; });
    localStorage.setItem('pm_v4', JSON.stringify(pendientes));
  } catch(e) { _fallo('_limpiarDatosLocalesCompartidos')(e); /* si algo falla leyendo, no tocar pm_v4 por seguridad */ }
  localStorage.removeItem('pm_registro_global');
  localStorage.removeItem('pm_incidencias_estados');
  localStorage.removeItem(CAT_KEY);
  localStorage.removeItem(CAT_V_KEY);
  localStorage.removeItem('pm_agenda');
}

// Se llama en el instante en que el PIN se confirma correcto, antes de decidir si hace
// falta preguntar el rol. Arranca la presentación completa y las sincronizaciones que no
// dependen del rol final (clientes, técnicos, catálogo, agenda, registro global) — así
// ese tiempo se aprovecha mientras el usuario ve la presentación o elige su rol.
var _loginSplashListo = false;
// _aplicarSesion la deja apuntando a su "retirar la presentación si ya está todo listo". Al terminar la presentación se llama
// por si las descargas acabaron antes: sin esto, la capa del logo se quedaba tapando la app hasta tocarla.
var _ocultarSplashPendiente = null;

// Al terminar la presentación, si el usuario todavía tiene que elegir su rol, se retira la capa del logo para
// que se vea el selector sin tocar nada. Si no hay selector pendiente, la capa se retira sola más adelante
// (_aplicarSesion), cuando ya hay sesión y han bajado los datos.
function _retirarPresentacionSiEligeRol(){
  var selector = document.getElementById('loginRolSel');
  var splash = document.getElementById('splash');
  if (!selector || !splash || selector.style.display !== 'block') return;
  splash.style.pointerEvents = 'none';
  splash.classList.add('fade-out');
  setTimeout(function(){ splash.style.display = 'none'; document.body.style.overflow = ''; }, 600);
}

function _iniciarPresentacionLogin(nombre){
  var nombreKey = (nombre||'').toLowerCase();
  var usuarioActual = localStorage.getItem(DISPOSITIVO_USUARIO_KEY);
  var esUsuarioDistinto = !!(usuarioActual && nombreKey && usuarioActual !== nombreKey);
  var hoy = new Date().toISOString().slice(0,10);
  var ultimaVerificacion = localStorage.getItem(ULTIMA_VERIFICACION_KEY);
  var esPrimerLoginDelDia = ultimaVerificacion !== hoy;
  if (esUsuarioDistinto || esPrimerLoginDelDia) {
    // Usuario distinto, o primer inicio de sesión del día: limpiar antes de sincronizar
    // de fresco, para garantizar que la copia local sea un reflejo exacto de Firestore
    // (Firestore siempre prevalece) antes de permitir que este dispositivo actualice nada
    _limpiarDatosLocalesCompartidos();
    var _msgSync = document.getElementById('splash-sync-msg');
    if (_msgSync) {
      _msgSync.style.display = 'block';
      // Duración exacta de toda la presentación (800 inicial + 7 ciclos × 930 + 560 previo
      // al parpadeo + 6000 del parpadeo/crecimiento final) — el mensaje se ve mientras dure
      // toda la presentación, no solo un instante
      setTimeout(function(){ if (_msgSync) _msgSync.style.display = 'none'; }, 13870);
    }
  } else {
    var _msgSyncOff = document.getElementById('splash-sync-msg');
    if (_msgSyncOff) _msgSyncOff.style.display = 'none';
  }
  if (nombreKey) localStorage.setItem(DISPOSITIVO_USUARIO_KEY, nombreKey);
  localStorage.setItem(ULTIMA_VERIFICACION_KEY, hoy);
  _loginSplashListo = false;
  iniciarSplash(function(){ _loginSplashListo = true; _retirarPresentacionSiEligeRol(); if (_ocultarSplashPendiente) _ocultarSplashPendiente(); });
  _sincronizarAlEntrar();
}

// Sincronizaciones que no dependen del rol final; se lanzan al entrar con PIN y también al recuperar una sesión guardada
function _sincronizarAlEntrar(){
  _sincronizarClientesDesdeFirestore();
  _sincronizarTecnicosDesdeFirestore();
  _sincronizarCatalogoDesdeFirestore();
  _sincronizarAgendaDesdeFirestore();
  _sincronizarEnlacesDesdeFirestore();
  _sincronizarMaterialesFlotantesDesdeFirestore();
  _sincronizarRegistroGlobal();
  _sincronizarContadorIRV();
  _reintentarPartesPendientes();
}

function _loginSinConexionContinuar() {
  // Sin conexión: si el dispositivo tiene datos de OTRO usuario guardados, no se puede
  // cambiar de forma segura (no hay forma de sincronizar de fresco) — bloquear con aviso
  var nombreKey = (_loginPendienteNombre||'').toLowerCase();
  var usuarioActual = localStorage.getItem(DISPOSITIVO_USUARIO_KEY);
  if (usuarioActual && nombreKey && usuarioActual !== nombreKey) {
    var msgEl = document.getElementById('loginMsg');
    if (msgEl) msgEl.textContent = 'Este dispositivo tiene datos de otro usuario guardados. Se necesita conexión para cambiar de usuario de forma segura.';
    return;
  }
  if (nombreKey) localStorage.setItem(DISPOSITIVO_USUARIO_KEY, nombreKey);
  // Ya se sabe con certeza que no hay conexión — solo la presentación local, sin
  // intentar ninguna sincronización de red (que no tiene sentido y solo haría esperar)
  _loginSplashListo = false;
  iniciarSplash(function(){ _loginSplashListo = true; if (_ocultarSplashPendiente) _ocultarSplashPendiente(); });
  _entrarConRol(_loginPendienteNombre, 'tecnico');
}

// Diálogo de confirmación con el estilo propio de la app, en vez del confirm() nativo
// del navegador. Uso: _confirmarApp('mensaje', function(){ ...si acepta... }, function(){ ...si cancela (opcional)... });
var _confirmarAppCallback = null;
var _confirmarAppCallbackNo = null;
function _confirmarApp(mensaje, callback, callbackNo){
  _confirmarAppCallback = callback;
  _confirmarAppCallbackNo = callbackNo||null;
  var msg = document.getElementById('dlgConfirmarMsg'); if (msg) msg.textContent = mensaje;
  var dlg = document.getElementById('dlgConfirmar'); if (dlg) dlg.classList.add('show');
}
function _confirmarAppSi(){
  var dlg = document.getElementById('dlgConfirmar'); if (dlg) dlg.classList.remove('show');
  var cb = _confirmarAppCallback; _confirmarAppCallback = null; _confirmarAppCallbackNo = null;
  if (cb) cb();
}
function _confirmarAppNo(){
  var dlg = document.getElementById('dlgConfirmar'); if (dlg) dlg.classList.remove('show');
  var cb = _confirmarAppCallbackNo; _confirmarAppCallback = null; _confirmarAppCallbackNo = null;
  if (cb) cb();
}

// Se usa cuando se pierde la conexión en pleno uso, estando como admin — cambia
// la sesión actual a técnico directamente, sin pasar por el splash ni intentar sincronizar
// (ya se sabe con certeza que no hay conexión, así que no tiene sentido intentarlo)
function _continuarComoTecnicoPorDesconexion(){
  if (window._sesion) {
    window._sesion.rol = 'tecnico';
    var sub = document.getElementById('hdr-sub');
    if (sub) sub.textContent = window._sesion.nombre + ' · tecnico';
    var icCat = document.getElementById('iconCatalogo');
    if (icCat) icCat.style.display = 'none';
    var btnRol = document.getElementById('btnCambiarRol');
    if (btnRol) btnRol.style.display = 'none'; // reaparece solo al confirmar que vuelve la conexión
  }
  var dlg = document.getElementById('dlgSinConexionAdmin');
  if (dlg) dlg.classList.remove('show');
  goTo('w-clientes');
}

function _mostrarSinConexion(nombre, rol) {
  _loginPendienteNombre = nombre;
  _loginPendienteRol = rol;
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('loginRolSel').style.display = 'none';
  document.getElementById('loginSinConexion').style.display = 'block';
}

// ===== ACCESO (nombre + PIN) =====
// El PIN se comprueba en el servidor (función "entrar"): la app no lo lee de Firestore ni lo guarda.
// Tras entrar bien con internet se guarda en este dispositivo solo una huella del PIN (PBKDF2 con sal), para
// poder volver a entrar sin cobertura. Esa entrada sin internet solo vale si Firebase conserva la sesión de
// ese mismo usuario en el dispositivo (ver _entrarSinConexion): sin sesión de Firebase no se podrían subir datos.
var ACCESO_LOCAL_KEY = 'irv_acceso_local';

// Mismo criterio que el servidor y que el resto de la app: "Manuel Rivero" -> "manuel_rivero"
function _idAcceso(nombre){ return nombre.trim().toLowerCase().replace(/ /g,'_'); }

// ===== ÚLTIMO USUARIO DE ESTE DISPOSITIVO =====
// Tras entrar bien se guarda solo el nombre (nunca el PIN) para que el acceso salga con el nombre ya puesto y solo haga
// falta el PIN (el cursor no se mueve solo: el usuario toca el PIN cuando quiere). Si se borra o se cambia una letra del nombre, se limpia todo (nombre y PIN) para escribir el de otra persona.
var ULTIMO_USUARIO_KEY = 'irv_ultimo_usuario';
var _loginNombrePuesto = ''; // el nombre que se puso solo; vacío cuando el campo ya lo ha tocado el usuario

function _guardarUltimoUsuario(nombre){
  try { localStorage.setItem(ULTIMO_USUARIO_KEY, nombre); } catch(e) { _fallo('_guardarUltimoUsuario')(e); }
}

function _prepararNombreLogin(){
  var campo = document.getElementById('loginNombre'), pin = document.getElementById('loginPin');
  if (!campo || !pin) return;
  var guardado = '';
  try { guardado = localStorage.getItem(ULTIMO_USUARIO_KEY) || ''; } catch(e) { _fallo('_prepararNombreLogin')(e); }
  if (!guardado) return;
  campo.value = guardado;
  _loginNombrePuesto = guardado;
}

function _loginNombreEditado(ev){
  if (!_loginNombrePuesto) return;
  _loginNombrePuesto = '';
  var campo = document.getElementById('loginNombre');
  // Si lo que hizo fue escribir una letra, esa letra es el principio del nombre nuevo; borrar o pegar deja todo vacío
  var tipo = (ev && ev.inputType) || '';
  campo.value = (tipo.indexOf('insert') === 0 && tipo !== 'insertFromPaste' && ev.data) ? ev.data : '';
  document.getElementById('loginPin').value = '';
  document.getElementById('loginMsg').textContent = '';
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _prepararNombreLogin); else _prepararNombreLogin();

function _bytesAHex(bytes){
  return Array.prototype.map.call(bytes, function(b){ return ('0'+b.toString(16)).slice(-2); }).join('');
}

function _huellaPin(pin, salHex){
  var sal = new Uint8Array(salHex.match(/../g).map(function(h){ return parseInt(h, 16); }));
  return crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']).then(function(clave){
    return crypto.subtle.deriveBits({ name:'PBKDF2', salt:sal, iterations:100000, hash:'SHA-256' }, clave, 256);
  }).then(function(bits){ return _bytesAHex(new Uint8Array(bits)); });
}

function _leerAccesosLocales(){
  try { return JSON.parse(localStorage.getItem(ACCESO_LOCAL_KEY) || '{}'); }
  catch(e) { _fallo('_leerAccesosLocales')(e); return {}; }
}

function _guardarAccesoLocal(id, nombre, pin, roles){
  try {
    var salHex = _bytesAHex(crypto.getRandomValues(new Uint8Array(16)));
    _huellaPin(pin, salHex).then(function(hash){
      var todos = _leerAccesosLocales();
      todos[id] = { nombre: nombre, sal: salHex, hash: hash, roles: roles };
      localStorage.setItem(ACCESO_LOCAL_KEY, JSON.stringify(todos));
    }).catch(_fallo('_guardarAccesoLocal #1'));
  } catch(e) { _fallo('_guardarAccesoLocal #2')(e); }
}

function _olvidarAccesoLocal(id){
  var todos = _leerAccesosLocales();
  delete todos[id];
  try { localStorage.setItem(ACCESO_LOCAL_KEY, JSON.stringify(todos)); } catch(e) { _fallo('_olvidarAccesoLocal')(e); }
}

// Llama a la función "entrar". Siempre resuelve { estado, datos }; estado es 'ok', uno de los errores del
// servidor ('credenciales', 'bloqueado', 'desactivado', 'formato', 'servidor') o 'sinConexion'.
function _llamarEntrar(nombre, pin){
  var control = new AbortController();
  var timer = setTimeout(function(){ control.abort(); }, 10000);
  return fetch(URL_ENTRAR, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: nombre, pin: pin }), signal: control.signal
  }).then(function(r){
    return r.json();
  }).then(function(datos){
    clearTimeout(timer);
    return datos.ok ? { estado: 'ok', datos: datos } : { estado: datos.error || 'servidor', datos: datos };
  }).catch(function(){
    clearTimeout(timer);
    return { estado: 'sinConexion' };
  });
}

function _iniciarSesion() {
  var nombre = document.getElementById('loginNombre').value.trim();
  var pin = document.getElementById('loginPin').value.trim();
  var msgEl = document.getElementById('loginMsg');
  msgEl.textContent = '';
  if (!nombre || pin.length !== 4) { msgEl.textContent = 'Introduce nombre y PIN de 4 digitos.'; return; }

  msgEl.textContent = 'Verificando...';
  _llamarEntrar(nombre, pin).then(function(r) {
    if (r.estado === 'ok') { _entrarConPermiso(nombre, pin, r.datos, msgEl); return; }
    if (r.estado === 'sinConexion') { _entrarSinConexion(nombre, pin, msgEl); return; }
    if (r.estado === 'credenciales') { msgEl.textContent = 'PIN incorrecto o usuario no encontrado.'; return; }
    if (r.estado === 'bloqueado') { msgEl.textContent = 'Demasiados intentos fallidos. Espera ' + r.datos.minutos + ' min e inténtalo de nuevo.'; return; }
    if (r.estado === 'desactivado') {
      msgEl.textContent = 'Acceso desactivado.';
      _olvidarAccesoLocal(_idAcceso(nombre));
      _limpiarDatosLocalesCompartidos();
      return;
    }
    msgEl.textContent = 'Error del servidor. Inténtalo de nuevo en un momento.';
  });
}

// PIN correcto: se abre la sesión de Firebase con el permiso que devolvió "entrar" y se sigue como siempre
function _entrarConPermiso(nombre, pin, datos, msgEl) {
  firebase.auth().signInWithCustomToken(datos.token).then(function() {
    var nombreFicha = datos.nombre || nombre;
    _guardarAccesoLocal(_idAcceso(nombre), nombreFicha, pin, datos.roles);
    _guardarUltimoUsuario(nombreFicha);
    _iniciarPresentacionLogin(nombreFicha);
    if (datos.roles.length > 1) { _mostrarSelectorRol(nombreFicha, datos.roles); }
    else { _entrarConRol(nombreFicha, datos.roles[0]); }
  }).catch(function() { msgEl.textContent = 'Error de conexion.'; });
}

// Sin internet: se acepta el PIN contra la huella guardada, y solo si Firebase conserva la sesión de ese usuario.
// Un admin sin conexión entra únicamente como técnico (mismo criterio que antes).
function _entrarSinConexion(nombre, pin, msgEl) {
  var id = _idAcceso(nombre);
  var local = _leerAccesosLocales()[id];
  var usuarioFirebase = firebase.auth().currentUser;
  if (!local || !usuarioFirebase || usuarioFirebase.uid !== id) {
    msgEl.textContent = 'Sin conexion. No hay datos guardados en este dispositivo para "'+nombre+'" — conectate a internet para verificar el acceso la primera vez.';
    return;
  }
  _huellaPin(pin, local.sal).then(function(hash) {
    if (hash !== local.hash) { msgEl.textContent = 'PIN incorrecto.'; return; }
    _guardarUltimoUsuario(local.nombre);
    if (local.roles.indexOf('admin') >= 0) {
      msgEl.textContent = '';
      _mostrarSinConexion(local.nombre, 'tecnico');
    } else {
      _iniciarPresentacionLogin(local.nombre);
      _entrarConRol(local.nombre, 'tecnico');
    }
  }).catch(function() { msgEl.textContent = 'Sin conexion y no se puede verificar el acceso en este dispositivo.'; });
}

function _mostrarSelectorRol(nombre, roles) {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('loginRolSel').style.display = 'block';
  document.getElementById('loginRolNombre').textContent = nombre;
  var btns = document.getElementById('loginRolBtns');
  btns.innerHTML = '';
  var labels = { tecnico: '🔧 Técnico', admin: '⚙️ Administrador' };
  roles.forEach(function(r) {
    var b = document.createElement('button');
    b.className = 'btn btn-p btn-full';
    b.style.marginBottom = '8px';
    b.textContent = labels[r] || r;
    b.onclick = function() { _entrarConRol(nombre, r, true); };
    btns.appendChild(b);
  });
}

function _entrarConRol(nombre, rol, multiRol) {
  _aplicarSesion(nombre, rol, !!multiRol);
  goTo('w-clientes');
}

function _aplicarSesion(nombre, rol, multiRol) {
  window._sesion = { nombre: nombre, rol: rol, multiRol: !!multiRol };
  try { localStorage.setItem('irv_sesion', JSON.stringify(window._sesion)); } catch(e) { _fallo('_aplicarSesion')(e); }
  document.getElementById('w-login').style.display = 'none';
  document.querySelector('.app').style.display = 'block';
  var sub = document.getElementById('hdr-sub');
  if (sub) sub.textContent = nombre + ' · ' + rol;
  var icCat = document.getElementById('iconCatalogo');
  if (icCat) icCat.style.display = rol === 'admin' ? '' : 'none';
  var icBackups = document.getElementById('iconBackups');
  if (icBackups) icBackups.style.display = rol === 'admin' ? '' : 'none';
  var icPapelera = document.getElementById('iconPapelera');
  if (icPapelera) icPapelera.style.display = rol === 'admin' ? '' : 'none';
  setTimeout(_mostrarIconoUsuarios, 0);
  if (rol === 'admin') _comprobarBackupDiario();

  // La presentación y las sincronizaciones que no dependen del rol ya se dispararon antes
  // (_iniciarPresentacionLogin, en el momento en que el PIN se confirmó correcto). Aquí solo
  // queda esperar a que termine la presentación (bandera global — puede que ya haya terminado,
  // si el usuario tardó en elegir su rol) y la sincronización de partes/incidencias, que sí
  // depende del rol ya decidido. Ninguna de las dos corta a la otra.
  // La pantalla de "Sincronizando" solo se oculta cuando las tres descargas que
  // alimentan los badges (partes, registro global e incidencias) han terminado —
  // no basta con que termine solo la de partes, porque entonces se revela la app
  // con los badges todavía incompletos.
  var _syncPartesTerminada = false, _syncRegistroTerminado = false, _syncEstadosTerminado = false;
  function _todoSincronizado(){ return _syncPartesTerminada && _syncRegistroTerminado && _syncEstadosTerminado; }
  function _ocultarSplashSiListo() {
    if (!_loginSplashListo || !_todoSincronizado()) return;
    var sp = document.getElementById('splash');
    if (sp) {
      sp.classList.add('fade-out');
      setTimeout(function(){ if(sp.parentNode) sp.parentNode.removeChild(sp); }, 600);
    }
    document.body.style.overflow = '';
    document.body.style.height = '';
    renderClientes();
    refreshCounts();
    renderAsgTecnico();
    renderAsgAdmin();
    renderHistTecBtns();
    catActualizarBadge();
  }
  _ocultarSplashPendiente = _ocultarSplashSiListo;
  var _syncPartesYaResuelto = false;
  function _ocultarOverlay() {
    if (_syncPartesYaResuelto) return; // ya se resolvió (a tiempo, o por la salvaguarda) — no repetir
    _syncPartesYaResuelto = true;
    _syncPartesTerminada = true;
    _syncRegistroTerminado = true;
    _syncEstadosTerminado = true;
    _ocultarSplashSiListo();
  }
  // Salvaguarda: si Firestore no responde en 10s (sin conexión, o una consulta colgada),
  // entrar igualmente en vez de quedarse esperando para siempre
  setTimeout(_ocultarOverlay, 10000);

  // La salvaguarda de 10s puede disparar _ocultarOverlay() antes de que las descargas
  // reales terminen (mucho histórico, mala señal) — su guarda interna evita ocultar la
  // pantalla de carga dos veces, pero eso también descartaba silenciosamente el
  // repintado del badge cuando la descarga real llegaba después. Aquí se separan:
  // _ocultarOverlay() sigue protegido para no repetirse, pero el repintado de cada
  // descarga se hace siempre que esa descarga termine de verdad, a tiempo o tarde.
  function _partesListas(){ _syncPartesTerminada = true; _ocultarOverlay(); renderClientes(); refreshCounts(); renderAsgTecnico(); }
  function _registroListo(){ _syncRegistroTerminado = true; _ocultarSplashSiListo(); }
  function _estadosListos(){ _syncEstadosTerminado = true; _ocultarSplashSiListo(); }

  if (rol === 'admin') {
    _sincronizarEstadosIncidencias(null, _estadosListos);
    _sincronizarRegistroGlobal(_registroListo);
    _sincronizarPartesDesdeFirestore(null, _partesListas);
  }
  else if (rol === 'tecnico') {
    _sincronizarEstadosIncidencias(nombre, _estadosListos);
    _sincronizarRegistroGlobal(_registroListo);
    _sincronizarPartesDesdeFirestore(nombre, _partesListas);
  }
  else { _ocultarOverlay(); }
  _iniciarActualizacionPeriodica();
}

var _actualizacionPeriodicaIniciada = false;
function _iniciarActualizacionPeriodica(){
  if(_actualizacionPeriodicaIniciada) return; // solo un ciclo activo, aunque se cambie de rol o se recargue varias veces
  _actualizacionPeriodicaIniciada = true;
  // Chequeo de versión del código: gratis (solo lee el index.html estático de GitHub Pages,
  // no consulta Firestore), así que puede ir mucho más seguido sin coste real.
  setInterval(function(){
    if(document.visibilityState !== 'visible') return;
    _comprobarVersionNueva();
  }, 15000); // cada 15 segundos

  // Sincronización completa — todo lo que la app sincroniza al entrar (clientes, técnicos,
  // catálogo, agenda, registro global, partes, estados de incidencias) se repite aquí
  // también, para que nada se quede desactualizado mientras la app sigue abierta.
  function _sincronizacionCompleta(){
    if(!window._sesion) return;
    var _s2 = window._sesion;
    // Comprobar si el usuario actual sigue activo — las reglas de Firestore dejan de dejarle leer en cuanto
    // lo desactivan (ni siquiera su propia ficha), así que ese rechazo es la señal: si lo desactivaron
    // mientras estaba dentro de la app, se borran sus datos locales y se le saca de la sesión
    if (typeof _db !== 'undefined' && _db) {
      var _docIdActivo = _s2.nombre.toLowerCase().replace(/ /g,'_');
      _db.collection('usuario').doc(_docIdActivo).get().catch(function(e){
        if (e && e.code === 'permission-denied') {
          // Se cierra también la sesión de Firebase: si se conservara, el usuario desactivado podría volver a entrar sin conexión
          _limpiarDatosLocalesCompartidos();
          firebase.auth().signOut().then(cerrarSesion, cerrarSesion);
        }
        else _fallo('_iniciarActualizacionPeriodica usuario.get')(e);
      });
    }
    _sincronizarClientesDesdeFirestore();
    _sincronizarTecnicosDesdeFirestore();
    _sincronizarCatalogoDesdeFirestore(); // ya se autolimita a admin por dentro
    _sincronizarAgendaDesdeFirestore();
    _sincronizarEnlacesDesdeFirestore();
    _sincronizarMaterialesFlotantesDesdeFirestore();
    _sincronizarRegistroGlobal();
    _sincronizarContadorIRV();
    if (_s2.rol === 'admin') {
      _sincronizarEstadosIncidencias();
      _sincronizarPartesDesdeFirestore(null);
    } else if (_s2.rol === 'tecnico') {
      _sincronizarEstadosIncidencias(_s2.nombre);
      _sincronizarPartesDesdeFirestore(_s2.nombre);
    }
    renderAsgTecnico();
    renderAsgAdmin();
    catActualizarBadge();
    // Comprobación de conexión, solo si es relevante (admin actual, o técnico
    // con más de un rol disponible)
    if (_s2.multiRol || _s2.rol === 'admin') {
      _verificarConexionFirestore(function(hayConexion){
        if (!hayConexion) {
          if (_s2.rol === 'admin') {
            var dlg = document.getElementById('dlgSinConexionAdmin');
            if (dlg) dlg.classList.add('show');
          }
          var btnRol = document.getElementById('btnCambiarRol');
          if (btnRol && _s2.rol !== 'admin') btnRol.style.display = 'none';
        } else {
          if (_s2.multiRol && _s2.rol !== 'admin') {
            var btnRol2 = document.getElementById('btnCambiarRol');
            if (btnRol2) { btnRol2.style.display = ''; btnRol2.textContent = '⚙️ Admin'; }
          }
        }
      });
    }
  }

  // El ciclo solo cuenta tiempo mientras la app está realmente visible en uso — no un
  // setTimeout ciego que sigue corriendo en segundo plano. Respeta el tiempo por rol:
  // 1 minuto para admin conectado (lo necesitan más, detección rápida), 4 minutos
  // para técnico (apenas les afecta). Se recalcula en cada ciclo por si el rol cambia en
  // plena sesión.
  var _timerSincronizacion = null;
  function _programarSiguienteSincronizacion(){
    if (_timerSincronizacion) clearTimeout(_timerSincronizacion);
    var _s = window._sesion;
    var _esAdminAhora = _s && _s.rol === 'admin';
    var espera = _esAdminAhora ? 60000 : 240000;
    _timerSincronizacion = setTimeout(function(){
      if(document.visibilityState === 'visible' && window._sesion){
        _sincronizacionCompleta();
      }
      _programarSiguienteSincronizacion(); // reprogramar con la espera correspondiente al rol de ese momento
    }, espera);
  }

  // Al volver a la app (dejó de estar oculta) — sincronizar de inmediato y reiniciar el
  // conteo desde ese momento, en vez de disparar en cuanto se cumpla el tiempo que ya
  // llevaba corriendo mientras estaba fuera. Al ocultarse — cancelar el temporizador
  // pendiente, así no cuenta tiempo mientras no se está usando la app.
  document.addEventListener('visibilitychange', function(){
    if (document.visibilityState === 'visible') {
      if (window._sesion) _sincronizacionCompleta();
      _programarSiguienteSincronizacion();
    } else {
      if (_timerSincronizacion) { clearTimeout(_timerSincronizacion); _timerSincronizacion = null; }
    }
  });

  // Arranque inicial: si la app ya está visible al llamar esta función, programa el
  // primer ciclo normal (la sincronización de entrada ya la hizo _aplicarSesion aparte)
  if (document.visibilityState === 'visible') _programarSiguienteSincronizacion();
}

function _comprobarVersionNueva(){
  var urlSinCache = location.href.split('#')[0].split('?')[0] + '?_cb=' + Date.now();
  fetch(urlSinCache, {cache:'no-store'}).then(function(r){ return r.text(); }).then(function(t){
    var m = t.match(/APP_BUILD_ID\s*=\s*'([^']+)'/);
    if(m && m[1] !== APP_BUILD_ID){
      if(window._sesion){
        return; // hay una sesión activa — nunca interrumpir, se reintenta en el próximo ciclo hasta que no haya nadie logueado
      }
      Promise.all([
        caches.keys().then(function(keys){ return Promise.all(keys.map(function(k){ return caches.delete(k); })); }),
        navigator.serviceWorker.getRegistrations().then(function(regs){ return Promise.all(regs.map(function(r){ return r.unregister(); })); })
      ]).then(function(){ location.reload(true); }).catch(function(){ location.reload(true); });
    }
  }).catch(function(){}); // sin conexión — no pasa nada, se comprobará en el siguiente ciclo
}

// Registro global de incidencias por pedido — funciona offline una vez sincronizado.
// A diferencia de pm_incidencias_estados (que para técnico solo trae las suyas),
// este trae TODAS las incidencias (ligero: solo pedido/centro/tecnicoPrincipal/estado/clienteId),
// para poder bloquear localmente pedidos que ya son de otro técnico, sin depender de internet en el momento.
function _sincronizarRegistroGlobal(callback){
  if (typeof _db === 'undefined' || !_db) { if(callback) callback(); return; }
  _db.collection('incidencias').get().then(function(snap){
    var reg = {};
    snap.forEach(function(doc){
      var d = doc.data();
      if(!d.pedido) return;
      var key = (d.clienteId||'mercadona')+'||'+d.pedido;
      reg[key] = {
        pedido: d.pedido,
        tecnicoPrincipal: d.tecnicoPrincipal||'',
        estado: d.estado||'pendiente',
        centro: d.centro||'',
        tienda: d.tienda||'',
        clienteId: d.clienteId||'mercadona',
        id: doc.id
      };
    });
    localStorage.setItem('pm_registro_global', JSON.stringify(reg));
    if (typeof renderClientes === 'function') renderClientes();
    if (typeof renderHistTecBtns === 'function') renderHistTecBtns();
    if(callback) callback();
  }).catch(function(){ if(callback) callback(); });
  // Números de parte ya usados (por cualquier técnico) — mismo ciclo de sincronización,
  // sin crear un temporizador ni una función de sincronización aparte.
  _db.collection('partes').get().then(function(snap){
    var usados = {};
    snap.forEach(function(doc){
      var d = doc.data();
      if(d.numParte) usados[String(d.numParte).trim()] = true;
    });
    localStorage.setItem('pm_numpartes_global', JSON.stringify(usados));
  }).catch(_fallo('_sincronizarRegistroGlobal partes.get'));
}
function _registroGlobal(pedido, clienteId){
  if(!pedido) return null;
  try {
    var reg = JSON.parse(localStorage.getItem('pm_registro_global')||'{}');
    return reg[(clienteId||'mercadona')+'||'+pedido] || null;
  } catch(e){ return null; }
}
function _numParteUsadoLocal(numParte){
  if(!numParte) return false;
  try {
    var usados = JSON.parse(localStorage.getItem('pm_numpartes_global')||'{}');
    return !!usados[String(numParte).trim()];
  } catch(e){ return false; }
}

function _sincronizarEstadosIncidencias(soloTecnico, callback) {
  if (typeof _db === 'undefined' || !_db) { if(callback) callback(); return; }
  var query = _db.collection('incidencias');
  if (soloTecnico) {
    var _tec = getTecnicos().find(function(t){ return t.nombre.toLowerCase() === soloTecnico.toLowerCase(); });
    var nom = _tec ? _tec.nombre : soloTecnico;
    query = query.where('tecnicoPrincipal','==',nom);
  }
  query.get().then(function(snap){
    var estados = {};
    snap.forEach(function(doc){
      var d = doc.data();
      var k = (d.pedido||'') + '||' + (d.centro||'');
      estados[k] = d.estado || 'en-ejecucion';
    });
    localStorage.setItem('pm_incidencias_estados', JSON.stringify(estados));
    // Refrescar los badges de clientes también aquí, por si esta sincronización termina
    // después de que la app ya se haya revelado — evita que se queden con datos vacíos
    // o viejos justo tras la limpieza diaria/de usuario
    if (typeof renderClientes === 'function') renderClientes();
    if(callback) callback();
  }).catch(function(){ if(callback) callback(); });
}

function _sincronizarPartesDesdeFirestore(soloTecnico, callback) {
  if (typeof _db === 'undefined' || !_db) { if(callback) callback(); return; }

  function _procesarSnap(snap, h) {
    var nuevos = 0;
    snap.forEach(function(doc){
      var d = doc.data();
      var idx = h.findIndex(function(x){ return x.fecha===d.fecha && x.pedido===d.pedido && x.centro===d.centro; });
      if (idx >= 0) {
        // Siempre actualizar el estado desde Firestore (puede cambiar al reabrir sin actualizar fechaModificacion)
        if (d.estado && d.estado !== h[idx].estado) { h[idx].estado = d.estado; }
        if ((d.fechaModificacion||0) > (h[idx]._fm||0)) { d._fm = d.fechaModificacion; h[idx] = d; }
      } else {
        d._fm = d.fechaModificacion;
        h.push(d); nuevos++;
      }
    });
    return nuevos;
  }

  if (soloTecnico) {
    // Usar nombre exacto del catálogo para la consulta (case-sensitive en Firestore)
    var _tec = getTecnicos().find(function(t){ return t.nombre.toLowerCase() === soloTecnico.toLowerCase(); });
    if (_tec) soloTecnico = _tec.nombre;
    // Descargar partes como principal Y como ayudante
    var h = getH();
    var pendientes = 2;
    function _done() {
      pendientes--;
      if (pendientes === 0) {
        setH(h);
        if(callback) callback(); else { renderClientes(); refreshCounts(); renderAsgTecnico(); }
      }
    }
    _db.collection('partes').where('tecnicoPrincipal','==',soloTecnico).get().then(function(snap){
      _procesarSnap(snap, h); _done();
    }).catch(function(){ _done(); });
    _db.collection('partes').where('tecnicos','array-contains',soloTecnico).get().then(function(snap){
      _procesarSnap(snap, h); _done();
    }).catch(function(){ _done(); });
  } else {
    _db.collection('partes').get().then(function(snap){
      var h = getH();
      _procesarSnap(snap, h);
      setH(h);
      if(callback) callback(); else { renderClientes(); refreshCounts(); renderAsgTecnico(); }
    }).catch(function(){ if(callback) callback(); });
  }
}

// (definición de _esAdmin movida arriba, junto a renderClientes)

// ---- MÓDULO INCIDENCIAS ----
var _asgJob = '';
var _asgTec = '';

function leerAsg(){
  var t=$('asgRaw').value; if(!t.trim()){ $('asgMsg').textContent='Pega el texto primero.'; return; }
  var pedido=cap(/PEDIDO DE SERVICIO\s+N[º°ª]?[:\s]+(\d+)/i,t)||cap(/N[º°ª]\s*ORDEN[:\s]+(\S+)/i,t)||cap(/(\d{6,})/,t);
  var centro=cap(/N[º°ª]?\s*de\s*Centro[:\s]+(\d+)/i,t)||cap(/Centro[:\s-]+(\d+)/i,t);
  var denom=cap(/(?:TIENDA|Denominaci[oó]n)[:\s]+([\s\S]+?)(?=\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ° ]+:|\n|$)/i,t);
  if(!centro&&denom){ var cm=denom.trim().match(/(\d{3,5})\s*$/); if(cm) centro=cm[1]; }
  var tel=cap(/TEL[EÉ]FONO[^:]*[:\s]+(\+?\d[\d\s\-]{6,})/i,t);
  var dir=cap(/DIRECCI[OÓ]N[:\s]+([\s\S]+?)(?=\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ° ]+:|\n|$)/i,t);
  if(dir) dir = dir.replace(/\s+Persona\s+de\s*$/i,'').trim();
  var jobKeys=['Climatización','Conductos','Obras'];
  var job=null;
  var clasif=cap(/Clasificaci[oó]n[:\s]+([^\n]+)/i,t);
  if(clasif){
    for(var ji=0;ji<jobKeys.length;ji++){ if(clasif.toLowerCase().indexOf(jobKeys[ji].toLowerCase())>=0){ job=jobKeys[ji]; break; } }
  }
  if(!job){
    for(var jk=0;jk<jobKeys.length;jk++){ if(t.toLowerCase().indexOf(jobKeys[jk].toLowerCase())>=0){ job=jobKeys[jk]; break; } }
  }
  var desc=cap(/DESCRIPCI[OÓ]N\s*\n?([^\n]+(?:\n(?!\s*[A-ZÁÉÍÓÚÑ ]{4,}[:\n])[^\n]+)*)/,t);
  var n=0;
  if(pedido){ $('asgPedido').value=pedido.trim(); n++; }
  if(centro){ $('asgCentro').value=centro.trim(); n++; buscarKmAsg(centro.trim()); }
  // Si el centro es conocido, buscarKmAsg() ya dejó tienda/dir/tel fijos con el dato correcto
  // de la agenda — el texto pegado nunca debe pisarlos, solo se usa para centros nuevos.
  if(denom && !$('asgTienda').readOnly){
    var nombreTienda='Mercadona '+denom.trim()+(centro?' '+centro.trim():'');
    $('asgTienda').value=nombreTienda; n++;
  }
  if(dir && !$('asgDir').readOnly){ $('asgDir').value=dir.trim(); n++; }
  if(tel && !$('asgTel').readOnly){ $('asgTel').value=tel.trim(); n++; }
  if(job){
    var jobT=job.trim();
    document.querySelectorAll('#asgJobTgl button').forEach(function(btn){
      if(btn.textContent.trim().toLowerCase()===jobT.toLowerCase()){ btn.click(); n++; }
    });
  }
  if(desc){ $('asgDescripcion').value=desc.trim(); n++; }
  $('asgMsg').textContent = n?n+' campo(s) autocompletados.':'No se encontraron datos.';
}

// Si el centro ya existe en la agenda, tienda/dirección/teléfono/km/despl. se toman SIEMPRE
// de ahí y quedan fijos (ni el texto pegado ni lo escrito a mano puede pisarlos) — si hay que
// corregir esos datos, se hace desde Catálogo > Agenda, no desde la asignación. Solo si el
// centro es nuevo (no está en la agenda) quedan libres para rellenarlos a mano.
function buscarKmAsg(centro){
  centro=(centro||'').trim();
  if(!curCliente) return;
  var camposAgenda=['asgTienda','asgDir','asgTel','asgKm','asgTr'];
  var ag=centro?agendaBuscar(curCliente.id,centro):null;
  if(ag){
    $('asgTienda').value=ag.tienda||'';
    $('asgDir').value=ag.dir||'';
    $('asgTel').value=ag.tel||'';
    $('asgKm').value=ag.km||'';
    $('asgTr').value=ag.tr||'';
    camposAgenda.forEach(function(id){
      var el=$(id); if(el){ el.readOnly=true; el.style.background='var(--surface2)'; el.style.color='var(--text2)'; }
    });
  } else {
    camposAgenda.forEach(function(id){
      var el=$(id); if(el){ el.readOnly=false; el.style.background=''; el.style.color=''; }
    });
  }
}

function abrirAsignar() {
  if (!curCliente) return;
  _asgJob = ''; _asgTec = '';
  $('asgRaw').value='';
  $('asgPedido').value=''; $('asgCentro').value=''; $('asgTienda').value=''; $('asgDir').value=''; $('asgTel').value=''; $('asgKm').value=''; $('asgTr').value=''; $('asgDescripcion').value='';
  ['asgTienda','asgDir','asgTel','asgKm','asgTr'].forEach(function(id){
    var el=$(id); if(el){ el.readOnly=false; el.style.background=''; el.style.color=''; }
  });
  $('asgMsg').textContent='';
  var esMerc = curCliente.tipo==='mercadona';
  $('asgLabelPedido').innerHTML = esMerc ? 'N&ordm; orden <span class="req">*</span>' : 'N&ordm; orden / referencia';
  $('asgFieldCentro').style.display = esMerc ? 'block' : 'none';
  var jobs = curCliente.jobs||['Conductos','Climatización','Obras'];
  $('asgJobTgl').innerHTML = jobs.map(function(j){
    return '<button onclick="setAsgJob(\''+j+'\',this)">'+j+'</button>';
  }).join('');
  var tecs = _tecnicosAsignables();
  $('asgTecTgl').innerHTML = tecs.length ? tecs.map(function(t){
    return '<button onclick="setAsgTec(\''+t.nombre.replace(/\'/g,"\\'")+'\',this)">'+t.nombre+'</button>';
  }).join('') : '<div style="color:var(--text2);font-size:.82rem;padding:6px;">No hay técnicos activos en el catálogo.</div>';
  goTo('w-asignar');
  renderAsgLista();
}

function setAsgJob(j, el) { _asgJob = j; document.querySelectorAll('#asgJobTgl button').forEach(function(b){b.classList.remove('active');}); el.classList.add('active'); }
function setAsgTec(t, el) { _asgTec = t; document.querySelectorAll('#asgTecTgl button').forEach(function(b){b.classList.remove('active');}); el.classList.add('active'); }

function _irAlCampo(id){
  var el=$(id);
  if(el){ el.scrollIntoView({behavior:'smooth',block:'center'}); el.focus(); }
}

function guardarAsignacion() {
  var tienda=$('asgTienda').value.trim(), dir=$('asgDir').value.trim(), tel=$('asgTel').value.trim();
  var pedido=$('asgPedido').value.trim();
  if (!tienda) { showMsg('asgMsg','Falta: Tienda.','error'); _irAlCampo('asgTienda'); return; }
  if (!dir) { showMsg('asgMsg','Falta: Dirección.','error'); _irAlCampo('asgDir'); return; }
  if (!tel) { showMsg('asgMsg','Falta: Teléfono.','error'); _irAlCampo('asgTel'); return; }
  if (!_asgJob) { showMsg('asgMsg','Falta: Tipo de trabajo (toca uno de los botones).','error'); _irAlCampo('asgJobTgl'); return; }
  if (!_asgTec) { showMsg('asgMsg','Falta: Técnico principal (toca uno de los botones).','error'); _irAlCampo('asgTecTgl'); return; }
  if (!$('asgDescripcion').value.trim()) { showMsg('asgMsg','Falta: Descripción de lo que hay que hacer.','error'); _irAlCampo('asgDescripcion'); return; }

  function _guardar(refLegado){
    var data = {
      clienteId: curCliente.id,
      pedido: pedido,
      centro: $('asgCentro').value.trim(),
      tienda: tienda, dir: dir, tel: tel, job: _asgJob,
      km: $('asgKm').value.trim(), tr: $('asgTr').value.trim(),
      descripcion: $('asgDescripcion').value.trim(),
      tecnicoPrincipal: _asgTec,
      creadoPor: window._sesion.nombre,
      estado: 'pendiente',
      vista: false,
      fechaCreacion: Date.now()
    };
    Object.assign(data, _marcaModificacion('Asignación creada'));
    // ID fijo (cliente+centro+pedido) cuando hay pedido — igual que _actualizarIncidenciaPorOrden,
    // evita que una asignación pueda acabar duplicada en dos documentos paralelos. Si ya existía
    // una incidencia antigua (terminada, con ID aleatorio) para este mismo pedido, se reutiliza
    // ese documento en vez de crear uno nuevo en paralelo. Sin pedido no hay clave estable
    // posible, así que se mantiene el ID aleatorio de siempre en ese caso.
    var _guardarPromise = refLegado ? refLegado.set(data)
      : pedido ? _db.collection('incidencias').doc(incidenciaId(data.centro, pedido)).set(data)
      : _db.collection('incidencias').add(data);
    _guardarPromise.then(function(){
      showMsg('asgMsg','✓ Incidencia asignada.','success');
      _subirAgendaEntry(data.clienteId, data.centro, data.tienda, data.dir, data.tel, data.km, data.tr);
      $('asgPedido').value=''; $('asgCentro').value=''; $('asgTienda').value=''; $('asgDir').value=''; $('asgTel').value=''; $('asgKm').value=''; $('asgTr').value=''; $('asgDescripcion').value='';
      _asgJob=''; _asgTec='';
      document.querySelectorAll('#asgJobTgl button, #asgTecTgl button').forEach(function(b){b.classList.remove('active');});
      renderAsgLista();
    }).catch(function(){ showMsg('asgMsg','Error al guardar.','error'); });
  }

  // Verificar si ya existe una incidencia pendiente/en-ejecución con el mismo nº de orden
  if (pedido) {
    _db.collection('incidencias').where('clienteId','==',curCliente.id).where('pedido','==',pedido).get().then(function(snap){
      var existente=null, refExistenteTerminada=null;
      snap.forEach(function(doc){ var d=doc.data(); if(d.estado!=='terminado') existente=d; else refExistenteTerminada=doc.ref; });
      if (existente) {
        showMsg('asgMsg','⚠ Esta orden ya está asignada a '+existente.tecnicoPrincipal+'.','error');
      } else {
        _guardar(refExistenteTerminada);
      }
    }).catch(function(){ _guardar(null); });
  } else {
    _guardar(null);
  }
}

// Técnicos a los que se puede asignar una incidencia: activos, con PIN y que llenan partes. Quien no tiene "Llenar parte" marcado
// en el catálogo solo ve Estadísticas y Registro de horario, así que no recibe incidencias.
function _tecnicosAsignables(){
  return getTecnicos().filter(function(t){ return t.activo !== false && t.tienePin && t.principal !== false; });
}

var _asgIncidenciasPorTec = {};
function renderAsgLista() {
  var el = $('asgLista'); if (!el || !curCliente) return;
  el.innerHTML = '<div style="color:var(--text2);font-size:.82rem;">Cargando...</div>';
  _consultarIncidenciasAbiertas(curCliente.id).then(function(snap){
    var b=$('asgBadge'); if(b){ b.textContent=snap.size; b.style.display=snap.size>0?'block':'none'; }
    _asgIncidenciasPorTec = {};
    snap.forEach(function(doc){
      var d = Object.assign({id: doc.id}, doc.data());
      var nom = d.tecnicoPrincipal || '(sin asignar)';
      if(!_asgIncidenciasPorTec[nom]) _asgIncidenciasPorTec[nom]=[];
      _asgIncidenciasPorTec[nom].push(d);
    });
    // No salen los técnicos sin "Llenar parte" (no reciben incidencias) ni, además, los que tienen cero incidencias
    var _sinLlenarParte = {};
    getTecnicos().forEach(function(t){ if(t.principal === false) _sinLlenarParte[t.nombre] = true; });
    var nombres = Object.keys(_asgIncidenciasPorTec).filter(function(n){ return !_sinLlenarParte[n]; }).sort(function(a,b){
      return (_asgIncidenciasPorTec[b].length) - (_asgIncidenciasPorTec[a].length);
    });
    if(!nombres.length){ el.innerHTML='<div style="color:var(--text2);font-size:.82rem;">No hay incidencias asignadas.</div>'; return; }
    var html='';
    nombres.forEach(function(nom){
      var cant=_asgIncidenciasPorTec[nom].length;
      var key=nom.replace(/[^a-z0-9]/gi,'_');
      html += '<div class="card" style="margin-bottom:8px;padding:0;overflow:hidden;">'
        + '<button class="btn btn-s btn-full" style="justify-content:space-between;border-radius:0;" onclick="toggleCard(\'asgTecGrupo_'+key+'\',this)">'
        + '<span>&#128119; '+nom+'</span>'
        + '<span style="background:'+(cant>0?'var(--green)':'var(--border2)')+';color:#fff;font-size:.75rem;font-weight:700;padding:2px 9px;border-radius:20px;min-width:22px;text-align:center;">'+cant+'</span>'
        + '</button>'
        + '<div id="asgTecGrupo_'+key+'" style="display:none;padding:10px;">'
        + _renderAsgTecGrupoBody(nom)
        + '</div>'
        + '</div>';
    });
    el.innerHTML = html;
  }).catch(function(){ el.innerHTML='<div style="color:var(--red);">Error al cargar.</div>'; });
}

function _renderAsgTecGrupoBody(nom){
  var lista = (_asgIncidenciasPorTec[nom]||[]).slice().sort(function(a,b){
    return (b.fechaCreacion||0)-(a.fechaCreacion||0);
  });
  if(!lista.length) return '<div style="color:var(--text2);font-size:.82rem;">Sin incidencias asignadas.</div>';
  var tecs = _tecnicosAsignables();
  var html='';
  lista.forEach(function(d){
    var estLabel = {pendiente:'⏳ Pendiente', 'en-ejecucion':'🔧 En ejecución', terminado:'✅ Terminado'}[d.estado]||d.estado;
    var refs=[]; if(d.pedido) refs.push('Orden '+d.pedido); if(d.centro) refs.push('Centro '+d.centro);
    html += '<div class="card" style="margin-bottom:8px;">'
      +'<div style="font-weight:700;font-size:.9rem;">'+d.tienda+'</div>'
      +(refs.length?'<div style="font-size:.78rem;color:var(--text2);">'+refs.join(' · ')+'</div>':'')
      +'<div style="font-size:.78rem;color:var(--text2);margin-top:2px;">'+d.job+' · '+estLabel+'</div>';
    html += '<div style="margin-top:8px;"><label style="font-size:.75rem;color:var(--text2);font-weight:700;">Reasignar a:</label>'
      +'<select onchange="reasignarIncidencia(\''+d.id+'\',this.value)" style="width:100%;margin-top:4px;padding:6px;border-radius:var(--r-sm);border:1.5px solid var(--border);background:var(--surface2);color:var(--text);font-family:inherit;">'
      +'<option value="">-- mantener --</option>'
      +tecs.filter(function(t){ return t.nombre !== d.tecnicoPrincipal; }).map(function(t){return '<option value="'+t.nombre.replace(/"/g,'')+'">'+t.nombre+'</option>';}).join('')
      +'</select></div>'
      +'<button class="btn btn-d btn-sm" style="margin-top:8px;" onclick="eliminarIncidencia(\''+d.id+'\')">&#128465; Eliminar</button>';
    html += '</div>';
  });
  return html;
}

function reasignarIncidencia(id, nuevoTec) {
  if (!nuevoTec) return;
  _db.collection('incidencias').doc(id).update(Object.assign({ tecnicoPrincipal: nuevoTec, vista:false }, _marcaModificacion('Reasignada a otro técnico'))).then(function(){
    renderAsgLista();
  });
}

function eliminarIncidencia(id) {
  _confirmarApp('¿Eliminar esta incidencia asignada?', function(){
    _moverAPapelera('incidencias', id, 'Eliminada desde Asignar incidencia').then(function(){ renderAsgLista(); });
  });
}

// (renderAsgTecnico, renderAsgAdmin, verAsgAdminAviso, abrirAsgTecOpciones, consultarAsgTec,
// ejecutarAsgTec y _asgTecActual movidos arriba, al bloque de script correcto, antes de su primer uso)

function cerrarSesion() {
  try { localStorage.removeItem('irv_sesion'); localStorage.removeItem('irv_pantalla'); } catch(e) { _fallo('cerrarSesion')(e); }
  location.reload();
}

// Sesión restaurada al arrancar si existe una guardada (ver el bloque junto a iniciarSplash())

// Cierre automático a las 6:00 (hora del dispositivo) — asegura que la primera
// vez que se usa la app tras esa hora, cargue el código más reciente (los cambios se suben de noche).
function _comprobarReinicioDiario(){
  if(!window._sesion) return;
  var ahora=new Date();
  var hoy=ahora.toISOString().slice(0,10);
  var ultimo=localStorage.getItem('pm_ultimo_dia_activo');
  if(ultimo===hoy) return; // ya se hizo el cierre de hoy, nada más que hacer
  if(ahora.getHours()<6) return; // aún no son las 6am de hoy — esperar, sin marcar nada todavía
  localStorage.setItem('pm_ultimo_dia_activo', hoy); // marcar el día de hoy como hecho ANTES de cerrar — así el bucle es imposible
  cerrarSesion();
}
// Al cargar la app: comprobación única, por si las 6am ya pasaron mientras la app no estaba abierta
_comprobarReinicioDiario();

// Alarma para la próxima vez que sean las 6am: se calcula una sola vez cuánto falta y se
// programa un único aviso para ese momento exacto — nada de comprobaciones repetidas en medio.
// Si la app está abierta en ese instante, se dispara ahí mismo. Tras dispararse, se reprograma
// sola para el día siguiente a las 6am, y así sucesivamente.
function _programarAlarmaReinicioDiario(){
  var ahora = new Date();
  var proxima6am = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 6, 0, 0, 0);
  if(proxima6am.getTime() <= ahora.getTime()) proxima6am.setDate(proxima6am.getDate()+1);
  var espera = proxima6am.getTime() - ahora.getTime();
  setTimeout(function(){
    _comprobarReinicioDiario();
    _programarAlarmaReinicioDiario();
  }, espera);
}
_programarAlarmaReinicioDiario();

// Wake Lock: evita que la pantalla se apague mientras hay actividad en la app.
// Se libera tras 8 minutos sin interacción (entonces la pantalla se apaga normal,
// según la configuración del dispositivo). Cada interacción reinicia el contador.
// No afecta a la sesión ni a los datos — al reactivar el dispositivo, todo sigue igual.
var _wakeLock=null;
var _wakeLockTimer=null;
function _pedirWakeLock(){
  if(!window._sesion || !('wakeLock' in navigator) || _wakeLock) return;
  navigator.wakeLock.request('screen').then(function(wl){
    _wakeLock=wl;
    wl.addEventListener('release', function(){ _wakeLock=null; });
  }).catch(function(){});
}
function _liberarWakeLock(){
  if(_wakeLock){ _wakeLock.release().catch(function(){}); _wakeLock=null; }
}
var _avisoMin4Timer=null;
function _resetWakeLockTimer(){
  if(!window._sesion) return;
  _pedirWakeLock();
  if(_wakeLockTimer) clearTimeout(_wakeLockTimer);
  if(_avisoMin4Timer) clearTimeout(_avisoMin4Timer);
  _wakeLockTimer=setTimeout(_liberarWakeLock, 300000); // 5 minutos
  _avisoMin4Timer=setTimeout(function(){
    if(_parteTieneContenidoSinGuardar()) _mostrarAvisoParteSinGuardar(null);
  }, 240000); // 4 minutos — 1 min antes de que se apague la pantalla
}
document.addEventListener('visibilitychange', function(){
  // El navegador libera el Wake Lock solo al ocultar la pestaña — hay que repedirlo al volver
  if(document.visibilityState==='visible') _resetWakeLockTimer();
});
['click','keydown','touchstart','scroll'].forEach(function(ev){
  document.addEventListener(ev, _resetWakeLockTimer, {passive:true});
});
_resetWakeLockTimer();

// Mostrar botón cambiar rol si corresponde
function _mostrarIconoUsuarios() {
  var rol = window._sesion && window._sesion.rol;
  // Botón cambiar rol: solo si el usuario demostró tener más de un rol disponible
  if (window._sesion && window._sesion.multiRol) {
    var btn = document.getElementById('btnCambiarRol');
    if (btn) { btn.style.display = ''; btn.textContent = rol === 'admin' ? '🔧 Técnico' : '⚙️ Admin'; }
  }
}

function pedirPinCambioRol() {
  var sesion = window._sesion;
  if (!sesion) return;
  // De admin a técnico: directo, sin PIN
  if (sesion.rol === 'admin') { _entrarConRol(sesion.nombre, 'tecnico', true); return; }
  // De técnico a admin: pide PIN
  document.getElementById('dlgCambioRolPin').value = '';
  document.getElementById('dlgCambioRolMsg').textContent = '';
  document.getElementById('dlgCambioRol').classList.add('show');
  setTimeout(function(){ document.getElementById('dlgCambioRolPin').focus(); }, 100);
}

function confirmarCambioRol() {
  var pin = document.getElementById('dlgCambioRolPin').value.trim();
  var msg = document.getElementById('dlgCambioRolMsg');
  var sesion = window._sesion;
  msg.textContent = 'Verificando...';
  // El PIN se comprueba en el servidor. Sin conexión no se puede verificar nada, así que
  // sin internet todos quedan como técnico puro, sin excepción.
  _llamarEntrar(sesion.nombre, pin).then(function(r) {
    if (r.estado === 'ok' && r.datos.roles.indexOf('admin') >= 0) {
      msg.textContent = '';
      document.getElementById('dlgCambioRol').classList.remove('show');
      document.getElementById('dlgCambioRolPin').value = '';
      _entrarConRol(sesion.nombre, 'admin', true);
    } else if (r.estado === 'sinConexion') {
      msg.textContent = 'Sin conexión. No se puede entrar como admin sin internet.';
    } else if (r.estado === 'bloqueado') {
      msg.textContent = 'Demasiados intentos fallidos. Espera ' + r.datos.minutos + ' min.';
    } else {
      msg.textContent = 'PIN incorrecto.';
    }
  });
}

function abrirCatalogo() {
  var rol = window._sesion && window._sesion.rol;
  if (rol !== 'admin') {
    _toast('Sin acceso. Solo administrador.', _AVISO_ROJO); return;
  }
  // El catálogo se lee y se escribe directamente contra Firestore, sin copia local
  // intermedia — por eso hace falta conexión para entrar, igual que otras acciones de admin
  _verificarConexionFirestore(function(hayConexion){
    if (!hayConexion) {
      _toast('Necesitas conexión a internet para acceder al catálogo.', _AVISO_ROJO);
      return;
    }
    goTo('w-catalogo');
  });
}

