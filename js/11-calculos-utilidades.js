// ===== FRANJAS =====

function tecMostrarDrop(i){
  var d=$('tecDrop'+i); if(d) d.style.display='block';
}
function tecOcultarDrop(i){
  setTimeout(function(){ var d=$('tecDrop'+i); if(d) d.style.display='none'; },150);
}
function tecSeleccionar(i,nombre){
  wNames[i]=nombre;
  var inp=$('wInp'+i); if(inp) inp.value=nombre;
  renderWorkers();
  if(i===0) checkAutoEnlace(); // el técnico principal determina el enlace, reevaluar
}
function renderWorkers(){
  var w=Math.max(1,Math.min(4,+$('w').value||0));
  var _esAdminEditando = window._sesion && window._sesion.rol === 'admin' && window._editIdx !== null;
  var _campoW = $('w'); if(_campoW) _campoW.disabled = !!_esAdminEditando;
  if(!w){ $('workersRol').style.display='none'; wRoles=[]; wNames=[]; return; }
  $('workersRol').style.display='block';
  var nr=curJob==='Climatización';
  while(wRoles.length<w) wRoles.push('Oficial');
  wRoles=wRoles.slice(0,w); wRoles[0]='Oficial';
  while(wNames.length<w) wNames.push('');
  wNames=wNames.slice(0,w);
  var html='';
  // Técnicos disponibles filtrados por job activo — los desactivados no deben salir como
  // sugerencia para trabajo nuevo, pero siguen apareciendo en el histórico de sus partes
  // ya guardados, ya que ese histórico lee el nombre directamente del parte, no de aquí
  var _allTecs=getTecnicos().filter(function(t){
    return t.activo!==false && (!t.jobs||!t.jobs.length||t.jobs.indexOf(curJob)>=0);
  });
  for(var i=0;i<w;i++){
    var _usados=wNames.filter(function(n,ni){return ni!==i&&n&&n.trim();});
    var _tDisp=_allTecs.filter(function(t){return _usados.indexOf(t.nombre)<0;});
    var _dropId='tecDrop'+i;
    var _dropItems=_tDisp.map(function(t){
      return '<div onmousedown="tecSeleccionar('+i+',\''+t.nombre.replace(/\'/g,'\\\'')+'\')" style="padding:10px 14px;font-size:.88rem;cursor:pointer;border-bottom:1px solid var(--border2);">'+t.nombre+'</div>';
    }).join('');
    var _dropHtml='<div id="'+_dropId+'" style="display:none;position:absolute;left:0;right:0;top:100%;z-index:99;background:var(--surface);border:1.5px solid var(--green);border-radius:var(--r-sm);max-height:160px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,.4);">'+_dropItems+'</div>';
    var _inp = _esAdminEditando
      ? '<span style="flex:1;min-width:120px;padding:5px 9px;font-size:.85rem;color:var(--text);display:inline-block;">'+(wNames[i]||'—')+'</span>'
      : '<input type="text" id="wInp'+i+'" placeholder="Nombre" style="flex:1;min-width:120px;padding:5px 9px;font-size:.85rem;width:100%;" value="'+(wNames[i]||'')+'" oninput="wNames['+i+']=this.value'+(i===0?';checkAutoEnlace()':'')+'" onfocus="tecMostrarDrop('+i+')" onblur="tecOcultarDrop('+i+')">';
    if(nr&&i===0){
      html+='<div class="worker-row" style="flex-wrap:wrap;gap:6px"><span class="worker-label">Trabajador 1<span class="wbadge wbadge-auto">Oficial</span></span><div style="position:relative;flex:1;min-width:120px;">'+_inp+_dropHtml+'</div></div>';
    } else if(nr){
      var rol=wRoles[i]||'Oficial';
      html+='<div class="worker-row" style="flex-wrap:wrap;gap:6px"><span class="worker-label">Trabajador '+(i+1)+'<span class="wbadge wbadge-sel" id="wb'+i+'">'+rol+'</span></span><div style="position:relative;flex:1;min-width:120px;">'+_inp+_dropHtml+'</div><div class="worker-tgl"><button onclick="setWR('+i+',\'Oficial\',this)" class="'+(rol==='Oficial'?'active':'')+'">Oficial</button><button onclick="setWR('+i+',\'Pe\u00f3n\',this)" class="'+(rol==='Peón'?'active':'')+'">Pe&oacute;n</button></div></div>';
    } else {
      html+='<div class="worker-row" style="flex-wrap:wrap;gap:6px"><span class="worker-label">Trabajador '+(i+1)+'</span><div style="position:relative;flex:1;min-width:120px;">'+_inp+_dropHtml+'</div></div>';
    }
  }
  $('workersList').innerHTML=html;
}

function refreshCounts(){
  var ej=getOrdenes('en-ejecucion').length;
  var fi=getOrdenes('terminado').length;
  $('cntEj').textContent=ej+' '+(ej===1?'orden activa':'órdenes activas');
  $('cntFin').textContent=fi+' '+(fi===1?'orden cerrada':'órdenes cerradas');
}

var _secActual='';

function adaptarFormularioACliente(){
  var esMerc=curCliente&&curCliente.tipo==='mercadona';
  if(esMerc){
    $('labelPedido').innerHTML='N&ordm; orden <span class="req">*</span>';
    $('pedido').placeholder='Ej: 119137';
    $('pedido').style.display='block';
    $('pedidoGenDisplay').style.display='none';
    $('labelCentro').textContent='Nº centro';
    $('labelCentro').style.cssText='';
    $('centro').placeholder='Ej: 2721';
    $('centro').inputMode='numeric';
    $('fieldCentro').style.display='block';
    $('centro').style.display='block';
    $('centro').style.display='block';
    $('labelTienda').innerHTML='Tienda <span class="req">*</span>';
    $('tienda').placeholder='Mercadona SAN JAVIER 2721';
  } else {
    $('labelPedido').innerHTML='N&ordm; orden (generado)';
    $('pedido').style.display='none';
    $('pedidoGenDisplay').style.display='block';
    $('pedidoGenDisplay').textContent='Se generará al guardar';
    $('centro').value=curCliente?curCliente.nombre:'';
    $('fieldCentro').style.display='block';
    $('labelCentro').textContent=curCliente?curCliente.nombre.toUpperCase():'';
    $('labelCentro').style.cssText='font-size:.95rem;font-weight:700;color:var(--text);text-transform:uppercase;letter-spacing:.04em;';
    $('centro').style.display='none';
    $('labelTienda').innerHTML='Referencia <span class="req">*</span>';
    $('tienda').placeholder='Ej: Baños planta 1, Instalación split...';
  }
}

function calcMin(ini,fin,td){
  var r={Normal:0,Extra:0,Nocturna:0,Festiva:0};
  franjas(td).forEach(function(f){ var m=ov(ini,fin,f.i,f.f); if(m>0) r[f.t]=(r[f.t]||0)+m; });
  return r;
}

// ===== CODIGOS =====
var COD={
  'Conductos':{ 'H. Normal':{c:'MF9404',r:false},'H. Extra':{c:'MF9405',r:false},'H. Nocturna':{c:'MF9406',r:false},'H. Festiva':{c:'MF9407',r:false},'D. Normal':{c:'MK9OVB',r:false},'D. Extra':{c:'MB8723',r:false},'D. Nocturno':{c:'MB8725',r:false},'D. Festivo':{c:'MB8724',r:false},'Km':{c:'MF9412',r:false},'Dieta':{c:'MF9896',r:false} },
  'Climatizacion':{ 'H. Normal':{c:{Oficial:'MF9344',Peón:'MF9348'},r:true},'H. Extra':{c:{Oficial:'MF9345',Peón:'MF9349'},r:true},'H. Nocturna':{c:{Oficial:'MF9346',Peón:'MF9350'},r:true},'H. Festiva':{c:{Oficial:'MF9347',Peón:'MF9351'},r:true},'D. Normal':{c:'M71077',r:false},'D. Extra':{c:'MB8726',r:false},'D. Nocturno':{c:'MB8728',r:false},'D. Festivo':{c:'MB8727',r:false},'Km':{c:'MF9352',r:false},'Dieta':{c:'MF9895',r:false} },
  'Obras':{ 'H. Normal':{c:'MA4836',r:false},'H. Extra':{c:'M71088',r:false},'H. Nocturna':{c:'MA4837',r:false},'H. Festiva':{c:'MA4838',r:false},'D. Normal':{c:'M71077',r:false},'D. Extra':{c:'MB8726',r:false},'D. Nocturno':{c:'MB8728',r:false},'D. Festivo':{c:'MB8727',r:false},'Km':{c:'MA4841',r:false},'Dieta':{c:'MA4839',r:false} }
};

var FN=['01-01','01-06','05-01','08-15','10-12','11-01','12-06','12-08','12-25'];
var FF=['2026-04-03','2026-04-02'];
function esFN(f){ if(!f) return false; if(FF.indexOf(f)!==-1) return true; var p=f.split('-'); return FN.indexOf(p[1]+'-'+p[2])!==-1; }

function showMsg(id,txt,type){
  type=type||'error';
  var m=$(id);
  if(!m) return;
  m.innerHTML='<span>'+(type==='error'?'✕':type==='success'?'✓':'!')+'</span><span>'+txt+'</span>';
  m.className='msg show '+type;
  setTimeout(function(){ m.className='msg'; },5000);
}
function _toast(msg, color){
  var t=document.createElement('div');
  t.style.cssText='position:fixed;bottom:20px;left:50%;transform:translateX(-50%);max-width:88%;background:'+(color||'var(--green)')+';color:#fff;padding:10px 18px;border-radius:20px;font-size:.85rem;font-weight:600;z-index:999;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,.3);';
  t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(function(){ t.remove(); },3500);
}

// ===== UTILS =====

function fmtH(v){
  var r=Math.round(v*100)/100;
  var w=Math.floor(r); var d=Math.round((r-w)*100)/100;
  var f={0.25:'1/4',0.5:'1/2',0.75:'3/4'}[d]||'';
  if(f) return w?w+'h '+f:f+'h';
  return w+'h';
}

function checkAutoEnlace(){
  if(curOrigen==='otro') return; // trayecto libre, no sale de la nave — el enlace no aplica
  if(curLink==='Si') return; // nunca sobrescribir un enlace manual ya elegido por el técnico
  if(curLink==='Auto') return; // ya está en modo Auto — no repetir el autorrelleno de kmA/trA,
                                 // que sobrescribiría un valor que el técnico ya corrigió a mano
  var fecha=$('fecha').value;
  if(!fecha){ resetAE(); return; }
  // Servicios y Reparaciones: trabajos puntuales, nunca se auto-enlazan
  if(curCliente&&curCliente.id==='c_1779744364343'){ resetAE(); return; }
  // El enlace es siempre por técnico: dos técnicos distintos no pueden compartir
  // un enlace aunque coincidan en cliente, fecha y horario — cada uno hace su propio trayecto
  var tecPrincipal=(wNames[0]||'').trim().toLowerCase();
  if(!tecPrincipal){ resetAE(); return; }
  // Busca en TODOS los partes del día (cualquier cliente) del mismo técnico principal
  var curCid=curCliente?curCliente.id:'mercadona';
  var same=getH().filter(function(x){ return x.fecha===fecha && (x.clienteId||'mercadona')===curCid && x.tecnicos && x.tecnicos[0] && x.tecnicos[0].toLowerCase()===tecPrincipal; });
  if(!same.length){ resetAE(); return; }
  var last=same[same.length-1];
  if(!last.linkType||last.linkType==='No'){ resetAE(); return; }

  // 1) El parte anterior ya anunció con enlace manual hacia una tienda destino concreta: si el
  // Nº de centro de este parte coincide, enlazar al instante — sin mirar la hora de llegada. Un
  // enlace declarado por número de tienda es más fiable que una ventana de tiempo fija, sobre
  // todo en trayectos largos donde el margen de 15 min no es realista (caso real Espinardo ->
  // La Loma, 09/09/2026: 75 min de trayecto declarado, 30 min de diferencia real con la hora
  // estimada, fuera del margen de 15 min que había antes).
  var centroActual=($('centro').value||'').trim();
  if(last.linkType==='Si' && last.enlaceDestinoCentro && centroActual && last.enlaceDestinoCentro===centroActual){
    _activarEnlaceAuto(last); return;
  }

  // 2) Si no hay tienda destino anunciada o no coincide, respaldo de siempre: margen de 15 min
  // sobre la hora de llegada estimada del parte anterior.
  var arrVal=$('arr').value;
  if(!arrVal){ resetAE(); return; }
  if(!last.horaEnlace){ resetAE(); return; }
  if(Math.abs(tm(arrVal)-last.horaEnlace)<=15){ _activarEnlaceAuto(last); } else { resetAE(); }
}
function _activarEnlaceAuto(last){
    $('lnkToggleDiv').style.display='none'; $('modeNo').style.display='none'; $('modeSi').style.display='none'; $('modeAuto').style.display='block';
    $('link').value='Auto'; curLink='Auto';
    var origen=last.tienda||last.centro||'parte anterior';
    $('abn').classList.add('show'); $('abnTxt').textContent='Enlace autom\u00e1tico desde '+origen+'. Indica solo km y despl. de salida.';
    // El regreso desde esta tienda es el mismo trayecto que la ida ya conocida de ESTE
    // parte (no del anterior) - trasladarlo antes de ocultar km/tr, en vez de dejar
    // kmA/trA vacios pidiendo un dato que el formulario ya tenia
    if(!$('kmA').value) $('kmA').value=$('km').value||'';
    if(!$('trA').value) $('trA').value=$('tr').value||'';
    _bloquearCamposAutorrellenados();
    aeData={kmDif:last.kmDif||0,trDif:last.trDif||0};
    // Con enlace, el km/despl. de salida del segundo parte es el trayecto REAL de regreso
    // — nunca debe sugerirse con un dato del parte anterior (eso sería aplicar la lógica
    // de "sin enlace" a un caso con enlace). El técnico introduce el valor real.
}

function franjas(td){
  if(td==='festivo') return [{t:'Festiva',i:0,f:1440}];
  if(td==='sabado') return [{t:'Nocturna',i:0,f:360},{t:'Extra',i:360,f:1320},{t:'Nocturna',i:1320,f:1440}];
  return [{t:'Nocturna',i:0,f:360},{t:'Extra',i:360,f:480},{t:'Normal',i:480,f:1140},{t:'Extra',i:1140,f:1320},{t:'Nocturna',i:1320,f:1440}];
}

function getOrdenes(filtro){
  var h=getHVisible();
  // filtrar por cliente activo
  if(curCliente) h=h.filter(function(r){ return (r.clienteId||'mercadona')===curCliente.id; });
  var q=($('busca')?($('busca').value||''):'').toLowerCase();
  var qf=$('buscaF')?($('buscaF').value||''):'';
  var grupos={};
  h.forEach(function(r,idx){
    var okQ=!q||(r.centro||'').toLowerCase().includes(q)||(r.tienda||'').toLowerCase().includes(q)||(r.pedido||'').includes(q)||(r.numParte||'').toLowerCase().includes(q);
    var okF=!qf||(r.fecha===qf);
    if(!okQ||!okF) return;
    var k=getGrupKey(r);
    if(!grupos[k]) grupos[k]={pedido:r.pedido,centro:r.centro,tienda:r.tienda,job:r.job,actObras:r.actObras||null,partes:[],fechaMin:r.fecha,fechaMax:r.fecha};
    grupos[k].partes.push({r:r,idx:idx});
    if(r.fecha<grupos[k].fechaMin) grupos[k].fechaMin=r.fecha;
    if(r.fecha>grupos[k].fechaMax){
      grupos[k].fechaMax=r.fecha;
      grupos[k].tienda=r.tienda; // usar tienda del parte más reciente
    }
  });
  var res=[];
  Object.keys(grupos).forEach(function(k){
    var g=grupos[k];
    g.partes.sort(function(a,b){return a.r.fecha.localeCompare(b.r.fecha);});
    // Usar estado de incidencia de Firestore si está disponible, si no usar el último parte
    var _estadoInc = _getEstadoIncidencia(g.pedido, g.centro);
    g.estado = _estadoInc || g.partes[g.partes.length-1].r.estado || 'terminado';
    if(!filtro||g.estado===filtro) res.push(g);
  });
  return res.sort(function(a,b){ return b.fechaMax.localeCompare(a.fechaMax); });
}

function getTD(fecha){
  if(!fecha) return 'normal';
  if(esFestivo) return 'festivo';
  var dow=new Date(fecha+'T12:00:00').getDay();
  if(dow===0) return 'festivo';
  if(dow===6) return 'sabado';
  return 'normal';
}

function mostrarDlgInicioOrden(){
  var clienteId=curCliente?curCliente.id:'mercadona';
  var sinAsig=_clienteSinAsignacion(clienteId);
  var h=getH();
  var esTecnico=window._sesion && window._sesion.rol==='tecnico';
  var miNombre=esTecnico?window._sesion.nombre.toLowerCase():null;
  var activas=[];
  var seen={};
  for(var i=h.length-1;i>=0;i--){
    var r=h[i];
    if((r.clienteId||'mercadona')!==clienteId) continue;
    var estadoReal=_getEstadoIncidencia(r.pedido, r.centro) || r.estado || 'terminado';
    if(estadoReal!=='en-ejecucion') continue;
    if(esTecnico && !sinAsig){
      var reg=_registroGlobal(r.pedido, r.clienteId||'mercadona');
      var esMio = reg ? (reg.tecnicoPrincipal && reg.tecnicoPrincipal.toLowerCase()===miNombre)
                       : (r.tecnicos && r.tecnicos[0] && r.tecnicos[0].toLowerCase()===miNombre);
      if(!esMio) continue;
    }
    var k=r.pedido+'||'+r.centro;
    if(seen[k]) continue;
    seen[k]=true;
    activas.push({r:r,idx:i});
  }
  // Técnico: incluir también órdenes reasignadas a él en el registro global que aún no tiene en su historial local
  if(esTecnico){
    try {
      var regGlobal=JSON.parse(localStorage.getItem('pm_registro_global')||'{}');
      Object.keys(regGlobal).forEach(function(key){
        var g=regGlobal[key];
        var pedido=g.pedido; if(!pedido) return;
        if(!sinAsig && (!g.tecnicoPrincipal || g.tecnicoPrincipal.toLowerCase()!==miNombre)) return;
        if(g.estado!=='en-ejecucion') return;
        if((g.clienteId||'mercadona')!==clienteId) return;
        var k=pedido+'||'+g.centro;
        if(seen[k]) return;
        seen[k]=true;
        activas.push({r:{pedido:pedido,centro:g.centro,clienteId:g.clienteId,tienda:g.tienda||'',fecha:''},idx:null});
      });
    } catch(e) { _fallo('mostrarDlgInicioOrden')(e); }
  }
  var esMerc=curCliente&&curCliente.tipo==='mercadona';
  $('dlgInicioSub').textContent=activas.length
    ?'Tienes '+activas.length+' orden'+(activas.length>1?'es':'')+(esMerc?' activa':'s activas')+'. ¿Continúas con alguna?'
    :'No hay órdenes activas. ¿Orden nueva?';
  var lista=$('dlgOrdenesActivas');
  if(!activas.length){
    lista.style.display='none';
  } else {
    lista.style.display='block';
    lista.innerHTML=activas.map(function(x){
      var r=x.r;
      var fF=r.fecha?r.fecha.split('-').reverse().join('/'):'--';
      var subTitle=r.actObras?r.actObras:esMerc?'Orden '+r.pedido:'IRV '+r.pedido;
      var click=(x.idx===null)
        ?"seleccionarOrdenInicioFormPedido('"+r.pedido.replace(/'/g,"\\'")+"','"+(r.centro||'').replace(/'/g,"\\'")+"')"
        :'seleccionarOrdenInicioForm('+x.idx+')';
      return '<div class="act-list-item" onclick="'+click+'">'
        +'<div style="flex:1">'
        +'<div class="act-info">'+(r.tienda||r.centro||'')+'</div>'
        +'<div class="act-sub">'+subTitle+' &middot; '+fF+'</div>'
        +'</div>'
        +'<span style="color:var(--text3);">&#8250;</span>'
        +'</div>';
    }).join('');
  }
  $('dlgInicioOrden').classList.add('show');
}

function setJob(v,btn){
  curJob=v; $('job').value=v;
  document.querySelectorAll('#jobTgl button').forEach(function(b){ b.classList.remove('active'); });
  if(btn) btn.classList.add('active');
  renderWorkers();
  // Sistema ms* de materiales por secciones
  _MS.modo='parte';
  $('cardMatFormWrap').style.display='block';
  $('cardMatForm').style.display='none';
  var bm=$('btnMateriales'); if(bm) bm.textContent='\u{1F4E6} Materiales';
  var esObras=v==='Obras';
  var tgl=$('obrasMatTipoTgl');
  if(esObras){
    tgl.style.display='flex';
    if(!_MS.catJob){ _MS.catJob='Climatización'; }
    document.querySelectorAll('#obrasMatTipoTgl button').forEach(function(b){
      b.classList.toggle('active', b.textContent===_MS.catJob);
    });
  } else {
    tgl.style.display='none';
    _MS.catJob=null;
  }
  msRender('parteMatCard');
  // Mostrar/ocultar campo pedido vs actuación obras
  var esMercadona=curCliente&&curCliente.tipo==='mercadona';
  $('fieldPedido').style.display=(esMercadona&&esObras)?'none':'block';
  $('fieldActObras').style.display=(esMercadona&&esObras)?'block':'none';
  // El código IRV de Obras es de uso interno — el técnico nunca lo escribe. Se genera solo
  // en cuanto se elige Obras (a menos que ya venga asignado de una actuación existente,
  // p.ej. desde "¿Cómo seguimos?", "Ejecutar asignación" o al editar un parte guardado).
  if(esMercadona&&esObras){
    if(!_actObrasSeleccionada) _actObrasSeleccionada=nextIRV();
    var ad=$('actObrasDisplay');
    if(ad){ ad.textContent=_actObrasSeleccionada; ad.style.display='block'; }
    var ah=$('actObrasHint'); if(ah) ah.style.display='none';
  }
}
function setObrasMatTipo(tipo,btn){
  _MS.catJob=tipo;
  document.querySelectorAll('#obrasMatTipoTgl button').forEach(function(b){ b.classList.remove('active'); });
  if(btn) btn.classList.add('active');
  msRender('parteMatCard');
}

function setWR(i,rol,btn){
  wRoles[i]=rol;
  btn.closest('.worker-row').querySelectorAll('.worker-tgl button').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  var wb=$('wb'+i); if(wb) wb.textContent=rol;
}

// ===== ACTUACION OBRAS =====
// (_actObrasSeleccionada y _pedidoNoMerc ya declaradas arriba)

function verOrden(enc){
  var dec=decodeURIComponent(enc); var pp=dec.split('||'); var pedido=pp[0]; var centro=pp[1];
  var h=getH();
  var esTecnico=window._sesion && window._sesion.rol==='tecnico';
  var miNombre=esTecnico?window._sesion.nombre.toLowerCase():null;
  // Lista completa de la orden (todos los técnicos) — necesaria para calcular bloques de
  // certificación correctamente aunque el técnico que mira solo vea su propio subconjunto.
  var partesTodas=h.map(function(r,i){ return {r:r,idx:i}; }).filter(function(x){
    return x.r.pedido===pedido && x.r.centro===centro;
  }).sort(function(a,b){ return (a.r.fecha||'').localeCompare(b.r.fecha||''); });
  var partes=esTecnico
    ?partesTodas.filter(function(x){ return x.r.tecnicos && x.r.tecnicos[0] && x.r.tecnicos[0].toLowerCase()===miNombre; })
    :partesTodas;
  if(!partes.length) return;
  // De dónde se abre la orden, para que "Atrás" vuelva allí (ver volverSec): una lista del historial, la búsqueda o un aviso.
  // Desde la lista de incidencias de un centro lo fija selIncidencia, y al repintar la orden (certificar, cerrar…) se conserva.
  if($('secView').style.display==='block') _ordenDesde='lista';
  else if($('histOpts').style.display!=='none') _ordenDesde='';
  $('secView').style.display='none'; $('ordenView').style.display='block'; $('parteView').style.display='none';
  var g=partes[0].r;
  var lastEstado=_getEstadoIncidencia(pedido,centro) || (partes[partes.length-1].r.estado||'terminado');
  var badge=lastEstado==='en-ejecucion'?'<span class="badge badge-a">En ejecuci&oacute;n</span>':'<span class="badge badge-g">Finalizado</span>';
  var f1=partes[0].r.fecha.split('-').reverse().join('/');
  var fN=partes[partes.length-1].r.fecha.split('-').reverse().join('/');
  var fr=f1===fN?f1:f1+' → '+fN;

  var codAcum={};
  // Agrupar por código+etiqueta, no solo por código — así Oficial y Peón (mismo código en
  // clientes sin código propio como no-Mercadona, pero con etiqueta ".Of"/".Pn" distinta)
  // no se mezclan en un único total.
  function sumarCodigo(cod,lab,v,u){ var k=cod+'|'+lab; if(!codAcum[k]) codAcum[k]={rc:cod,rl:lab,v:0,u:u}; codAcum[k].v+=v; }
  partes.forEach(function(p){
    (p.r.codigos||parsearCodigos(p.r.detalle||'', p.r.roles||[])).forEach(function(c){ sumarCodigo(c.cod,c.lab,c.v,c.u); });
  });

  function fmtVal(v,u){ if(u==='km') return Math.round(v)+' km'; if(u==='dieta') return ''+Math.round(v); return fmtH(v); }

  var matAcum={};
  partes.forEach(function(p){
    (p.r.materiales||[]).forEach(function(m){ if(m.cantidad&&+m.cantidad>0) matAcum[m.nombre]=(matAcum[m.nombre]||0)+(+m.cantidad); });
  });

  // Bloques certificados presentes, en orden cronológico de certificación (ascendente).
  // Color alternado verde/blanco contando HACIA ATRÁS desde el último bloque certificado
  // (que siempre es verde) — la cola sin certificar nunca entra en esta alternancia.
  // Calculado sobre partesTodas (la orden completa), no sobre `partes` (que puede estar
  // filtrada a un solo técnico) — si no, un técnico que solo ve parte de una orden con
  // varios técnicos vería colores/etiquetas mal calculados contra el vecino equivocado.
  var _bloques=[];
  partesTodas.forEach(function(p){ var b=p.r.bloqueCertificado; if(b && _bloques.indexOf(b)===-1) _bloques.push(b); });
  var _colorPorBloque={};
  _bloques.forEach(function(b,_bi){
    var _desdeElFinal=_bloques.length-1-_bi;
    _colorPorBloque[b]=(_desdeElFinal%2===0)?'#4ade80':'';
  });
  var _esUltimoDelBloquePorIdx={};
  var _idxUltimoParteOrden=partesTodas.length?partesTodas[partesTodas.length-1].idx:null;
  partesTodas.forEach(function(p,pi){
    var b=p.r.bloqueCertificado;
    if(b){
      var esUltimo=(pi===partesTodas.length-1)||partesTodas[pi+1].r.bloqueCertificado!==b;
      _esUltimoDelBloquePorIdx[p.idx]=esUltimo;
    }
  });

  // Lista de datos del resumen: la pantalla y el PDF salen de aquí, así que siempre dicen lo mismo
  var modeloPartes=[];
  var partesHTML=partes.map(function(p,pi){
    var fF=p.r.fecha.split('-').reverse().join('/');
    var _arrM=p.r.arr?tm(p.r.arr):0, _leaM=p.r.lea?tm(p.r.lea):p.r.fin;
    var dur=fmtH((_leaM<_arrM?1440-_arrM+_leaM:_leaM-_arrM)/60);
    var _bloque=p.r.bloqueCertificado;
    var _color=_bloque?_colorPorBloque[_bloque]:'';
    var _esUltimoParteOrden=(p.idx===_idxUltimoParteOrden);
    var _esUltimoDelBloque=!!_esUltimoDelBloquePorIdx[p.idx];
    var _etiqueta='', _fechaCertHTML='', _etiquetaTxt='', _certTxt='';
    if(_esUltimoParteOrden && lastEstado==='terminado' && _bloques.length){
      _etiqueta=' <span style="font-size:.68rem;font-weight:700;color:var(--text3);">&middot; Cerrada</span>';
      _etiquetaTxt='Cerrada';
    } else if(_esUltimoDelBloque){
      _etiqueta=' <span style="font-size:.68rem;font-weight:700;color:#4ade80;">&middot; Certificados</span>';
      _etiquetaTxt='Certificados';
      // fechaCertificado es el campo propio de la certificación; en partes certificados antes
      // de que existiera ese campo, se cae a fechaModificacion (que en su momento coincidía).
      var _msCert=p.r.fechaCertificado||p.r.fechaModificacion;
      if(_msCert){
        _certTxt='Certificado el '+_fmtFechaHora(_msCert);
        _fechaCertHTML='<div style="font-size:.72rem;color:#4ade80;margin-top:1px;">'+_certTxt+'</div>';
      }
    }
    modeloPartes.push({ n:pi+1, numParte:p.r.numParte||'', fecha:fF, etiqueta:_etiquetaTxt, certificadoEl:_certTxt, color:_color,
      horario:(p.r.arr||'--')+' – '+(p.r.lea||'--')+' · '+dur });
    var _tituloStyle='font-size:.85rem;font-weight:600;'+(_color?('color:'+_color+';'):'');
    return '<div class="orden-parte-item" onclick="verParte('+p.idx+')"><div><div style="'+_tituloStyle+'">Parte '+(pi+1)+(p.r.numParte?' ('+p.r.numParte+')':'')+' &middot; '+fF+_etiqueta+'</div><div style="font-size:.76rem;color:var(--text2);">'+(p.r.arr||'--')+' – '+(p.r.lea||'--')+' &middot; '+dur+'</div>'+_fechaCertHTML+'</div><span style="color:var(--text3);">&#8250;</span></div>';
  }).join('');

  var codHTML=Object.values(codAcum).length
    ?Object.values(codAcum).map(function(c){ return '<div class="acum-row"><span>'+c.rc+' &middot; '+c.rl+'</span><span style="font-weight:600;">'+fmtVal(c.v,c.u)+'</span></div>'; }).join('')
    :'<div style="font-size:.82rem;color:var(--text3);padding:6px 0;">Sin datos.</div>';
  var modeloCodigos=Object.values(codAcum).map(function(c){ return {cod:c.rc, lab:c.rl, valor:fmtVal(c.v,c.u)}; });
  var modeloTotal=null;
  // Añadir TOTAL con precio si cliente de cobro
  var _conPrecios=curCliente&&curCliente.precios===true;
  if(_conPrecios&&Object.values(codAcum).length){
    var _hTot=0,_precioTot=0;
    Object.values(codAcum).forEach(function(c){
      if(c.u==='h'&&c.rl.indexOf('Dsp')===-1) _hTot+=c.v;
      _precioTot+=getPrecioPorCod(c.rc,c.rl,g.job)*c.v;
    });
    if(_precioTot>0){
      modeloTotal={horas:_hTot>0?fmtH(_hTot):'', precio:fmtPrecio(_precioTot)};
      codHTML+='<div class="acum-row" style="border-top:1px solid var(--border);margin-top:6px;padding-top:6px;font-weight:700;color:#4ade80;">'+
        '<span>TOTAL</span>'+
        '<span>'+(_hTot>0?fmtH(_hTot)+'&nbsp;&nbsp;':'')+fmtPrecio(_precioTot)+'</span></div>';
    }
  }

  var matHTML=Object.keys(matAcum).length
    ?Object.keys(matAcum).map(function(n){ return '<div class="acum-row"><span>'+n+'</span><span style="font-weight:600;">'+matAcum[n]+'</span></div>'; }).join('')
    :'<div style="font-size:.82rem;color:var(--text3);padding:6px 0;">Sin materiales registrados.</div>';

  window._ordenActual={ tienda:g.tienda, pedido:pedido, job:g.job, centro:g.centro, clienteId:g.clienteId||'mercadona', actObras:g.actObras||null,
    fechas:partes.map(function(p){ return p.r.fecha.split('-').reverse().join('/'); }),
    estado:lastEstado, codAcum:codAcum, matAcum:matAcum, partes:partes,
    // Lo que dice la pantalla de la orden, en datos: el PDF resumen lo dibuja desde aquí (ver pdfOrden)
    resumen:{ tienda:g.tienda, titulo:(g.actObras?g.actObras+' · '+g.job:'Orden '+pedido+' · '+g.job), estado:lastEstado, fechas:fr,
      nPartes:partes.length, partes:modeloPartes, codigos:modeloCodigos, total:modeloTotal,
      materiales:Object.keys(matAcum).map(function(n){ return {nombre:n, cantidad:matAcum[n]}; }) } };

  var _sinCertOrden=partesTodas.filter(function(p){ return !p.r.bloqueCertificado; }).length;
  var _mostrarCertBtn=_esAdmin() && lastEstado==='en-ejecucion' && _sinCertOrden>=4;
  // En un cliente sin asignación solo el administrador cierra y reabre
  var _soloAdmin=_clienteSinAsignacion(g.clienteId||'mercadona') && !_esAdmin();

  var ordenTitle=g.actObras?g.actObras+' &middot; '+g.job:'Orden '+pedido+' &middot; '+g.job;

  $('ordenBody').innerHTML=
    '<div class="card">'+
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">'+
    '<div><div style="font-weight:700;font-size:.95rem;">'+escHtml(g.tienda)+'</div>'+
    '<div style="font-size:.76rem;color:var(--text2);margin-top:2px;">'+ordenTitle+'</div></div>'+badge+'</div>'+
    '<div class="rrow info-row"><span class="rc">Fechas</span><span class="rl">'+fr+'</span><span class="rv"></span></div>'+
    '<div class="rrow info-row"><span class="rc">Partes</span><span class="rl">'+partes.length+' parte'+(partes.length===1?'':'s')+'</span><span class="rv"></span></div>'+
    '</div>'+
    '<div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin-bottom:7px;">Partes de esta orden</div>'+
    partesHTML+
    '<div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin:14px 0 7px;">C&oacute;digos acumulados</div>'+
    '<div class="acum-block">'+codHTML+'</div>'+
    '<div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin:14px 0 7px;">Materiales acumulados</div>'+
    '<div class="acum-block">'+matHTML+'</div>'+
    '<div class="brow" style="margin-top:10px;">'+
    (lastEstado==='terminado'?'<button class="btn btn-p btn-sm" onclick="pdfOrden()">&#128196; PDF resumen</button>'+(_soloAdmin?'':'<button class="btn btn-s btn-sm" id="btnReabrirOrden">&#128275; Reabrir incidencia</button>'):((_mostrarCertBtn?'<button class="btn btn-p btn-sm" id="btnCertificarOrden" style="background:var(--green);">&#9989; Certificar</button>':'')+(_soloAdmin?'':'<button class="btn btn-p btn-sm" id="btnCerrarOrden" style="background:var(--green);">&#9989; Cerrar incidencia</button>')))+
    '<button class="btn btn-s btn-sm" onclick="compartirOrden()">&#128203; Compartir resumen</button>'+
    '</div>';
  var btnC=document.getElementById('btnCerrarOrden');
  if(btnC) btnC.addEventListener('click', cerrarIncidenciaActual);
  var btnR=document.getElementById('btnReabrirOrden');
  if(btnR) btnR.addEventListener('click', reabrirIncidenciaActual);
  var btnCert=document.getElementById('btnCertificarOrden');
  if(btnCert) btnCert.addEventListener('click', certificarOrdenActual);
}

function resetAE(){
  $('lnkToggleDiv').style.display='block'; $('modeAuto').style.display='none'; $('abn').classList.remove('show');
  var isSi=curLink==='Si';
  $('modeNo').style.display=isSi?'none':'block'; $('modeSi').style.display=isSi?'block':'none';
  if(curLink==='Auto'){ curLink='No'; $('link').value='No'; }
  aeData=null;
}

