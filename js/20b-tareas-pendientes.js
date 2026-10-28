// ===== TAREAS PENDIENTES =====
// Cosas por cuadrar con un cliente que todavía no son una incidencia. Colección "tareasPendientes". La crea el administrador
// (elige el técnico) o un técnico (queda asignada a él); la ven el administrador y el técnico asignado. Al realizarla se exige un
// comentario y pasa a "realizada": no se borra, queda como registro. Aviso del administrador = vistaAdmin:false (se apaga al abrirla);
// aviso del técnico = sus tareas abiertas (no se apaga hasta que la realice).
var _tarSel=null, _tarTec='', _tarSugs=[], _tarTecs=[], _tarCache={}, _tarCerradas=false;
function _tarAdmin(){ var r=window._sesion&&window._sesion.rol; return r==='admin'||r==='creador'; }
function _tarYo(){ var n=(window._sesion&&window._sesion.nombre)||''; var t=getTecnicos().find(function(x){ return x.nombre.toLowerCase()===n.toLowerCase(); }); return t?t.nombre:n; }
function _tarCol(){ return _db.collection('tareasPendientes'); }
function _tarUltima(d){ var c=d.comentarios||[]; return c.length?c[c.length-1].ts:(d.fechaCreacion||0); }
function actualizarBadgeTareas(){
  try{
    var b=$('tareasBadge'); if(!b||!window._sesion||typeof _db==='undefined'||!_db) return;
    var clave=_tarAdmin()?'admin':_tarYo();
    var poner=function(n){ b.textContent=n; b.style.display=n>0?'block':'none'; };
    // Sin conexión se deja el último número que se vio (guardado en el móvil)
    var desdeCopia=function(){ try{ var c=JSON.parse(localStorage.getItem('pm_cache_tareas_badge')||'null'); if(c&&c.clave===clave) poner(c.n); }catch(e){} };
    if(navigator.onLine===false){ desdeCopia(); return; }
    // Administrador: todas las tareas activas de todos los técnicos. Técnico: solo las suyas.
    var q=_tarAdmin()?_tarCol().where('estado','==','pendiente'):_tarCol().where('tecnico','==',_tarYo()).where('estado','==','pendiente');
    _conTimeout(q.get(),7000).then(function(s){ poner(s.size); try{ localStorage.setItem('pm_cache_tareas_badge',JSON.stringify({clave:clave,n:s.size})); }catch(e){} }).catch(desdeCopia);
  }catch(e){} // un fallo aquí nunca debe afectar a la pantalla de inicio ni al inicio de sesión, que lo llaman
}
function abrirTareas(verRealizadas){
  _tarSel=null; _tarTec=''; _tarSugs=[]; _tarCerradas=verRealizadas===true;
  $('tarCliente').value=''; $('tarComentario').value=''; $('tarMsg').textContent='';
  var ac=$('acTarCliente'); ac.classList.remove('show'); ac.innerHTML='';
  $('cardNuevaTarea').style.display='none';
  var adm=_tarAdmin();
  $('tarFieldTec').style.display=adm?'block':'none';
  $('tarInfoTec').style.display=adm?'none':'block';
  $('tarInfoTec').textContent='Quedará asignada a ti ('+_tarYo()+').';
  _tarTecs=_tecnicosAsignables().map(function(t){ return t.nombre; });
  $('tarTecTgl').innerHTML=_tarTecs.length?_tarTecs.map(function(n,i){ return '<button onclick="tarElegirTec('+i+',this)">'+escHtml(n)+'</button>'; }).join(''):'<div style="color:var(--text2);font-size:.82rem;padding:6px;">No hay técnicos activos en el catálogo.</div>';
  goTo('w-tareas');
  return tarRender();
}
function tarElegirTec(i,el){ _tarTec=_tarTecs[i]; document.querySelectorAll('#tarTecTgl button').forEach(function(b){ b.classList.remove('active'); }); el.classList.add('active'); }
// Busca en todos los clientes y en todos los sitios de la agenda (Mercadona incluido), por nombre del cliente, de la tienda o nº de centro.
function tarSugerir(val){
  var box=$('acTarCliente'); box.classList.remove('show'); box.innerHTML=''; _tarSugs=[]; _tarSel=null;
  val=(val||'').trim().toLowerCase(); if(!val) return;
  var nom={}, a=getAgenda();
  getClientes().forEach(function(c){ nom[c.id]=c.nombre; if(c.nombre.toLowerCase().indexOf(val)>=0) _tarSugs.push({clienteId:c.id,cliente:c.nombre,centro:'',tienda:''}); });
  Object.keys(a).forEach(function(k){
    var g=a[k]; if(!nom[g.clienteId]) return;
    if((nom[g.clienteId]+' '+(g.tienda||'')+' '+(g.centro||'')).toLowerCase().indexOf(val)>=0) _tarSugs.push({clienteId:g.clienteId,cliente:nom[g.clienteId],centro:g.centro||'',tienda:g.tienda||''});
  });
  if(!_tarSugs.length) return;
  var total=_tarSugs.length; _tarSugs=_tarSugs.slice(0,10);
  box.innerHTML=_tarSugs.map(function(s,i){
    return '<div class="ac-item" onclick="tarElegir('+i+')"><span style="font-size:.75rem;color:var(--green);font-weight:700;margin-right:6px;">'+escHtml(s.cliente)+'</span>'+escHtml(s.tienda||'(todo el cliente)')+'</div>';
  }).join('')+(total>10?'<div class="ac-item" style="color:var(--text2);cursor:default;">Hay '+(total-10)+' más: escribe más letras</div>':'');
  box.classList.add('show');
}
function tarElegir(i){
  _tarSel=_tarSugs[i]; if(!_tarSel) return;
  $('tarCliente').value=_tarSel.cliente+(_tarSel.tienda?' · '+_tarSel.tienda:'');
  var box=$('acTarCliente'); box.classList.remove('show'); box.innerHTML='';
}
function guardarTarea(){
  var txt=$('tarCliente').value.trim(), com=$('tarComentario').value.trim(), adm=_tarAdmin(), tec=adm?_tarTec:_tarYo();
  if(!txt){ showMsg('tarMsg','Falta: Cliente / tienda.'); return; }
  if(!tec){ showMsg('tarMsg','Falta: Técnico encargado (toca uno de los botones).'); return; }
  if(!com){ showMsg('tarMsg','Falta: Comentario.'); return; }
  var s=_tarSel, ts=Date.now();
  var data=Object.assign({
    clienteId:s?s.clienteId:'', cliente:s?s.cliente:'', centro:s?s.centro:'', tienda:s?s.tienda:txt,
    tecnico:tec, estado:'pendiente', creadoPor:window._sesion.nombre, fechaCreacion:ts,
    comentarios:[{texto:com,por:window._sesion.nombre,ts:ts}], vistaAdmin:adm, vistaTecnico:!adm
  }, _marcaModificacion('Tarea creada'));
  _tarCol().add(data).then(function(){ _toast('Tarea guardada'); abrirTareas(); actualizarBadgeTareas(); })
    .catch(function(){ showMsg('tarMsg','Error al guardar. Comprueba tu conexión.'); });
}
// Título como en las asignaciones (el nombre de la tienda); el cliente se antepone solo si el nombre de la tienda no lo incluye.
function _tarTitulo(d){
  var t=d.tienda||'', c=d.cliente||'';
  return (c && t.toLowerCase().indexOf(c.toLowerCase())<0) ? (t?c+' · '+t:c) : (t||c);
}
// Tarjeta con el mismo formato que las incidencias de Asignar: título en negrita y líneas grises debajo.
function _tarFila(id){
  var d=_tarCache[id], cerrada=d.estado==='realizada', nuevo=_tarAdmin()?d.vistaAdmin===false:d.vistaTecnico===false;
  var estado=cerrada?'✅ Realizada':'⏳ Pendiente';
  var tec=(_tarAdmin() && _tarCerradas)?' · Técnico: '+escHtml(d.tecnico):'';
  return '<div class="card" style="margin-bottom:8px;">'
    +'<div onclick="tarAbrir(\''+id+'\')" style="cursor:pointer;"><div style="font-weight:700;font-size:.9rem;">'+escHtml(_tarTitulo(d))
    +(nuevo?' <span class="badge badge-a" id="tarNuevo_'+id+'">nuevo</span>':'')+'</div>'
    +'<div style="font-size:.78rem;color:var(--text2);margin-top:2px;">'+estado+tec+' · '+_fmtFechaHora(_tarUltima(d))+'</div></div>'
    +'<div id="tarDet_'+id+'" style="display:none;margin-top:8px;">'
    +(d.comentarios||[]).map(function(c){ return '<div style="font-size:.8rem;border-left:3px solid var(--border);padding:3px 8px;margin:4px 0;"><b>'+escHtml(c.por)+'</b> · '+_fmtFechaHora(c.ts)+(c.cierre?' · realizada':'')+'<br>'+escHtml(c.texto).replace(/\n/g,'<br>')+'</div>'; }).join('')
    +(cerrada?'':'<div class="field"><textarea id="tarCom_'+id+'" rows="2" placeholder="Comentario…"></textarea></div>'
      +'<div class="brow"><button class="btn btn-s" onclick="tarEnviar(\''+id+'\',false)">Añadir comentario</button><button class="btn btn-p" onclick="tarEnviar(\''+id+'\',true)">&#10003; Realizada</button></div><div id="tarMsg_'+id+'" class="msg"></div>')
    +(_tarAdmin()?_tarControlesAdmin(d,id,cerrada):'')
    +'</div></div>';
}
// Solo el administrador: reasignar a otro técnico y eliminar (va a la Papelera y se puede restaurar), igual que en las asignaciones.
function _tarControlesAdmin(d,id,cerrada){
  return (cerrada?'':'<div style="margin-top:8px;"><label style="font-size:.75rem;color:var(--text2);font-weight:700;">Reasignar a:</label>'
      +'<select onchange="tarReasignar(\''+id+'\',this.value)" style="width:100%;margin-top:4px;padding:6px;border-radius:var(--r-sm);border:1.5px solid var(--border);background:var(--surface2);color:var(--text);font-family:inherit;">'
      +'<option value="">-- mantener --</option>'
      +_tarTecs.filter(function(n){ return n!==d.tecnico; }).map(function(n){ return '<option value="'+escHtml(n)+'">'+escHtml(n)+'</option>'; }).join('')
      +'</select></div>')
    +'<button class="btn btn-d btn-sm" style="margin-top:8px;" onclick="tarEliminar(\''+id+'\')">&#128465; Eliminar</button>';
}
function tarReasignar(id,nuevo){
  if(!nuevo) return;
  var d=_tarCache[id]; if(!d) return;
  var c={texto:'Reasignada de '+d.tecnico+' a '+nuevo,por:window._sesion.nombre,ts:Date.now()};
  _tarCol().doc(id).update(Object.assign({tecnico:nuevo, vistaTecnico:false, vistaAdmin:true, comentarios:firebase.firestore.FieldValue.arrayUnion(c)}, _marcaModificacion('Tarea reasignada')))
    .then(function(){ _toast('Tarea reasignada a '+nuevo); tarRender(); actualizarBadgeTareas(); })
    .catch(function(){ _toast('No se pudo reasignar. Comprueba tu conexión.','var(--red)'); });
}
function tarEliminar(id){
  _confirmarApp('¿Eliminar esta tarea?', function(){
    _moverAPapelera('tareasPendientes', id, 'Eliminada desde Tareas').then(function(){ _toast('Tarea eliminada (está en la Papelera)'); tarRender(); actualizarBadgeTareas(); })
      .catch(function(){ _toast('No se pudo eliminar. Comprueba tu conexión.','var(--red)'); });
  });
}
// Pendientes del administrador: un desplegable por técnico con su número, primero los que tienen tareas (igual que Asignar).
var _tarAbiertos={};
var _tarEstiloAbierto='background:var(--green-light);border-color:var(--green);color:var(--green);'; // el técnico abierto se resalta como en Asignar
function _tarGrupos(ids){
  var por={}; _tarTecs.forEach(function(n){ por[n]=[]; });
  ids.forEach(function(id){ var n=_tarCache[id].tecnico||'(sin asignar)'; (por[n]=por[n]||[]).push(id); });
  return Object.keys(por).sort(function(a,b){ return por[b].length-por[a].length || a.localeCompare(b); }).map(function(n){
    var k=n.replace(/[^a-z0-9]/gi,'_'), cant=por[n].length;
    return '<div class="card" style="margin-bottom:8px;padding:0;overflow:hidden;">'
      +'<button class="btn btn-s btn-full" style="justify-content:space-between;border-radius:0;'+(_tarAbiertos[k]?_tarEstiloAbierto:'')+'" onclick="tarToggleGrupo(\''+k+'\')"><span>&#128119; '+escHtml(n)+'</span>'
      +'<span style="background:'+(cant?'var(--green)':'var(--border2)')+';color:#fff;font-size:.75rem;font-weight:700;padding:2px 9px;border-radius:20px;min-width:22px;text-align:center;">'+cant+'</span></button>'
      +'<div id="tarGrupo_'+k+'" style="display:'+(_tarAbiertos[k]?'block':'none')+';padding:10px;">'
      +(cant?por[n].map(_tarFila).join(''):'<div style="color:var(--text2);font-size:.82rem;">Sin tareas pendientes.</div>')+'</div></div>';
  }).join('');
}
// Avisos del administrador en el inicio ("Notificaciones pendientes"): tarea nueva, comentario o cierre de un técnico que aún no ha visto.
// Al tocar el aviso se marca como visto y se abre Tareas con el desplegable de ese técnico abierto.
function _tarAvisosHtml(snap){
  var h='';
  snap.forEach(function(doc){
    var d=doc.data(), c=d.comentarios||[], u=c[c.length-1]||{};
    var que=d.estado==='realizada'?'realizó la tarea':(c.length>1?'comentó':'creó una tarea');
    var quien=u.por||d.creadoPor||'';
    // El técnico solo se nombra si es otra persona (no hace falta decir "Manuel creó una tarea · Técnico: Manuel")
    var tec=quien.trim().toLowerCase()===(d.tecnico||'').trim().toLowerCase()?'':' · Técnico: '+escHtml(d.tecnico);
    h+='<div class="act-list-item" onclick="tarVerAviso(\''+doc.id+'\')"><span class="act-num">&#128221;</span>'
      +'<div><div class="act-info">'+escHtml(_tarTitulo(d))+'</div>'
      +'<div class="act-sub">Tarea · '+escHtml(quien)+' '+que+tec+'</div></div></div>';
  });
  return h;
}
// Avisos del técnico en el inicio (junto a sus incidencias asignadas): una tarea que le asignaron, o que comentaron, y aún no ha visto.
// Igual que las asignaciones: la fila desaparece al verla, y al tocarla se abre esa tarea.
function _tarAvisosTecnicoHtml(snap){
  var h='';
  snap.forEach(function(doc){
    var d=doc.data(), c=d.comentarios||[], u=c[c.length-1]||{};
    var que=d.estado==='realizada'?'dio la tarea por realizada':(/^Reasignada de /.test(u.texto||'')?'te reasignó la tarea':(c.length>1?'comentó':'te asignó una tarea'));
    h+='<div class="act-list-item" onclick="tarVerAvisoTecnico(\''+doc.id+'\')"><span class="act-num">&#128221;</span>'
      +'<div><div class="act-info">'+escHtml(_tarTitulo(d))+'</div>'
      +'<div class="act-sub">Tarea · '+escHtml(u.por||d.creadoPor||'')+' '+que+'</div></div></div>';
  });
  return h;
}
function tarVerAvisoTecnico(id){
  if(navigator.onLine===false){ _toast('Sin conexión: la tarea se podrá abrir cuando vuelvas a tener internet.','var(--red)'); return; }
  _tarCol().doc(id).get().then(function(doc){
    if(!doc.exists) return;
    var d=doc.data();
    return _tarCol().doc(id).update({vistaTecnico:true}).then(function(){ return abrirTareas(d.estado==='realizada'); }).then(function(){ tarEnfocar(id); });
  }).catch(function(){ _toast('No se pudo abrir la tarea. Comprueba tu conexión.','var(--red)'); });
}
function tarVerAviso(id){
  _tarCol().doc(id).get().then(function(doc){
    if(!doc.exists) return;
    var d=doc.data(); _tarAbiertos={}; _tarAbiertos[(d.tecnico||'(sin asignar)').replace(/[^a-z0-9]/gi,'_')]=true;
    return _tarCol().doc(id).update({vistaAdmin:true}).then(function(){ return abrirTareas(d.estado==='realizada'); }).then(function(){ tarEnfocar(id); });
  }).catch(function(){ _toast('No se pudo abrir la tarea. Comprueba tu conexión.','var(--red)'); });
}
// Deja esa tarea desplegada, resaltada y a la vista (para que el aviso lleve a la tarea y no solo a la lista).
function tarEnfocar(id){
  var det=$('tarDet_'+id); if(!det) return;
  _tarCerrarOtras(det);
  det.style.display='block';
  var fila=det.parentNode; fila.style.borderColor='var(--green)';
  fila.scrollIntoView({behavior:'smooth',block:'center'});
}
// Solo un técnico desplegado a la vez: al abrir uno se cierra el que estuviera abierto.
function tarToggleGrupo(k){
  var el=$('tarGrupo_'+k); if(!el) return;
  var abrir=el.style.display==='none';
  document.querySelectorAll('[id^=tarGrupo_]').forEach(function(e){ e.style.display='none'; var b=e.parentNode.querySelector('button'); if(b){ b.style.background=''; b.style.borderColor=''; b.style.color=''; } });
  _tarCerrarOtras(null); // y las tareas que estuvieran desplegadas dentro
  _tarAbiertos={}; _tarAbiertos[k]=abrir;
  el.style.display=abrir?'block':'none';
  var btn=el.parentNode.querySelector('button');
  if(abrir && btn){ btn.style.background='var(--green-light)'; btn.style.borderColor='var(--green)'; btn.style.color='var(--green)'; }
}
function tarRender(){
  var el=$('tarLista'); el.innerHTML='<div style="color:var(--text2);font-size:.82rem;">Cargando…</div>';
  $('tarTitulo').innerHTML=_tarCerradas?'&#10003; Realizadas':'&#128221; Pendientes';
  $('tarBtnVer').textContent=_tarCerradas?'Ver pendientes':'Ver realizadas';
  // El administrador ve las de todos los técnicos (las pendientes agrupadas por técnico, como en Asignar); el técnico, solo las suyas.
  var c=_tarCol(), est=_tarCerradas?'realizada':'pendiente';
  var q=_tarAdmin()?c.where('estado','==',est):c.where('tecnico','==',_tarYo()).where('estado','==',est);
  return q.get().then(function(s){
    _tarCache={}; var ids=[];
    s.forEach(function(d){ _tarCache[d.id]=d.data(); ids.push(d.id); });
    ids.sort(function(a,b){ return _tarUltima(_tarCache[b])-_tarUltima(_tarCache[a]); });
    if(_tarAdmin() && !_tarCerradas) el.innerHTML=_tarGrupos(ids);
    else el.innerHTML=ids.length?ids.slice(0,60).map(_tarFila).join(''):'<div style="color:var(--text2);font-size:.82rem;">No hay tareas.</div>';
  }).catch(function(){ el.innerHTML='<div style="color:var(--red);font-size:.82rem;">No se pudieron cargar. Comprueba tu conexión.</div>'; });
}
function tarVerCerradas(){ _tarCerradas=!_tarCerradas; tarRender(); }
// Solo una tarea desplegada a la vez: al abrir una se cierra la anterior.
function _tarCerrarOtras(det){
  document.querySelectorAll('[id^=tarDet_]').forEach(function(e){ if(e!==det){ e.style.display='none'; e.parentNode.style.borderColor=''; } });
}
function tarAbrir(id){
  var det=$('tarDet_'+id); if(!det) return;
  var abrir=det.style.display==='none';
  _tarCerrarOtras(det);
  det.style.display=abrir?'block':'none';
  var d=_tarCache[id], campo=_tarAdmin()?'vistaAdmin':'vistaTecnico';
  if(d && d[campo]===false){
    d[campo]=true; var u={}; u[campo]=true;
    _tarCol().doc(id).update(u).then(function(){ var t=$('tarNuevo_'+id); if(t) t.remove(); actualizarBadgeTareas(); }).catch(function(){});
  }
}
function tarEnviar(id,cerrar){
  var t=$('tarCom_'+id), txt=t?t.value.trim():'';
  if(!txt){ showMsg('tarMsg_'+id,cerrar?'Para dar la tarea por realizada escribe un comentario de cierre.':'Escribe el comentario.'); return; }
  var adm=_tarAdmin(), c={texto:txt,por:window._sesion.nombre,ts:Date.now()};
  if(cerrar) c.cierre=true;
  var u=Object.assign({comentarios:firebase.firestore.FieldValue.arrayUnion(c), vistaAdmin:adm, vistaTecnico:!adm}, _marcaModificacion(cerrar?'Tarea realizada':'Comentario en tarea'));
  if(cerrar) Object.assign(u,{estado:'realizada',cerradaPor:c.por,fechaCierre:c.ts});
  _tarCol().doc(id).update(u).then(function(){ _toast(cerrar?'Tarea realizada':'Comentario añadido'); tarRender(); actualizarBadgeTareas(); })
    .catch(function(){ showMsg('tarMsg_'+id,'No se pudo guardar. Comprueba tu conexión.'); });
}

// ===== AVISOS DEL TÉCNICO SIN CONEXIÓN =====
// Lo que se le asigna al técnico (incidencias, solicitudes de reabrir rechazadas y tareas) solo existe en la nube. Cada vez que el inicio lo
// carga bien se guarda una copia en el móvil (localStorage); sin conexión la lista sale de esa copia y se puede empezar una asignación con ella.
var ASG_CACHE_KEY = 'pm_cache_asg_tec';
function _asgCacheLeer(nombre){
  try { var c = JSON.parse(localStorage.getItem(ASG_CACHE_KEY) || 'null'); return (c && (!nombre || c.nombre === nombre)) ? c : null; } catch(e) { return null; }
}
function _asgCacheGuardar(nombre, inc, rech, tar){
  try { localStorage.setItem(ASG_CACHE_KEY, JSON.stringify({ nombre:nombre, ts:Date.now(), inc:inc, rech:rech, tar:tar })); } catch(e) {}
}
// Si la red no responde, no se espera eternamente: se rechaza y se usa la copia.
function _conTimeout(p, ms){
  return new Promise(function(res, rej){
    var t = setTimeout(function(){ rej(new Error('timeout')); }, ms);
    p.then(function(v){ clearTimeout(t); res(v); }, function(e){ clearTimeout(t); rej(e); });
  });
}
function _asgTecAvisoSinConexion(nombre){
  var c = _asgCacheLeer(nombre);
  return '<div class="act-sub" style="margin-bottom:6px;">&#128244; Sin conexión · lista guardada el '+_fmtFechaHora(c ? c.ts : 0)+'</div>';
}
// Mismas filas de siempre, ahora a partir de datos sueltos (vengan de la nube o de la copia).
function _asgTecHtml(inc, rech, tar){
  var html = '';
  inc.forEach(function(d){
    var refs=[]; if(d.pedido) refs.push('Orden '+escHtml(d.pedido)); if(d.centro) refs.push('Centro '+escHtml(d.centro));
    html += '<div class="act-list-item" onclick="abrirAsgTecOpciones(\''+d.id+'\')">'
      + '<span class="act-num">&#128229;</span>'
      + '<div><div class="act-info">'+escHtml(d.tienda)+'</div>'
      + '<div class="act-sub">'+(refs.length?refs.join(' · ')+' · ':'')+escHtml(d.job)+'</div></div>'
      + '</div>';
  });
  rech.forEach(function(d){
    var refs=[]; if(d.pedido) refs.push('Orden '+escHtml(d.pedido)); if(d.centro) refs.push('Centro '+escHtml(d.centro));
    html += '<div class="act-list-item" onclick="verSolicitudRechazada(\''+d.id+'\')">'
      + '<span class="act-num" style="color:var(--red);">&#128274;</span>'
      + '<div><div class="act-info">'+escHtml(d.tienda)+'</div>'
      + '<div class="act-sub">'+(refs.length?refs.join(' · ')+' · ':'')+'Solicitud de reabrir rechazada</div></div>'
      + '</div>';
  });
  return html + _tarAvisosTecnicoHtml({ forEach:function(f){ tar.forEach(function(d){ f({ id:d.id, data:function(){ return d; } }); }); } });
}
function _asgTecRender(miNombre, sec, el){
  function pintar(inc, rech, tar, copia){
    var html = _asgTecHtml(inc, rech, tar);
    if (!html) { sec.style.display = 'none'; el.innerHTML = ''; return; }
    el.innerHTML = (copia ? _asgTecAvisoSinConexion(miNombre) : '') + html; sec.style.display = 'block';
  }
  function desdeCopia(){
    var c = _asgCacheLeer(miNombre);
    if (c) pintar(c.inc || [], c.rech || [], c.tar || [], true); else sec.style.display = 'none';
  }
  if (navigator.onLine === false) { desdeCopia(); return; }
  _conTimeout(Promise.all([
    _db.collection('incidencias').where('tecnicoPrincipal','==',miNombre).where('estado','in',['pendiente','en-ejecucion']).get(),
    _db.collection('incidencias').where('solicitudReabrir.tecnico','==',miNombre).get(),
    // Tareas pendientes que le asignaron (o le comentaron) y aún no ha visto (si esta consulta falla, el resto de avisos sigue igual)
    _db.collection('tareasPendientes').where('tecnico','==',miNombre).where('vistaTecnico','==',false).get().catch(function(){ return { empty:true, forEach:function(){} }; })
  ]), 7000).then(function(r){
    var inc = [], rech = [], tar = [];
    r[0].forEach(function(doc){ var d = doc.data(); if (d.vista === true) return; inc.push(Object.assign({ id:doc.id }, d)); }); // ya vista por el técnico
    r[1].forEach(function(doc){ var d = doc.data(); if (!d.solicitudReabrir || !d.solicitudReabrir.rechazada) return; rech.push(Object.assign({ id:doc.id }, d)); }); // aún no resuelta, o ya aceptada
    r[2].forEach(function(doc){ tar.push(Object.assign({ id:doc.id }, doc.data())); });
    _asgCacheGuardar(miNombre, inc, rech, tar);
    pintar(inc, rech, tar, false);
  }).catch(desdeCopia);
}
function _asgTecAbrirOpciones(id){
  function mostrar(d){
    _asgTecActual = d;
    $('dlgAsgTecTitulo').textContent = _asgTecActual.tienda || 'Incidencia';
    var refs=[]; if(_asgTecActual.pedido) refs.push('Orden '+_asgTecActual.pedido); if(_asgTecActual.centro) refs.push('Centro '+_asgTecActual.centro);
    $('dlgAsgTecSub').textContent = (refs.length?refs.join(' · ')+' · ':'')+(_asgTecActual.job||'');
    $('dlgAsgTec').classList.add('show');
  }
  function desdeCopia(){
    var c = _asgCacheLeer(), d = c && (c.inc || []).find(function(x){ return x.id === id; });
    if (d) mostrar(d); else _toast('Sin conexión: no se pudo abrir esta asignación.', 'var(--red)');
  }
  if (navigator.onLine === false) { desdeCopia(); return; }
  _conTimeout(_db.collection('incidencias').doc(id).get(), 6000).then(function(doc){
    if (!doc.exists) return;
    mostrar(Object.assign({ id:doc.id }, doc.data()));
  }).catch(desdeCopia);
}

