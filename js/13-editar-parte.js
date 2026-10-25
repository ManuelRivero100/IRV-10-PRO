// ===== AUTOCOMPLETADO =====
var _cAC=null,_oAC=null;

function seleccionarOrdenInicioForm(idx){
  $('dlgInicioOrden').classList.remove('show');
  goToRaw('w-form');
  nuevo();
  var h=getH(); var r=h[idx]; if(!r) return;
  // Si es una actuación de Obras, fijar el IRV ANTES de rellenar el tipo de trabajo —
  // así, cuando rellenarDatos() active "Obras", setJob() ve que ya hay uno asignado y no
  // genera un IRV nuevo de más.
  if(r.actObras) _actObrasSeleccionada=r.actObras;
  // Autorrellenar todo
  if(r.pedido) $('pedido').value=r.pedido;
  rellenarDatos(idx, true); // orden activa: autorellena tipo de trabajo
  // Para no-Mercadona: el número IRV ya está asignado
  var esMerc=curCliente&&curCliente.tipo==='mercadona';
  if(!esMerc){
    _pedidoNoMerc=r.pedido;
    $('pedidoGenDisplay').textContent=r.pedido;
  }
  // Si hay número de orden, ocultar bloque de lectura
  if(r.pedido) ocultarLectura();
}

function seleccionarOrdenInicioFormPedido(pedido, centro){
  $('dlgInicioOrden').classList.remove('show');
  goToRaw('w-form');
  nuevo();
  if(pedido) $('pedido').value=pedido;
  var clienteId=curCliente?curCliente.id:'mercadona';
  var ag=centro?agendaBuscar(clienteId,centro):null;
  if(ag){
    rellenarDesdeAgenda(clienteId, centro);
  } else if(centro){
    $('centro').value=centro; buscarPorCentroORef(centro);
  }
  var esMerc=curCliente&&curCliente.tipo==='mercadona';
  if(!esMerc){
    _pedidoNoMerc=pedido;
    $('pedidoGenDisplay').textContent=pedido;
    _autoNumParte0000(pedido, centro);
  }
  if(pedido) ocultarLectura();
  // Descripción de la incidencia: no hay parte local (por eso se llegó por este camino),
  // así que se busca directamente en Firestore y se rellena en cuanto llegue la respuesta
  if(pedido && typeof _db !== 'undefined' && _db){
    var reg=_registroGlobal(pedido, clienteId);
    var _traerDesc=function(doc){
      if(!doc||!doc.exists) return;
      var desc=doc.data().descripcion;
      if(!desc) return;
      var fd=$('fieldDescIncidencia'); var dd=$('descIncidencia');
      if(fd&&dd){ fd.style.display='block'; dd.value=desc; }
    };
    if(reg&&reg.id){
      _db.collection('incidencias').doc(reg.id).get().then(_traerDesc).catch(_fallo('seleccionarOrdenInicioFormPedido incidencias.get #1'));
    } else {
      _db.collection('incidencias').where('pedido','==',pedido).where('centro','==',(centro||'')).where('clienteId','==',clienteId).limit(1).get()
        .then(function(snap){ if(!snap.empty) _traerDesc(snap.docs[0]); }).catch(_fallo('seleccionarOrdenInicioFormPedido incidencias.get #2'));
    }
  }
}

function setFestivo(v,btn){
  esFestivo=v;
  document.querySelectorAll('#festivoTgl button').forEach(function(b){ b.classList.remove('active'); });
  if(btn) btn.classList.add('active');
}

function setLink(v,btn){
  curLink=v; $('link').value=v;
  document.querySelectorAll('#lnkTgl button').forEach(function(b){ b.classList.remove('active'); });
  if(btn) btn.classList.add('active');
  $('modeNo').style.display=v==='Si'?'none':'block';
  $('modeSi').style.display=v==='No'?'none':'block';
  _actualizarTodosEnlazanVisibilidad();
}

var curOrigen='nave';
function setOrigen(v,btn){
  curOrigen=v; $('origen').value=v;
  document.querySelectorAll('#origTgl button').forEach(function(b){ b.classList.remove('active'); });
  if(btn) btn.classList.add('active');
  $('modeNave').style.display=v==='otro'?'none':'block';
  $('modeOtroPunto').style.display=v==='otro'?'block':'none';
}

// Busca si ya existe una pareja de tiendas guardada (tienda actual + tienda destino) —
// si existe, autorrellena y bloquea km/despl. de salida (exclusivos de esa pareja); si no,
// los deja libres para rellenar a mano (se guardan al generar el parte, sirven en los dos
// sentidos). El NOMBRE de la tienda destino es un dato de esa tienda, no de la pareja — se
// autorrellena y bloquea aparte, desde la Agenda general, en cuanto el centro es conocido,
// exista o no ya una pareja guardada con la tienda actual.
function buscarEnlacePar(){
  var centroDestino=($('enlaceDestinoCentro').value||'').trim();
  var centroActual=($('centro').value||'').trim();
  var clienteId=curCliente?curCliente.id:'mercadona';

  var ag=centroDestino?agendaBuscar(clienteId,centroDestino):null;
  var elDestino=$('enlaceDestino');
  if(elDestino){
    if(ag){
      elDestino.value=ag.tienda||'';
      elDestino.readOnly=true; elDestino.style.background='var(--surface2)'; elDestino.style.color='var(--text2)';
    } else {
      elDestino.readOnly=false; elDestino.style.background=''; elDestino.style.color='';
    }
  }

  var camposPar=['kmS','trS'];
  var par=(centroDestino&&centroActual)?enlaceBuscar(clienteId,centroActual,centroDestino):null;
  if(par){
    $('kmS').value=par.km||'';
    $('trS').value=par.tr||'';
    camposPar.forEach(function(id){ var el=$(id); if(el){ el.readOnly=true; el.style.background='var(--surface2)'; el.style.color='var(--text2)'; } });
  } else {
    camposPar.forEach(function(id){ var el=$(id); if(el){ el.readOnly=false; el.style.background=''; el.style.color=''; } });
  }
}

function _actualizarTodosEnlazanVisibilidad(){
  var f=$('todosEnlazanField'); if(!f) return;
  var nCoches=Math.max(1,+$('ncoches').value||1);
  f.style.display=(curLink==='Si'&&nCoches>1)?'block':'none';
}

function setTodosEnlazan(v,btn){
  $('todosEnlazan').value=v?'Si':'No';
  document.querySelectorAll('#todosEnlazanTgl button').forEach(function(b){ b.classList.remove('active'); });
  if(btn) btn.classList.add('active');
}

// ===== TRABAJADORES =====
var wRoles=[],wNames=[];

// Índice del parte que se está viendo en el histórico (lo usa la recuperación de pantalla al volver a la app)
var _parteIdxActual=null;

// Cuerpo del parte tal como lo ve el usuario: cabecera, detalle (con precios en clientes de cobro), total y
// observaciones. Lo usan la pantalla del parte y su PDF (pdfDesde), así que siempre dicen lo mismo.
function parteCuerpoHTML(r){
  var fF=r.fecha?r.fecha.split('-').reverse().join('/'):'--';
  // Procesar detalle con precios si cliente de cobro
  var _detalleHTML = r.detalle||'<div style="color:var(--text2);padding:10px">Sin detalle.</div>';
  var _totalHTML = '';
  if(curCliente&&curCliente.precios===true&&r.codigos&&r.codigos.length){
    var _precioTot=0, _hTot=0;
    // Mapa de cod -> precio para inyectar en el detalle
    var _precioMap={};
    r.codigos.forEach(function(c){
      var p=getPrecioPorCod(c.cod,c.lab,r.job||curJob||'');
      var sub=p*c.v;
      _precioTot+=sub;
      if(c.u==='h'&&(c.lab||'').indexOf('Dsp')===-1) _hTot+=c.v;
      if(p>0) _precioMap[c.cod]={precio:p, sub:sub};
    });
    // Inyectar precio en cada rrow del detalle
    _detalleHTML = _detalleHTML.replace(/<div class="rrow"><span class="rc">([^<]+)<\/span><span class="rl">([^<]+)<\/span><span class="rv">([^<]*)<\/span><\/div>/g, function(match, rc, rl, rv){
      var entry = _precioMap[rc];
      if(entry){
        return '<div class="rrow"><span class="rc">'+rc+'</span><span class="rl">'+rl+'</span><span class="rv">'+rv+'</span><span style="color:var(--green);font-weight:600;font-size:.82rem;margin-left:auto;padding-left:8px;">'+fmtPrecio(entry.sub)+'</span></div>';
      }
      return match;
    });
    // Añadir línea de total al final del detalle
    if(_precioTot>0){
      _totalHTML='<div class="rrow total-row" style="border-top:1px solid var(--border);margin-top:4px;padding-top:4px;">'+
        '<span class="rc">TOTAL</span>'+
        '<span class="rl"></span>'+
        '<span class="rv">'+(_hTot>0?fmtH(_hTot):'')+'</span>'+
        '<span style="color:var(--green);font-weight:700;margin-left:auto;padding-left:8px;">'+fmtPrecio(_precioTot)+'</span>'+
        '</div>';
    }
  }
  return '<div class="card-title">&#128203; '+escHtml(r.tienda)+' &middot; '+fF+'</div>'+
    _detalleHTML+
    _totalHTML+
    (function(){ var _obsCompl=observacionesCompletas(r); return _obsCompl?('<div class="divider"></div><div class="rrow obs-row" style="height:auto"><span class="rc" style="align-self:flex-start;padding-top:8px">Obs.</span><span class="rl" style="white-space:pre-wrap;word-break:break-word;height:auto;flex:1">'+escHtml(_obsCompl)+'</span></div>'):''; })();
}

function verParte(idx){
  _parteIdxActual=idx;
  $('ordenView').style.display='none'; $('parteView').style.display='block';
  var all=getH(); var r=all[idx]; if(!r) return;
  var matHTML='';
  $('parteBody').innerHTML=
    '<div class="card">'+parteCuerpoHTML(r)+
    '<div class="divider"></div><div class="brow" style="margin-bottom:8px;">'+
    '<button class="btn btn-s btn-sm" onclick="hacerPDF('+idx+')">PDF</button>'+
    '<button class="btn btn-s btn-sm" onclick="compartirParte('+idx+')">Compartir</button>'+
    (_esAdmin()?'<button class="btn btn-amber btn-sm" onclick="abrirEdicionParte('+idx+')">&#9998; Editar</button>':'')+
    (_esAdmin()?'<button class="btn btn-d btn-sm" onclick="pedirBorrarParte('+idx+')">Borrar</button>':'')+'</div>'+
    '<div id="confirmDel" style="display:none;padding:12px;background:var(--red-light);border:1px solid rgba(192,57,43,.2);border-radius:var(--r-sm);margin-top:8px">'+
    '<div style="font-size:.88rem;font-weight:600;color:var(--red);margin-bottom:8px">&iquest;Borrar este parte?</div>'+
    '<div style="display:flex;gap:8px"><button class="btn btn-d btn-sm" onclick="borrarParteOk('+idx+')">S&iacute;, borrar</button><button class="btn btn-s btn-sm" onclick="$(\'confirmDel\').style.display=\'none\'">Cancelar</button></div>'+
    '</div>'+
    '</div>'+matHTML;
}

// ===== EDITAR PARTE (V17) =====

function verResumenCentro(){
  var h=getH();
  if(curCliente)h=h.filter(function(r){return (r.clienteId||'mercadona')===curCliente.id;});
  h=h.filter(function(r){return (r.estado||'terminado')==='terminado'&&r.centro===_curCentroFin;});
  var tienda=h.length?h[h.length-1].tienda:'Centro '+_curCentroFin;
  $('resumenCentroTitle').innerHTML='&#128202; '+tienda;
  var codAcum={};
  h.forEach(function(r){(r.codigos||[]).forEach(function(c){var k=c.cod+'|'+c.lab;if(!codAcum[k])codAcum[k]={rc:c.cod,rl:c.lab,v:0,u:c.u};codAcum[k].v+=c.v;});});
  window._resumenCentroCodAcum=codAcum;
  _mostrarResumen('Centro','agrupado');
  histShow(['resumenCentroView']);
}

function verResumenTotal(){
  var h=getH();
  if(curCliente)h=h.filter(function(r){return (r.clienteId||'mercadona')===curCliente.id;});
  var codAcum={};
  h.forEach(function(r){(r.codigos||[]).forEach(function(c){var k=c.cod+'|'+c.lab;if(!codAcum[k])codAcum[k]={rc:c.cod,rl:c.lab,v:0,u:c.u};codAcum[k].v+=c.v;});});
  window._resumenTotalCodAcum=codAcum;
  _mostrarResumen('Total','agrupado');
  var el=document.getElementById('resumenTotalView');
  if(el){el.style.display='block';}
  var el2=document.getElementById('centrosView');
  if(el2){el2.style.display='none';}
}

function renderHistTecBtns(){
  var el = $('histTecBtns'); if(!el) return;
  var rol = window._sesion && window._sesion.rol;
  var h = getHVisible();
  var cliId = curCliente && curCliente.id;
  var sinAsig = _clienteSinAsignacion(cliId);
  var badgeStyle='position:absolute;top:-6px;right:-8px;background:var(--green);color:#06210f;font-size:.6rem;font-weight:800;min-width:15px;height:15px;border-radius:8px;display:flex;align-items:center;justify-content:center;padding:0 3px;border:2px solid var(--surface);';

  if(rol === 'tecnico'){
    // Técnico: botón "Mis incidencias" — total (activas+finalizadas) donde es principal de verdad (registro global), filtrado por cliente actual
    var miNombre = window._sesion.nombre.toLowerCase();
    var total = {}, activas = {};
    h.forEach(function(r){
      if((r.clienteId||'mercadona') !== cliId) return;
      var reg=_registroGlobal(r.pedido, r.clienteId||'mercadona');
      var tecReal = (reg && !sinAsig) ? reg.tecnicoPrincipal : (r.tecnicos && r.tecnicos[0]);
      if(!(tecReal && tecReal.toLowerCase() === miNombre)) return;
      var estadoReal = reg ? reg.estado : (r.estado||'terminado');
      var k = (r.clienteId||'mercadona')+'||'+r.pedido+'||'+(r.centro||'');
      total[k] = true;
      if(estadoReal==='en-ejecucion') activas[k] = true;
    });
    var totalN = Object.keys(total).length;
    var activasN = Object.keys(activas).length;
    var badge = activasN>0 ? '<span style="'+badgeStyle+'">'+activasN+'</span>' : '';
    el.innerHTML = totalN > 0
      ? '<div class="hist-opts"><div class="hist-opt" style="background:var(--surface2);border:1px solid var(--border);" onclick="verSecTecnico(\''+window._sesion.nombre+'\')"><div class="opt-ico" style="position:relative;display:inline-block;">&#128203;'+badge+'</div><div class="opt-title">Mis incidencias</div><div class="opt-count">'+totalN+'</div></div></div>'
      : '';
    return;
  }

  if(rol === 'admin'){
    // Admin: un botón por cada técnico con incidencias como principal de verdad (registro global), filtrado por cliente actual
    var tecsTotal = {}, tecsActivas = {};
    h.forEach(function(r){
      if((r.clienteId||'mercadona') !== cliId) return;
      var reg=_registroGlobal(r.pedido, r.clienteId||'mercadona');
      var t = (reg && !sinAsig) ? reg.tecnicoPrincipal : (r.tecnicos && r.tecnicos[0]);
      if(!t) return;
      var estadoReal = reg ? reg.estado : (r.estado||'terminado');
      var k = (r.clienteId||'mercadona')+'||'+r.pedido+'||'+(r.centro||'');
      if(!tecsTotal[t]) tecsTotal[t] = {};
      tecsTotal[t][k] = true;
      if(estadoReal==='en-ejecucion'){
        if(!tecsActivas[t]) tecsActivas[t] = {};
        tecsActivas[t][k] = true;
      }
    });
    var names = Object.keys(tecsTotal).sort();
    // Solo técnicos activos y con PIN (tienePin) — el histórico de uno desactivado sigue disponible
    // en el catálogo de técnicos, no aquí (mismo criterio que renderWorkers())
    var tecsActivosConPin = {};
    getTecnicos().forEach(function(t){
      if(t.activo!==false && t.tienePin) tecsActivosConPin[t.nombre.toLowerCase()] = true;
    });
    names = names.filter(function(t){ return tecsActivosConPin[t.toLowerCase()]; });
    if(!names.length){ el.innerHTML=''; return; }
    el.innerHTML = '<div style="font-size:.72rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">Por técnico</div>'
      + '<div class="hist-opts" style="flex-wrap:wrap;">'
      + names.map(function(t){
          var cnt = Object.keys(tecsTotal[t]).length;
          var activasCnt = tecsActivas[t] ? Object.keys(tecsActivas[t]).length : 0;
          var badge = activasCnt>0 ? '<span style="'+badgeStyle+'">'+activasCnt+'</span>' : '';
          var tEnc = t.replace(/'/g,"\'");
          return '<div class="hist-opt" style="background:var(--surface2);border:1px solid var(--border);" onclick="verSecTecnico(\''+tEnc+'\')"><div class="opt-ico" style="position:relative;display:inline-block;">&#128100;'+badge+'</div><div class="opt-title" style="font-size:.8rem;">'+t+'</div><div class="opt-count">'+cnt+'</div></div>';
        }).join('')
      + '</div>';
  }
}

// Muestra la vista de lista del historial (por sección o por técnico) y oculta el resto.
function _secAbrirVista(){
  $('histOpts').style.display='none'; $('secView').style.display='block'; $('ordenView').style.display='none'; $('parteView').style.display='none';
  $('centrosView').style.display='none'; $('incidenciasView').style.display='none';
}
// Una fila por orden: tienda, tipo de trabajo, nº de partes, estado y fechas.
function _secFilasOrdenes(ords){
  return ords.map(function(g){
    var f1=g.fechaMin.split('-').reverse().join('/');
    var f2=g.fechaMax.split('-').reverse().join('/');
    var fr=f1===f2?f1:f1+' → '+f2;
    var dot='<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:'+(g.estado==='en-ejecucion'?'var(--amber)':'var(--green)')+';margin-right:6px;vertical-align:middle;flex-shrink:0;"></span>';
    var badge=g.estado==='en-ejecucion'?'<span class="badge badge-a">En ejecuci&oacute;n</span>':'<span class="badge badge-g">Finalizado</span>';
    var enc=encodeURIComponent(g.pedido)+'||'+encodeURIComponent(g.centro);
    var subTitle=g.actObras?g.actObras+' &middot; '+g.job:'Orden '+g.pedido+' &middot; '+g.job;
    return '<div class="hist-item" onclick="verOrden(\''+enc+'\')">'+
      '<div><div class="hi-title">'+dot+escHtml(g.tienda)+'</div>'+
      '<div class="hi-sub">'+subTitle+' &middot; '+g.partes.length+' parte'+(g.partes.length===1?'':'s')+'</div>'+badge+'</div>'+
      '<div class="hi-date">'+fr+'</div></div>';
  }).join('');
}

function verSecTecnico(nomTecnico){
  _secActual = 'tec_'+nomTecnico;
  _secAbrirVista();
  var cliId = curCliente && curCliente.id;
  var sinAsig = _clienteSinAsignacion(cliId);
  var ords = getOrdenes().filter(function(g){ return (g.partes[0] && (g.partes[0].r.clienteId||'mercadona')) === cliId; });
  // Filtrar incidencias donde este técnico es/fue el principal real
  var nomL = nomTecnico.toLowerCase();
  ords = ords.filter(function(g){
    var reg=_registroGlobal(g.pedido, g.partes[0] && (g.partes[0].r.clienteId||'mercadona'));
    if(reg && !sinAsig) return reg.tecnicoPrincipal && reg.tecnicoPrincipal.toLowerCase()===nomL;
    return g.partes.some(function(p){ return p.r.tecnicos && p.r.tecnicos[0] && p.r.tecnicos[0].toLowerCase()===nomL; });
  });
  var hdr = $('secHdr');
  hdr.className = 'hist-sec-hdr fin';
  hdr.innerHTML = '&#128100; '+nomTecnico+' &mdash; '+ords.length+' '+(ords.length===1?'incidencia':'incidencias');
  if(!ords.length){ $('secList').innerHTML='<div class="empty"><div class="empty-ico">📋</div><div>Sin incidencias.</div></div>'; return; }
  $('secList').innerHTML=_secFilasOrdenes(ords);
}

function verSec(sec){
  _secActual=sec;
  if(sec==='fin'){verCentros();return;}
  _secAbrirVista();
  var ords=getOrdenes(sec==='ej'?'en-ejecucion':'terminado');
  var hdr=$('secHdr');
  hdr.className='hist-sec-hdr '+(sec==='ej'?'ej':'fin');
  hdr.innerHTML=(sec==='ej'?'&#9203; En ejecuci&oacute;n':'&#9989; Finalizados')+' &mdash; '+ords.length+' '+(ords.length===1?'orden':'órdenes');
  if(!ords.length){ $('secList').innerHTML='<div class="empty"><div class="empty-ico">'+(sec==='ej'?'⏳':'✅')+'</div><div>No hay órdenes.</div></div>'; return; }
  $('secList').innerHTML=_secFilasOrdenes(ords);
}

function volverAlForm(){
  _keepForm=true;
  goToRaw('w-form');
}

function volverCentros(){histShow(['centrosView']);}

function volverHistOpts(){ $('histOpts').style.display='block'; $('secView').style.display='none'; $('ordenView').style.display='none'; $('parteView').style.display='none'; refreshCounts(); renderHistTecBtns(); renderSearchResults(); }

function volverIncidencias(){histShow(['incidenciasView']);}

function volverOrden(){ $('parteView').style.display='none'; $('ordenView').style.display='block'; }

// "Atrás" de la orden: vuelve a la vista desde la que se abrió (_ordenDesde la fija verOrden/selIncidencia).
// Si no se sabe de dónde viene (búsqueda, aviso, sesión recuperada), va al Historial en vez de a una lista vacía.
var _ordenDesde='';
function volverSec(){
  $('ordenView').style.display='none'; $('parteView').style.display='none';
  if(_ordenDesde==='incidencias') volverIncidencias();
  else if(_ordenDesde==='lista') $('secView').style.display='block';
  else volverHistOpts();
}

function volverSecFin(){histShow(['histOpts']);refreshCounts();}

function _marcarPendienteSync(parte, pendiente){
  var h=getH();
  var idx=h.findIndex(function(x){ return x.fecha===parte.fecha && x.pedido===parte.pedido && x.centro===parte.centro; });
  if(idx<0) return;
  if(pendiente) h[idx]._pendienteSync=true; else delete h[idx]._pendienteSync;
  setH(h);
}
function _marcarIncidenciaPendientePorPedido(pedido, centro){
  var h=getH();
  var pp=_partesDeOrdenOrdenados(pedido,centro,h);
  if(pp.length) pp[pp.length-1].r._pendienteIncidencia=true;
  setH(h);
}
function _limpiarIncidenciaPendientePorPedido(pedido, centro){
  var h=getH();
  var cambiado=false;
  h.forEach(function(r){ if(r.pedido===pedido && r.centro===centro && r._pendienteIncidencia){ delete r._pendienteIncidencia; cambiado=true; } });
  if(cambiado) setH(h);
}

function _subirParteAFirestore(parte, razon){
  try{
    if(typeof _db === 'undefined' || !_db || !window._sesion) { _marcarPendienteSync(parte, true); return; }
    var docId = (parte.clienteId||'mercadona')+'_'+parte.fecha+'_'+parte.centro+'_'+parte.pedido;
    docId = docId.replace(/[\/\s]/g,'-');
    var datos = Object.assign({}, parte, {
      tecnicoPrincipal: (parte.tecnicos&&parte.tecnicos[0])||window._sesion.nombre,
      // Respeta un creadoPor ya presente en el propio parte (caso "Terminar de guardar" desde
      // el aviso de parte sin guardar, donde el autor real es el técnico que lo generó, no el
      // administrador que lo termina de guardar) — en el resto de casos parte.creadoPor nunca
      // viene seteado de antemano, así que cae igual que siempre a la sesión actual.
      creadoPor: parte.creadoPor||window._sesion.nombre,
      fechaModificacion: Date.now(),
      ultimaModificacionRazon: razon||'Parte nuevo'
    });
    _db.collection('partes').doc(docId).set(datos, {merge:true}).then(function(){
      _marcarPendienteSync(parte, false);
    }).catch(function(){
      _marcarPendienteSync(parte, true);
    });
    if(parte.pedido) _actualizarIncidenciaPorOrden(parte.pedido, parte.centro, parte.estado||'en-ejecucion', datos);
    if(parte.pedido && parte.pedido.indexOf('IRV-')===0) _avanzarContadorIRV(parte.pedido);
    if(parte.actObras && parte.actObras.indexOf('IRV-')===0) _avanzarContadorIRV(parte.actObras);
    // "Otro punto": el km/despl. no sale de la nave, no es representativo de la tienda —
    // no debe autorrellenar ni completar la Agenda (contaminaría la distancia típica).
    if(parte.origen!=='otro'){
      _subirAgendaEntry(parte.clienteId, parte.centro, parte.tienda, parte.dir, parte.tel, parte.km, parte.tr);
      _completarAgendaFaltantes(parte.clienteId, parte.centro, parte.km, parte.tr);
    }
  }catch(e){ _marcarPendienteSync(parte, true); }
}

function _reintentarPartesPendientes(){
  if(typeof _db === 'undefined' || !_db || !window._sesion) return;
  var h=getH();
  var pendientes=h.filter(function(r){ return r._pendienteSync; });
  pendientes.forEach(function(r){ _subirParteAFirestore(r,'Reintento tras fallo de conexión'); });
  var pendientesIncidencia=h.filter(function(r){ return r._pendienteIncidencia; });
  pendientesIncidencia.forEach(function(r){
    var datos = Object.assign({}, r, {
      tecnicoPrincipal: (r.tecnicos&&r.tecnicos[0])||window._sesion.nombre,
      creadoPor: window._sesion.nombre
    });
    _actualizarIncidenciaPorOrden(r.pedido, r.centro, r.estado||'en-ejecucion', datos);
  });
  var borrarPendiente=JSON.parse(localStorage.getItem('pm_partes_borrar_pendiente')||'[]');
  borrarPendiente.forEach(function(item){
    // Compatibilidad con el formato viejo (solo el docId, sin razón) por si quedó algo pendiente de antes
    var docId = (typeof item==='string') ? item : item.docId;
    var razon = (typeof item==='string') ? 'Borrado pendiente' : item.razon;
    _moverAPapelera('partes', docId, razon).then(function(){
      var lista=JSON.parse(localStorage.getItem('pm_partes_borrar_pendiente')||'[]');
      localStorage.setItem('pm_partes_borrar_pendiente', JSON.stringify(lista.filter(function(x){ return (typeof x==='string'?x:x.docId)!==docId; })));
    }).catch(_fallo('_reintentarPartesPendientes'));
  });
}
window.addEventListener('online', _reintentarPartesPendientes);
function _marcarParteBorrarPendiente(docId, razon){
  var lista=JSON.parse(localStorage.getItem('pm_partes_borrar_pendiente')||'[]');
  if(!lista.some(function(x){ return (typeof x==='string'?x:x.docId)===docId; })) lista.push({docId:docId, razon:razon||'Borrado pendiente'});
  localStorage.setItem('pm_partes_borrar_pendiente', JSON.stringify(lista));
}

function _finalizarGuardado(estado){
  var r=window.recTmp; if(!r) return;
  r.estado=estado;
  var h=getH();
  // Recuperar _editIdx desde backup si se perdió durante generarCore
  if(_editIdx===null&&window._editIdxBackup!==null&&window._editIdxBackup!==undefined){
    _editIdx=window._editIdxBackup;
  }
  if(_editIdx!==null){
    var orig=h[_editIdx];
    // Editando un parte existente: se sustituye siempre por completo, cambie lo que cambie
    h[_editIdx]=r; setH(h);
    // Si cambió fecha/pedido/centro, el ID del documento en Firestore también cambia —
    // borrar el documento viejo primero para no dejar un huérfano duplicado
    if(orig && typeof _db !== 'undefined' && _db && window._sesion){
      var docIdViejo=((orig.clienteId||'mercadona')+'_'+orig.fecha+'_'+orig.centro+'_'+orig.pedido).replace(/[\/\s]/g,'-');
      var docIdNuevo=((r.clienteId||'mercadona')+'_'+r.fecha+'_'+r.centro+'_'+r.pedido).replace(/[\/\s]/g,'-');
      if(docIdViejo!==docIdNuevo){
        _moverAPapelera('partes', docIdViejo, 'Reemplazado al editar (cambio de identidad)').catch(function(){ _marcarParteBorrarPendiente(docIdViejo, 'Reemplazado al editar (cambio de identidad)'); });
      }
    }
    _editIdx=null; window._editIdxBackup=null;
    _borrarBorradorParte(r);
    _subirParteAFirestore(r,'Parte editado');
    showMsg('msgRes','Parte actualizado.','success');
    $('gbtn').textContent='\u2713 Guardado'; $('gbtn').disabled=true; $('gbtn').style.opacity='.6';
    setTimeout(function(){ goTo('w-menu'); },1200);
    return;
  }
  // Verificar si coincide con un parte existente (solo para partes nuevos, no edición)
  var _idxDup=h.findIndex(function(x){ return x.fecha===r.fecha&&x.pedido===r.pedido&&x.centro===r.centro; });
  if(_idxDup>=0){
    _confirmarApp('Ya existe un parte con la misma fecha, centro y orden.\n¿Reemplazar el parte existente?\n(Cancela para descartar el nuevo)', function(){
      h[_idxDup]=r; setH(h);
      _borrarBorradorParte(r);
      _subirParteAFirestore(r,'Parte reemplazado (mismo pedido/fecha/centro)');
      showMsg('msgRes','Parte reemplazado.','success');
      $('gbtn').textContent='\u2713 Guardado'; $('gbtn').disabled=true; $('gbtn').style.opacity='.6';
      setTimeout(function(){ goTo('w-menu'); },1200);
    }, function(){
      showMsg('msgRes','Parte descartado.','warn');
    });
    return;
  }
  h.push(r); setH(h);
  _borrarBorradorParte(r);
  _subirParteAFirestore(r);
  if (_asgTecActual && _asgTecActual.id) {
    // El estado real ya lo deja correcto _actualizarIncidenciaPorOrden() (llamado dentro de
    // _subirParteAFirestore, justo arriba) según lo que el técnico eligió — no forzar aquí
    // 'en-ejecucion' fijo, que competía en paralelo con esa escritura y podía dejar una
    // incidencia recién cerrada marcada otra vez como en curso.
    _asgTecActual = null;
    renderAsgTecnico();
  }
  showMsg('msgRes','Guardado correctamente.','success');
  $('gbtn').textContent='\u2713 Guardado'; $('gbtn').disabled=true; $('gbtn').style.opacity='.6';
  setTimeout(function(){ goTo('w-menu'); },1200);
}

// Resumen acumulado por concepto o por código: tipo 'Centro' (resumen del centro) o 'Total' (resumen de todos los centros).
function _mostrarResumen(tipo,modo){
  var pre=tipo==='Centro'?'rc':'rt';
  var codAcum=window['_resumen'+tipo+'CodAcum']||{};
  var html=modo==='agrupado'?_renderAcumAgrupado(codAcum):_renderAcum(codAcum);
  $('resumen'+tipo+'Content').innerHTML=
    '<div style="display:flex;gap:8px;margin-bottom:10px;">'+
    '<button id="'+pre+'a" style="flex:1;padding:7px;border-radius:var(--r-sm);font-size:.8rem;font-weight:700;cursor:pointer;font-family:inherit;border:1.5px solid var(--green);background:'+(modo==='agrupado'?'var(--green)':'var(--surface)')+';color:'+(modo==='agrupado'?'#fff':'var(--green)')+';">&#128202; Por concepto</button>'+
    '<button id="'+pre+'c" style="flex:1;padding:7px;border-radius:var(--r-sm);font-size:.8rem;font-weight:700;cursor:pointer;font-family:inherit;border:1.5px solid var(--green);background:'+(modo==='codigos'?'var(--green)':'var(--surface)')+';color:'+(modo==='codigos'?'#fff':'var(--green)')+';">&#128290; Por código</button>'+
    '</div><div class="acum-block">'+html+'</div>';
  var ea=document.getElementById(pre+'a'),ec=document.getElementById(pre+'c');
  if(ea)ea.addEventListener('click',function(){_mostrarResumen(tipo,'agrupado');});
  if(ec)ec.addEventListener('click',function(){_mostrarResumen(tipo,'codigos');});
}

function _renderAcum(codAcum){
  return Object.values(codAcum).length
    ?Object.values(codAcum).map(function(c){var v=c.u==='km'?Math.round(c.v)+' km':c.u==='dieta'?''+Math.round(c.v):fmtH(c.v);return '<div class="acum-row"><span>'+c.rc+' &middot; '+c.rl+'</span><span style="font-weight:600;">'+v+'</span></div>';}).join('')
    :'<div style="font-size:.82rem;color:var(--text3);">Sin datos.</div>';
}

var _codConcepto = {
  'MF9344':'H. Normal','MF9348':'H. Normal','MA4836':'H. Normal','MF9404':'H. Normal',
  'MF9345':'H. Extra','MF9349':'H. Extra','M71088':'H. Extra','MF9405':'H. Extra',
  'MF9346':'H. Nocturna','MF9350':'H. Nocturna','MA4837':'H. Nocturna','MF9406':'H. Nocturna',
  'MF9347':'H. Festiva','MF9351':'H. Festiva','MA4838':'H. Festiva','MF9407':'H. Festiva',
  'M71077':'Despl. Normal','MK9OVB':'Despl. Normal',
  'MB8726':'Despl. Extra','MB8723':'Despl. Extra',
  'MB8728':'Despl. Nocturno','MB8725':'Despl. Nocturno',
  'MB8727':'Despl. Festivo','MB8724':'Despl. Festivo',
  'MF9352':'Kilometraje','MF9412':'Kilometraje','MA4841':'Kilometraje',
  'MF9895':'½ Dieta','MF9896':'½ Dieta','MA4839':'½ Dieta'
};
function _renderAcumAgrupado(codAcum){
  // Agrupar por concepto
  var grupos={};
  Object.values(codAcum).forEach(function(c){
    var concepto=_codConcepto[c.rc]||c.rl;
    if(!grupos[concepto])grupos[concepto]={v:0,u:c.u};
    grupos[concepto].v+=c.v;
  });
  // Orden fijo
  var orden=['Kilometraje','H. Normal','H. Extra','H. Nocturna','H. Festiva',
             'Despl. Normal','Despl. Extra','Despl. Nocturno','Despl. Festivo','½ Dieta'];
  var html='';
  orden.forEach(function(k){
    if(!grupos[k])return;
    var c=grupos[k];
    var v=c.u==='km'?Math.round(c.v)+' km':c.u==='dieta'?''+Math.round(c.v):fmtH(c.v);
    html+='<div class="acum-row"><span>'+k+'</span><span style="font-weight:600;">'+v+'</span></div>';
  });
  // Cualquier otro que no esté en el orden
  Object.keys(grupos).forEach(function(k){
    if(orden.indexOf(k)>=0)return;
    var c=grupos[k];
    var v=c.u==='km'?Math.round(c.v)+' km':c.u==='dieta'?''+Math.round(c.v):fmtH(c.v);
    html+='<div class="acum-row"><span>'+k+'</span><span style="font-weight:600;">'+v+'</span></div>';
  });
  return html||'<div style="font-size:.82rem;color:var(--text3);">Sin datos.</div>';
}

function abrirEdicionParte(idx){
  var h=getH(); var r=h[idx]; if(!r) return;
  // Guardar pedido y centro originales para detectar cambios al guardar
  r._pedidoOriginal = r.pedido || '';
  r._centroOriginal = r.centro || '';
  setH(h);
  // Guardar idx ANTES de nuevo() que lo resetea
  var editIdxTemp=idx;
  // Marcar que no debe abrir el diálogo de inicio de orden
  _keepForm=true;
  // Limpiar formulario
  nuevo();
  // Restaurar _editIdx después de nuevo()
  _editIdx=editIdxTemp;
  window._editIdxBackup=editIdxTemp;
  // Restaurar actuación Obras si aplica
  if(r.actObras){
    _actObrasSeleccionada=r.actObras;
    var ad=$('actObrasDisplay'); if(ad){ad.textContent=r.actObras;ad.style.display='block';}
    var fp=$('fieldPedido'); if(fp) fp.style.display='none';
    var fa=$('fieldActObras'); if(fa) fa.style.display='block';
  }
  // Número de trabajadores y roles/nombres
  var nW=(r.roles||[]).length||2;
  $('w').value=nW;
  wRoles=(r.roles||[]).slice();
  // Nombres de técnicos: usar r.tecnicos (fuente de verdad) o fallback a regex sobre detalle
  if(r.tecnicos&&r.tecnicos.length){
    wNames=r.tecnicos.slice();
  } else {
    var nomMatch=r.detalle?r.detalle.match(/letter-spacing:[^>]*>([^<]+)<\/div>/):null;
    if(nomMatch){
      wNames=nomMatch[1].split(/\s*·\s*|\s*&middot;\s*/).map(function(n){return n.trim();}).filter(Boolean);
    } else {
      wNames=(r.roles||[]).map(function(){return '';});
    }
  }
  // Tipo de trabajo — debe ir antes de adaptarFormularioACliente
  if(r.job){
    document.querySelectorAll('#jobTgl button').forEach(function(b){
      if(b.textContent.trim()===r.job) setJob(r.job,b);
    });
  }
  // Datos de la orden
  // Número de orden según tipo de cliente
  var esMerc=curCliente&&curCliente.tipo==='mercadona';
  if(esMerc){
    $('pedido').value=r.pedido||'';
  } else {
    _pedidoNoMerc=r.pedido||'';
    $('pedidoGenDisplay').textContent=r.pedido||'';
  }
  $('fecha').value=r.fecha||'';
  $('centro').value=r.centro||'';
  $('tienda').value=r.tienda||'';
  $('dir').value=r.dir||'';
  $('tel').value=r.tel||'';
  $('numParte').value=r.numParte||'';
  window._editNumParteOriginal=r.numParte||'';
  $('arr').value=r.arr||'';
  $('lea').value=r.lea||'';
  // Kilometraje y desplazamiento
  $('km').value=r.km||'';
  $('tr').value=r.tr||'';
  $('kmE').value=r.km||'';
  $('trE').value=r.tr||'';
  // Enlace
  var lv=r.linkType||'No';
  var lnkBtns=document.querySelectorAll('#lnkTgl button');
  if(lv==='Auto'){
    // Restaurar el modo Auto tal cual quedó guardado — setLink() solo sabe alternar
    // entre "No"/"Si", así que aquí se replica lo que hace checkAutoEnlace() al activarlo
    $('lnkToggleDiv').style.display='none'; $('modeNo').style.display='none'; $('modeSi').style.display='none'; $('modeAuto').style.display='block';
    $('link').value='Auto'; curLink='Auto';
    $('kmA').value=r.km||''; $('trA').value=r.tr||'';
    aeData={kmDif:r.kmDif||0, trDif:r.trDif||0};
  } else if(lv==='Si'||lv==='Í'||lv==='Sí'){
    setLink('Si', lnkBtns[1]||lnkBtns[0]);
    $('enlaceDestinoCentro').value=r.enlaceDestinoCentro||'';
    $('enlaceDestino').value=r.enlaceDestino||'';
    $('kmS').value=(r.enlaceKmSalida!=null)?r.enlaceKmSalida:'';
    $('trS').value=(r.enlaceTrSalida!=null)?r.enlaceTrSalida:'';
  } else {
    setLink('No', lnkBtns[0]);
  }
  // Origen del trayecto (nave / otro punto)
  var origBtns=document.querySelectorAll('#origTgl button');
  if(r.origen==='otro'){
    setOrigen('otro', origBtns[1]||origBtns[0]);
    $('kmOtroIda').value=r.km||''; $('trOtroIda').value=r.tr||'';
    $('kmOtroVuelta').value=r.otroKmVuelta||''; $('trOtroVuelta').value=r.otroTrVuelta||'';
    $('otroPartidaDesde').value=r.otroPartidaDesde||'';
    $('otroLlegadaHacia').value=r.otroLlegadaHacia||'';
  } else {
    setOrigen('nave', origBtns[0]);
  }
  // Renderizar trabajadores con nombres
  renderWorkers();
  // Materiales — después de setJob para que msRender no los sobreescriba
  msInitSel(r.materiales||[]);
  if(curJob) msRender('parteMatCard');
  // Observaciones — solo lo que escribió el técnico
  $('obs').value=r.obs||'';
  // Descripción de la incidencia y nota de km adicionales: se restauran aparte, fijas,
  // para que no se pierdan ni se dupliquen al regenerar el parte durante la edición.
  var _fdEdit=$('fieldDescIncidencia'), _ddEdit=$('descIncidencia');
  if(_ddEdit) _ddEdit.value=r.descIncidencia||'';
  if(_fdEdit) _fdEdit.style.display=r.descIncidencia?'block':'none';
  window._notaKmAdicionalOriginal=r.notaKmAdicional||'';
  var _fnaEdit=$('fieldNotaKmAdic'), _nkdEdit=$('notaKmAdicDisplay');
  if(_nkdEdit) _nkdEdit.value=r.notaKmAdicional||'';
  if(_fnaEdit) _fnaEdit.style.display=r.notaKmAdicional?'block':'none';
  // Restaurar tipoDia del parte
  if(r.tipoDia==='festivo'){
    esFestivo=true;
    document.querySelectorAll('#festivoTgl button').forEach(function(b,i){ b.classList.toggle('active',i===1); b.disabled=false; b.style.opacity='1'; b.style.cursor='pointer'; });
  } else {
    esFestivo=false;
    document.querySelectorAll('#festivoTgl button').forEach(function(b,i){ b.classList.toggle('active',i===0); b.disabled=false; b.style.opacity='1'; b.style.cursor='pointer'; });
  }
  // Ocultar lectura
  ocultarLectura();
  // Bloquear identidad del parte: editar no debe poder convertirse en crear uno distinto
  _bloquearCamposIdentidadParte();
  // Ir al formulario
  _keepForm=true;
  goToRaw('w-form');
  window.scrollTo(0,0);
}

function avisoCruzado(referencia,nombreCliente){
  $('acCentro').classList.remove('show');
  window._avisoCruzadoCliente=nombreCliente;
  var dlg=$('dlgAvisoCruzado');
  if(dlg){
    document.getElementById('dlgAvisoCruzadoTxt').textContent=
      '"'+referencia+'" est\u00e1 activa en '+nombreCliente+'. \u00bfIr a esa orden?';
    dlg.classList.add('show');
  }
}
function _confirmarAvisoCruzado(){
  $('dlgAvisoCruzado').classList.remove('show');
  var nombreCliente=window._avisoCruzadoCliente;
  var cl=getClientes().find(function(c){ return c.nombre===nombreCliente; });
  if(cl){ seleccionarCliente(cl.id); goTo('w-hist'); }
}

function avisoCruzadoIdx(idx){
  var h=getH(); var r=h[idx]; if(!r) return;
  var nombreCliente=r.clienteId;
  var cl=getClientes().find(function(c){ return c.id===r.clienteId; });
  if(cl) nombreCliente=cl.nombre;
  avisoCruzado(r.tienda,nombreCliente);
}

