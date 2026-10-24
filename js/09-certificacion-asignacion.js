// ===== CERTIFICACIÓN DE PARTES =====
// Cada 4 (o más) partes sin certificar de una misma orden, se ofrece agruparlos en un
// "bloque certificado" (campo bloqueCertificado en el parte, número de bloque correlativo
// por orden). Es solo una marca — no cambia el estado de la incidencia ni ningún cálculo
// de horas/km/dieta existente.
function _siguienteBloqueCertificado(pedido, centro, clienteId){
  var cid = clienteId||'mercadona';
  var max=0;
  getH().forEach(function(r){
    if(r.pedido===pedido && r.centro===centro && (r.clienteId||'mercadona')===cid && r.bloqueCertificado>max) max=r.bloqueCertificado;
  });
  return max+1;
}
function _marcarCertificadoEnFirestore(r, bloque, fechaCert){
  if(typeof _db==='undefined'||!_db) return;
  var docId=((r.clienteId||'mercadona')+'_'+r.fecha+'_'+r.centro+'_'+r.pedido).replace(/[\/\s]/g,'-');
  _db.collection('partes').doc(docId).set({
    bloqueCertificado: bloque, fechaCertificado: fechaCert, fechaModificacion: Date.now(),
    ultimaModificacionRazon: 'Certificado (bloque '+bloque+')'
  }, {merge:true}).catch(_fallo('_marcarCertificadoEnFirestore partes.set'));
}
// Certifica TODOS los partes sin certificar de una orden ya guardados (usado desde el
// resumen de la orden, sin relación a guardar un parte nuevo).
function certificarOrden(pedido, centro, clienteId){
  var cid = clienteId||'mercadona';
  var nuevoBloque = _siguienteBloqueCertificado(pedido, centro, cid);
  // fechaCertificado es un campo propio (distinto de fechaModificacion, que cualquier
  // edición posterior del parte sobreescribe) — así la fecha mostrada en el resumen no se
  // pierde si el parte se toca por otro motivo después de certificarse.
  var ahora = Date.now();
  var h = getH();
  var afectados=[];
  h.forEach(function(r){
    if(r.pedido===pedido && r.centro===centro && (r.clienteId||'mercadona')===cid && !r.bloqueCertificado){
      r.bloqueCertificado = nuevoBloque; r.fechaCertificado = ahora; afectados.push(r);
    }
  });
  setH(h);
  afectados.forEach(function(r){ _marcarCertificadoEnFirestore(r, nuevoBloque, ahora); });
  return nuevoBloque;
}
function certificarOrdenActual(){
  if(!_esAdmin()) return;
  var o=window._ordenActual; if(!o) return;
  certificarOrden(o.pedido, o.centro, o.clienteId);
  verOrden(encodeURIComponent(o.pedido)+'||'+encodeURIComponent(o.centro));
}
// Certifica desde el diálogo "¿La incidencia sigue abierta?": el parte que se está guardando
// AHORA entra también en el bloque nuevo (se le asigna antes de guardar, para que quede en
// el mismo guardado), y de paso se certifican los partes anteriores de la misma orden que
// aún estuvieran sin certificar.
function certificarDesdeDialogo(){
  if(!_esAdmin()) return;
  if(!window.recTmp) return;
  var r=window.recTmp;
  var cid=r.clienteId||'mercadona';
  var nuevoBloque=_siguienteBloqueCertificado(r.pedido, r.centro, cid);
  var ahora=Date.now();
  r.bloqueCertificado=nuevoBloque; r.fechaCertificado=ahora;
  // Marcar los demás partes sin certificar de la orden ANTES de guardarConEstado(): si el
  // parte actual resulta duplicado (misma fecha/pedido/centro que uno ya existente),
  // guardarConEstado() abre un diálogo de confirmación y guarda sobre un snapshot de h
  // capturado en ese momento — haciéndolo después pisaría este cambio al confirmar.
  var h=getH();
  // Índice real de edición: _editIdx puede haberse perdido (ver _finalizarGuardado, mismo
  // caso), por eso se cae a window._editIdxBackup igual que hace el guardado real.
  var _idxEdicion=(_editIdx!==null&&_editIdx!==undefined)?_editIdx:window._editIdxBackup;
  h.forEach(function(x,i){
    // Excluir el idx de edición: si se está editando, esa entrada es la versión vieja del
    // propio parte que se está guardando ahora (r), no otro parte distinto de la orden.
    if(i!==_idxEdicion && x!==r && x.pedido===r.pedido && x.centro===r.centro && (x.clienteId||'mercadona')===cid && !x.bloqueCertificado){
      x.bloqueCertificado=nuevoBloque; x.fechaCertificado=ahora; _marcarCertificadoEnFirestore(x, nuevoBloque, ahora);
    }
  });
  setH(h);
  guardarConEstado('en-ejecucion');
}

function cerrarIncidenciaActual(){
  var o=window._ordenActual;if(!o)return;
  var h=getH();
  h.forEach(function(r){if(r.pedido===o.pedido&&r.centro===o.centro){r.estado='terminado';_subirParteAFirestore(r,'Cierre directo');}});
  setH(h);
  // Actualizar también el estado de la incidencia en Firestore (fuente real de verdad),
  // igual que ya hace reabrirIncidenciaActual() al reabrir — así "Asignaciones" deja de
  // mostrarla como activa en cuanto se cierra, sea cual sea el camino por el que se cierre
  _db.collection('incidencias')
    .where('pedido','==',o.pedido)
    .where('centro','==',o.centro)
    .get().then(function(snap){
      snap.forEach(function(doc){
        _db.collection('incidencias').doc(doc.id).update(Object.assign({estado:'terminado'}, _marcaModificacion('Cierre directo')));
      });
      try {
        var estados = JSON.parse(localStorage.getItem('pm_incidencias_estados')||'{}');
        estados[(o.pedido||'')+'||'+(o.centro||'')] = 'terminado';
        localStorage.setItem('pm_incidencias_estados', JSON.stringify(estados));
      } catch(e) { _fallo('cerrarIncidenciaActual incidencias.update')(e); }
      refreshCounts();
      verOrden(encodeURIComponent(o.pedido)+'||'+encodeURIComponent(o.centro));
    }).catch(function(){ verOrden(encodeURIComponent(o.pedido)+'||'+encodeURIComponent(o.centro)); });
}
function reabrirIncidenciaActual(){
  var o=window._ordenActual;if(!o)return;
  var esTecnicoPuro=window._sesion && window._sesion.rol==='tecnico' && !window._sesion.multiRol;
  if(esTecnicoPuro){
    window._reabrirPedido=o.pedido; window._reabrirCentro=o.centro;
    _confirmarSolicitudReabrir();
    return;
  }
  // Solo cambiar el estado de la incidencia en Firestore — no tocar los partes
  _db.collection('incidencias')
    .where('pedido','==',o.pedido)
    .where('centro','==',o.centro)
    .get().then(function(snap){
      snap.forEach(function(doc){
        _db.collection('incidencias').doc(doc.id).update(Object.assign({estado:'en-ejecucion'}, _marcaModificacion('Reapertura directa')));
      });
      // Actualizar estado local
      try {
        var estados = JSON.parse(localStorage.getItem('pm_incidencias_estados')||'{}');
        estados[(o.pedido||'')+'||'+(o.centro||'')] = 'en-ejecucion';
        localStorage.setItem('pm_incidencias_estados', JSON.stringify(estados));
      } catch(e) { _fallo('reabrirIncidenciaActual incidencias.update')(e); }
      refreshCounts();
      verOrden(encodeURIComponent(o.pedido)+'||'+encodeURIComponent(o.centro));
    }).catch(function(){ verOrden(encodeURIComponent(o.pedido)+'||'+encodeURIComponent(o.centro)); });
}
function _actualizarIncidenciaPorOrden(pedido,centro,estado,datosParte){
  if(typeof _db === 'undefined' || !_db || !pedido) return;
  var _clienteIdInc = (datosParte && datosParte.clienteId) || 'mercadona';
  var _refInc = _db.collection('incidencias').doc(incidenciaId(centro,pedido));
  var _razonMod = estado==='terminado' ? 'Parte generado (cerrada)' : 'Parte generado (sigue abierta)';
  function _actualizarRefs(refs){
    var _descNueva = datosParte && (datosParte.averiaReportada||datosParte.obs);
    var _updateData = Object.assign({estado:estado, vista:true}, _marcaModificacion(_razonMod));
    if(_descNueva) _updateData.descripcion = _descNueva;
    return Promise.all(refs.map(function(ref){ return ref.update(_updateData); }));
  }
  function _crearNueva(){
    if(!datosParte) return Promise.resolve();
    // Crear incidencia siempre — incluido cuando se cierra en el primer parte.
    // ID fijo en vez de .add(): si este mismo guardado se repitiera (reintento tras un
    // corte de conexión), cae sobre el MISMO documento en vez de crear uno paralelo.
    return _refInc.set(Object.assign({
      clienteId: _clienteIdInc,
      pedido: pedido, centro: centro||'',
      tienda: datosParte.tienda||'', dir: datosParte.dir||'', tel: datosParte.tel||'',
      job: datosParte.job||'', tecnicoPrincipal: datosParte.tecnicoPrincipal||'',
      creadoPor: datosParte.creadoPor||'', estado: estado,
      descripcion: datosParte.averiaReportada||datosParte.obs||'',
      verificarDatos: !!datosParte.origenAutoLectura,
      vista: true, vistaAdmin: false, fechaCreacion: Date.now()
    }, _marcaModificacion(_razonMod)));
  }
  _refInc.get().then(function(doc){
    if(doc.exists) return _actualizarRefs([_refInc]);
    // No existe con el ID fijo — puede ser una incidencia de antes de este cambio, guardada
    // con ID aleatorio (.add() antiguo). Buscarla por pedido+centro antes de asumir que es
    // nueva, para no crear un documento paralelo de una que ya existe con otro ID.
    return _db.collection('incidencias').where('pedido','==',pedido).where('centro','==',centro).get()
      .then(function(snap){
        if(!snap.empty) return _actualizarRefs(snap.docs.map(function(d){ return d.ref; }));
        return _crearNueva();
      });
  }).then(function(){ _limpiarIncidenciaPendientePorPedido(pedido,centro); })
    .catch(function(){ _marcarIncidenciaPendientePorPedido(pedido,centro); });
  if(estado==='terminado'){
    _db.collection('partes').where('pedido','==',pedido).where('centro','==',centro).get().then(function(snap){
      return Promise.all(snap.docs.map(function(doc){ return doc.ref.update({estado:'terminado', fechaModificacion:Date.now(), ultimaModificacionRazon:'Cierre de incidencia (sincronizado)'}); }));
    }).catch(function(){ _marcarIncidenciaPendientePorPedido(pedido,centro); });
    var h=getH();
    h.forEach(function(r){ if(r.pedido===pedido && r.centro===centro) r.estado='terminado'; });
    setH(h);
    try {
      var estados = JSON.parse(localStorage.getItem('pm_incidencias_estados')||'{}');
      estados[(pedido||'')+'||'+(centro||'')] = 'terminado';
      localStorage.setItem('pm_incidencias_estados', JSON.stringify(estados));
    } catch(e) { _fallo('_actualizarIncidenciaPorOrden')(e); }
  }
}
function renderAsgTecnico() {
  var sec = $('asgTecSection'); var el = $('asgTecLista');
  if (!sec || !el) return;
  var esTecnico = window._sesion && window._sesion.rol === 'tecnico';
  if (!esTecnico || _esTecnicoSinPrincipal()) { sec.style.display = 'none'; return; }
  // Usar el nombre exacto del catálogo para la comparación (case-sensitive en Firestore)
  var miNombre = window._sesion.nombre;
  var _tec = getTecnicos().find(function(t){ return t.nombre.toLowerCase() === miNombre.toLowerCase(); });
  if (_tec) miNombre = _tec.nombre;
  Promise.all([
    _db.collection('incidencias')
      .where('tecnicoPrincipal','==',miNombre)
      .where('estado','in',['pendiente','en-ejecucion'])
      .get(),
    _db.collection('incidencias')
      .where('solicitudReabrir.tecnico','==',miNombre)
      .get()
  ]).then(function(resultados){
    var snap = resultados[0], snapRechazadas = resultados[1];
    var html = '';
    snap.forEach(function(doc){
      var d = doc.data();
      if (d.vista === true) return; // ya vista por el técnico
      var refs=[]; if(d.pedido) refs.push('Orden '+escHtml(d.pedido)); if(d.centro) refs.push('Centro '+escHtml(d.centro));
      html += '<div class="act-list-item" onclick="abrirAsgTecOpciones(\''+doc.id+'\')">'
        + '<span class="act-num">&#128229;</span>'
        + '<div><div class="act-info">'+escHtml(d.tienda)+'</div>'
        + '<div class="act-sub">'+(refs.length?refs.join(' · ')+' · ':'')+escHtml(d.job)+'</div></div>'
        + '</div>';
    });
    snapRechazadas.forEach(function(doc){
      var d = doc.data();
      if (!d.solicitudReabrir || !d.solicitudReabrir.rechazada) return; // aún no resuelta, o ya aceptada
      var refs=[]; if(d.pedido) refs.push('Orden '+escHtml(d.pedido)); if(d.centro) refs.push('Centro '+escHtml(d.centro));
      html += '<div class="act-list-item" onclick="verSolicitudRechazada(\''+doc.id+'\')">'
        + '<span class="act-num" style="color:var(--red);">&#128274;</span>'
        + '<div><div class="act-info">'+escHtml(d.tienda)+'</div>'
        + '<div class="act-sub">'+(refs.length?refs.join(' · ')+' · ':'')+'Solicitud de reabrir rechazada</div></div>'
        + '</div>';
    });
    if (!html) { sec.style.display = 'none'; el.innerHTML=''; }
    else { el.innerHTML = html; sec.style.display = 'block'; }
  }).catch(function(){ sec.style.display = 'none'; });
}

function verSolicitudRechazada(id){
  _db.collection('incidencias').doc(id).get().then(function(doc){
    if (!doc.exists) return;
    var d = doc.data();
    var refs=[]; if(d.pedido) refs.push('Orden '+escHtml(d.pedido)); if(d.centro) refs.push('Centro '+escHtml(d.centro));
    var html = '<div class="card"><div class="card-title">&#128274; Solicitud de reapertura rechazada</div>'
      + '<div class="rrow info-row"><span class="rc">'+escHtml(d.tienda||'')+'</span><span class="rl"></span><span class="rv"></span></div>'
      + (refs.length?'<div class="rrow info-row"><span class="rc">Datos</span><span class="rl">'+refs.join(' · ')+'</span><span class="rv"></span></div>':'')
      + '<div class="dialogo-sub" style="margin-top:10px;">Un administrador no aprobó reabrir esta incidencia. Si es necesario, contacta con un administrador.</div>'
      + '</div>'
      + '<button class="btn btn-p btn-full" style="margin-top:12px;" onclick="_confirmarVistaSolicitudRechazada(\''+id+'\')">&#10003; Entendido</button>';
    document.querySelectorAll('.win').forEach(function(w){w.classList.remove('active');});
    $('w-consultaAsg').classList.add('active');
    $('consultaAsgBody').innerHTML = html;
  });
}
function _confirmarVistaSolicitudRechazada(id){
  _db.collection('incidencias').doc(id).update(Object.assign({
    solicitudReabrir: firebase.firestore.FieldValue.delete()
  }, _marcaModificacion('Técnico confirmó ver rechazo'))).then(function(){
    renderAsgTecnico();
    goTo('w-clientes');
  }).catch(function(){
    _toast('No se pudo actualizar. Comprueba tu conexión.', 'var(--red)');
  });
}

function renderAsgAdmin() {
  var sec = $('asgAdminSection'); var el = $('asgAdminLista');
  if (!sec || !el) return;
  var esAdmin = window._sesion && window._sesion.rol === 'admin';
  if (!esAdmin) { sec.style.display = 'none'; return; }
  Promise.all([
    _db.collection('incidencias').where('vistaAdmin','==',false).get(),
    _db.collection('notificacionesTecnico').get(),
    _db.collection('materialesFlotantes').get(),
    _db.collection('partesSinGuardar').get()
  ]).then(function(resultados){
    var snap = resultados[0];
    var snapNotif = resultados[1];
    var snapMatFlotante = resultados[2];
    // Solo se muestran los que ya llevan 15 min o más sin guardarse de verdad — comparado
    // contra la hora actual de quien mira, no depende de nada "corriendo" en segundo plano
    // (ver _guardarBorradorParte()/_borrarBorradorParte()).
    var LIMITE_SIN_GUARDAR_MS = 15*60*1000;
    var ahoraMs = Date.now();
    var partesSinGuardarPendientes=[];
    resultados[3].forEach(function(doc){
      var d=doc.data();
      if(ahoraMs-(d.generadoEn||0) >= LIMITE_SIN_GUARDAR_MS) partesSinGuardarPendientes.push(Object.assign({id:doc.id}, d));
    });
    if (snap.empty && snapNotif.empty && snapMatFlotante.empty && !partesSinGuardarPendientes.length) { sec.style.display = 'none'; el.innerHTML=''; return; }
    var html = '';
    snap.forEach(function(doc){
      var d = doc.data();
      var refs=[]; if(d.pedido) refs.push('Orden '+escHtml(d.pedido)); if(d.centro) refs.push('Centro '+escHtml(d.centro));
      if(d.solicitudReabrir){
        html += '<div class="act-list-item" onclick="verSolicitudReabrir(\''+doc.id+'\')">'
          + '<span class="act-num">&#128275;</span>'
          + '<div><div class="act-info">'+escHtml(d.tienda)+'</div>'
          + '<div class="act-sub">'+(refs.length?refs.join(' · ')+' · ':'')+escHtml(d.solicitudReabrir.tecnico)+' solicita reabrir</div></div>'
          + '</div>';
      } else {
        html += '<div class="act-list-item" onclick="verAsgAdminAviso(\''+doc.id+'\',\''+(d.clienteId||'')+'\')">'
          + '<span class="act-num">&#128229;</span>'
          + '<div><div class="act-info">'+escHtml(d.tienda)+'</div>'
          + '<div class="act-sub">'+(refs.length?refs.join(' · ')+' · ':'')+escHtml(d.job)+' · Creada por '+escHtml(d.creadoPor)+'</div>'
          + (d.verificarDatos?'<div class="act-sub" style="color:var(--amber);font-weight:600;">&#9888;&#65039; Verificar datos y validarlos</div>':'')
          + '</div>'
          + '</div>';
      }
    });
    snapNotif.forEach(function(doc){
      var n = doc.data();
      html += '<div class="act-list-item" onclick="verNotificacionTecnico(\''+doc.id+'\')">'
        + '<span class="act-num" style="color:var(--red);">&#9888;&#65039;</span>'
        + '<div><div class="act-info">'+escHtml(n.tecnico)+'</div>'
        + '<div class="act-sub">intentó entrar estando desactivado · '+_fmtFechaHora(n.fecha)+'</div></div>'
        + '</div>';
    });
    if(!snapMatFlotante.empty){
      var flotDocs=[]; snapMatFlotante.forEach(function(doc){ flotDocs.push(Object.assign({id:doc.id}, doc.data())); });
      var totalFlot=flotDocs.length;
      if(totalFlot===1){
        var unico=flotDocs[0];
        html += '<div class="act-list-item" onclick="verMaterialFlotanteAviso(\''+(unico.grupo||'').replace(/'/g,"\\'")+'\')">'
          + '<span class="act-num" style="color:var(--amber);">&#129513;</span>'
          + '<div><div class="act-info">'+escHtml(unico.nombre)+'</div>'
          + '<div class="act-sub">Material pendiente de clasificar · '+escHtml(unico.grupo)+'</div></div>'
          + '</div>';
      } else {
        html += '<div class="act-list-item" onclick="verMaterialFlotanteAviso(null)">'
          + '<span class="act-num" style="color:var(--amber);">&#129513;</span>'
          + '<div><div class="act-info">'+totalFlot+' materiales pendientes</div>'
          + '<div class="act-sub">Pendientes de clasificar en el cat&aacute;logo</div></div>'
          + '</div>';
      }
    }
    partesSinGuardarPendientes.forEach(function(p){
      var refs=[]; if(p.pedido) refs.push('Orden '+escHtml(p.pedido)); if(p.centro) refs.push('Centro '+escHtml(p.centro));
      html += '<div class="act-list-item" onclick="verParteSinGuardarAviso(\''+p.id+'\')">'
        + '<span class="act-num" style="color:var(--red);">&#128203;</span>'
        + '<div><div class="act-info">'+escHtml(p.tienda||'')+'</div>'
        + '<div class="act-sub">'+(refs.length?refs.join(' · ')+' · ':'')+escHtml(p.tecnicoGenerador||'')+' generó un parte y no lo guardó</div>'
        + '<div class="act-sub" style="color:var(--amber);font-weight:600;">&#9888;&#65039; Generado el '+_fmtFechaHora(p.generadoEn)+'</div>'
        + '</div>'
        + '</div>';
    });
    el.innerHTML = html;
    sec.style.display = 'block';
  }).catch(function(){ sec.style.display = 'none'; });
}
function verMaterialFlotanteAviso(nombreGrupo){
  if(nombreGrupo){
    var g=getCat().grupos.find(function(x){return x.nombre===nombreGrupo;});
    if(g){ abrirCatalogo(); setTimeout(function(){ catAbrirGrupo(g.id); }, 50); return; }
  }
  abrirCatalogo();
}
function verNotificacionTecnico(id){
  _db.collection('notificacionesTecnico').doc(id).delete().then(renderAsgAdmin).catch(_fallo('verNotificacionTecnico notificacionesTecnico.delete'));
}
function verParteSinGuardarAviso(id){
  _db.collection('partesSinGuardar').doc(id).get().then(function(doc){
    if(!doc.exists){ showMsg('msgRes','Este parte ya no está pendiente.','warn'); return; }
    var d=doc.data();
    var refs=[]; if(d.pedido) refs.push('Orden '+escHtml(d.pedido)); if(d.centro) refs.push('Centro '+escHtml(d.centro));
    var fF=d.fecha?d.fecha.split('-').reverse().join('/'):'';
    var html = '<div class="card"><div class="card-title">&#128203; '+escHtml(d.tienda||'')+'</div>'
      + '<div class="rrow info-row" style="color:var(--amber);font-weight:600;"><span class="rc">&#9888;&#65039; Aviso</span><span class="rl">Generado el '+_fmtFechaHora(d.generadoEn)+', sin guardar</span><span class="rv"></span></div>'
      + (refs.length?'<div class="rrow info-row"><span class="rc">Datos</span><span class="rl">'+refs.join(' · ')+'</span><span class="rv"></span></div>':'')
      + '<div class="rrow info-row"><span class="rc">Técnico</span><span class="rl">'+escHtml(d.tecnicoGenerador||'')+'</span><span class="rv"></span></div>'
      + '<div class="rrow info-row"><span class="rc">Fecha del parte</span><span class="rl">'+fF+'</span><span class="rv"></span></div>'
      + (d.obs?'<div class="rrow obs-row"><span class="rc">Descripción</span><span class="rl">'+escHtml(d.obs).replace(/\n/g,'<br>')+'</span><span class="rv"></span></div>':'')
      + '</div>'
      + '<div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin:14px 0 7px;">Contenido generado</div>'
      + (d.detalle||'')
      + '<button class="btn btn-p btn-full" style="margin-top:12px;" onclick="_terminarDeGuardarParte(\''+id+'\')">&#9989; Terminar de guardar</button>'
      + '<button class="btn btn-d btn-full" style="margin-top:8px;" onclick="_descartarParteSinGuardar(\''+id+'\')">&#128465;&#65039; Descartar</button>'
      + '<button class="btn btn-s btn-full" style="margin-top:8px;" onclick="goTo(\'w-clientes\')">&#8592; Volver</button>';
    $('consultaAsgBody').innerHTML = html;
    document.querySelectorAll('.win').forEach(function(w){w.classList.remove('active');});
    $('w-consultaAsg').classList.add('active');
  });
}
function _descartarParteSinGuardar(id){
  _confirmarApp('¿Descartar este parte sin guardar? No podrá recuperarse.', function(){
    _db.collection('partesSinGuardar').doc(id).delete().then(function(){
      showMsg('msgRes','Descartado.','success');
      goTo('w-clientes');
      renderAsgAdmin();
    }).catch(function(){ showMsg('msgRes','No se pudo descartar. Comprueba tu conexión.','error'); });
  });
}
var _parteSinGuardarActual=null;
function _terminarDeGuardarParte(id){
  _db.collection('partesSinGuardar').doc(id).get().then(function(doc){
    if(!doc.exists){ showMsg('msgRes','Este parte ya no está pendiente.','warn'); return; }
    _parteSinGuardarActual={id:id, datos:doc.data()};
    var d=_parteSinGuardarActual.datos;
    $('dlgTerminarGuardadoSub').textContent='Orden '+(d.pedido||'')+' — '+(d.tienda||'');
    $('dlgTerminarGuardado').classList.add('show');
  });
}
// El admin elige aquí lo que el técnico nunca llegó a elegir (Sigue abierta / Cerrar) y el
// parte se guarda como real, con el técnico que lo generó como creadoPor — no el admin que
// lo termina de guardar (ver el ajuste de creadoPor en _subirParteAFirestore()).
function _confirmarTerminarGuardado(estado){
  $('dlgTerminarGuardado').classList.remove('show');
  if(!_parteSinGuardarActual) return;
  var d=_parteSinGuardarActual.datos;
  var id=_parteSinGuardarActual.id;
  var r=Object.assign({}, d);
  delete r.generadoEn;
  r.estado=estado;
  r.creadoPor=d.tecnicoGenerador||'';
  delete r.tecnicoGenerador;
  var h=getH();
  var _idxDup=h.findIndex(function(x){ return x.fecha===r.fecha&&x.pedido===r.pedido&&x.centro===r.centro; });
  if(_idxDup>=0){ h[_idxDup]=r; } else { h.push(r); }
  setH(h);
  _subirParteAFirestore(r, 'Terminado de guardar por '+((window._sesion&&window._sesion.nombre)||'admin')+' — generado por '+(d.tecnicoGenerador||'?'));
  _db.collection('partesSinGuardar').doc(id).delete().catch(_fallo('_confirmarTerminarGuardado partesSinGuardar.delete'));
  _parteSinGuardarActual=null;
  showMsg('msgRes','Parte guardado correctamente.','success');
  goTo('w-clientes');
  renderAsgAdmin();
}
function verAsgAdminAviso(id, clienteId) {
  _db.collection('incidencias').doc(id).get().then(function(doc){
    if (!doc.exists) return;
    var d = doc.data();
    // vistaAdmin ya NO se marca aquí, solo al mirar — se queda pendiente hasta que de
    // verdad se resuelve (pulsando "Ver / reasignar"), igual que "material flotante".
    var refs=[]; if(d.pedido) refs.push('Orden '+d.pedido); if(d.centro) refs.push('Centro '+d.centro);
    var html = '<div class="card"><div class="card-title">&#128229; '+(d.tienda||'')+'</div>'
      + (d.verificarDatos?'<div class="rrow info-row" style="color:var(--amber);font-weight:600;"><span class="rc">&#9888;&#65039; Aviso</span><span class="rl">Datos por lectura autom&aacute;tica — verificar y validar</span><span class="rv"></span></div>':'')
      + (refs.length?'<div class="rrow info-row"><span class="rc">Datos</span><span class="rl">'+refs.join(' · ')+'</span><span class="rv"></span></div>':'')
      + '<div class="rrow info-row"><span class="rc">Trabajo</span><span class="rl">'+(d.job||'')+'</span><span class="rv"></span></div>'
      + '<div class="rrow info-row"><span class="rc">T&eacute;cnico</span><span class="rl">'+(d.tecnicoPrincipal||'')+'</span><span class="rv"></span></div>'
      + (d.dir?'<div class="rrow info-row"><span class="rc">Direcci&oacute;n</span><span class="rl">'+d.dir+'</span><span class="rv"></span></div>':'')
      + (d.tel?'<div class="rrow info-row"><span class="rc">Tel&eacute;fono</span><span class="rl">'+d.tel+'</span><span class="rv"></span></div>':'')
      + (d.km?'<div class="rrow info-row"><span class="rc">Km</span><span class="rl">'+d.km+'</span><span class="rv"></span></div>':'')
      + (d.tr?'<div class="rrow info-row"><span class="rc">Despl.</span><span class="rl">'+d.tr+' min</span><span class="rv"></span></div>':'')
      + (d.descripcion?'<div class="rrow obs-row"><span class="rc">Descripci&oacute;n</span><span class="rl">'+d.descripcion.replace(/\n/g,'<br>')+'</span><span class="rv"></span></div>':'')
      + '</div>'
      + '<button class="btn btn-p btn-full" style="margin-top:12px;" onclick="verAsgAdminReasignar(\''+clienteId+'\',\''+id+'\')">&#128260; Ver / reasignar</button>'
      + '<button class="btn btn-s btn-full" style="margin-top:8px;" onclick="goTo(\'w-clientes\')">&#8592; Volver</button>';
    $('consultaAsgBody').innerHTML = html;
    goTo('w-consultaAsg');
  });
}
function verAsgAdminReasignar(clienteId, id) {
  // Aquí sí se marca vistaAdmin: true — es la acción real de resolver el aviso, no de
  // solo abrirlo a mirar.
  if (id) _db.collection('incidencias').doc(id).update(Object.assign({ vistaAdmin: true }, _marcaModificacion('Aviso visto por admin'))).then(renderAsgAdmin).catch(_fallo('verAsgAdminReasignar incidencias.update'));
  var cli = getClientes().find(function(c){ return c.id === clienteId; });
  if (cli) { seleccionarCliente(clienteId); abrirAsignar(); }
}

function verSolicitudReabrir(id) {
  _db.collection('incidencias').doc(id).get().then(function(doc){
    if (!doc.exists) return;
    var d = doc.data();
    var refs=[]; if(d.pedido) refs.push('Orden '+d.pedido); if(d.centro) refs.push('Centro '+d.centro);
    var tec = (d.solicitudReabrir&&d.solicitudReabrir.tecnico)||'';
    var html = '<div class="card"><div class="card-title">&#128275; Solicitud de reapertura</div>'
      + '<div class="rrow info-row"><span class="rc">'+(d.tienda||'')+'</span><span class="rl"></span><span class="rv"></span></div>'
      + (refs.length?'<div class="rrow info-row"><span class="rc">Datos</span><span class="rl">'+refs.join(' · ')+'</span><span class="rv"></span></div>':'')
      + (d.job?'<div class="rrow info-row"><span class="rc">Trabajo</span><span class="rl">'+d.job+'</span><span class="rv"></span></div>':'')
      + '<div class="rrow info-row"><span class="rc">Solicitado por</span><span class="rl">'+tec+'</span><span class="rv"></span></div>'
      + (d.dir?'<div class="rrow info-row"><span class="rc">Direcci&oacute;n</span><span class="rl">'+d.dir+'</span><span class="rv"></span></div>':'')
      + (d.tel?'<div class="rrow info-row"><span class="rc">Tel&eacute;fono</span><span class="rl">'+d.tel+'</span><span class="rv"></span></div>':'')
      + (d.km?'<div class="rrow info-row"><span class="rc">Km</span><span class="rl">'+d.km+'</span><span class="rv"></span></div>':'')
      + (d.tr?'<div class="rrow info-row"><span class="rc">Despl.</span><span class="rl">'+d.tr+' min</span><span class="rv"></span></div>':'')
      + (d.descripcion?'<div class="rrow obs-row"><span class="rc">Descripci&oacute;n</span><span class="rl">'+d.descripcion.replace(/\n/g,'<br>')+'</span><span class="rv"></span></div>':'')
      + '</div>'
      + '<button class="btn btn-p btn-full" style="margin-top:12px;" onclick="ejecutarSolicitudReabrir(\''+id+'\')">&#128275; Reabrir y asignar a '+tec+'</button>'
      + '<button class="btn btn-d btn-full" style="margin-top:8px;" onclick="rechazarSolicitudReabrir(\''+id+'\')">&#10005; Rechazar</button>'
      + '<button class="btn btn-s btn-full" style="margin-top:8px;" onclick="goTo(\'w-clientes\')">&#8592; Volver</button>';
    $('consultaAsgBody').innerHTML = html;
    goTo('w-consultaAsg');
    // vistaAdmin ya NO se marca aquí, solo al mirar — se queda pendiente hasta que se
    // resuelve de verdad (aceptando o rechazando), igual que "material flotante".
  });
}

function rechazarSolicitudReabrir(id) {
  _confirmarApp('¿Rechazar esta solicitud de reapertura? El técnico verá que fue rechazada.', function(){
    _db.collection('incidencias').doc(id).get().then(function(doc){
      if (!doc.exists) return;
      var d = doc.data();
      var tec = (d.solicitudReabrir&&d.solicitudReabrir.tecnico)||'';
      doc.ref.update(Object.assign({
        vistaAdmin: true,
        'solicitudReabrir.rechazada': true,
        'solicitudReabrir.fechaRechazo': Date.now()
      }, _marcaModificacion('Solicitud de reapertura rechazada'))).then(function(){
        renderAsgAdmin();
        goTo('w-clientes');
        _toast('Solicitud rechazada. '+tec+' verá el aviso.');
      }).catch(function(){
        _toast('No se pudo rechazar. Comprueba la conexión e inténtalo de nuevo.', 'var(--red)');
      });
    });
  });
}

function ejecutarSolicitudReabrir(id) {
  _db.collection('incidencias').doc(id).get().then(function(doc){
    if (!doc.exists) return;
    var d = doc.data();
    var tec = (d.solicitudReabrir&&d.solicitudReabrir.tecnico)||d.tecnicoPrincipal;
    var _tec2=getTecnicos().find(function(t){ return t.nombre.toLowerCase()===(tec||'').toLowerCase(); });
    if(_tec2) tec=_tec2.nombre;
    doc.ref.update(Object.assign({
      estado: 'en-ejecucion',
      tecnicoPrincipal: tec,
      vista: false,
      vistaAdmin: true,
      solicitudReabrir: firebase.firestore.FieldValue.delete()
    }, _marcaModificacion('Reapertura aprobada'))).then(function(){
      _sincronizarRegistroGlobal();
      renderAsgAdmin();
      goTo('w-clientes');
      _toast('Incidencia reabierta y asignada a '+tec+'.');
    }).catch(function(){
      _toast('No se pudo reabrir. Comprueba la conexión e inténtalo de nuevo.', 'var(--red)');
    });
  });
}

var _asgTecActual = null;
function abrirAsgTecOpciones(id) {
  _db.collection('incidencias').doc(id).get().then(function(doc){
    if (!doc.exists) return;
    _asgTecActual = Object.assign({id: doc.id}, doc.data());
    $('dlgAsgTecTitulo').textContent = _asgTecActual.tienda || 'Incidencia';
    var refs=[]; if(_asgTecActual.pedido) refs.push('Orden '+_asgTecActual.pedido); if(_asgTecActual.centro) refs.push('Centro '+_asgTecActual.centro);
    $('dlgAsgTecSub').textContent = (refs.length?refs.join(' · ')+' · ':'')+(_asgTecActual.job||'');
    $('dlgAsgTec').classList.add('show');
  });
}

function consultarAsgTec() {
  if (!_asgTecActual) return;
  $('dlgAsgTec').classList.remove('show');
  var d = _asgTecActual;
  var refs=[]; if(d.pedido) refs.push('N&ordm; orden: '+d.pedido); if(d.centro) refs.push('N&ordm; centro: '+d.centro);
  var html = '<div class="card"><div class="card-title">&#128229; '+(d.tienda||'')+'</div>'
    + (refs.length?'<div class="rrow info-row"><span class="rc">Datos</span><span class="rl">'+refs.join(' · ')+'</span><span class="rv"></span></div>':'')
    + '<div class="rrow info-row"><span class="rc">Trabajo</span><span class="rl">'+(d.job||'')+'</span><span class="rv"></span></div>'
    + (d.dir?'<div class="rrow info-row"><span class="rc">Direcci&oacute;n</span><span class="rl">'+d.dir+'</span><span class="rv"></span></div>':'')
    + (d.tel?'<div class="rrow info-row"><span class="rc">Tel&eacute;fono</span><span class="rl">'+d.tel+'</span><span class="rv"></span></div>':'')
    + (d.km?'<div class="rrow info-row"><span class="rc">Km</span><span class="rl">'+d.km+'</span><span class="rv"></span></div>':'')
    + (d.tr?'<div class="rrow info-row"><span class="rc">Despl.</span><span class="rl">'+d.tr+' min</span><span class="rv"></span></div>':'')
    + (d.descripcion?'<div class="rrow obs-row"><span class="rc">Descripci&oacute;n</span><span class="rl">'+d.descripcion.replace(/\n/g,'<br>')+'</span><span class="rv"></span></div>':'')
    + '</div><button class="btn btn-s btn-full" onclick="goTo(\'w-clientes\')">&#8592; Volver</button>';
  document.querySelectorAll('.win').forEach(function(w){w.classList.remove('active');});
  $('w-consultaAsg').classList.add('active');
  $('consultaAsgBody').innerHTML = html;
}

function ejecutarAsgTec() {
  if (!_asgTecActual) return;
  $('dlgAsgTec').classList.remove('show');
  var d = _asgTecActual;
  var cli = getClientes().find(function(c){ return c.id === d.clienteId; });
  curCliente = cli || null;
  if (!curCliente) return;
  goToRaw('w-form');
  nuevo();
  _asgTecActual = d;
  if (d.pedido) {
    var esMerc = curCliente.tipo === 'mercadona';
    if (esMerc) {
      $('pedido').value = d.pedido;
      if (d.job === 'Obras') _actObrasSeleccionada = d.pedido;
    }
    else { _pedidoNoMerc = d.pedido; $('pedidoGenDisplay').textContent = d.pedido; _autoNumParte0000(d.pedido, d.centro); }
  }
  // Si la asignación no traía km/tr/dir/tel/tienda, completar desde la agenda compartida
  var datos = { centro:d.centro, tienda:d.tienda, dir:d.dir, tel:d.tel, km:d.km, tr:d.tr, job:d.job, descripcion:d.descripcion };
  if(!datos.km || !datos.dir || !datos.tel || !datos.tienda){
    var ag = agendaBuscar(d.clienteId, d.centro);
    if(ag){
      if(!datos.km && ag.km) datos.km=ag.km;
      if(!datos.tr && ag.tr) datos.tr=ag.tr;
      if(!datos.dir && ag.dir) datos.dir=ag.dir;
      if(!datos.tel && ag.tel) datos.tel=ag.tel;
      if(!datos.tienda && ag.tienda) datos.tienda=ag.tienda;
    }
  }
  _rellenarFormulario(datos);
  if (d.pedido) ocultarLectura();
}

