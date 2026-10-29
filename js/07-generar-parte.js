// ===== ROWS =====
function escHtml(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
// Junta, solo para mostrar/exportar, las observaciones guardadas por separado de un parte:
// 1) descripción de la incidencia (de la asignación), 2) nota de km adicionales,
// 3) descripción del trabajo realizado (del técnico). Nunca se guardan mezcladas — así
// editar un parte no puede duplicarlas ni mezclarlas mal.
function observacionesCompletas(r){
  return [r.descIncidencia, r.notaKmAdicional, r.obs].filter(function(s){ return s && s.trim(); }).join('\n');
}
function iRow(l,v){ return '<div class="rrow info-row"><span class="rc">'+escHtml(l)+'</span><span class="rl">'+escHtml(v)+'</span><span class="rv"></span></div>'; }
function cRow(c,l,v){ return '<div class="rrow"><span class="rc">'+escHtml(c)+'</span><span class="rl">'+escHtml(l)+'</span><span class="rv">'+escHtml(v)+'</span></div>'; }
function tRow(v){ return '<div class="rrow tipo-row"><span class="rc">Tipo</span><span class="rl">'+v+'</span><span class="rv"></span></div>'; }
function totRow(v){ return '<div class="rrow total-row"><span class="rc">TOTAL</span><span class="rl"></span><span class="rv">'+v+'</span></div>'; }
function gt(t){ return '<div class="rgroup-title">'+t+'</div>'; }

// ===== GENERAR =====
// Mapeo cod genérico → label largo del catálogo
var _COD_A_LAB={
  'H. Normal':   {Oficial:'H. Normal (Oficial)',Peón:'H. Normal (Peón)','':'H. Normal'},
  'H. Extra':    {Oficial:'H. Extra (Oficial)', Peón:'H. Extra (Peón)', '':'H. Extra'},
  'H. Nocturna': {Oficial:'H. Nocturna (Oficial)',Peón:'H. Nocturna (Peón)','':'H. Nocturna'},
  'H. Festiva':  {Oficial:'H. Festiva (Oficial)', Peón:'H. Festiva (Peón)','':'H. Festiva'},
  'D. Normal':   {'':'Despl. Normal'},'D. Extra':{'':'Despl. Extra'},
  'D. Nocturno': {'':'Despl. Nocturno'},'D. Festivo':{'':'Despl. Festivo'},
  'Km':{'':'Kilometraje'},'Dieta':{'':'½ Dieta'}
};

function getPrecioPorCod(codStr,labStr,job){
  if(!codStr) return 0;
  var cat=getCat(); var conceptos=cat.conceptos||[];
  var jobNorm=job||curJob||'';
  // 1. Buscar por código exacto (Mercadona: MF9344, etc.)
  var c=conceptos.find(function(x){ return x.cod===codStr&&x.precio&&+x.precio>0; });
  if(c) return parseFloat(c.precio)||0;
  // 2. Buscar por tipo+label mapeado (clientes sin código)
  var mapEntry=_COD_A_LAB[codStr];
  if(mapEntry){
    var rol='';
    if((labStr||'').indexOf('.Of')>=0) rol='Oficial';
    else if((labStr||'').indexOf('.Pn')>=0) rol='Peón';
    var labLargo=mapEntry[rol]||mapEntry['']||'';
    if(labLargo){
      var c2=conceptos.find(function(x){
        return x.tipo===jobNorm&&x.lab===labLargo&&x.precio&&+x.precio>0;
      });
      if(c2) return parseFloat(c2.precio)||0;
    }
  }
  return 0;
}

function fmtPrecio(v){ return v.toFixed(2).replace('.',',')+' €'; }

function generar(){
  var _mf=$('msgForm'); if(_mf) _mf.className='msg';
  if(!_validarCamposParte()) return;

  // Nº de parte: obligatorio (ya comprobado arriba) y nunca puede repetirse (ningún
  // técnico). Con internet se comprueba en vivo contra Firestore (dato más fiable); sin
  // internet se comprueba contra la copia local sincronizada periódicamente
  // (pm_numpartes_global) y, si no aparece ahí, se deja generar igualmente — puede haber
  // sido usado hace poco por otro técnico offline y aún no sincronizado; ese caso límite
  // se resuelve manualmente si llega a ocurrir.
  var numParteVal=($('numParte').value||'').trim();
  // Excepción "0000": control interno, nunca aplica a Mercadona — se deja repetir sin
  // comprobar duplicados.
  var _esMercadonaActual=curCliente&&curCliente.tipo==='mercadona';
  if(numParteVal==='0000' && !_esMercadonaActual){ _generarPaso2(); return; }
  // Editando un parte existente sin cambiar su número: es el mismo documento reemplazándose
  // a sí mismo, así que no tiene sentido (ni es seguro) comprobar si "ya está usado" — lo
  // encontraría a él mismo en Firestore y bloquearía guardar el propio parte.
  if(_editIdx!==null && numParteVal===(window._editNumParteOriginal||'')){ _generarPaso2(); return; }
  if(typeof _db !== 'undefined' && _db){
    _verificarConexionFirestore(function(hayConexion){
      if(hayConexion){
        _db.collection('partes').where('numParte','==',numParteVal).limit(1).get().then(function(snap){
          if(!snap.empty){ showMsg('msgForm','Ese número de parte ya está usado. Introduce uno distinto.','error'); return; }
          _generarPaso2();
        }).catch(function(){
          if(_numParteUsadoLocal(numParteVal)){ showMsg('msgForm','Ese número de parte ya está usado. Introduce uno distinto.','error'); return; }
          _generarPaso2();
        });
      } else {
        if(_numParteUsadoLocal(numParteVal)){ showMsg('msgForm','Ese número de parte ya está usado. Introduce uno distinto.','error'); return; }
        _generarPaso2();
      }
    });
  } else {
    if(_numParteUsadoLocal(numParteVal)){ showMsg('msgForm','Ese número de parte ya está usado. Introduce uno distinto.','error'); return; }
    _generarPaso2();
  }
}

function _generarPaso2(){
  var esMercadona=curCliente&&curCliente.tipo==='mercadona';
  var esObras=curJob==='Obras';

  // No-Mercadona: pre-asignar número IRV si no tiene
  if(!esMercadona&&!_pedidoNoMerc){
    _pedidoNoMerc=nextIRV();
    $('pedidoGenDisplay').textContent=_pedidoNoMerc;
  }

  // Obras Mercadona: el IRV ya se generó solo al elegir "Obras" (setJob) — red de
  // seguridad por si algún camino llegara aquí sin haberlo asignado todavía.
  if(esMercadona&&esObras&&!_actObrasSeleccionada){
    _actObrasSeleccionada=nextIRV();
    $('actObrasDisplay').textContent=_actObrasSeleccionada; $('actObrasDisplay').style.display='block';
  }

  // Detectar turno nocturno (salida anterior a llegada)
  var arrMin=tm($('arr').value), leaMin=tm($('lea').value);
  if(leaMin>0&&arrMin>0&&leaMin<arrMin&&!_nocturnoConfirmado){
    $('dlgNocturno').classList.add('show');
    return;
  }
  generarCore();
}

function toggleCard(id, btn){
  var el=$(id); if(!el) return;
  var visible=el.style.display!=='none';
  el.style.display=visible?'none':'block';
  if(btn){
    btn.style.background=visible?'':'var(--green-light)';
    btn.style.borderColor=visible?'':'var(--green)';
    btn.style.color=visible?'':'var(--green)';
  }
}

function respNocturno(si){
  $('dlgNocturno').classList.remove('show');
  if(!si){ showMsg('msgForm','Corrige la hora de salida.','error'); return; }
  _nocturnoConfirmado=true;
  generar();
}

// Aviso de "falta este campo": el mensaje fijo (#msgForm) vive al final del formulario,
// así que si el campo está más arriba, el scroll lo deja fuera de la vista y no se llega a
// leer. En vez de mover el nodo #msgForm por el DOM (se probó e hizo que la app se rompiera
// del todo: si el campo estaba dentro de una lista que se vuelve a pintar por completo,
// como los trabajadores, ese repintado borra el nodo movido para siempre y cualquier
// "Generar parte" posterior fallaba en silencio), se usa un aviso flotante (_toast, ya
// fijo en pantalla sin importar el scroll) además del mensaje de siempre.
function _avisoFalta(idCampo, mensaje){
  showMsg('msgForm', mensaje, 'error');
  _toast(mensaje, 'var(--red)');
  _irAlCampo(idCampo);
}

// Validación campo por campo, en el mismo orden en que aparecen en el formulario de arriba
// hacia abajo — al primero que falte, mensaje específico justo encima y foco automático
// ahí. La usan tanto generar() (antes de comprobar que el nº de parte no esté ya usado)
// como generarCore() (red de seguridad para cuando se llega aquí por otro camino, p.ej.
// tras elegir actuación de Obras).
function _validarCamposParte(){
  var esMercadona=curCliente&&curCliente.tipo==='mercadona';
  var esObras=curJob==='Obras';
  if(!curJob){ _avisoFalta('jobTgl','Falta: Tipo de trabajo.'); return false; }
  if(!$('fecha').value.trim()){ _avisoFalta('fecha','Falta: Fecha.'); return false; }
  // pedido requerido solo si es Mercadona y no es Obras
  if(esMercadona&&!esObras&&!$('pedido').value.trim()){ _avisoFalta('pedido','Falta: Nº orden.'); return false; }
  if(!$('numParte').value.trim()){ _avisoFalta('numParte','Falta: Nº parte.'); return false; }
  if(!$('tienda').value.trim()){ _avisoFalta('tienda','Falta: Tienda.'); return false; }
  if(!$('dir').value.trim()){ _avisoFalta('dir','Falta: Dirección.'); return false; }
  if(!$('tel').value.trim()){ _avisoFalta('tel','Falta: Teléfono.'); return false; }
  // Los campos de enlace manual solo son obligatorios con "Con enlace" — con "Sin enlace"
  // o enlace automático ni siquiera se muestran.
  if(curLink==='Si'&&!($('kmE')&&$('kmE').value.trim())){ _avisoFalta('kmE','Falta: Km entrada.'); return false; }
  if(curLink==='Si'&&!($('trE')&&$('trE').value.trim())){ _avisoFalta('trE','Falta: Despl. entrada.'); return false; }
  if(curLink==='Si'&&!($('enlaceDestinoCentro')&&$('enlaceDestinoCentro').value.trim())){ _avisoFalta('enlaceDestinoCentro','Falta: Nº tienda destino.'); return false; }
  if(curLink==='Si'&&!($('enlaceDestino')&&$('enlaceDestino').value.trim())){ _avisoFalta('enlaceDestino','Falta: Tienda destino.'); return false; }
  if(curLink==='Si'&&!($('kmS')&&$('kmS').value.trim())){ _avisoFalta('kmS','Falta: Km salida.'); return false; }
  if(curLink==='Si'&&!($('trS')&&$('trS').value.trim())){ _avisoFalta('trS','Falta: Despl. salida.'); return false; }
  if(!$('arr').value.trim()){ _avisoFalta('arr','Falta: Llegada.'); return false; }
  if(!$('lea').value.trim()){ _avisoFalta('lea','Falta: Salida.'); return false; }
  var wVal=+$('w').value||0;
  if(!wVal){ _avisoFalta('w','Falta: Nº de trabajadores.'); return false; }
  var wChk=Math.max(1,Math.min(4,wVal));
  var nrChk=curJob==='Climatización';
  for(var wi2=0;wi2<wChk;wi2++){
    if(!wNames[wi2]||!wNames[wi2].trim()){ _avisoFalta('wInp'+wi2,'Falta: nombre del Trabajador '+(wi2+1)+'.'); return false; }
    if(nrChk&&wi2>0&&!wRoles[wi2]){ _avisoFalta('wb'+wi2,'Falta: categoría del Trabajador '+(wi2+1)+'.'); return false; }
  }
  if(!$('obs').value.trim()){ _avisoFalta('obs','Falta: Descripción del trabajo realizado.'); return false; }
  return true;
}

function generarCore(){
  var esMercadona=curCliente&&curCliente.tipo==='mercadona';
  var esObras=curJob==='Obras';

  if(!_validarCamposParte()) return;
  // Red de seguridad: si el técnico escribió el pedido directamente (sin pasar por el
  // buscador de arriba, que ya avisa mientras escribe) y ese pedido es de otro técnico,
  // bloquear aquí también — nunca dejar guardar sobre una incidencia ajena.
  if(window._sesion && window._sesion.rol==='tecnico'){
    var _pedidoCheck=($('pedido').value||'').trim();
    if(_pedidoCheck){
      var _regCheck=_registroGlobal(_pedidoCheck, curCliente?curCliente.id:'mercadona');
      if(_regCheck && !_ordenAbiertaATodos(_pedidoCheck, curCliente?curCliente.id:'mercadona') && _regCheck.tecnicoPrincipal && _regCheck.tecnicoPrincipal.toLowerCase()!==window._sesion.nombre.toLowerCase()){
        _mostrarBloqueoIncidenciaDeOtro();
        return;
      }
    }
  }

  var fecha=$('fecha').value; var arr=tm($('arr').value); var lea=tm($('lea').value);
  var esNocturno=_nocturnoConfirmado&&lea<arr;
  var w=Math.max(1,Math.min(4,+$('w').value||0));
  if(lea<=arr&&!esNocturno){ showMsg('msgForm','La hora de salida debe ser posterior a la llegada.','error'); return; }
  var td=getTD(fecha); var nr=curJob==='Climatización';
  var roles=nr?wRoles.slice(0,w):Array(w).fill('Oficial');
  var nOf=roles.filter(function(r){ return r==='Oficial'; }).length;
  var nPe=roles.filter(function(r){ return r==='Peón'; }).length;
  var hist=getH();
  var _tecPrincipalActual=(wNames[0]||'').trim();
  var _tecsCat=getTecnicos();
  var _matchTecPrincipal=_tecsCat.find(function(t){ return t.nombre.toLowerCase()===_tecPrincipalActual.toLowerCase(); });
  if(_matchTecPrincipal) _tecPrincipalActual=_matchTecPrincipal.nombre;
  // Índice real de edición: _editIdx puede haberse perdido (ver _finalizarGuardado, mismo
  // caso), por eso se cae a window._editIdxBackup igual que hace el guardado real. Se excluye
  // de "same" para no contar la versión vieja del propio parte que se está editando como si
  // fuera "otro parte anterior" (duplicaba minutos hacia la media dieta y el auto-enlace).
  var _idxEdicionActual=(_editIdx!==null&&_editIdx!==undefined)?_editIdx:window._editIdxBackup;
  var same=hist.filter(function(x,i){
    return i!==_idxEdicionActual && x.fecha===fecha && x.tecnicos && x.tecnicos[0] && x.tecnicos[0].toLowerCase()===_tecPrincipalActual.toLowerCase();
  });

  // Pedido: Mercadona usa campo manual, no-Mercadona genera IRV, Obras Mercadona usa actObras
  var pedidoVal;
  if(esMercadona&&esObras){
    pedidoVal=_actObrasSeleccionada||nextIRV();
  } else if(esMercadona){
    pedidoVal=$('pedido').value.trim();
  } else {
    // No-Mercadona: generar IRV si no tiene ya uno asignado
    pedidoVal=_pedidoNoMerc||nextIRV();
    _pedidoNoMerc=pedidoVal;
    $('pedidoGenDisplay').textContent=pedidoVal;
  }

  // Grupo para no-Mercadona: usar nombre del cliente si centro vacío
  if(!esMercadona&&curCliente){
    if(window._centroSeleccionado){
      $('centro').value=window._centroSeleccionado;
      window._centroSeleccionado=null;
    } else if(!$('centro').value.trim()||$('centro').value===curCliente.nombre){
      // Nueva referencia - asignar código automático
      $('centro').value=getNextCodLugar();
    }
  }

  // Llamada final de seguridad: recalcula el auto-enlace justo antes de usar curLink,
  // por si el evento onchange de 'arr' no llegó a dispararse de forma fiable antes de
  // generar. checkAutoEnlace() ya protege un enlace manual 'Sí' (early-return) y excluye
  // Servicios y Reparaciones, así que es seguro llamarla aquí sin distinguir cliente/flujo.
  checkAutoEnlace();

  var kmT=0,trI=0,trO=0,kmDG=0,trDG=0,heG=0,kmG=0,trG=0;
  var _notaEnlace='';
  var _origenPedidoAuto=null, _origenCentroAuto=null;
  if(curOrigen==='otro'){
    if(!$('kmOtroIda').value||!$('trOtroIda').value||!$('kmOtroVuelta').value||!$('trOtroVuelta').value){ showMsg('msgForm','Indica km y despl. de ida y vuelta.','error'); return; }
    var kOI=+$('kmOtroIda').value, tOI=rQ(+$('trOtroIda').value);
    var kOV=+$('kmOtroVuelta').value, tOV=rQ(+$('trOtroVuelta').value);
    kmT=kOI+kOV; trI=tOI; trO=tOV; heG=lea+tOV; kmG=kOI; trG=tOI;
    var _otroDesde=$('otroPartidaDesde')?$('otroPartidaDesde').value.trim():'';
    var _otroHacia=$('otroLlegadaHacia')?$('otroLlegadaHacia').value.trim():'';
    if(_otroDesde||_otroHacia) _notaEnlace='Trayectoria: '+(_otroDesde?'partida desde '+_otroDesde:'')+(_otroDesde&&_otroHacia?' · ':'')+(_otroHacia?'llegada hacia '+_otroHacia:'');
  } else if(curLink==='No'){
    if(!$('km').value||!$('tr').value){ showMsg('msgForm','Indica km y desplazamiento.','error'); return; }
    var kv=+$('km').value; var tv=rQ(+$('tr').value);
    kmT=kv*2; trI=tv; trO=tv; heG=lea+tv; kmG=kv; trG=tv;
  } else if(curLink==='Si'){
    // Los 4 campos ya se comprueban arriba en _validarCamposParte(), con mensaje específico
    // y foco en cada uno — aquí ya no hace falta repetir la comprobación.
    var ke=+$('kmE').value,ks=+$('kmS').value,te=rQ(+$('trE').value),ts=+$('trS').value;
    if(ks>ke){ kmDG=ks-ke; trDG=ts>te?Math.round(ts-te):0; kmT=ke*2; trI=te; trO=te; }
    else { kmT=ke+ks; trI=te; trO=rQ(ts); }
    heG=lea+ts; kmG=ke; trG=te;
    var _enlaceDestino=$('enlaceDestino')?$('enlaceDestino').value.trim():'';
    if(_enlaceDestino) _notaEnlace='Desplazamiento Hacia '+_enlaceDestino;
    // Si el km/despl. de esta pareja de tiendas (actual + destino) no vino ya bloqueado
    // desde una pareja conocida (buscarEnlacePar), es nuevo — se guarda para la próxima
    // vez, en los dos sentidos a la vez (misma clave, ver parEnlaceKey).
    var _centroDestinoVal=$('enlaceDestinoCentro')?$('enlaceDestinoCentro').value.trim():'';
    if(_centroDestinoVal && $('kmS') && !$('kmS').readOnly){
      _subirEnlaceEntry(curCliente?curCliente.id:'mercadona', $('centro').value.trim(), _centroDestinoVal, _enlaceDestino, ks, ts);
    }
  } else if(curLink==='Auto'){
    if(!$('kmA').value||!$('trA').value){ showMsg('msgForm','Indica km y despl. de salida.','error'); return; }
    var kA=+$('kmA').value,tA=rQ(+$('trA').value);
    kmT=(aeData?aeData.kmDif:0)+kA; trI=aeData?aeData.trDif:0; trO=tA; heG=lea+tA;
    kmG=kA; trG=tA;
    if(same.length && same[same.length-1].tienda) _notaEnlace='Desplazamiento Desde '+same[same.length-1].tienda;
    if(same.length){ _origenPedidoAuto=same[same.length-1].pedido||null; _origenCentroAuto=same[same.length-1].centro||null; }
  }
  var kmTBase=kmT;
  var _nCoches=Math.max(1,+$('ncoches').value||1);
  var _todosEnlazan = $('todosEnlazan') ? $('todosEnlazan').value!=='No' : true;
  var _kmMultiplicacionSimple = true;
  if(curLink==='Si' && _nCoches>1 && !_todosEnlazan){
    // No todos los coches enlazan: 1 coche usa la fórmula de enlace ya calculada arriba
    // (sin multiplicar), el resto (nCoches-1) usa ida y vuelta al taller (km entrada × 2)
    var kmNoEnlaza = (+$('kmE').value||0) * 2;
    kmT = kmT + (kmNoEnlaza * (_nCoches-1));
    _kmMultiplicacionSimple = false;
  } else {
    kmT=kmT*_nCoches;
  }
  var kmAdic = +$('kmAdicionales').value || 0;
  var _notaKmAdicional = '';
  if(kmAdic>0){
    var _kmAdicJust=$('kmAdicionalesJust').value.trim();
    if(!_kmAdicJust){ _mostrarAvisoKmAdicObligatoria(); return; }
    _notaKmAdicional = kmAdic+' km adicionales: '+_kmAdicJust;
  } else if(window._notaKmAdicionalOriginal){
    // Editando un parte y no se tocó el km adicional esta vez: conservar la nota original,
    // en vez de perderla (el importe original de km adicionales no queda guardado por separado).
    _notaKmAdicional = window._notaKmAdicionalOriginal;
  }
  kmT = kmT + kmAdic;

  var tlK='',tlT='',tlS='';
  if(curOrigen==='otro'){ tlK=tl(arr-trI,arr)+' &middot; '+fmt(kOI)+' km'; tlT=tl(arr,lea)+' Tienda'; tlS=tl(lea,lea+trO)+' &middot; '+fmt(kOV)+' km'; }
  else if(curLink==='No'){ var ku=(kmT-kmAdic)/2; tlK=tl(arr-trI,arr)+' &middot; '+fmt(ku)+' km'; tlT=tl(arr,lea)+' Tienda'; tlS=tl(lea,lea+trO)+' &middot; '+fmt(ku)+' km'; }
  else if(curLink==='Si'){ var kev=+$('kmE').value,ksm=kmDG>0?kev:+$('kmS').value; tlK=tl(arr-trI,arr)+' &middot; '+fmt(kev)+' km'; tlT=tl(arr,lea)+' Tienda'; tlS=tl(lea,lea+trO)+' &middot; '+fmt(ksm)+' km'; }
  else if(curLink==='Auto'){ var kAv=+$('kmA').value,kd=aeData?aeData.kmDif:0,td2=aeData?aeData.trDif:0; tlK=(td2>0)?tl(arr-trI,arr)+' &middot; '+fmt(kd)+' km':''; tlT=tl(arr,lea)+' Tienda'; tlS=tl(lea,lea+trO)+' &middot; '+fmt(kAv)+' km'; }

  var html='';
  html+=tRow(curJob);
  html+=gt('Datos generales');
  html+=iRow('Fecha',fecha.split('-').reverse().join('/'));
  if(esMercadona&&esObras){
    html+=iRow('Actuaci\u00f3n',pedidoVal);
  } else {
    html+=iRow('N\u00ba orden',pedidoVal);
  }
  var _numParteHtml=($('numParte').value||'').trim();
  if(_numParteHtml) html+=iRow('N\u00ba parte',_numParteHtml);
  html+=iRow('Tienda',$('tienda').value);
  html+=iRow('Direcci\u00f3n',$('dir').value);
  html+=iRow('Tel\u00e9fono',$('tel').value);

  if(tlK) html+=gt(tlK);
  var conPrecios=curCliente&&curCliente.precios===true;
  var _kmCod=gc(curJob,'Km',''); var _kmPr=conPrecios?getPrecioPorCod(_kmCod,'Kmje',curJob):0;
  var _kmSubtotal=kmTBase*_nCoches;
  var _kmValTxt;
  if(_nCoches>1 && _kmMultiplicacionSimple){
    _kmValTxt = fmt(kmTBase)+' km x'+_nCoches+'= '+fmt(_kmSubtotal)+' km';
    if(kmAdic>0) _kmValTxt += ' + '+fmt(kmAdic)+' km adic.= '+fmt(kmT)+' km';
  } else if(kmAdic>0){
    _kmValTxt = fmt(kmT-kmAdic)+' + '+fmt(kmAdic)+' = '+fmt(kmT)+' km';
  } else {
    _kmValTxt = fmt(kmT)+' km';
  }
  if(conPrecios&&_kmPr>0){ html+='<div class="rrow"><span class="rc">'+_kmCod+'</span><span class="rl">Kmje</span><span class="rv">'+_kmValTxt+'</span><span class="rp">'+fmtPrecio(_kmPr*kmT)+'</span></div>'; }
  else { html+=cRow(_kmCod,'Kmje',_kmValTxt); }
  html+=gt(tlT);
  var hMin;
  if(esNocturno){
    var t1=calcMin(arr,1440,td);
    var t2=calcMin(0,lea,td);
    hMin={Normal:(t1.Normal||0)+(t2.Normal||0),Extra:(t1.Extra||0)+(t2.Extra||0),Nocturna:(t1.Nocturna||0)+(t2.Nocturna||0),Festiva:(t1.Festiva||0)+(t2.Festiva||0)};
  } else {
    hMin=calcMin(arr,lea,td);
  }
  var lA={'H. Normal':'H.Nor','H. Extra':'H.Ext','H. Nocturna':'H.Noc','H. Festiva':'H.Fes'};
  ['H. Normal','H. Extra','H. Nocturna','H. Festiva'].forEach(function(lab){
    var tipo=lab.replace('H. ',''); var min=hMin[tipo]; if(!min) return;
    var h=min/60; var ab=lA[lab]||lab;
    if(!nr){
      var t=h*w; var _hCod=gc(curJob,lab,''); var _hPr=conPrecios?getPrecioPorCod(_hCod,ab,curJob):0;
      var _hVal=w>1?fmtH(h)+' x'+w+'= '+fmtH(t):fmtH(h);
      if(conPrecios&&_hPr>0){ html+='<div class="rrow"><span class="rc">'+_hCod+'</span><span class="rl">'+ab+'</span><span class="rv">'+_hVal+'</span><span class="rp">'+fmtPrecio(_hPr*t)+'</span></div>'; }
      else { html+=cRow(_hCod,ab,_hVal); }
    } else {
      if(nOf>0){ var tO=h*nOf; var _hCodOf=gc(curJob,lab,'Oficial'); var _hPrOf=conPrecios?getPrecioPorCod(_hCodOf,ab+'.Of',curJob):0; var _hValOf=nOf>1?fmtH(h)+' x'+nOf+'= '+fmtH(tO):fmtH(h);
        if(conPrecios&&_hPrOf>0){ html+='<div class="rrow"><span class="rc">'+_hCodOf+'</span><span class="rl">'+ab+'.Of</span><span class="rv">'+_hValOf+'</span><span class="rp">'+fmtPrecio(_hPrOf*tO)+'</span></div>'; }
        else { html+=cRow(_hCodOf,ab+'.Of',_hValOf); }
      }
      if(nPe>0){ var tP=h*nPe; var _hCodPn=gc(curJob,lab,'Peón'); var _hPrPn=conPrecios?getPrecioPorCod(_hCodPn,ab+'.Pn',curJob):0; var _hValPn=nPe>1?fmtH(h)+' x'+nPe+'= '+fmtH(tP):fmtH(h);
        if(conPrecios&&_hPrPn>0){ html+='<div class="rrow"><span class="rc">'+_hCodPn+'</span><span class="rl">'+ab+'.Pn</span><span class="rv">'+_hValPn+'</span><span class="rp">'+fmtPrecio(_hPrPn*tP)+'</span></div>'; }
        else { html+=cRow(_hCodPn,ab+'.Pn',_hValPn); }
      }
    }
  });
  html+=gt(tlS);
  var gD={Normal:0,Extra:0,Nocturna:0,Festiva:0};
  if(trI>0){
    var dI=calcMin(arr-trI,arr,td);
    Object.keys(dI).forEach(function(k){ gD[k]=(gD[k]||0)+dI[k]; });
  }
  if(trO>0){
    var dO=calcMin(lea,lea+trO,td);
    Object.keys(dO).forEach(function(k){ gD[k]=(gD[k]||0)+dO[k]; });
  }
  var dL={Normal:'D. Normal',Extra:'D. Extra',Nocturna:'D. Nocturno',Festiva:'D. Festivo'};
  var dA={Normal:'Dsp.Nor',Extra:'Dsp.Ext',Nocturna:'Dsp.Noc',Festiva:'Dsp.Fes'};
  ['Normal','Extra','Nocturna','Festiva'].forEach(function(k){
    if(!gD[k]) return; var h=gD[k]/60; var t=h*w;
    var _dCod=gc(curJob,dL[k],''); var _dPr=conPrecios?getPrecioPorCod(_dCod,dA[k],curJob):0;
    var _dVal=w>1?fmtH(h)+' x'+w+'= '+fmtH(t):fmtH(h);
    if(conPrecios&&_dPr>0){ html+='<div class="rrow"><span class="rc">'+_dCod+'</span><span class="rl">'+dA[k]+'</span><span class="rv">'+_dVal+'</span><span class="rp">'+fmtPrecio(_dPr*t)+'</span></div>'; }
    else { html+=cRow(_dCod,dA[k],_dVal); }
  });
  var totMin=trI+(esNocturno?(1440-arr+lea):(lea-arr))+trO;
  var clienteIdActual=curCliente?curCliente.id:'mercadona';
  var sameCliente=same.filter(function(x){ return (x.clienteId||'mercadona')===clienteIdActual; });
  var dietaYa=sameCliente.some(function(x){ return x.dieta; });
  // La media dieta solo acumula horas de un tramo REALMENTE continuo: se suma un parte
  // anterior solo si el hueco hasta el siguiente (o hasta el actual) es de 1h o menos, O si
  // los dos partes están enlazados de verdad (Con enlace / Auto) — un enlace ya explica y
  // cubre ese hueco (es el trayecto declarado), así que ahí no hace falta mirar el reloj.
  // Si hay un hueco mayor SIN enlace de por medio, ahí se corta la cadena y no cuenta como
  // el mismo tramo. Solo cuentan partes que ya terminaron ANTES de la llegada de este (nunca
  // uno posterior, que puede existir si se está editando/regenerando uno de una hora más
  // temprana).
  var _anteriores=sameCliente.filter(function(x){ return tm(x.arr)<=arr; })
    .slice().sort(function(a,b){ return tm(a.arr)-tm(b.arr); });
  var acum=totMin;
  var _inicioTramo=arr;
  var _enlazadoConAnterior=(curLink==='Auto');
  for(var _si=_anteriores.length-1;_si>=0;_si--){
    var _prev=_anteriores[_si];
    var _finPrev=tm(_prev.lea);
    if(!_prev.lea) break;
    if(!_enlazadoConAnterior && _inicioTramo-_finPrev>60) break;
    acum+=(_prev.totalMin||0);
    _inicioTramo=tm(_prev.arr);
    _enlazadoConAnterior=(_prev.linkType==='Auto');
  }
  var dieta=acum>=300&&!dietaYa;
  html+='<div style="height:1px;background:var(--border);margin:10px 0"></div>';
  var subtotalServicio=0;
  if(dieta){
    var dCod=gc(curJob,'Dieta',''); var dVal=w>1?'\u00d7 '+w:'\u00d7 1';
    var dPrecio=conPrecios?getPrecioPorCod(dCod,'\u00bd Dieta',curJob):0;
    var dTotal=dPrecio*w;
    if(conPrecios&&dTotal>0){ subtotalServicio+=dTotal; html+='<div class="rrow"><span class="rc">'+dCod+'</span><span class="rl">\u00bd Dieta</span><span class="rv">'+dVal+'</span><span class="rp">'+fmtPrecio(dTotal)+'</span></div>'; }
    else { html+=cRow(dCod,'\u00bd Dieta',dVal); }
  }
  else { var info=dietaYa?'&#9989; Media dieta ya aplicada hoy':'&#9203; Acumulado: '+fmt(acum/60)+' h de 5 h (faltan '+fmt(Math.max(0,300-acum)/60)+' h)'; html+='<div style="font-size:.82rem;color:var(--text2);padding:7px 10px;background:var(--surface2);border-radius:var(--r-sm);border:1px solid var(--border2)">'+info+'</div>'; }
  var durTotal=esNocturno?(1440-arr+lea):(lea-arr);
  var noms=wNames.filter(function(n){ return n&&n.trim(); });

  // Calcular subtotal servicio (km+horas+despl+dieta)
  if(conPrecios){
    // km
    var kmCod=gc(curJob,'Km',''); var kmPr=getPrecioPorCod(kmCod,'Kmje',curJob); subtotalServicio+=kmPr*kmT;
    // horas
    ['H. Normal','H. Extra','H. Nocturna','H. Festiva'].forEach(function(lab){
      var tipo=lab.replace('H. ',''); var min=hMin[tipo]; if(!min) return; var h=min/60;
      if(!nr){ subtotalServicio+=getPrecioPorCod(gc(curJob,lab,''),lA[lab]||lab,curJob)*h*w; }
      else {
        if(nOf>0) subtotalServicio+=getPrecioPorCod(gc(curJob,lab,'Oficial'),(lA[lab]||lab)+'.Of',curJob)*h*nOf;
        if(nPe>0) subtotalServicio+=getPrecioPorCod(gc(curJob,lab,'Peón'),(lA[lab]||lab)+'.Pn',curJob)*h*nPe;
      }
    });
    // desplazamiento
    ['Normal','Extra','Nocturna','Festiva'].forEach(function(k){
      if(!gD[k]) return; var h=gD[k]/60;
      subtotalServicio+=getPrecioPorCod(gc(curJob,dL[k],''),dA[k],curJob)*h*w;
    });
  }

  if(conPrecios&&subtotalServicio>0){
    html+='<div class="rrow subtotal-row" style="margin-top:6px;"><span class="rc">Sub.</span><span class="rl">Subtotal servicio</span><span class="rv">'+fmtPrecio(subtotalServicio)+'</span></div>';
    html+='<div style="height:1px;background:var(--border);margin:8px 0"></div>';
  }

  var matsUsados=msGetSel();
  var subtotalMats=0;
  if(matsUsados.length){
    html+='<div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin:8px 0 5px;">Materiales</div>';
    html+='<div style="padding:6px 0;">';
    matsUsados.forEach(function(m){
      var cant=m.cantidad; var cantStr=Number.isInteger(cant)?cant:cant;
      if(conPrecios){
        // buscar precio del material en el catálogo
        var cat=getCat(); var grupoId=null;
        var g=catGetGrupoParaJob(_MS.catJob||curJob); if(g) grupoId=g.id;
        var matPrecio=0;
        if(grupoId){
          var allSecs=(cat.grupos.find(function(x){return x.id===grupoId;})||{}).secciones||[];
          allSecs.forEach(function(sec){
            (sec.mats||[]).forEach(function(mat){if(mat.nom===m.nombre&&mat.precio&&+mat.precio>0) matPrecio=parseFloat(mat.precio);});
            (sec.subsecs||[]).forEach(function(ss){(ss.mats||[]).forEach(function(mat){if(mat.nom===m.nombre&&mat.precio&&+mat.precio>0) matPrecio=parseFloat(mat.precio);});});
          });
        }
        if(matPrecio>0){
          var matTotal=matPrecio*cant; subtotalMats+=matTotal;
          html+='<div style="font-size:.88rem;padding:4px 0;border-bottom:1px solid var(--border2);display:flex;justify-content:space-between;"><span>'+cantStr+' '+escHtml(m.nombre)+'</span><span style="color:#4ade80;font-weight:700;font-size:.82rem;">'+fmtPrecio(matTotal)+'</span></div>';
        } else {
          html+='<div style="font-size:.88rem;padding:4px 0;border-bottom:1px solid var(--border2);">'+cantStr+' '+escHtml(m.nombre)+'</div>';
        }
      } else {
        html+='<div style="font-size:.88rem;padding:4px 0;border-bottom:1px solid var(--border2);">'+cantStr+' '+escHtml(m.nombre)+'</div>';
      }
    });
    html+='</div>';
    if(conPrecios&&subtotalMats>0){
      html+='<div class="rrow subtotal-row" style="margin-top:6px;"><span class="rc">Sub.</span><span class="rl">Subtotal materiales</span><span class="rv">'+fmtPrecio(subtotalMats)+'</span></div>';
      html+='<div style="height:1px;background:var(--border);margin:8px 0"></div>';
    }
  }

  if(_notaEnlace) html+='<div class="nota-trayectoria" style="font-size:.82rem;color:var(--text2);padding:7px 10px;background:var(--surface2);border-radius:var(--r-sm);border:1px solid var(--border2);margin-bottom:8px;">&#128279; '+escHtml(_notaEnlace)+'</div>';
  // Fila TOTAL con horas y precio total si aplica
  var totalPrecio=subtotalServicio+subtotalMats;
  if(conPrecios&&totalPrecio>0){
    html+='<div class="rrow total-row"><span class="rc">TOTAL</span><span class="rl"></span><span class="rv">'+fmtH(durTotal/60*w)+'</span><span class="rp">'+fmtPrecio(totalPrecio)+'</span></div>';
  } else {
    html+=totRow(fmtH(durTotal/60*w));
  }
  if(noms.length) html+='<div class="rrow info-row"><span class="rc" style="font-family:sans-serif;font-size:.72rem;font-weight:700;text-transform:uppercase;">Técnicos</span><span class="rl" style="font-family:sans-serif;font-size:.85rem;color:var(--text);">'+noms.map(function(n){return n.trim();}).join(' · ')+'</span></div>';
  _nocturnoConfirmado=false;
  $('out').innerHTML=html;
  // La observación se escribe en el formulario (antes de generar), no aquí — se muestra de
  // solo lectura para poder revisarla junto al resto del parte antes de guardar.
  var _od=$('obsDisplay'); if(_od) _od.value=$('obs').value.trim();
  $('gbtn').textContent='\u{1F4BE} Guardar parte'; $('gbtn').disabled=false; $('gbtn').style.opacity='1';
  $('msgRes').className='msg';
  var _fna=$('fieldNotaKmAdic'), _nkd=$('notaKmAdicDisplay');
  if(_fna&&_nkd){ if(_notaKmAdicional){ _fna.style.display='block'; _nkd.value=_notaKmAdicional; } else { _fna.style.display='none'; _nkd.value=''; } }

  var codigos=[];
  codigos.push({cod:gc(curJob,'Km',''),lab:'Kmje',v:kmT,u:'km'});
  ['H. Normal','H. Extra','H. Nocturna','H. Festiva'].forEach(function(lab){
    var tipo=lab.replace('H. ',''); var min=hMin[tipo]; if(!min) return;
    var h=min/60; var ab=lA[lab]||lab;
    if(!nr){ codigos.push({cod:gc(curJob,lab,''),lab:ab,v:h*w,u:'h'}); }
    else {
      if(nOf>0) codigos.push({cod:gc(curJob,lab,'Oficial'),lab:ab+'.Of',v:h*nOf,u:'h'});
      if(nPe>0) codigos.push({cod:gc(curJob,lab,'Peón'),lab:ab+'.Pn',v:h*nPe,u:'h'});
    }
  });
  ['Normal','Extra','Nocturna','Festiva'].forEach(function(k){
    if(!gD[k]) return;
    codigos.push({cod:gc(curJob,dL[k],''),lab:dA[k],v:(gD[k]/60)*w,u:'h'});
  });
  if(dieta) codigos.push({cod:gc(curJob,'Dieta',''),lab:'½ Dieta',v:w,u:'dieta'});

  window.recTmp={
    fecha:fecha, pedido:pedidoVal, numParte:($('numParte').value||'').trim(), actObras:(esMercadona&&esObras)?pedidoVal:null,
    centro:$('centro').value, tienda:$('tienda').value,
    dir:$('dir').value, tel:$('tel').value, km:kmG, tr:trG,
    job:curJob, catJob:_MS.catJob||null, roles:roles, detalle:html, fin:lea, trS:trO, totalMin:totMin, dieta:dieta,
    arr:$('arr').value, lea:$('lea').value, obs:'', linkType:curLink,
    kmDif:kmDG, trDif:trDG, horaEnlace:heG, tipoDia:td,
    enlaceDestinoCentro:(typeof _centroDestinoVal!=='undefined'&&_centroDestinoVal)?_centroDestinoVal:null,
    enlaceDestino:(typeof _enlaceDestino!=='undefined'&&_enlaceDestino)?_enlaceDestino:null,
    enlaceKmSalida:(typeof ks!=='undefined')?ks:null, enlaceTrSalida:(typeof ts!=='undefined')?ts:null,
    enlaceOrigenPedido:_origenPedidoAuto, enlaceOrigenCentro:_origenCentroAuto,
    origen:curOrigen,
    otroPartidaDesde:(typeof _otroDesde!=='undefined'&&_otroDesde)?_otroDesde:null,
    otroLlegadaHacia:(typeof _otroHacia!=='undefined'&&_otroHacia)?_otroHacia:null,
    otroKmVuelta:(typeof kOV!=='undefined')?kOV:null, otroTrVuelta:(typeof tOV!=='undefined')?tOV:null,
    estado:'en-ejecucion', materiales:msGetSel(), codigos:codigos,
    clienteId:curCliente?curCliente.id:'mercadona', cod_v:3,
    averiaReportada:_averiaReportada||'',
    descIncidencia:($('descIncidencia')&&$('descIncidencia').value)||'',
    notaKmAdicional:_notaKmAdicional,
    origenAutoLectura: !!window._origenAutoLectura,
    tecnicos:(function(){
      var tecs=getTecnicos();
      return wNames.filter(function(n){return n&&n.trim();}).map(function(nom){
        var nomL=nom.trim().toLowerCase();
        // Buscar coincidencia exacta primero, luego parcial
        var match=tecs.find(function(t){return t.nombre.toLowerCase()===nomL;})
          ||tecs.find(function(t){return t.nombre.toLowerCase().indexOf(nomL)===0||nomL.indexOf(t.nombre.toLowerCase().split(' ')[0])===0;});
        return match?match.nombre:nom.trim();
      });
    })()
  };
  _guardarBorradorParte();
  document.querySelectorAll('.win').forEach(function(win){ win.classList.remove('active'); });
  $('w-result').classList.add('active');
  window.scrollTo(0,0);
}
// Guarda de inmediato en Firestore una copia del parte recién generado, identificada igual
// que tendría el parte real (fecha+pedido+centro+cliente) — así, si el técnico nunca llega a
// guardarlo de verdad (olvido, pérdida de conexión, cierre de la app), el dato no se pierde:
// pasados 15 minutos sin guardarse, el panel de avisos del administrador lo muestra (ver
// renderAsgAdmin()). Se sobrescribe cada vez que se regenera el mismo parte — no crea uno
// nuevo por cada regeneración mientras el técnico sigue ajustando datos antes de guardar.
function _guardarBorradorParte(){
  if(typeof _db==='undefined' || !_db || !window.recTmp) return;
  var r=window.recTmp;
  if(!r.pedido || !r.fecha || !r.centro) return;
  var docId=((r.clienteId||'mercadona')+'_'+r.fecha+'_'+r.centro+'_'+r.pedido).replace(/[\/\s]/g,'-');
  var datos=Object.assign({}, r, {
    obs: ($('obs')&&$('obs').value.trim())||'',
    tecnicoGenerador: (window._sesion&&window._sesion.nombre)||'',
    generadoEn: Date.now()
  });
  _db.collection('partesSinGuardar').doc(docId).set(datos).catch(_fallo('_guardarBorradorParte partesSinGuardar.set'));
}
// Borra el borrador correspondiente cuando el parte sí se termina guardando de verdad —
// llamada desde los 3 caminos de _finalizarGuardado() que sí resultan en un guardado real
// (nunca en el camino de "cancelar reemplazo", donde de verdad no se guardó nada).
function _borrarBorradorParte(r){
  if(typeof _db==='undefined' || !_db || !r || !r.pedido) return;
  var docId=((r.clienteId||'mercadona')+'_'+r.fecha+'_'+r.centro+'_'+r.pedido).replace(/[\/\s]/g,'-');
  _db.collection('partesSinGuardar').doc(docId).delete().catch(_fallo('_borrarBorradorParte partesSinGuardar.delete'));
}

function copiar(){
  if(!window.recTmp) return;
  var lines=[];
  document.querySelectorAll('#out .rrow').forEach(function(row){
    var rc=row.querySelector('.rc')?row.querySelector('.rc').textContent:'';
    var rl=row.querySelector('.rl')?row.querySelector('.rl').textContent:'';
    var rv=row.querySelector('.rv')?row.querySelector('.rv').textContent:'';
    lines.push([rc,rl,rv].filter(function(s){ return s.trim(); }).join(' | '));
  });
  var obs=$('obs').value.trim(); if(obs) lines.push('Obs. | '+obs);
  navigator.clipboard.writeText(lines.join('\n')).then(function(){ showMsg('msgRes','Copiado.','success'); });
}

function resetearEstadoCompleto(){
  _editIdx=null; _actObrasSeleccionada=null; _pedidoNoMerc=null; _averiaReportada='';
  aeData=null; esFestivo=false; _nocturnoConfirmado=false;
  curJob=''; curLink='No'; curOrigen='nave'; wRoles=[];
  wNames = (window._sesion && window._sesion.rol === 'tecnico') ? [window._sesion.nombre] : [];
  _MS.sel={}; _MS.extras={}; _MS.secAbierta=null; _MS.catJob=null;
  _keepForm=false;
  ['pedido','numParte','tienda','dir','tel','centro','raw','obs','km','tr',
   'kmE','kmS','trE','trS','kmA','trA','arr','lea','enlaceDestino','enlaceDestinoCentro',
   'otroPartidaDesde','otroLlegadaHacia','kmOtroIda','trOtroIda','kmOtroVuelta','trOtroVuelta'].forEach(function(id){
    var el=$(id); if(el) el.value='';
  });
  _desbloquearCamposAutorrellenados();
  var mnp=$('msgNumParte'); if(mnp){ mnp.style.display='none'; mnp.textContent=''; }
  $('w').value='2';
  $('job').value='';
  $('link').value='No';
  var ad=$('actObrasDisplay'); if(ad){ad.style.display='none';ad.textContent='';}
  var ah=$('actObrasHint'); if(ah) ah.style.display='block';
  var fp=$('fieldPedido'); if(fp) fp.style.display='block';
  var fa=$('fieldActObras'); if(fa) fa.style.display='none';
  var cmf=$('cardMatForm'); if(cmf) cmf.style.display='none';
  var cmfw=$('cardMatFormWrap'); if(cmfw) cmfw.style.display='none';
  var wr=$('workersRol'); if(wr) wr.style.display='none';
  var wl=$('workersList'); if(wl) wl.innerHTML='';
  $('modeNo').style.display='block';
  $('modeSi').style.display='none';
  $('modeAuto').style.display='none';
  $('lnkToggleDiv').style.display='block';
  $('modeNave').style.display='block';
  $('modeOtroPunto').style.display='none';
  $('origen').value='nave';
  $('abn').classList.remove('show');
  $('acOrden').classList.remove('show');
  $('acCentro').classList.remove('show');
  $('msgForm').className='msg';
  $('out').innerHTML='';
  window.recTmp=null;
  $('fecha').value=hoy();
  onFechaChange();
  document.querySelectorAll('#jobTgl button').forEach(function(b){ b.classList.remove('active'); });
  document.querySelectorAll('#lnkTgl button').forEach(function(b,i){ b.classList.toggle('active',i===0); });
  document.querySelectorAll('#origTgl button').forEach(function(b,i){ b.classList.toggle('active',i===0); });
  document.querySelectorAll('#festivoTgl button').forEach(function(b,i){
    b.classList.toggle('active',i===0);
    b.disabled=false; b.style.opacity='1'; b.style.cursor='pointer';
  });
  msInitSel([]);
  renderWorkers();
  renderJobTgl();
  if(curCliente) adaptarFormularioACliente();
}

function nuevo(){
  _editIdx=null;
  ['pedido','numParte','tienda','dir','tel','centro','raw','obs','km','tr','kmE','kmS','trE','trS','kmA','trA','arr','lea','kmAdicionales','kmAdicionalesJust','enlaceDestino','enlaceDestinoCentro','otroPartidaDesde','otroLlegadaHacia','kmOtroIda','trOtroIda','kmOtroVuelta','trOtroVuelta'].forEach(function(id){ var el=$(id); if(el) el.value=''; });
  var mnp2=$('msgNumParte'); if(mnp2){ mnp2.style.display='none'; mnp2.textContent=''; }
  _desbloquearCamposAutorrellenados();
  _desbloquearCamposIdentidadParte();
  window._editNumParteOriginal=null;
  window._notaKmAdicionalOriginal=null;
  window._origenAutoLectura=false;
  var _fd=$('fieldDescIncidencia'); if(_fd) _fd.style.display='none'; var _dd=$('descIncidencia'); if(_dd) _dd.value='';
  var _fna2=$('fieldNotaKmAdic'); if(_fna2) _fna2.style.display='none'; var _nkd2=$('notaKmAdicDisplay'); if(_nkd2) _nkd2.value='';
  $('w').value='2'; $('job').value=''; $('link').value='No'; $('ncoches').value='1';
  $('todosEnlazan').value='Si';
  document.querySelectorAll('#todosEnlazanTgl button').forEach(function(b,i){ b.classList.toggle('active',i===0); });
  $('todosEnlazanField').style.display='none';
  curJob=''; curLink='No'; curOrigen='nave'; wRoles=[];
  wNames = (window._sesion && window._sesion.rol === 'tecnico') ? [window._sesion.nombre] : [];
  esFestivo=false; _cAC=null; _oAC=null; aeData=null;
  _actObrasSeleccionada=null;
  _pedidoNoMerc=null;
  $('actObrasDisplay').style.display='none'; $('actObrasDisplay').textContent='';
  $('actObrasHint').style.display='block';
  $('fieldPedido').style.display='block'; $('fieldActObras').style.display='none';
  document.querySelectorAll('#jobTgl button').forEach(function(b){ b.classList.remove('active'); });
  document.querySelectorAll('#lnkTgl button').forEach(function(b,i){ b.classList.toggle('active',i===0); });
  document.querySelectorAll('#origTgl button').forEach(function(b,i){ b.classList.toggle('active',i===0); });
  document.querySelectorAll('#festivoTgl button').forEach(function(b,i){ b.classList.toggle('active',i===0); b.disabled=false; b.style.opacity='1'; b.style.cursor='pointer'; });
  $('workersRol').style.display='none'; $('workersList').innerHTML='';
  $('modeNo').style.display='block'; $('modeSi').style.display='none'; $('modeAuto').style.display='none';
  $('modeNave').style.display='block'; $('modeOtroPunto').style.display='none'; $('origen').value='nave';
  $('lnkToggleDiv').style.display='block'; $('abn').classList.remove('show');
  $('acOrden').classList.remove('show'); $('acCentro').classList.remove('show');
  $('msgForm').className='msg'; $('out').innerHTML=''; window.recTmp=null;
  $('gbtn').textContent='\u{1F4BE} Guardar parte'; $('gbtn').disabled=false; $('gbtn').style.opacity='1';
  $('cardMatForm').style.display='none'; msInitSel([]);
  _MS.catJob=null;
  var omt=$('obrasMatTipoTgl'); if(omt) omt.style.display='none';
  $('fecha').value=hoy(); onFechaChange(); renderWorkers();
  renderJobTgl();
  adaptarFormularioACliente();
}

