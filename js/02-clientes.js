// ===== CLIENTES =====
var CLIENTE_MERCADONA = {
  id:'mercadona', nombre:'Mercadona', tipo:'mercadona',
  jobs: JSON.parse(localStorage.getItem('pm_mercadona_jobs')||'null') || ['Conductos','Climatización','Obras'],
  codigos:true, precios:false
};

function getClientes(){
  CLIENTE_MERCADONA.jobs = JSON.parse(localStorage.getItem('pm_mercadona_jobs')||'null') || ['Conductos','Climatización','Obras'];
  var def=[CLIENTE_MERCADONA];
  var extra=JSON.parse(localStorage.getItem('pm_clientes')||'[]');
  // Eliminar duplicados de Mercadona que puedan venir del localStorage
  extra=extra.filter(function(c){ return c.id!=='mercadona' && c.tipo!=='mercadona'; });
  return def.concat(extra);
}
function saveClientes(lista){
  // solo guardamos los que no son mercadona
  var extra=lista.filter(function(c){ return c.id!=='mercadona'; });
  localStorage.setItem('pm_clientes',JSON.stringify(extra));
}
function _subirClienteAFirestore(c){
  try{
    if(typeof _db === 'undefined' || !_db || !c || c.id==='mercadona') return;
    _db.collection('clientes').doc(c.id).set(c, {merge:true}).catch(_fallo('_subirClienteAFirestore clientes.set #1'));
  }catch(e) { _fallo('_subirClienteAFirestore clientes.set #2')(e); }
}
function _sincronizarClientesDesdeFirestore(){
  if(typeof _db === 'undefined' || !_db) return;
  _db.collection('clientes').get().then(function(snap){
    var extra=JSON.parse(localStorage.getItem('pm_clientes')||'[]');
    var subidos={};
    extra.forEach(function(c){ subidos[c.id]=true; });
    var cambiado=false;
    snap.forEach(function(doc){
      var d=doc.data();
      var idx=extra.findIndex(function(c){ return c.id===d.id; });
      if(idx>=0){
        var loc=extra[idx];
        if(Object.keys(d).some(function(k){ return JSON.stringify(d[k])!==JSON.stringify(loc[k]); }) || Object.keys(loc).some(function(k){ return !(k in d); })) cambiado=true;
        extra[idx]=d;
      } else { extra.push(d); cambiado=true; }
    });
    if(cambiado){ localStorage.setItem('pm_clientes',JSON.stringify(extra)); renderClientes(); }
  }).catch(_fallo('_sincronizarClientesDesdeFirestore'));
}
function _sincronizarAgendaDesdeFirestore(){
  if(typeof _db === 'undefined' || !_db) return;
  _db.collection('agenda').get().then(function(snap){
    var a=getAgenda();
    var cambiado=false;
    var clavesReales={};
    snap.forEach(function(doc){
      var d=doc.data();
      var k=agendaKey(d.clienteId,d.centro);
      clavesReales[k]=true;
      if(JSON.stringify(a[k])!==JSON.stringify(d)){ a[k]=d; cambiado=true; }
    });
    // La respuesta trae SIEMPRE la colección completa, así que cualquier clave local que ya
    // no esté ahí fue borrada de verdad en Firestore (no una tienda real que falló al leer) —
    // se borra también en local para que un borrado se refleje en todos los dispositivos.
    Object.keys(a).forEach(function(k){
      if(!clavesReales[k]){ delete a[k]; cambiado=true; }
    });
    if(cambiado) setAgenda(a);
    // Actualizar el badge también aquí, por si esta sincronización termina después de que
    // la app ya se haya revelado — así el número siempre queda correcto, sin importar cuánto
    // tarde la descarga de la agenda
    if(typeof catActualizarBadge==='function') catActualizarBadge();
  }).catch(_fallo('_sincronizarAgendaDesdeFirestore'));
}
function _sincronizarMaterialesFlotantesDesdeFirestore(){
  if(typeof _db === 'undefined' || !_db) return;
  _db.collection('materialesFlotantes').get().then(function(snap){
    var lista=[];
    snap.forEach(function(doc){ lista.push(Object.assign({id:doc.id}, doc.data())); });
    setMaterialesFlotantes(lista);
    if(typeof catActualizarBadge==='function') catActualizarBadge();
  }).catch(_fallo('_sincronizarMaterialesFlotantesDesdeFirestore materialesFlotantes.get'));
}
function _sincronizarTecnicosDesdeFirestore(){
  if(typeof _db === 'undefined' || !_db) return;
  _db.collection('usuario').where('roles','array-contains','tecnico').get().then(function(snap){
    var tecs=getTecnicos();
    var cambiado=false;
    snap.forEach(function(doc){
      var d=doc.data();
      var roles = d.roles || ['tecnico'];
      var idx=tecs.findIndex(function(t){ return t.nombre===d.nombre; });
      if(idx>=0){
        delete tecs[idx].pin; // PIN en claro de versiones anteriores: no debe quedarse en el dispositivo
        tecs[idx].tienePin=!!d.tienePin;
        tecs[idx].activo=d.activo!==false;
        tecs[idx].roles=roles;
        tecs[idx].ultimaConexion=d.ultimaConexion||null;
        tecs[idx].matFlotante=!!d.matFlotante;
        if(d.activoDesde) tecs[idx].activoDesde=d.activoDesde;
        if(typeof d.principal==='boolean') tecs[idx].principal=d.principal;
        cambiado=true;
      } else {
        tecs.push({id:'tec_'+doc.id, nombre:d.nombre, tel:'', jobs:[], tienePin:!!d.tienePin, activo:d.activo!==false, roles:roles, ultimaConexion:d.ultimaConexion||null, matFlotante:!!d.matFlotante, activoDesde:d.activoDesde||'', principal:(typeof d.principal==='boolean' ? d.principal : undefined)});
        cambiado=true;
      }
    });
    if(cambiado) setTecnicos(tecs);
  }).catch(_fallo('_sincronizarTecnicosDesdeFirestore'));
}
function _sincronizarCatalogoDesdeFirestore(){
  if(typeof _db === 'undefined' || !_db || !window._sesion) return;
  // Todos los roles pueden bajar el catalogo (el tecnico lo necesita para elegir
  // materiales al generar un parte, aunque no tenga pantalla propia de catalogo).
  // Solo admin puede subir cambios - eso se controla aparte, en
  // _subirCatalogoAFirestore() y _modificarCatalogoEnFirestore().
  _db.collection('config').doc('catalogo').get().then(function(doc){
    if(doc.exists){
      var d=doc.data();
      // Bajar de Firestore solo si es más reciente que el local
      var localV=localStorage.getItem(CAT_V_KEY)||'0';
      if(d.version&&d.version>=localV){
        // El catálogo compartido ya no incluye tecnicos (tienen su propio camino seguro) —
        // conservar los locales al bajar, para no dejar un hueco momentáneo sin técnicos
        var tecnicosActuales = getTecnicos();
        var catNuevo = d.catalogo || {};
        catNuevo.tecnicos = tecnicosActuales;
        localStorage.setItem(CAT_KEY,JSON.stringify(catNuevo));
        localStorage.setItem(CAT_V_KEY,d.version);
      }
    } else {
      // No existe en Firestore — no subir automáticamente para evitar sobrescribir con catálogo sin precios
    }
  }).catch(_fallo('_sincronizarCatalogoDesdeFirestore'));
}
function _subirCatalogoAFirestore(){
  if(typeof _db === 'undefined' || !_db || !window._sesion) return;
  var rol=window._sesion.rol;
  if(rol!=='admin') return;
  var cat=getCat();
  // Excluir tecnicos: ya tienen su propio camino seguro (colección usuario, vía
  // _subirTecnicoAFirestore) — incluirlos aquí arriesgaba sobrescribir/borrar técnicos
  // añadidos desde otro dispositivo si esta copia local del catálogo estaba desactualizada
  var catSinTecnicos = Object.assign({}, cat);
  delete catSinTecnicos.tecnicos;
  _db.collection('config').doc('catalogo').set({
    catalogo: catSinTecnicos,
    version: CAT_V,
    fechaModificacion: Date.now()
  }).catch(_fallo('_subirCatalogoAFirestore config.set'));
}

// Modifica el contenido del catálogo (grupos, secciones, materiales, conceptos) leyendo y
// escribiendo SIEMPRE directamente contra Firestore — nunca usa la copia local como origen
// del cambio, ya que Firestore es la única fuente de verdad; la copia local solo se
// actualiza como espejo, después de que el cambio quede confirmado en Firestore.
// modificarFn recibe el catálogo recién leído y lo modifica en el sitio (sin devolver nada).
// alTerminar(exito) se llama al terminar, para que quien llama pueda refrescar la pantalla.
function _modificarCatalogoEnFirestore(modificarFn, alTerminar){
  if(typeof _db === 'undefined' || !_db || !window._sesion){ if(alTerminar) alTerminar(false); return; }
  var rol=window._sesion.rol;
  if(rol!=='admin'){ if(alTerminar) alTerminar(false); return; }
  _db.collection('config').doc('catalogo').get().then(function(doc){
    var catActual = (doc.exists && doc.data().catalogo) ? doc.data().catalogo : {grupos:[], conceptos:[]};
    // Conservar los técnicos locales — el documento compartido no los incluye
    catActual.tecnicos = getTecnicos();
    // Si modificarFn devuelve explícitamente false, es que detectó que el catálogo cambió
    // por debajo (otro admin editó/borró justo lo que este índice esperaba encontrar) —
    // abortar sin guardar nada, en vez de actuar a ciegas sobre lo que haya ahora en esa posición.
    if(modificarFn(catActual)===false){ if(alTerminar) alTerminar(false, 'conflicto'); return; }
    var catSinTecnicos = Object.assign({}, catActual);
    delete catSinTecnicos.tecnicos;
    return _db.collection('config').doc('catalogo').set({
      catalogo: catSinTecnicos,
      version: CAT_V,
      fechaModificacion: Date.now()
    }).then(function(){
      // Actualizar el espejo local con lo que Firestore acaba de confirmar
      localStorage.setItem(CAT_KEY, JSON.stringify(catActual));
      if(alTerminar) alTerminar(true);
    });
  }).catch(function(){
    if(alTerminar) alTerminar(false);
  });
}

var curCliente = null;
var _keepForm = false;
var esFestivo = false;
var curJob = '', curLink = 'No';
var aeData = null;
var _centrosCache = [];
var wNames = [];
var _actObrasSeleccionada = null;
var _pedidoNoMerc = null;
var _editIdx = null;
var _nocturnoConfirmado = false;
var _incidenciasCache = [];
var _averiaReportada = '';

function seleccionarCliente(id){
  var lista=getClientes();
  curCliente=lista.find(function(c){ return c.id===id; })||null;
  if(!curCliente) return;
  $('hdr-sub').textContent=curCliente.nombre;
  renderMenu();
  goToRaw('w-menu');
}

function borrarCliente(id){
  _confirmarApp('¿Eliminar este cliente y todos sus datos?', function(){
    var lista=getClientes().filter(function(c){ return c.id!==id; });
    saveClientes(lista);
    try{ if(typeof _db !== 'undefined' && _db) _db.collection('clientes').doc(id).delete().catch(_fallo('borrarCliente clientes.delete #1')); }catch(e) { _fallo('borrarCliente clientes.delete #2')(e); }
    // borrar partes de este cliente
    var h=getH().filter(function(r){ return r.clienteId!==id; });
    setH(h);
    renderClientes();
  });
}

var _ncTipo='fijo';
function setNcTipo(v,btn){
  _ncTipo=v;
  document.querySelectorAll('#nc-tipo-tgl button').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  $('nc-tipo').value=v;
}
var _ncAsig=true;
function ncPonerAsig(v){
  _ncAsig=v;
  $('nc-asig').className='btn btn-full '+(v?'btn-p':'btn-s');
  $('nc-asig-info').textContent=v
    ? 'Solo el técnico asignado a la incidencia puede continuarla.'
    : 'Sin asignación: cualquier técnico principal puede continuar la orden y solo el administrador la cierra o reabre.';
}
function ncToggleAsig(){ ncPonerAsig(!_ncAsig); }
function guardarNuevoCliente(){
  var n=$('nc-nombre').value.trim(); if(!n){ showMsg('msgNc','Introduce el nombre del cliente.','error'); return; }
  var jobs=$('nc-jobs').value.split(',').map(function(j){ return j.trim(); }).filter(Boolean);
  if(!jobs.length) jobs=['Trabajos'];
  var id='c_'+Date.now();
  var c={id:id,nombre:n,tipo:_ncTipo,jobs:jobs,codigos:false,precios:_ncTipo==='particular',conAsignacion:_ncAsig};
  var extra=JSON.parse(localStorage.getItem('pm_clientes')||'[]');
  extra.push(c); localStorage.setItem('pm_clientes',JSON.stringify(extra));
  _subirClienteAFirestore(c);
  $('nc-nombre').value=''; $('nc-jobs').value=''; ncPonerAsig(true);
  renderClientes(); goTo('w-clientes');
}

function renderMenu(){
  if(!curCliente) return;
  var items=[
    {ico:'&#9999;&#65039;',cls:'ico-mercadona',title:'Generar parte',id:'w-form'},
    {ico:'&#128203;',cls:'ico-other',title:'Historial',id:'w-hist'}
  ];
  if(_esAdmin()){
    items.push({ico:'&#128229;',cls:'ico-other',title:'Asignar incidencia',id:'w-asignar'});
  }
  var html='';
  items.forEach(function(item){
    html+='<div class="app-icon" id="'+(item.id==='w-asignar'?'iconAsignar':'')+'" onclick="'+(item.id==='w-asignar'?'abrirAsignar()':'goTo(\''+item.id+'\')')+'" style="'+(item.id==='w-asignar'?'position:relative;':'')+'">'
      +'<div class="app-icon-img '+item.cls+'">'+item.ico+'</div>'
      +(item.id==='w-asignar'?'<span id="asgBadge" style="display:none;position:absolute;top:-4px;right:2px;background:#e05555;color:#fff;font-size:.62rem;font-weight:700;padding:2px 6px;border-radius:20px;min-width:18px;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,.3);">0</span>':'')
      +'<span class="app-icon-label">'+item.title+'</span>'
      +'</div>';
  });
  $('menuGrid').innerHTML=html;
  refreshCounts();
  if(_esAdmin()) _actualizarBadgeAsignar();
}
// Incidencias de un cliente que no están terminadas. Se piden todas las del cliente (una sola condición, sin índice) y se filtran
// aquí: con where('estado','!=','terminado') Firestore exige un índice compuesto que el proyecto nuevo no tiene, y sin él la
// consulta falla (número de "Asignar" sin actualizar y lista de Asignar en "Cargando…"). Igual que el "!=" de Firestore,
// las que no tienen campo "estado" no cuentan. Devuelve algo que se usa como el resultado de una consulta: size, forEach y docs.
function _consultarIncidenciasAbiertas(clienteId){
  return _db.collection('incidencias').where('clienteId','==',clienteId).get().then(function(snap){
    var docs=snap.docs.filter(function(d){ var e=d.data().estado; return e!==undefined && e!=='terminado'; });
    return { size:docs.length, docs:docs, forEach:function(f){ docs.forEach(f); } };
  });
}
function _actualizarBadgeAsignar(){
  if(!curCliente) return;
  var b=$('asgBadge'); if(!b) return;
  _consultarIncidenciasAbiertas(curCliente.id).then(function(snap){
    if(!b) return;
    b.textContent=snap.size;
    b.style.display=snap.size>0?'block':'none';
  }).catch(_fallo('_actualizarBadgeAsignar incidencias.get'));
}

function renderJobTgl(){
  if(!curCliente) return;
  var el=$('jobTgl'); if(!el) return;
  var jobs=curCliente.jobs||['Conductos','Climatización','Obras'];
  el.innerHTML=jobs.map(function(j){
    return '<button onclick="setJob(\''+j+'\',this)">'+j+'</button>';
  }).join('');
}

// ===== REGISTRO DE FALLOS SILENCIOSOS =====
// Operaciones "de mejor esfuerzo" (sincronizar, copiar a la nube…) que no avisan al usuario si fallan.
// Aquí solo se deja rastro: consola (F12) y un registro pequeño en el teléfono (pm_fallos, últimos 50).
// Nunca lanza error ni cambia nada visible; el mismo fallo no se repite más de 1 vez por minuto.
var _falloUltimo = {};
function _fallo(contexto){
  return function(err){
    try {
      var ahora = Date.now();
      if(_falloUltimo[contexto] && ahora - _falloUltimo[contexto] < 60000) return;
      _falloUltimo[contexto] = ahora;
      console.warn('IRV: fallo silencioso en ' + contexto, err);
      var reg = JSON.parse(localStorage.getItem('pm_fallos') || '[]');
      reg.push({ts: ahora, donde: contexto, codigo: (err && err.code) || '', msg: String((err && err.message) || err || '').slice(0, 100)});
      localStorage.setItem('pm_fallos', JSON.stringify(reg.slice(-50)));
    } catch(e) { /* el registro nunca debe romper nada */ }
  };
}

