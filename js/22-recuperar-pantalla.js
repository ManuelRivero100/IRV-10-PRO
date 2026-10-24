// ===== RECUPERAR SESIÓN Y PANTALLA AL VOLVER A LA APP =====
// Cuando el móvil descarta la pestaña, al volver la app arranca de nuevo. Aquí se recupera la sesión guardada,
// sin enseñar la entrada ni la presentación, y se deja al usuario en la pantalla donde estaba. La pantalla se
// guarda al salir de la app y cada pocos segundos. La borran el cierre diario de las 6:00 y cerrar sesión.
// Este módulo se carga el último: así, al recuperar la sesión, todas las funciones de la app ya existen.
var PANTALLA_KEY = 'irv_pantalla';
var _restaurandoPantalla = false;

// Instante del último cierre diario de las 6:00; lo guardado antes de ese momento ya no vale
function _ultimoCierreDiario(){
  var ahora = new Date();
  var corte = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 6, 0, 0, 0);
  if (ahora < corte) corte.setDate(corte.getDate() - 1);
  return corte.getTime();
}

// ----- Qué se guarda y cómo se recupera, pantalla por pantalla -----
// capturar() devuelve lo necesario para volver al mismo punto; abrir() abre la pantalla (por defecto goTo);
// restaurar() la deja como estaba. Las pantallas que no están aquí se recuperan solo hasta el menú del cliente.
var _PANTALLAS = {
  'w-hist': { capturar: _capturarHist, restaurar: _restaurarHist },
  'w-stats': { capturar: _capturarStats, restaurar: _restaurarStats },
  'w-horas': { capturar: _capturarHoras, abrir: abrirHoras, restaurar: _restaurarHoras },
  'w-catalogo': { capturar: _capturarCatalogo, restaurar: _restaurarCatalogo },
  'w-form': { capturar: _capturarForm, abrir: volverAlForm, restaurar: _restaurarForm },
  'w-result': { capturar: _capturarForm, abrir: volverAlForm, restaurar: _restaurarForm },
  'w-papelera': { abrir: abrirPapelera },
  'w-backups': { abrir: abrirBackups },
  'w-asignar': { capturar: _capturarAsignar, abrir: abrirAsignar, restaurar: _restaurarAsignar },
  'w-nuevo-cliente': { capturar: _capturarNuevoCliente, restaurar: _restaurarNuevoCliente }
};

// Rellena los campos con id indicado a partir de {id: valor}
function _ponerCampos(campos){
  Object.keys(campos || {}).forEach(function(id){
    var el = $(id); if (!el) return;
    if (el.type === 'checkbox') el.checked = !!campos[id]; else el.value = campos[id];
  });
}
function _leerCampos(ids){
  var r = {};
  ids.forEach(function(id){ var el = $(id); if (el) r[id] = el.type === 'checkbox' ? el.checked : el.value; });
  return r;
}
// Marca como activo el botón de un grupo cuyo onclick contiene el texto indicado
function _activarBoton(selector, textoOnclick){
  document.querySelectorAll(selector + ' button').forEach(function(b){
    b.classList.toggle('active', (b.getAttribute('onclick') || '').indexOf(textoOnclick) >= 0);
  });
}
function _botonPorOnclick(selector, textoOnclick){
  return [].slice.call(document.querySelectorAll(selector + ' button')).filter(function(b){
    return (b.getAttribute('onclick') || '').indexOf(textoOnclick) >= 0;
  })[0] || null;
}

// ----- Histórico -----
var _VISTAS_HIST = ['histOpts','secView','centrosView','incidenciasView','ordenView','parteView','resumenTotalView','resumenCentroView'];
function _capturarHist(){
  var visibles = _VISTAS_HIST.filter(function(id){ var e = $(id); return e && e.style.display === 'block'; });
  var c = { vista: visibles.length ? visibles[visibles.length - 1] : 'histOpts', sec: _secActual || '', centro: (typeof _curCentroFin !== 'undefined') ? _curCentroFin : null };
  if (window._ordenActual) c.orden = { pedido: window._ordenActual.pedido, centro: window._ordenActual.centro };
  if (c.vista === 'parteView' && _parteIdxActual !== null) {
    var r = getH()[_parteIdxActual];
    if (r) c.parte = { fecha: r.fecha, centro: r.centro, pedido: r.pedido, numParte: r.numParte || '' };
  }
  return c;
}
function _restaurarHist(c){
  if (!c || c.vista === 'histOpts') return;
  var enc = c.orden ? encodeURIComponent(c.orden.pedido) + '||' + encodeURIComponent(c.orden.centro) : null;
  var sec = c.sec || '';
  // Primero la lista de la que se viene, para que "Volver" lleve a donde llevaba
  if (c.vista === 'centrosView' || c.vista === 'incidenciasView' || sec === 'fin') {
    verCentros();
    if (c.centro && c.vista !== 'centrosView' && c.vista !== 'resumenTotalView') verIncidenciasCentro(c.centro);
  }
  else if (sec.indexOf('tec_') === 0) verSecTecnico(sec.slice(4));
  else if (sec === 'ej') verSec('ej');
  if (c.vista === 'ordenView' && enc) verOrden(enc);
  else if (c.vista === 'parteView' && enc) {
    verOrden(enc);
    var h = getH(), p = c.parte;
    var idx = p ? h.findIndex(function(r){ return r.fecha === p.fecha && r.centro === p.centro && r.pedido === p.pedido && (r.numParte || '') === p.numParte; }) : -1;
    if (idx >= 0) verParte(idx);
  }
  else if (c.vista === 'resumenTotalView') verResumenTotal();
  else if (c.vista === 'resumenCentroView') { if (c.centro) _curCentroFin = c.centro; verResumenCentro(); }
}

// ----- Estadísticas -----
function _capturarStats(){
  return { cli: $('statsCliente') ? $('statsCliente').value : 'todos', periodo: _statsPeriodo, vista: _statsVista, activas: !!statsInclActivas() };
}
function _restaurarStats(c){
  if (!c) return;
  if ($('statsCliente') && c.cli) $('statsCliente').value = c.cli;
  if ($('statsInclActivas')) $('statsInclActivas').checked = !!c.activas;
  _statsPeriodo = c.periodo || 'todo';
  _statsVista = c.vista || 'concepto';
  _activarBoton('#statsTglP', "'" + _statsPeriodo + "'");
  var bCon = $('statsBtnCon'), bCod = $('statsBtnCod');
  if (bCon) bCon.classList.toggle('active', _statsVista === 'concepto');
  if (bCod) bCod.classList.toggle('active', _statsVista === 'codigo');
  statsActualizar();
}

// ----- Registro de horario -----
function _capturarHoras(){
  var c = { vista: _horasVista, hist: _horasHistSel, eq: _horasEq, ctl: _horasCtl, tab: _horasTabSel };
  if (_horasVista === 'hoy') {
    c.hoy = _leerCampos(['hFecha', 'hInicio', 'hFin', 'hLugar', 'hDieta']);
    c.festivo = !!_horasFestivoManual;
  }
  return c;
}
function _restaurarHoras(c){
  if (!c || !c.vista || c.vista === 'menu' || c.vista === 'menuAdmin') return;
  horasMostrar(c.vista);
  if (c.vista === 'hist') { _horasHistSel = c.hist; horasRenderHist(); }
  else if (c.vista === 'equipo') { _horasEq = c.eq; horasRenderEquipo(); }
  else if (c.vista === 'control') { _horasCtl = c.ctl; horasRenderControl(); }
  else if (c.vista === 'tab') { _horasTabSel = c.tab; horasRenderTab(); }
  else if (c.vista === 'hoy' && c.hoy) {
    $('hFecha').value = c.hoy.hFecha; horasCargarDia();
    _ponerCampos({ hInicio: c.hoy.hInicio, hFin: c.hoy.hFin, hLugar: c.hoy.hLugar, hDieta: c.hoy.hDieta });
    _horasFestivoManual = !!c.festivo;
    horasPintarTipo(); horasPintarDieta(); horasRecalcular();
  }
}

// ----- Catálogo -----
function _capturarCatalogo(){
  var activa = document.querySelector('.cat-tab.active');
  var m = activa && (activa.getAttribute('onclick') || '').match(/catTab\('([a-z]+)'/);
  return { tab: m ? m[1] : 'materiales', nav: _catNav };
}
function _restaurarCatalogo(c){
  if (!c) return;
  var btn = [].slice.call(document.querySelectorAll('.cat-tab')).filter(function(b){ return (b.getAttribute('onclick') || '').indexOf("catTab('" + c.tab + "'") >= 0; })[0];
  if (btn && c.tab !== 'materiales') catTab(c.tab, btn);
  if (c.tab === 'materiales' && c.nav) { _catNav = c.nav; catNavRender(); }
}

// ----- Asignaciones -----
var _CAMPOS_ASIGNAR = ['asgRaw', 'asgPedido', 'asgCentro', 'asgTienda', 'asgDir', 'asgTel', 'asgKm', 'asgTr', 'asgDescripcion'];
function _capturarAsignar(){ return { campos: _leerCampos(_CAMPOS_ASIGNAR), job: _asgJob, tec: _asgTec }; }
function _restaurarAsignar(c){
  if (!c) return;
  _ponerCampos(c.campos);
  var bJob = c.job && [].slice.call(document.querySelectorAll('#asgJobTgl button')).filter(function(b){ return b.textContent === c.job; })[0];
  if (bJob) setAsgJob(c.job, bJob);
  var bTec = c.tec && [].slice.call(document.querySelectorAll('#asgTecTgl button')).filter(function(b){ return b.textContent === c.tec; })[0];
  if (bTec) setAsgTec(c.tec, bTec);
}

// ----- Cliente nuevo -----
function _capturarNuevoCliente(){ return { campos: _leerCampos(['nc-nombre', 'nc-jobs']), tipo: _ncTipo }; }
function _restaurarNuevoCliente(c){
  if (!c) return;
  _ponerCampos(c.campos);
  var b = _botonPorOnclick('#nc-tipo-tgl', "'" + c.tipo + "'");
  if (b) setNcTipo(c.tipo, b);
}

// ----- Formulario de generar parte y su resultado -----
// Es la pantalla con más estado: campos, bloques que se muestran u ocultan, botones de tipo de trabajo / origen /
// festivo y varias variables de la app. Se guarda una "foto" y se vuelve a montar al recuperar. Si el parte ya
// estaba generado (pantalla de resultado) se guarda también el resultado para poder terminar de guardarlo.
var _GLOBALES_FORM = ['curJob', 'curLink', 'curOrigen', 'wRoles', 'wNames', 'esFestivo', '_nocturnoConfirmado', '_actObrasSeleccionada',
  '_pedidoNoMerc', '_averiaReportada', 'aeData', '_editIdx', '_cAC', '_oAC', '_asgTecActual',
  '_editNumParteOriginal', '_notaKmAdicionalOriginal', '_origenAutoLectura', '_centroSeleccionado'];
var _GRUPOS_BOTONES_FORM = ['jobTgl', 'lnkTgl', 'origTgl', 'festivoTgl', 'todosEnlazanTgl'];
// Avisos y listas que se abren solos: no se recuperan
var _IGNORAR_FORM = /^(msg|abn$|acOrden$|acCentro$|out$)/;

function _capturarForm(){
  var c = { campos: {}, vis: {}, g: {}, botones: {}, ms: { sel: _MS.sel, extras: _MS.extras, secAbierta: _MS.secAbierta, subAbierta: _MS.subAbierta, catJob: _MS.catJob } };
  [].slice.call(document.querySelectorAll('#w-form [id]')).forEach(function(el){
    if (_IGNORAR_FORM.test(el.id)) return;
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) && el.type !== 'file' && el.type !== 'button') {
      c.campos[el.id] = el.type === 'checkbox' ? el.checked : el.value;
      c.vis[el.id] = { d: el.style.display, c: el.className, ro: el.readOnly, dis: el.disabled };
    } else {
      c.vis[el.id] = { d: el.style.display, c: el.className };
      if (/Display$/.test(el.id)) c.vis[el.id].t = el.textContent;
    }
  });
  _GLOBALES_FORM.forEach(function(n){ if (typeof window[n] !== 'undefined') c.g[n] = window[n]; });
  _GRUPOS_BOTONES_FORM.forEach(function(g){
    c.botones[g] = [].slice.call(document.querySelectorAll('#' + g + ' button')).map(function(b){ return { a: b.classList.contains('active'), dis: b.disabled }; });
  });
  var dlg = $('dlgInicioOrden');
  c.inicio = !!(dlg && dlg.classList.contains('show'));
  var res = $('w-result');
  if (res && res.classList.contains('active')) c.resultado = { out: $('out').innerHTML, rec: window.recTmp };
  return c;
}

function _restaurarForm(c){
  if (!c) return;
  // Se abre el formulario sin la pregunta inicial de "orden nueva / continuar orden"
  volverAlForm();
  _keepForm = false; // volverAlForm la deja activada, y la próxima vez que se abra el formulario no saldría la pregunta inicial
  Object.keys(c.g || {}).forEach(function(n){ window[n] = c.g[n]; });
  _MS.sel = c.ms.sel || {}; _MS.extras = c.ms.extras || {}; _MS.secAbierta = c.ms.secAbierta; _MS.subAbierta = c.ms.subAbierta; _MS.catJob = c.ms.catJob;
  // Piezas que se montan a partir de las variables y de algunos campos (p. ej. nº de técnicos): primero esos campos,
  // luego las piezas, y después todos los campos otra vez (así también los que crean las propias piezas)
  _ponerCampos(c.campos);
  if (curCliente) { adaptarFormularioACliente(); renderJobTgl(); }
  renderWorkers();
  // Campos y bloques visibles, como estaban
  _ponerCampos(c.campos);
  Object.keys(c.vis).forEach(function(id){
    var el = $(id), v = c.vis[id];
    if (!el) return;
    el.style.display = v.d;
    if (typeof v.c === 'string') el.className = v.c;
    if (typeof v.ro === 'boolean') el.readOnly = v.ro;
    if (typeof v.dis === 'boolean') el.disabled = v.dis;
    if (typeof v.t === 'string') el.textContent = v.t;
  });
  Object.keys(c.botones).forEach(function(g){
    [].slice.call(document.querySelectorAll('#' + g + ' button')).forEach(function(b, i){
      var s = c.botones[g][i]; if (!s) return;
      b.classList.toggle('active', s.a); b.disabled = s.dis;
    });
  });
  if (typeof msRender === 'function' && $('parteMatCard')) msRender('parteMatCard');
  if (c.resultado) { $('out').innerHTML = c.resultado.out; window.recTmp = c.resultado.rec; goToRaw('w-result'); }
  else if (c.inicio) mostrarDlgInicioOrden();
}

// ----- Guardar la pantalla -----
function _guardarPantalla(){
  // Sin sesión guardada (o recién cerrada) no se guarda nada; durante la recuperación tampoco
  if (_restaurandoPantalla || !window._sesion || !localStorage.getItem('irv_sesion')) return;
  var w = document.querySelector('.win.active');
  if (!w) return;
  var est = { nombre: window._sesion.nombre, rol: window._sesion.rol, ts: Date.now(), win: w.id, cli: curCliente ? curCliente.id : null };
  var def = _PANTALLAS[w.id];
  if (def && def.capturar) { try { est.ctx = def.capturar(); } catch(e) { _fallo('_guardarPantalla ' + w.id)(e); } }
  try { localStorage.setItem(PANTALLA_KEY, JSON.stringify(est)); } catch(e) { _fallo('_guardarPantalla setItem')(e); }
}
document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'hidden') _guardarPantalla(); });
window.addEventListener('pagehide', _guardarPantalla);
setInterval(_guardarPantalla, 3000);

// ----- Recuperar la pantalla -----
// Devuelve la pantalla guardada si es de este mismo usuario y rol y es posterior al último cierre de las 6:00
function _pantallaGuardada(sesion){
  try {
    var p = JSON.parse(localStorage.getItem(PANTALLA_KEY) || 'null');
    if (!p || !p.win || p.nombre !== sesion.nombre || p.rol !== sesion.rol || !(p.ts >= _ultimoCierreDiario())) return null;
    return p;
  } catch(e) { _fallo('_pantallaGuardada')(e); return null; }
}

function _restaurarPantalla(p){
  _restaurandoPantalla = true;
  try {
    if (p.cli) {
      seleccionarCliente(p.cli);
      if (!curCliente) return; // el cliente ya no existe: se queda en el inicio
    }
    if (p.win === 'w-clientes' || p.win === 'w-menu') return;
    var def = _PANTALLAS[p.win];
    if (!def && !p.cli) return;
    if (def) { if (def.abrir) def.abrir(); else goTo(p.win); }
    else return; // pantallas sin recuperación propia: se queda en el menú del cliente
    if (def.restaurar) def.restaurar(p.ctx);
  } catch(e) {
    _fallo('_restaurarPantalla ' + p.win)(e);
    goTo('w-clientes');
  } finally {
    _restaurandoPantalla = false;
  }
}

function _terminarRecuperacion(){ document.documentElement.classList.remove('recuperando'); }

// Si hay una sesión guardada de una vez anterior, se entra directamente sin pedir PIN, y se vuelve a la pantalla donde
// se estaba. Se mantiene hasta el cierre diario de las 6:00 o hasta que el usuario cierra sesión. Sin la sesión de
// Firebase de este dispositivo no hay acceso a los datos: se pide el PIN otra vez.
function _recuperarSesionGuardada(){
  try {
    var s = JSON.parse(localStorage.getItem('irv_sesion') || 'null');
    if (!s || !s.nombre || !s.rol || !firebase.auth().currentUser) { _terminarRecuperacion(); return; }
    // Si ya tocan las 6:00 de un día no marcado todavía, no se recupera: el cierre diario pide el PIN
    var ahora = new Date();
    var hoy = ahora.toISOString().slice(0, 10);
    if (localStorage.getItem('pm_ultimo_dia_activo') !== hoy && ahora.getHours() >= 6) {
      localStorage.setItem('pm_ultimo_dia_activo', hoy);
      try { localStorage.removeItem('irv_sesion'); localStorage.removeItem(PANTALLA_KEY); } catch(e) { _fallo('_recuperarSesionGuardada #1')(e); }
      _terminarRecuperacion();
      return;
    }
    var nombreKey = s.nombre.toLowerCase();
    var usuarioDelDispositivo = localStorage.getItem(DISPOSITIVO_USUARIO_KEY);
    var hayQueRefrescar = (usuarioDelDispositivo && usuarioDelDispositivo !== nombreKey) || localStorage.getItem(ULTIMA_VERIFICACION_KEY) !== hoy;
    if (hayQueRefrescar) {
      // Otro usuario o primer uso del día en este dispositivo: se limpia y se resincroniza como siempre, con su presentación
      _iniciarPresentacionLogin(s.nombre);
    } else {
      _loginSplashListo = true;
      _sincronizarAlEntrar();
    }
    _aplicarSesion(s.nombre, s.rol, !!s.multiRol);
    var p = _pantallaGuardada(s);
    if (p) _restaurarPantalla(p);
    if (!hayQueRefrescar) {
      var splash = $('splash');
      if (splash) splash.style.display = 'none';
      document.body.style.overflow = '';
    }
    _terminarRecuperacion();
  } catch(e) {
    _fallo('_recuperarSesionGuardada #2')(e);
    _terminarRecuperacion();
  }
}

_authReady.then(_recuperarSesionGuardada);
// Si algo tardara demasiado, no se deja la pantalla en blanco: se muestra la entrada de siempre
setTimeout(_terminarRecuperacion, 8000);
