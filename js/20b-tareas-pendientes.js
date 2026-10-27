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
    var q=_tarAdmin()?_tarCol().where('vistaAdmin','==',false):_tarCol().where('tecnico','==',_tarYo()).where('estado','==','pendiente');
    q.get().then(function(s){ b.textContent=s.size; b.style.display=s.size>0?'block':'none'; }).catch(function(){});
  }catch(e){} // un fallo aquí nunca debe afectar a la pantalla de inicio ni al inicio de sesión, que lo llaman
}
function abrirTareas(){
  _tarSel=null; _tarTec=''; _tarSugs=[]; _tarCerradas=false;
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
  tarRender();
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
function _tarFila(id){
  var d=_tarCache[id], cerrada=d.estado==='realizada', nuevo=_tarAdmin()?d.vistaAdmin===false:d.vistaTecnico===false;
  return '<div class="act-list-item" style="display:block;cursor:default;">'
    +'<div onclick="tarAbrir(\''+id+'\')" style="cursor:pointer;"><div class="act-info">'+(cerrada?'&#10003; ':'')+escHtml([d.cliente,d.tienda].filter(Boolean).join(' · '))
    +(nuevo?' <span class="badge badge-a" id="tarNuevo_'+id+'">nuevo</span>':'')+'</div>'
    +'<div class="act-sub">Técnico: '+escHtml(d.tecnico)+' · '+_fmtFechaHora(_tarUltima(d))+'</div></div>'
    +'<div id="tarDet_'+id+'" style="display:none;margin-top:8px;">'
    +(d.comentarios||[]).map(function(c){ return '<div style="font-size:.8rem;border-left:3px solid var(--border);padding:3px 8px;margin:4px 0;"><b>'+escHtml(c.por)+'</b> · '+_fmtFechaHora(c.ts)+(c.cierre?' · realizada':'')+'<br>'+escHtml(c.texto).replace(/\n/g,'<br>')+'</div>'; }).join('')
    +(cerrada?'':'<div class="field"><textarea id="tarCom_'+id+'" rows="2" placeholder="Comentario…"></textarea></div>'
      +'<div class="brow"><button class="btn btn-s" onclick="tarEnviar(\''+id+'\',false)">Añadir comentario</button><button class="btn btn-p" onclick="tarEnviar(\''+id+'\',true)">&#10003; Realizada</button></div><div id="tarMsg_'+id+'" class="msg"></div>')
    +'</div></div>';
}
function tarRender(){
  var el=$('tarLista'); el.innerHTML='<div style="color:var(--text2);font-size:.82rem;">Cargando…</div>';
  $('tarTitulo').innerHTML=_tarCerradas?'&#10003; Realizadas':'&#128221; Pendientes';
  $('tarBtnVer').textContent=_tarCerradas?'Ver pendientes':'Ver realizadas';
  // El administrador ve todas las abiertas, más las ya realizadas que aún no ha visto; el técnico, solo las suyas.
  var c=_tarCol(), est=_tarCerradas?'realizada':'pendiente', qs;
  if(_tarAdmin()) qs=_tarCerradas?[c.where('estado','==',est)]:[c.where('estado','==',est),c.where('vistaAdmin','==',false)];
  else qs=[c.where('tecnico','==',_tarYo()).where('estado','==',est)];
  Promise.all(qs.map(function(q){ return q.get(); })).then(function(snaps){
    _tarCache={}; var ids=[];
    snaps.forEach(function(s){ s.forEach(function(d){ if(!_tarCache[d.id]){ _tarCache[d.id]=d.data(); ids.push(d.id); } }); });
    ids.sort(function(a,b){ return _tarUltima(_tarCache[b])-_tarUltima(_tarCache[a]); });
    el.innerHTML=ids.length?ids.slice(0,60).map(_tarFila).join(''):'<div style="color:var(--text2);font-size:.82rem;">No hay tareas.</div>';
  }).catch(function(){ el.innerHTML='<div style="color:var(--red);font-size:.82rem;">No se pudieron cargar. Comprueba tu conexión.</div>'; });
}
function tarVerCerradas(){ _tarCerradas=!_tarCerradas; tarRender(); }
function tarAbrir(id){
  var det=$('tarDet_'+id); if(!det) return;
  det.style.display=det.style.display==='none'?'block':'none';
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

