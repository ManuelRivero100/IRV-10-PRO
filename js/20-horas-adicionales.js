// ===== HORAS ADICIONALES (control interno por técnico) =====
var HORAS_KEY='pm_horas';
var _horasFestivoManual=false;
var _horasSubiendo={};

function _horasGet(){
  try { return JSON.parse(localStorage.getItem(HORAS_KEY)||'{}'); }
  catch(e){ console.warn('Horas: copia local ilegible', e); return {}; }
}
function _horasSet(o){ localStorage.setItem(HORAS_KEY, JSON.stringify(o)); }
function horasId(nombre, fecha){ return String(nombre||'').toLowerCase().replace(/[\/\s]+/g,'_')+'_'+fecha; }

function horasTipoDia(fecha, festivoManual){
  var dow=new Date(fecha+'T12:00:00').getDay();
  if(festivoManual || dow===0) return 'festivo';
  if(dow===6) return 'sabado';
  return 'normal';
}

// Lun-vie: adicionales = total - 8 h, tomadas de las horas fuera de 8:00-16:00 en orden cronológico.
// Sábado, domingo y festivo: todo es adicional. Tras medianoche se usa el tipo de día en que empezó
// la jornada, igual que los partes (generarCore).
function horasCalcular(fecha, inicio, fin, festivoManual){
  var td=horasTipoDia(fecha, festivoManual);
  var ini=tm(inicio), fi=tm(fin);
  var cruza=fi<ini;
  var total=cruza?(1440-ini+fi):(fi-ini);
  var r={Normal:0,Extra:0,Nocturna:0,Festiva:0};
  function sumar(a,b){ var c=calcMin(a,b,td); Object.keys(c).forEach(function(k){ r[k]=(r[k]||0)+c[k]; }); }
  var adic;
  if(td!=='normal'){
    adic=total;
    sumar(ini, cruza?1440:fi);
    if(cruza) sumar(0, fi);
  } else {
    adic=Math.max(0,total-480);
    var finDia=cruza?1440:fi;
    var tramos=[];
    if(ini<480) tramos.push([ini, Math.min(finDia,480)]);
    if(finDia>960) tramos.push([Math.max(ini,960), finDia]);
    if(cruza) tramos.push([0, fi]);
    var resto=adic;
    tramos.forEach(function(t){
      if(resto<=0) return;
      var tomar=Math.min(t[1]-t[0], resto);
      if(tomar>0) sumar(t[0], t[0]+tomar);
      resto-=tomar;
    });
  }
  return {tipoDia:td, totalMin:total, adicionalesMin:adic, desglose:r};
}

function horasFmt(min){
  if(min<=0) return '0 h';
  var h=Math.floor(min/60), m=min%60;
  if(h===0) return m+' min';
  return m ? (h+' h '+('0'+m).slice(-2)+' min') : (h+' h');
}
function horasDesgloseTxt(d){
  var p=[];
  ['Normal','Extra','Nocturna','Festiva'].forEach(function(k){ if(d[k]>0) p.push(horasFmt(d[k])+' '+k); });
  return p.length ? p.join(' · ') : 'Sin adicionales';
}

var _horasVista='menu';
var _horasHistSel={mes:null, sem:null};

function _horasEsAdmin(){
  return !!(window._sesion && window._sesion.rol==='admin');
}

// El admin no registra horas (si trabajan, entran con rol de técnico): ven Equipo y Tabulador.
function abrirHoras(){
  if(!window._sesion) return;
  goTo('w-horas');
  if(_horasEsAdmin()){ horasMostrar('menuAdmin'); return; }
  horasMostrar('menu');
  horasReintentar();
  horasTraer();
}

function horasMostrar(v){
  if(_horasEsAdmin()){ if(v!=='equipo' && v!=='tab' && v!=='control') v='menuAdmin'; }
  else if(v==='equipo' || v==='tab' || v==='control' || v==='menuAdmin') v='menu';
  _horasVista=v;
  $('horasMenu').style.display = v==='menu' ? 'block' : 'none';
  $('horasForm').style.display = v==='hoy' ? 'block' : 'none';
  $('horasHist').style.display = v==='hist' ? 'block' : 'none';
  $('horasMenuAdmin').style.display = v==='menuAdmin' ? 'block' : 'none';
  $('horasEquipo').style.display = v==='equipo' ? 'block' : 'none';
  $('horasControl').style.display = v==='control' ? 'block' : 'none';
  $('horasTab').style.display = v==='tab' ? 'block' : 'none';
  $('hInicioBtn').style.display = (v==='menu' || v==='menuAdmin') ? 'none' : '';   // en el menú, "Atrás" ya lleva al inicio
  if(v==='tab'){
    _horasTabSel={nivel:'menu', id:null};
    horasRenderTab();
    horasTabCargar();
  }
  if(v==='hoy'){
    $('hFecha').value=hoy();
    $('hFecha').max=hoy();
    horasCargarDia();
  }
  if(v==='hist'){
    _horasHistSel={mes:null, sem:null};
    horasRenderHist();
  }
  if(v==='equipo'){
    _horasEq={tec:null, mes:null, sem:null, dia:null};
    horasRenderEquipo();
    horasEquipoCargar();
  }
  if(v==='control'){
    _horasCtl={tec:null, mes:null, sem:null};
    horasRenderControl();
    horasControlCargar();
  }
  window.scrollTo(0,0);
}

function horasAtras(){
  if(_horasVista==='equipo'){
    var e=_horasEq;
    if(e.dia!==null) e.dia=null;
    else if(e.sem!==null) e.sem=null;
    else if(e.mes!==null) e.mes=null;
    else if(e.tec!==null) e.tec=null;
    else { horasMostrar('menuAdmin'); return; }
    horasRenderEquipo();
    window.scrollTo(0,0);
    return;
  }
  if(_horasVista==='control'){
    var c=_horasCtl;
    if(c.sem!==null) c.sem=null;
    else if(c.mes!==null) c.mes=null;
    else if(c.tec!==null) c.tec=null;
    else { horasMostrar('menuAdmin'); return; }
    horasRenderControl();
    window.scrollTo(0,0);
    return;
  }
  if(_horasVista==='tab'){
    var s=_horasTabSel;
    if(s.nivel==='editar') horasTabIr('act');
    else if(s.nivel==='act' || s.nivel==='tec') horasTabIr('menu');
    else horasMostrar('menuAdmin');
    return;
  }
  if(_horasVista==='menu' || _horasVista==='menuAdmin'){ goTo('w-clientes'); return; }
  if(_horasVista==='hist'){
    if(_horasHistSel.sem!==null){ _horasHistSel.sem=null; horasRenderHist(); return; }
    if(_horasHistSel.mes!==null){ _horasHistSel.mes=null; horasRenderHist(); return; }
  }
  horasMostrar('menu');
}

function horasPintarTipo(){
  var fecha=$('hFecha').value;
  var dow=fecha ? new Date(fecha+'T12:00:00').getDay() : 1;
  var festivo=_horasFestivoManual || dow===0;
  var btns=document.querySelectorAll('#hTipoTgl button');
  btns[0].classList.toggle('active', !festivo);
  btns[1].classList.toggle('active', festivo);
  var info;
  if(dow===0) info='Domingo: festivo, todas las horas son adicionales.';
  else if(_horasFestivoManual) info='Festivo: todas las horas son adicionales.';
  else if(dow===6) info='Sábado: todas las horas son adicionales (extra).';
  else info='Lunes a viernes: día normal, 8 h de jornada.';
  $('hTipoInfo').textContent=info;
}
function horasSetFestivo(v){
  var f=$('hFecha').value;
  if(f && new Date(f+'T12:00:00').getDay()===0) return;
  _horasFestivoManual=v;
  horasPintarTipo();
  horasRecalcular();
}

function horasRecalcular(){
  var f=$('hFecha').value, i=$('hInicio').value, o=$('hFin').value, el=$('hResultado');
  if(!f || !i || !o || i===o){ el.style.display='none'; return null; }
  var c=horasCalcular(f, i, o, _horasFestivoManual);
  var fila=function(t,v){ return '<div style="display:flex;justify-content:space-between;gap:10px;padding:3px 0;"><span style="color:var(--text2);">'+t+'</span><b style="text-align:right;">'+v+'</b></div>'; };
  el.style.display='block';
  el.innerHTML=fila('Total', horasFmt(c.totalMin)+(o<i?' (termina al día siguiente)':''))
    +fila('Horas adicionales', horasFmt(c.adicionalesMin))
    +fila('Desglose', horasDesgloseTxt(c.desglose));
  return c;
}

function horasPintarNotas(reg){
  var el=$('hNotas'); if(!el) return;
  if(!reg){ el.innerHTML=''; return; }
  var h=(reg.notas||[]).map(function(n){
    return '<div style="font-size:.78rem;color:var(--text2);padding:2px 0;">'+escHtml(n.texto)+' el '+_fmtFechaHora(n.ts)+'</div>';
  }).join('');
  if(reg._pendienteSync) h+='<div style="font-size:.78rem;color:var(--amber);font-weight:600;padding:2px 0;">Pendiente de subir (sin conexión)</div>';
  el.innerHTML=h;
}

function horasFechaAnterior(fecha){
  var d=new Date(fecha+'T12:00:00');
  d.setDate(d.getDate()-1);
  return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);
}
function horasDietaAnterior(){
  var f=$('hFecha').value;
  if(!f || !window._sesion) return false;
  var prev=_horasGet()[horasId(window._sesion.nombre, horasFechaAnterior(f))];
  return !!(prev && prev.dieta);
}
// Viaje con pernocta: marcada y día anterior no = primero (ida); marcada y anterior marcada = intermedio;
// sin marcar y anterior marcada = regreso (vuelta, la dieta aplica hasta hoy).
function horasPintarDieta(){
  var marcada=$('hDieta').checked, ant=horasDietaAnterior(), t='';
  if(marcada && !ant) t='Primer día del viaje: cuenta el desplazamiento de ida.';
  else if(marcada && ant) t='Día intermedio del viaje: cuenta solo el horario en tienda.';
  else if(!marcada && ant) t='Día de regreso: cuenta el desplazamiento de vuelta y la dieta aplica hasta hoy.';
  $('hDietaInfo').textContent=t;
}

function horasCargarDia(){
  var nombre=window._sesion ? window._sesion.nombre : '';
  var reg=_horasGet()[horasId(nombre, $('hFecha').value)];
  $('hInicio').value=reg ? reg.inicio : '';
  $('hFin').value=reg ? reg.fin : '';
  $('hLugar').value=reg ? reg.lugar : '';
  _horasFestivoManual=!!(reg && reg.festivoManual);
  $('hDieta').checked=reg ? !!reg.dieta : horasDietaAnterior();
  horasPintarTipo();
  horasPintarDieta();
  horasRecalcular();
  horasPintarNotas(reg);
  $('hMsg').className='msg';
}

function horasGuardar(){
  if(!window._sesion || _horasEsAdmin()) return;
  var nombre=window._sesion.nombre;
  var fecha=$('hFecha').value, ini=$('hInicio').value, fin=$('hFin').value, lugar=($('hLugar').value||'').trim();
  if(!fecha){ showMsg('hMsg','Falta: fecha.','error'); return; }
  if(fecha>hoy()){ showMsg('hMsg','No se pueden registrar horas de una fecha futura.','error'); return; }
  if(!ini){ showMsg('hMsg','Falta: hora de inicio del trabajo.','error'); return; }
  if(!fin){ showMsg('hMsg','Falta: hora de fin del trabajo.','error'); return; }
  if(ini===fin){ showMsg('hMsg','La hora de fin no puede ser igual a la de inicio.','error'); return; }
  if(!lugar){ showMsg('hMsg','Falta: lugar de trabajo y breve comentario.','error'); return; }
  var c=horasCalcular(fecha, ini, fin, _horasFestivoManual);
  var dieta=$('hDieta').checked;
  var todo=_horasGet(), id=horasId(nombre, fecha), ant=todo[id], ahora=Date.now();
  if(ant && ant.inicio===ini && ant.fin===fin && ant.lugar===lugar && !!ant.festivoManual===_horasFestivoManual && !!ant.dieta===dieta){
    showMsg('hMsg','No hay cambios que guardar.','warn'); return;
  }
  var notas=(ant && ant.notas) ? ant.notas.slice() : [];
  notas.push({ts:ahora, por:nombre, texto: ant ? 'Modificado' : 'Introducido'});
  todo[id]={
    id:id, tecnico:nombre, fecha:fecha, inicio:ini, fin:fin, lugar:lugar,
    festivoManual:_horasFestivoManual, dieta:dieta, tipoDia:c.tipoDia, totalMin:c.totalMin,
    adicionalesMin:c.adicionalesMin, desglose:c.desglose, notas:notas,
    fechaCreacion:(ant && ant.fechaCreacion) || ahora, fechaModificacion:ahora, _pendienteSync:true
  };
  _horasSet(todo);
  _horasSubir(id);
  _toast('Horas guardadas.');
  goTo('w-clientes');
}

function _horasSubir(id){
  if(typeof _db==='undefined' || !_db || _horasSubiendo[id]) return;
  var reg=_horasGet()[id];
  if(!reg || !reg._pendienteSync) return;
  var datos=Object.assign({}, reg);
  delete datos._pendienteSync;
  _horasSubiendo[id]=true;
  _db.collection('horasAdicionales').doc(id).set(datos).then(function(){
    _horasSubiendo[id]=false;
    var t=_horasGet(), r=t[id];
    if(r && r.fechaModificacion===reg.fechaModificacion){ delete r._pendienteSync; _horasSet(t); }
    horasRefrescarDia();
  }).catch(function(e){
    _horasSubiendo[id]=false;
    console.warn('Horas: no se pudo subir, queda pendiente', e);
  });
}

function horasReintentar(){
  if(typeof _db==='undefined' || !_db) return;
  var t=_horasGet();
  Object.keys(t).forEach(function(id){ if(t[id]._pendienteSync) _horasSubir(id); });
}
window.addEventListener('online', horasReintentar);
document.addEventListener('visibilitychange', function(){ if(document.visibilityState==='visible') horasReintentar(); });

// Solo añade lo que falta en local: nunca pisa un registro que este teléfono ya tiene.
function horasTraer(){
  if(typeof _db==='undefined' || !_db || !window._sesion) return;
  _db.collection('horasAdicionales').where('tecnico','==',window._sesion.nombre).get().then(function(snap){
    var t=_horasGet(), cambiado=false;
    snap.forEach(function(doc){
      if(!t[doc.id]){ t[doc.id]=Object.assign({id:doc.id}, doc.data()); cambiado=true; }
    });
    if(cambiado){ _horasSet(t); horasRefrescarDia(); }
  }).catch(function(e){ console.warn('Horas: no se pudieron traer los registros', e); });
}

function horasRefrescarDia(){
  var win=$('w-horas');
  if(!win || !win.classList.contains('active') || !window._sesion) return;
  if(_horasVista==='hist'){ horasRenderHist(); return; }
  if(_horasVista!=='hoy') return;
  var vacio=!$('hInicio').value && !$('hFin').value && !($('hLugar').value||'').trim();
  if(vacio) horasCargarDia();
  else horasPintarNotas(_horasGet()[horasId(window._sesion.nombre, $('hFecha').value)]);
}

// ----- Histórico del técnico: solo sus días con horas adicionales, por mes > semana > día -----
var HORAS_MESES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
var HORAS_MESES_C=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
var HORAS_DIAS=['dom','lun','mar','mié','jue','vie','sáb'];

// Días del técnico con adicionales o con dieta aplicada (_dieta: 'dieta' = casilla marcada; 'regreso' = casilla
// quitada tras un día marcado, la dieta aplica hasta ese día).
function _horasRegsDe(todo, nombre){
  return Object.keys(todo).map(function(k){
      var r=Object.assign({}, todo[k]);
      if(r.dieta) r._dieta='dieta';
      else {
        var prev=todo[horasId(r.tecnico, horasFechaAnterior(r.fecha))];
        if(prev && prev.dieta) r._dieta='regreso';
      }
      return r;
    })
    .filter(function(r){ return r.tecnico===nombre && (r.adicionalesMin>0 || r._dieta); });
}
function _horasMisRegistros(){
  return _horasRegsDe(_horasGet(), window._sesion ? window._sesion.nombre : '');
}
function _horasSumar(regs){
  var s={Normal:0,Extra:0,Nocturna:0,Festiva:0}, tot=0, dietas=0;
  regs.forEach(function(r){
    tot+=r.adicionalesMin;
    if(r._dieta) dietas++;
    Object.keys(s).forEach(function(k){ s[k]+=(r.desglose && r.desglose[k]) || 0; });
  });
  return {total:tot, desglose:s, dietas:dietas};
}
// La primera semana empieza con el mes (puede ser corta); después de lunes a domingo; la última acaba con el mes.
function _horasSemanas(mes){
  var p=mes.split('-'), y=+p[0], m=+p[1];
  var dias=new Date(y, m, 0).getDate(), sem=[], ini=1;
  for(var d=1; d<=dias; d++){
    if(new Date(y, m-1, d, 12).getDay()===0 || d===dias){ sem.push({ini:ini, fin:d}); ini=d+1; }
  }
  return sem;
}
function _horasDiaDe(r){ return +r.fecha.slice(8,10); }

function horasHistMes(mes){ _horasHistSel={mes:mes, sem:null}; horasRenderHist(); window.scrollTo(0,0); }
function horasHistSem(i){ _horasHistSel.sem=i; horasRenderHist(); window.scrollTo(0,0); }

function horasRenderHist(){
  var cont=$('hHistLista'), tit=$('hHistTitulo');
  var regs=_horasMisRegistros(), h='';
  var fila=function(titulo, resumen, extra, onclick){
    return '<div '+(onclick?'onclick="'+onclick+'" ':'')+'style="background:var(--surface2);border:1.5px solid var(--border);border-radius:var(--r-sm);padding:11px 13px;margin-bottom:8px;'+(onclick?'cursor:pointer;':'')+'">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;"><b>'+titulo+'</b><b>'+horasFmt(resumen.total)+(onclick?' &rsaquo;':'')+'</b></div>'
      +'<div style="font-size:.8rem;color:var(--text2);margin-top:3px;">'+horasDesgloseTxt(resumen.desglose)+'</div>'
      +(resumen.dietas ? '<div style="font-size:.8rem;color:var(--green);font-weight:600;margin-top:2px;">'+resumen.dietas+(resumen.dietas===1?' dieta':' dietas')+'</div>' : '')
      +(extra||'')+'</div>';
  };
  var sel=_horasHistSel;
  if(sel.mes===null){
    tit.textContent='\u{1F4C5} Tus horas adicionales';
    var meses={};
    regs.forEach(function(r){ var k=r.fecha.slice(0,7); (meses[k]=meses[k]||[]).push(r); });
    var claves=Object.keys(meses).sort().reverse();
    if(!claves.length) h='<p style="font-size:.85rem;color:var(--text2);margin:0;">Todavía no tienes horas adicionales registradas.</p>';
    claves.forEach(function(k){
      h+=fila(HORAS_MESES[+k.slice(5,7)-1]+' '+k.slice(0,4), _horasSumar(meses[k]), '', "horasHistMes('"+k+"')");
    });
  } else {
    var mesNombre=HORAS_MESES[+sel.mes.slice(5,7)-1]+' '+sel.mes.slice(0,4);
    var delMes=regs.filter(function(r){ return r.fecha.slice(0,7)===sel.mes; });
    var semanas=_horasSemanas(sel.mes);
    if(sel.sem===null){
      tit.textContent=mesNombre;
      semanas.forEach(function(s, i){
        var rs=delMes.filter(function(r){ var d=_horasDiaDe(r); return d>=s.ini && d<=s.fin; });
        if(!rs.length) return;
        var mc=HORAS_MESES_C[+sel.mes.slice(5,7)-1];
        h+=fila(s.ini+' – '+s.fin+' '+mc, _horasSumar(rs), '', 'horasHistSem('+i+')');
      });
    } else {
      var s=semanas[sel.sem], mc=HORAS_MESES_C[+sel.mes.slice(5,7)-1];
      tit.textContent=mesNombre+' · '+s.ini+' – '+s.fin+' '+mc;
      delMes.filter(function(r){ var d=_horasDiaDe(r); return d>=s.ini && d<=s.fin; })
        .sort(function(a,b){ return a.fecha<b.fecha?-1:1; })
        .forEach(function(r){
          var dow=new Date(r.fecha+'T12:00:00').getDay();
          var extra=(r.inicio && r.fin ? '<div style="font-size:.8rem;font-weight:700;margin-top:4px;">'+escHtml(r.inicio)+' – '+escHtml(r.fin)+'</div>' : '')
            +'<div style="font-size:.8rem;margin-top:4px;white-space:pre-line;">'+escHtml(r.lugar||'')+'</div>'
            +(r.notas||[]).map(function(n){ return '<div style="font-size:.74rem;color:var(--text2);margin-top:2px;">'+escHtml(n.texto)+' el '+_fmtFechaHora(n.ts)+'</div>'; }).join('')
            +(r._pendienteSync?'<div style="font-size:.74rem;color:var(--amber);font-weight:600;margin-top:2px;">Pendiente de subir (sin conexión)</div>':'');
          var etiqueta=r._dieta ? '<span style="display:inline-block;margin-left:8px;padding:1px 8px;border-radius:10px;font-size:.7rem;font-weight:700;background:var(--green-light);color:var(--green);border:1px solid var(--green);">'+(r._dieta==='regreso'?'Dieta · regreso':'Dieta')+'</span>' : '';
          h+=fila(HORAS_DIAS[dow]+' '+_horasDiaDe(r)+' '+mc+etiqueta, {total:r.adicionalesMin, desglose:r.desglose||{}}, extra, '');
        });
    }
  }
  cont.innerHTML=h;
}

// ----- Vista de equipo (administrador): lo que registra el técnico frente a lo que dicen los partes -----
// El semáforo SOLO salta cuando el técnico registra MÁS horas adicionales que las de los partes; si registra
// menos no hay alarma (esas horas simplemente se pierden). % = exceso / horas registradas por el técnico.
var HORAS_UMBRAL_VERDE=0.05, HORAS_UMBRAL_NARANJA=0.20;
var HORAS_COLORES={g:'#2fbf71', o:'#f0a030', r:'#e5484d', n:'#555a6e'};
var _horasEquipoDatos=null;
var _horasEquipoTar=null;
var _horasEq={tec:null, mes:null, sem:null, dia:null};
var _horasEqNombres=[];
var _horasPartesVista=[];

function _horasColor(exceso, base){
  if(base<=0) return 'n';
  var p=exceso/base;
  return p<=HORAS_UMBRAL_VERDE ? 'g' : (p<=HORAS_UMBRAL_NARANJA ? 'o' : 'r');
}
function _horasPct(exceso, base){ return base>0 ? Math.round(exceso/base*100) : 0; }

function horasEquipoCargar(){
  var el=$('hEquipoLista');
  if(typeof _db==='undefined' || !_db){ el.innerHTML='<p style="font-size:.85rem;color:var(--text2);margin:0;">Necesitas conexión a internet.</p>'; return; }
  Promise.all([_db.collection('horasAdicionales').get(), _db.collection('tabuladores').get(), _db.collection('tabuladorTecnicos').get()]).then(function(r){
    var d={}, tabs={}, asig={};
    r[0].forEach(function(doc){ d[doc.id]=Object.assign({id:doc.id}, doc.data()); });
    r[1].forEach(function(doc){ tabs[doc.id]=doc.data(); });
    r[2].forEach(function(doc){ asig[doc.id]=doc.data(); });
    _horasEquipoTar={tabs:tabs, asig:asig};
    _horasEquipoDatos=d;
    if(_horasVista==='equipo') horasRenderEquipo();
  }).catch(function(e){
    console.warn('Horas: no se pudo consultar el equipo', e);
    if(_horasEquipoDatos===null) el.innerHTML='<p style="font-size:.85rem;color:var(--text2);margin:0;">No se pudo consultar. Necesitas conexión a internet.</p>';
  });
}

function _horasPartesDia(nombre, fecha){
  var n=String(nombre).trim().toLowerCase();
  return getH().filter(function(p){
      return p.fecha===fecha && (p.tecnicos||[]).some(function(t){ return String(t).trim().toLowerCase()===n; });
    }).sort(function(a,b){ return tm(a.arr)-tm(b.arr); });
}
// Papel del día en un viaje con pernocta, deducido de la casilla Dieta del día anterior.
function _horasRolViaje(reg, todo){
  var prev=todo[horasId(reg.tecnico, horasFechaAnterior(reg.fecha))];
  var pd=!!(prev && prev.dieta);
  if(reg.dieta) return pd ? 'intermedio' : 'primero';
  return pd ? 'regreso' : 'normal';
}
function _horasDurParte(p){ var a=tm(p.arr), l=tm(p.lea); return l<a ? 1440-a+l : l-a; }
// Horario completo de un parte con el viaje de ida y de vuelta (en tienda: arr – lea).
function _horasRangoParte(p){
  var trS=p.trS||0, ida=Math.max(0,(p.totalMin||0)-_horasDurParte(p)-trS);
  return fT((((tm(p.arr)-ida)%1440)+1440)%1440)+' – '+fT((tm(p.lea)+trS)%1440);
}
// Horas del día según los partes del técnico (tienda + desplazamientos). En un viaje con pernocta se quita el
// viaje de casa: primer día sin la vuelta, día intermedio sin ida ni vuelta, día de regreso sin la ida.
function _horasSegunPartes(reg, todo){
  var ps=_horasPartesDia(reg.tecnico, reg.fecha), rol=_horasRolViaje(reg, todo);
  var total=0, trI=0, trO=0;
  ps.forEach(function(p){ total+=p.totalMin||0; });
  if(ps.length){
    var f=ps[0], l=ps[ps.length-1];
    trI=Math.max(0, (f.totalMin||0)-_horasDurParte(f)-(f.trS||0));
    trO=l.trS||0;
  }
  var cont=total;
  if(rol==='primero') cont=total-trO;
  else if(rol==='intermedio') cont=total-trI-trO;
  else if(rol==='regreso') cont=total-trI;
  var adic=(reg.tipoDia||'normal')==='normal' ? Math.max(0, cont-480) : cont;
  var ini=null, fin=null;
  if(ps.length){
    var iniMin=tm(ps[0].arr)-((rol==='primero'||rol==='normal') ? trI : 0);
    var finMin=tm(ps[ps.length-1].lea)+((rol==='regreso'||rol==='normal') ? trO : 0);
    ini=fT(((iniMin%1440)+1440)%1440);
    fin=fT(finMin%1440);
  }
  return {partes:ps, rol:rol, total:total, contado:cont, adic:adic, ini:ini, fin:fin};
}
function _horasDiaStats(r, todo){
  var seg=_horasSegunPartes(r, todo);
  return {seg:seg, exceso:Math.max(0, r.adicionalesMin-seg.adic)};
}
// Importe de un día sobre lo que registra el técnico, con el tabulador que el técnico tenía ESE día y los precios
// vigentes ESE día. Cada línea se redondea al céntimo y el total es la suma de las líneas. Sin tabulador: tab=null.
function _horasImporteDia(r){
  var T=_horasEquipoTar, a=T.asig[tabSlug(r.tecnico)];
  var asg=tabVigente(a && a.historial, r.fecha);
  var tab=(asg && asg.tabuladorId) ? T.tabs[asg.tabuladorId] : null;
  var ver=tab ? tabVigente(tab.versiones, r.fecha) : null;
  if(!ver) return {tab:null, cent:0, lineas:[]};
  var cent=0, lineas=[];
  ['Normal','Extra','Nocturna','Festiva'].forEach(function(k){
    var m=(r.desglose && r.desglose[k]) || 0;
    if(m<=0) return;
    var pc=Math.round(((ver.valores && ver.valores[k]) || 0)*100), c=Math.round(m*pc/60);
    cent+=c; lineas.push({txt:horasFmt(m)+' '+k+' × '+fmtPrecio(pc/100)+'/h', cent:c});
  });
  if(r._dieta){
    var dc=Math.round(((ver.valores && ver.valores.Dieta) || 0)*100);
    cent+=dc; lineas.push({txt:'Dieta'+(r._dieta==='regreso' ? ' (regreso)' : ''), cent:dc});
  }
  return {tab:tab.nombre, cent:cent, lineas:lineas};
}
function _horasImporteTxt(cent, sinTab, dias){
  if(sinTab>=dias) return '<div style="font-size:.8rem;margin-top:2px;font-weight:600;color:var(--amber);">Sin tabulador asignado</div>';
  return '<div style="font-size:.8rem;margin-top:2px;font-weight:700;">Importe: '+fmtPrecio(cent/100)
    +(sinTab ? ' <span style="font-weight:600;color:var(--amber);">· '+sinTab+(sinTab===1?' día':' días')+' sin tabulador</span>' : '')+'</div>';
}
function _horasAgregar(regs, todo){
  var a={tec:0, partes:0, exceso:0, dietas:0, cent:0, sinTab:0, dias:regs.length};
  regs.forEach(function(r){
    var s=_horasDiaStats(r, todo), imp=_horasImporteDia(r);
    a.tec+=r.adicionalesMin; a.partes+=s.seg.adic; a.exceso+=s.exceso;
    if(r._dieta) a.dietas++;
    if(imp.tab) a.cent+=imp.cent; else a.sinTab++;
  });
  a.color=_horasColor(a.exceso, a.tec);
  return a;
}

function _horasPunto(c){
  return '<span style="width:12px;height:12px;border-radius:50%;flex:none;display:inline-block;background:'+HORAS_COLORES[c]+';"></span>';
}
function _horasFilaEq(c, titulo, sub, extra, onclick){
  return '<div '+(onclick?'onclick="'+onclick+'" ':'')+'style="display:flex;align-items:center;gap:10px;background:var(--surface2);border:1.5px solid var(--border);border-radius:var(--r-sm);padding:11px 13px;margin-bottom:8px;'+(onclick?'cursor:pointer;':'')+'">'
    +_horasPunto(c)
    +'<div style="flex:1;min-width:0;"><div style="font-weight:700;">'+titulo+'</div>'
    +'<div style="font-size:.8rem;color:var(--text2);margin-top:2px;">'+sub+'</div>'+(extra||'')+'</div>'
    +(onclick?'<span style="color:var(--text2);">&rsaquo;</span>':'')+'</div>';
}
function _horasResumenEq(a){
  var sub='Técnico '+horasFmt(a.tec)+' · según partes '+horasFmt(a.partes);
  var extra='<div style="font-size:.8rem;margin-top:2px;color:'+(a.exceso>0?HORAS_COLORES[a.color]:'var(--text2)')+';">'
    +(a.exceso>0 ? 'Registra de más: '+horasFmt(a.exceso)+' ('+_horasPct(a.exceso, a.tec)+'%)' : 'Sin exceso sobre los partes')+'</div>'
    +(a.dietas ? '<div style="font-size:.8rem;color:var(--green);font-weight:600;margin-top:2px;">'+a.dietas+(a.dietas===1?' dieta':' dietas')+'</div>' : '')
    +_horasImporteTxt(a.cent, a.sinTab, a.dias);
  return {sub:sub, extra:extra};
}
function _horasEtiquetaDieta(d){
  return d ? '<span style="display:inline-block;margin-left:8px;padding:1px 8px;border-radius:10px;font-size:.7rem;font-weight:700;background:var(--green-light);color:var(--green);border:1px solid var(--green);">'+(d==='regreso'?'Dieta · regreso':'Dieta')+'</span>' : '';
}

function horasEqTec(i){ _horasEq={tec:i, mes:null, sem:null, dia:null}; horasRenderEquipo(); window.scrollTo(0,0); }
function horasEqMes(k){ _horasEq.mes=k; _horasEq.sem=null; _horasEq.dia=null; horasRenderEquipo(); window.scrollTo(0,0); }
function horasEqSem(i){ _horasEq.sem=i; _horasEq.dia=null; horasRenderEquipo(); window.scrollTo(0,0); }
function horasEqDia(f){ _horasEq.dia=f; horasRenderEquipo(); window.scrollTo(0,0); }

function horasVerParte(i){
  var p=_horasPartesVista[i];
  if(!p) return;
  $('hParteTitulo').textContent='Parte '+(p.numParte||'s/n')+' · '+p.fecha.split('-').reverse().join('/');
  $('hParteDetalle').innerHTML=p.detalle || '<div style="color:var(--text2);padding:10px 0;">Sin detalle.</div>';
  $('dlgHorasParte').classList.add('show');
}

function _horasEqDiaHTML(r, todo){
  var s=_horasSegunPartes(r, todo);
  var exceso=Math.max(0, r.adicionalesMin-s.adic);
  var c=r.adicionalesMin>0 ? _horasColor(exceso, r.adicionalesMin) : 'n';
  _horasPartesVista=s.partes;
  var caja=function(inner){ return '<div style="background:var(--surface2);border:1.5px solid var(--border);border-radius:var(--r-sm);padding:10px 12px;margin-bottom:8px;font-size:.88rem;">'+inner+'</div>'; };
  var kv=function(t,v){ return '<div style="display:flex;justify-content:space-between;gap:10px;padding:2px 0;"><span style="color:var(--text2);">'+t+'</span><b style="text-align:right;">'+v+'</b></div>'; };
  var rotulo=function(t){ return '<div style="font-size:.72rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text3);margin:12px 2px 6px;">'+t+'</div>'; };
  var ROLES={primero:'Primer día del viaje: cuenta la ida', intermedio:'Día intermedio: solo el horario en tienda', regreso:'Día de regreso: cuenta la vuelta'};
  var h=rotulo('Lo que registró el técnico');
  h+=caja(kv('Inicio – fin', r.inicio+' – '+r.fin)
    +kv('Lugar y comentario', '<span style="white-space:pre-line;">'+escHtml(r.lugar||'')+'</span>')
    +kv('Adicionales', horasFmt(r.adicionalesMin))
    +'<div style="font-size:.78rem;color:var(--text2);text-align:right;">'+horasDesgloseTxt(r.desglose||{})+'</div>'
    +(s.rol!=='normal' ? '<div style="font-size:.78rem;color:var(--green);font-weight:600;margin-top:4px;">'+ROLES[s.rol]+'</div>' : '')
    +(r.notas||[]).map(function(n){ return '<div style="font-size:.74rem;color:var(--text2);margin-top:3px;">'+escHtml(n.texto)+' el '+_fmtFechaHora(n.ts)+'</div>'; }).join(''));
  var imp=_horasImporteDia(r);
  h+=rotulo('Importe del día');
  if(!imp.tab) h+=caja('<span style="color:var(--amber);font-weight:600;">Sin tabulador asignado ese día.</span> <span style="color:var(--text2);">Se asigna en Tabulador › Tabular técnicos.</span>');
  else h+=caja('<div style="font-size:.78rem;color:var(--text2);margin-bottom:4px;">Tabulador '+escHtml(imp.tab)+'</div>'
    +imp.lineas.map(function(l){ return kv(l.txt, fmtPrecio(l.cent/100)); }).join('')
    +'<div style="border-top:1px solid var(--border);margin-top:4px;padding-top:4px;">'+kv('Total', fmtPrecio(imp.cent/100))+'</div>');
  h+=rotulo('Partes de ese día');
  if(!s.partes.length) h+=caja('<span style="color:var(--text2);">No hay ningún parte de este técnico ese día.</span>');
  s.partes.forEach(function(p, i){
    h+='<div onclick="horasVerParte('+i+')" style="cursor:pointer;display:flex;align-items:center;gap:10px;background:var(--surface2);border:1.5px solid var(--border);border-radius:var(--r-sm);padding:10px 12px;margin-bottom:8px;">'
      +'<div style="flex:1;min-width:0;"><div style="font-weight:700;">'+escHtml(p.numParte?('Parte '+p.numParte):'Parte')+' · '+escHtml((p.tienda||'').trim())+'</div>'
      +'<div style="font-size:.8rem;color:var(--text2);margin-top:2px;">'+_horasRangoParte(p)+' · '+horasFmt(p.totalMin||0)+' con desplazamientos</div></div>'
      +'<span style="color:var(--text2);">&rsaquo;</span></div>';
  });
  h+=rotulo('Según los partes');
  h+=caja(kv('Total de los partes', horasFmt(s.total))
    +(s.rol!=='normal' ? kv('Cuenta (viaje con pernocta)', horasFmt(s.contado)) : '')
    +kv('Adicionales según partes', horasFmt(s.adic)+((r.tipoDia||'normal')==='normal' ? '' : ' (todo)'))
    +(s.ini ? kv('Horario estimado', s.ini+' – '+s.fin) : ''));
  var txt;
  if(r.adicionalesMin<=0) txt='Sin horas adicionales registradas este día.';
  else if(exceso>0) txt='El técnico registra '+horasFmt(r.adicionalesMin)+' y los partes dicen '+horasFmt(s.adic)+': registra de más '+horasFmt(exceso)+' ('+_horasPct(exceso, r.adicionalesMin)+'%).';
  else txt='El técnico registra '+horasFmt(r.adicionalesMin)+' y los partes dicen '+horasFmt(s.adic)+': sin alarma.';
  h+='<div style="display:flex;align-items:center;gap:10px;background:var(--surface2);border:1.5px solid '+HORAS_COLORES[c]+';border-radius:var(--r-sm);padding:10px 12px;font-size:.88rem;">'+_horasPunto(c)+'<span>'+txt+'</span></div>';
  return h;
}

function horasRenderEquipo(){
  var cont=$('hEquipoLista'), tit=$('hEquipoTitulo'), todo=_horasEquipoDatos, e=_horasEq, h='';
  if(todo===null){
    tit.textContent='\u{1F465} Equipo';
    cont.innerHTML='<p style="font-size:.85rem;color:var(--text2);margin:0;">Consultando…</p>';
    return;
  }
  var nombres=[];
  Object.keys(todo).forEach(function(k){ if(nombres.indexOf(todo[k].tecnico)<0) nombres.push(todo[k].tecnico); });
  nombres.sort();
  _horasEqNombres=nombres;
  if(e.tec===null){
    var mesAct=hoy().slice(0,7);
    tit.textContent='\u{1F465} Equipo · '+HORAS_MESES[+mesAct.slice(5,7)-1]+' '+mesAct.slice(0,4);
    if(!nombres.length) h+='<p style="font-size:.85rem;color:var(--text2);margin:0;">Todavía no hay horas adicionales registradas por los técnicos.</p>';
    nombres.forEach(function(n, i){
      var regs=_horasRegsDe(todo, n).filter(function(r){ return r.fecha.slice(0,7)===mesAct; });
      if(!regs.length){ h+=_horasFilaEq('n', escHtml(n), 'Sin horas adicionales este mes', '', 'horasEqTec('+i+')'); return; }
      var a=_horasAgregar(regs, todo), x=_horasResumenEq(a);
      h+=_horasFilaEq(a.color, escHtml(n), x.sub, x.extra, 'horasEqTec('+i+')');
    });
  } else {
    var nombre=nombres[e.tec], regs=_horasRegsDe(todo, nombre);
    if(nombre===undefined){ _horasEq.tec=null; return horasRenderEquipo(); }
    if(e.mes===null){
      tit.textContent='\u{1F464} '+nombre;
      var meses={};
      regs.forEach(function(r){ var k=r.fecha.slice(0,7); (meses[k]=meses[k]||[]).push(r); });
      var claves=Object.keys(meses).sort().reverse();
      if(!claves.length) h='<p style="font-size:.85rem;color:var(--text2);margin:0;">Este técnico no tiene horas adicionales registradas.</p>';
      claves.forEach(function(k){
        var a=_horasAgregar(meses[k], todo), x=_horasResumenEq(a);
        h+=_horasFilaEq(a.color, HORAS_MESES[+k.slice(5,7)-1]+' '+k.slice(0,4), x.sub, x.extra, "horasEqMes('"+k+"')");
      });
    } else {
      var mesNombre=HORAS_MESES[+e.mes.slice(5,7)-1]+' '+e.mes.slice(0,4), mc=HORAS_MESES_C[+e.mes.slice(5,7)-1];
      var delMes=regs.filter(function(r){ return r.fecha.slice(0,7)===e.mes; });
      var semanas=_horasSemanas(e.mes);
      if(e.sem===null){
        tit.textContent='\u{1F464} '+nombre+' · '+mesNombre;
        semanas.forEach(function(s, i){
          var rs=delMes.filter(function(r){ var d=_horasDiaDe(r); return d>=s.ini && d<=s.fin; });
          if(!rs.length) return;
          var a=_horasAgregar(rs, todo), x=_horasResumenEq(a);
          h+=_horasFilaEq(a.color, s.ini+' – '+s.fin+' '+mc, x.sub, x.extra, 'horasEqSem('+i+')');
        });
      } else {
        var s=semanas[e.sem];
        var delaSem=delMes.filter(function(r){ var d=_horasDiaDe(r); return d>=s.ini && d<=s.fin; }).sort(function(a,b){ return a.fecha<b.fecha?-1:1; });
        if(e.dia===null){
          tit.textContent='\u{1F464} '+nombre+' · '+s.ini+' – '+s.fin+' '+mc;
          delaSem.forEach(function(r){
            var st=_horasDiaStats(r, todo);
            var c=r.adicionalesMin>0 ? _horasColor(st.exceso, r.adicionalesMin) : 'n';
            var dow=new Date(r.fecha+'T12:00:00').getDay();
            var sub='Técnico '+horasFmt(r.adicionalesMin)+' · según partes '+horasFmt(st.seg.adic);
            var imp=_horasImporteDia(r);
            var extra='<div style="font-size:.8rem;margin-top:2px;white-space:pre-line;">'+escHtml(r.lugar||'')+'</div>'
              +(st.exceso>0 && r.adicionalesMin>0 ? '<div style="font-size:.8rem;margin-top:2px;color:'+HORAS_COLORES[c]+';">Registra de más: '+horasFmt(st.exceso)+' ('+_horasPct(st.exceso, r.adicionalesMin)+'%)</div>' : '')
              +_horasImporteTxt(imp.cent, imp.tab ? 0 : 1, 1);
            h+=_horasFilaEq(c, HORAS_DIAS[dow]+' '+_horasDiaDe(r)+' '+mc+_horasEtiquetaDieta(r._dieta), sub, extra, "horasEqDia('"+r.fecha+"')");
          });
        } else {
          var rd=delaSem.filter(function(r){ return r.fecha===e.dia; })[0];
          if(!rd){ _horasEq.dia=null; return horasRenderEquipo(); }
          var dw=new Date(rd.fecha+'T12:00:00').getDay();
          tit.innerHTML='\u{1F464} '+escHtml(nombre)+' · '+HORAS_DIAS[dw]+' '+_horasDiaDe(rd)+' '+mc+_horasEtiquetaDieta(rd._dieta);
          h=_horasEqDiaHTML(rd, todo);
        }
      }
    }
  }
  cont.innerHTML=h;
}

// ----- Control horario (administrador): todos los días trabajados de cada técnico, por mes > semana > día -----
// De lunes a viernes sin jornada registrada sale un aviso rojo. Solo se cuentan los días desde HORAS_CONTROL_DESDE
// (la de la subida de la app; antes de esa fecha el registro no se usaba) y hasta ayer: el día de hoy todavía se puede
// registrar. Un técnico nuevo, o reactivado, cuenta desde el día en que se activó (activoDesde); si un técnico tiene
// activoDesde, esa fecha manda sobre la general. Mientras la fecha general esté vacía (aún no se ha subido la app) solo
// se controla a los técnicos que tengan activoDesde.
var HORAS_CONTROL_DESDE='';
var _horasCtlDatos=null;
var _horasCtl={tec:null, mes:null, sem:null};
var _horasCtlNombres=[];

function horasControlCargar(){
  var el=$('hControlLista');
  if(typeof _db==='undefined' || !_db){ el.innerHTML='<p style="font-size:.85rem;color:var(--text2);margin:0;">Necesitas conexión a internet.</p>'; return; }
  _db.collection('horasAdicionales').get().then(function(snap){
    var d={};
    snap.forEach(function(doc){ d[doc.id]=Object.assign({id:doc.id}, doc.data()); });
    _horasCtlDatos=d;
    if(_horasVista==='control') horasRenderControl();
  }).catch(function(e){
    console.warn('Control horario: no se pudo consultar', e);
    if(_horasCtlDatos===null) el.innerHTML='<p style="font-size:.85rem;color:var(--text2);margin:0;">No se pudo consultar. Necesitas conexión a internet.</p>';
  });
}

function _horasCtlDesde(nombre){
  var t=getTecnicos().find(function(x){ return x.nombre===nombre; });
  return (t && t.activoDesde) ? t.activoDesde : HORAS_CONTROL_DESDE;
}

// Días de un técnico entre dos días de un mismo mes: los que registró y los de lunes a viernes sin registrar.
function _horasCtlFilas(nombre, mes, diaIni, diaFin){
  var y=+mes.slice(0,4), m=+mes.slice(5,7), hoyS=hoy(), desde=_horasCtlDesde(nombre), filas=[];
  for(var d=diaIni; d<=diaFin; d++){
    var f=mes+'-'+('0'+d).slice(-2), reg=_horasCtlDatos[horasId(nombre, f)];
    var dow=new Date(y, m-1, d, 12).getDay();
    if(reg) filas.push({dia:d, dow:dow, reg:reg});
    else if(desde && dow>=1 && dow<=5 && f>=desde && f<hoyS) filas.push({dia:d, dow:dow, falta:true});
  }
  return filas;
}
function _horasCtlCuenta(filas){
  var falta=filas.filter(function(x){ return x.falta; }).length;
  return {trabajados:filas.length-falta, faltan:falta, color: falta ? 'r' : (filas.length ? 'g' : 'n')};
}
function _horasCtlSub(c){ return c.trabajados+(c.trabajados===1 ? ' día trabajado' : ' días trabajados'); }
function _horasCtlExtra(c){
  return c.faltan ? '<div style="font-size:.8rem;margin-top:2px;font-weight:700;color:'+HORAS_COLORES.r+';">'+c.faltan+(c.faltan===1 ? ' día sin registrar' : ' días sin registrar')+'</div>' : '';
}
function _horasCtlDiasMes(mes){ return new Date(+mes.slice(0,4), +mes.slice(5,7), 0).getDate(); }
// Meses de un técnico: desde el de su fecha de arranque (o el primero en que registró algo) hasta el actual, el más reciente primero.
function _horasCtlMeses(nombre){
  var desde=_horasCtlDesde(nombre), ult=hoy().slice(0,7), primero=desde ? desde.slice(0,7) : ult;
  Object.keys(_horasCtlDatos).forEach(function(k){
    var r=_horasCtlDatos[k];
    if(r.tecnico===nombre && r.fecha.slice(0,7)<primero) primero=r.fecha.slice(0,7);
  });
  var meses=[], y=+primero.slice(0,4), m=+primero.slice(5,7), k;
  do {
    k=y+'-'+('0'+m).slice(-2);
    meses.push(k);
    m++; if(m>12){ m=1; y++; }
  } while(k<ult);
  return meses.reverse();
}

function horasCtlTec(i){ _horasCtl={tec:i, mes:null, sem:null}; horasRenderControl(); window.scrollTo(0,0); }
function horasCtlMes(k){ _horasCtl.mes=k; _horasCtl.sem=null; horasRenderControl(); window.scrollTo(0,0); }
function horasCtlSem(i){ _horasCtl.sem=i; horasRenderControl(); window.scrollTo(0,0); }

function horasRenderControl(){
  var cont=$('hControlLista'), tit=$('hControlTitulo'), todo=_horasCtlDatos, e=_horasCtl, h='';
  if(todo===null){
    tit.textContent='\u{1F5D3}️ Control horario';
    cont.innerHTML='<p style="font-size:.85rem;color:var(--text2);margin:0;">Consultando…</p>';
    return;
  }
  var nombres=getTecnicos().filter(function(t){ return t.activo!==false; }).map(function(t){ return t.nombre; }).sort();
  _horasCtlNombres=nombres;
  if(e.tec===null){
    var mesAct=hoy().slice(0,7);
    tit.textContent='\u{1F5D3}️ Control horario · '+HORAS_MESES[+mesAct.slice(5,7)-1]+' '+mesAct.slice(0,4);
    h+='<div style="font-size:.76rem;color:var(--text2);margin-bottom:10px;">Aviso rojo en cada día de lunes a viernes sin jornada registrada, contando desde que se activa el registro de cada técnico. El día de hoy no cuenta hasta que acaba.</div>';
    if(!nombres.length) h+='<p style="font-size:.85rem;color:var(--text2);margin:0;">No hay técnicos activos.</p>';
    nombres.forEach(function(n, i){
      var c=_horasCtlCuenta(_horasCtlFilas(n, mesAct, 1, _horasCtlDiasMes(mesAct)));
      h+=_horasFilaEq(c.color, escHtml(n), 'Este mes: '+_horasCtlSub(c), _horasCtlExtra(c)+(_horasCtlDesde(n) ? '' : '<div style="font-size:.78rem;margin-top:2px;color:var(--text2);">Registro sin activar</div>'), 'horasCtlTec('+i+')');
    });
  } else {
    var nombre=nombres[e.tec];
    if(nombre===undefined){ _horasCtl.tec=null; return horasRenderControl(); }
    if(e.mes===null){
      tit.textContent='\u{1F464} '+nombre;
      _horasCtlMeses(nombre).forEach(function(k){
        var c=_horasCtlCuenta(_horasCtlFilas(nombre, k, 1, _horasCtlDiasMes(k)));
        h+=_horasFilaEq(c.color, HORAS_MESES[+k.slice(5,7)-1]+' '+k.slice(0,4), _horasCtlSub(c), _horasCtlExtra(c), "horasCtlMes('"+k+"')");
      });
    } else {
      var mesNombre=HORAS_MESES[+e.mes.slice(5,7)-1]+' '+e.mes.slice(0,4), mc=HORAS_MESES_C[+e.mes.slice(5,7)-1];
      var semanas=_horasSemanas(e.mes);
      if(e.sem===null){
        tit.textContent='\u{1F464} '+nombre+' · '+mesNombre;
        semanas.forEach(function(s, i){
          var filas=_horasCtlFilas(nombre, e.mes, s.ini, s.fin);
          if(!filas.length) return;
          var c=_horasCtlCuenta(filas);
          h+=_horasFilaEq(c.color, s.ini+' – '+s.fin+' '+mc, _horasCtlSub(c), _horasCtlExtra(c), 'horasCtlSem('+i+')');
        });
        if(!h) h='<p style="font-size:.85rem;color:var(--text2);margin:0;">No hay días trabajados ni días sin registrar este mes.</p>';
      } else {
        var s=semanas[e.sem];
        tit.textContent='\u{1F464} '+nombre+' · '+s.ini+' – '+s.fin+' '+mc;
        _horasCtlFilas(nombre, e.mes, s.ini, s.fin).forEach(function(x){
          var titulo=HORAS_DIAS[x.dow]+' '+x.dia+' '+mc;
          if(x.falta){
            h+=_horasFilaEq('r', titulo, '<span style="font-weight:700;color:'+HORAS_COLORES.r+';">Sin registrar</span>', '', '');
          } else {
            var r=x.reg;
            h+=_horasFilaEq('g', titulo, (r.inicio && r.fin ? r.inicio+' – '+r.fin : '')+(r.totalMin ? ' · '+horasFmt(r.totalMin) : ''),
              r.lugar ? '<div style="font-size:.8rem;margin-top:2px;white-space:pre-line;">'+escHtml(r.lugar)+'</div>' : '', '');
          }
        });
      }
    }
  }
  cont.innerHTML=h;
}

// ----- Tabulador (administrador): precios por ítem de cada tabulador y tabulador de cada técnico -----
// Los precios nunca son retroactivos: cada tabulador y cada asignación guardan versiones con fecha "desde"
// (no anterior a hoy); el pasado conserva lo que valía entonces. Todo empieza en 0 €.
var TAB_ITEMS=['Normal','Extra','Nocturna','Festiva','Dieta'];
var TAB_ROTULOS={Normal:'Hora Normal (€/h)', Extra:'Hora Extra (€/h)', Nocturna:'Hora Nocturna (€/h)', Festiva:'Hora Festiva (€/h)', Dieta:'Dieta (€ por dieta)'};
var TAB_INICIALES=['Peón 1','Peón 2','Oficial 1','Oficial 2'];
var _horasTabDatos=null;
var _horasTabSel={nivel:'menu', id:null};
var _horasTabTecNombres=[];
var _horasTabSembrado=false;

function tabSlug(n){
  return String(n||'').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
}
function tabFechaMinima(){ return hoy(); }
function tabFechaFmt(f){ return f==='1970-01-01' ? 'el inicio' : f.split('-').reverse().join('/'); }
function tabVigente(versiones, fecha){
  var vig=null;
  (versiones||[]).forEach(function(v){ if(v.desde<=fecha && (!vig || v.desde>=vig.desde)) vig=v; });
  return vig;
}
function tabValoresTxt(v){
  return TAB_ITEMS.map(function(k){ return k+' '+fmtPrecio((v && v[k]) || 0); }).join(' · ');
}

function _horasTabSembrar(){
  var ahora=Date.now(), nombre=window._sesion.nombre, ceros={};
  TAB_ITEMS.forEach(function(k){ ceros[k]=0; });
  return Promise.all(TAB_INICIALES.map(function(n, i){
    return _db.collection('tabuladores').doc(tabSlug(n)).set({
      nombre:n, orden:i, creadoPor:nombre, fechaCreacion:ahora,
      versiones:[{desde:'1970-01-01', valores:ceros, creadoPor:nombre, fecha:ahora}]
    });
  }));
}

function horasTabCargar(){
  if(!_horasEsAdmin()) return;
  var el=$('hTabCuerpo');
  if(typeof _db==='undefined' || !_db){ el.innerHTML='<p style="font-size:.85rem;color:var(--text2);margin:0;">Necesitas conexión a internet.</p>'; return; }
  Promise.all([_db.collection('tabuladores').get(), _db.collection('tabuladorTecnicos').get()]).then(function(r){
    var tabs={}, asig={};
    r[0].forEach(function(d){ tabs[d.id]=Object.assign({id:d.id}, d.data()); });
    r[1].forEach(function(d){ asig[d.id]=Object.assign({id:d.id}, d.data()); });
    if(!Object.keys(tabs).length && !_horasTabSembrado){
      _horasTabSembrado=true;
      return _horasTabSembrar().then(horasTabCargar);
    }
    _horasTabDatos={tabs:tabs, asig:asig};
    if(_horasVista==='tab') horasRenderTab();
  }).catch(function(e){
    console.warn('Tabulador: no se pudo consultar', e);
    if(_horasTabDatos===null) el.innerHTML='<p style="font-size:.85rem;color:var(--text2);margin:0;">No se pudo consultar. Necesitas conexión a internet.</p>';
  });
}

function _horasFilaSimple(titulo, sub, extra, onclick){
  return '<div '+(onclick?'onclick="'+onclick+'" ':'')+'style="background:var(--surface2);border:1.5px solid var(--border);border-radius:var(--r-sm);padding:11px 13px;margin-bottom:8px;'+(onclick?'cursor:pointer;':'')+'">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;"><b>'+titulo+'</b>'+(onclick?'<span style="color:var(--text2);">&rsaquo;</span>':'')+'</div>'
    +'<div style="font-size:.8rem;color:var(--text2);margin-top:3px;">'+sub+'</div>'+(extra||'')+'</div>';
}
function horasTabIr(nivel, id){ _horasTabSel={nivel:nivel, id:id||null}; horasRenderTab(); window.scrollTo(0,0); }

function horasRenderTab(){
  var cont=$('hTabCuerpo'), tit=$('hTabTitulo'), s=_horasTabSel, d=_horasTabDatos, h='', hoyS=hoy();
  if(s.nivel==='menu'){
    tit.textContent='\u{1F4B6} Tabulador';
    cont.innerHTML='<div class="hist-opts">'
      +'<div class="hist-opt amber-opt" onclick="horasTabIr(\'act\')"><div class="opt-ico">&#128182;</div><div class="opt-title">Actualizar tabulador</div><div class="opt-count">Precio de cada ítem</div></div>'
      +'<div class="hist-opt green-opt" onclick="horasTabIr(\'tec\')"><div class="opt-ico">&#128119;</div><div class="opt-title">Tabular técnicos</div><div class="opt-count">Tabulador de cada uno</div></div>'
      +'</div>';
    return;
  }
  if(d===null){ tit.textContent='\u{1F4B6} Tabulador'; cont.innerHTML='<p style="font-size:.85rem;color:var(--text2);margin:0;">Consultando…</p>'; return; }
  var ids=Object.keys(d.tabs).sort(function(a,b){
    return ((d.tabs[a].orden||0)-(d.tabs[b].orden||0)) || String(d.tabs[a].nombre).localeCompare(String(d.tabs[b].nombre));
  });
  if(s.nivel==='act'){
    tit.textContent='\u{1F4B6} Actualizar tabulador';
    h+='<div class="field" style="margin-bottom:10px;"><label>Nuevo tabulador</label>'
      +'<div style="display:flex;gap:8px;"><input id="hTabNuevo" placeholder="Ej: Oficial 3" maxlength="40" autocomplete="off"><button class="btn btn-p" style="flex:none;" onclick="horasTabAgregar()">+ Agregar</button></div></div>'
      +'<div class="msg" id="hTabMsg"></div>';
    ids.forEach(function(id){
      var t=d.tabs[id], vig=tabVigente(t.versiones, hoyS);
      h+=_horasFilaSimple(escHtml(t.nombre), tabValoresTxt(vig && vig.valores),
        '<div style="font-size:.74rem;color:var(--text2);margin-top:2px;">Vigente desde '+tabFechaFmt(vig ? vig.desde : '1970-01-01')+'</div>',
        "horasTabIr('editar','"+id+"')");
    });
  } else if(s.nivel==='editar'){
    var t2=d.tabs[s.id];
    if(!t2){ _horasTabSel={nivel:'act', id:null}; return horasRenderTab(); }
    var vig2=tabVigente(t2.versiones, hoyS), val=(vig2 && vig2.valores) || {};
    tit.textContent='\u{1F4B6} '+t2.nombre;
    h+='<div class="g2">'+TAB_ITEMS.map(function(k){
      return '<div class="field"><label>'+TAB_ROTULOS[k]+'</label><input id="hTabV_'+k+'" type="number" step="0.01" min="0" inputmode="decimal" value="'+(val[k]||0)+'"></div>';
    }).join('')+'</div>'
      +'<div class="field"><label>Vigente desde</label><input id="hTabDesde" type="date" value="'+hoyS+'" min="'+tabFechaMinima()+'"></div>'
      +'<div style="font-size:.78rem;color:var(--text2);margin:-4px 0 10px;">Los días anteriores a esa fecha conservan el precio que tenían.</div>'
      +'<div class="msg" id="hTabMsg"></div>'
      +'<button class="btn btn-p" onclick="horasTabGuardarPrecios(\''+s.id+'\')">&#128190; Guardar precios</button>'
      +'<div style="font-size:.72rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text3);margin:16px 2px 6px;">Historial de precios</div>'
      +(t2.versiones||[]).slice().sort(function(a,b){ return a.desde<b.desde?1:-1; }).map(function(v){
        return '<div style="font-size:.8rem;padding:6px 0;border-top:1px solid var(--border);"><b>Desde '+tabFechaFmt(v.desde)+'</b><br><span style="color:var(--text2);">'+tabValoresTxt(v.valores)+'</span></div>';
      }).join('');
  } else if(s.nivel==='tec'){
    tit.textContent='\u{1F477} Tabular técnicos';
    var tecs=getTecnicos().filter(function(t){ return t.activo!==false; }).sort(function(a,b){
      return String(a.nombre).localeCompare(String(b.nombre));
    });
    _horasTabTecNombres=tecs.map(function(t){ return t.nombre; });
    h+='<div class="msg" id="hTabMsg"></div>';
    if(!ids.length) h+='<p style="font-size:.85rem;color:var(--text2);margin:0;">Primero crea algún tabulador.</p>';
    tecs.forEach(function(t, i){
      var a=d.asig[tabSlug(t.nombre)], hist=(a && a.historial) || [];
      var cur=tabVigente(hist, hoyS);
      var curNom=(cur && cur.tabuladorId && d.tabs[cur.tabuladorId]) ? d.tabs[cur.tabuladorId].nombre : 'Sin tabulador';
      var opciones='<option value="">— Sin tabulador —</option>'+ids.map(function(id){
        return '<option value="'+id+'"'+(cur && cur.tabuladorId===id ? ' selected' : '')+'>'+escHtml(d.tabs[id].nombre)+'</option>';
      }).join('');
      var historial=hist.slice().sort(function(x,y){ return x.desde<y.desde?1:-1; }).map(function(x){
        var n=(x.tabuladorId && d.tabs[x.tabuladorId]) ? d.tabs[x.tabuladorId].nombre : 'Sin tabulador';
        return '<div style="font-size:.74rem;color:var(--text2);">'+escHtml(n)+' desde '+tabFechaFmt(x.desde)+'</div>';
      }).join('');
      h+='<div style="background:var(--surface2);border:1.5px solid var(--border);border-radius:var(--r-sm);padding:11px 13px;margin-bottom:10px;">'
        +'<div style="font-weight:700;">'+escHtml(t.nombre)+'</div>'
        +'<div style="font-size:.8rem;color:var(--text2);margin:2px 0 8px;">Tabulador actual: <b>'+escHtml(curNom)+'</b></div>'
        +'<div class="g2"><div class="field"><label>Tabulador</label><select id="hTecSel_'+i+'" class="select-c" style="margin-bottom:0;">'+opciones+'</select></div>'
        +'<div class="field"><label>Desde</label><input id="hTecDesde_'+i+'" type="date" value="'+hoyS+'" min="'+tabFechaMinima()+'"></div></div>'
        +'<button class="btn btn-p btn-sm" onclick="horasTabGuardarTecnico('+i+')">&#128190; Guardar</button>'
        +(historial ? '<div style="margin-top:8px;border-top:1px solid var(--border);padding-top:6px;">'+historial+'</div>' : '')
        +'</div>';
    });
  }
  cont.innerHTML=h;
}

function _horasTabValidarFecha(desde){
  if(!desde){ showMsg('hTabMsg','Falta la fecha desde la que vale.','error'); return false; }
  if(desde<tabFechaMinima()){ showMsg('hTabMsg','Los cambios no pueden ser retroactivos: elige hoy o una fecha posterior.','error'); return false; }
  return true;
}

function horasTabAgregar(){
  if(!_horasEsAdmin() || !_horasTabDatos) return;
  var nombre=($('hTabNuevo').value||'').trim();
  if(!nombre){ showMsg('hTabMsg','Escribe el nombre del tabulador.','error'); return; }
  var id=tabSlug(nombre);
  if(!id){ showMsg('hTabMsg','Ese nombre no es válido.','error'); return; }
  if(_horasTabDatos.tabs[id]){ showMsg('hTabMsg','Ya existe un tabulador con ese nombre.','error'); return; }
  var ahora=Date.now(), ceros={}, orden=0;
  TAB_ITEMS.forEach(function(k){ ceros[k]=0; });
  Object.keys(_horasTabDatos.tabs).forEach(function(k){ orden=Math.max(orden, (_horasTabDatos.tabs[k].orden||0)+1); });
  var doc={nombre:nombre, orden:orden, creadoPor:window._sesion.nombre, fechaCreacion:ahora, versiones:[{desde:'1970-01-01', valores:ceros, creadoPor:window._sesion.nombre, fecha:ahora}]};
  _db.collection('tabuladores').doc(id).set(doc).then(function(){
    _horasTabDatos.tabs[id]=Object.assign({id:id}, doc);
    horasRenderTab();
    showMsg('hTabMsg','Tabulador "'+escHtml(nombre)+'" creado con todos los precios en 0 €.','success');
  }).catch(function(e){
    console.warn('Tabulador: no se pudo crear', e);
    showMsg('hTabMsg','No se pudo guardar. Comprueba la conexión.','error');
  });
}

function horasTabGuardarPrecios(id){
  if(!_horasEsAdmin() || !_horasTabDatos) return;
  var tab=_horasTabDatos.tabs[id], desde=$('hTabDesde').value, valores={};
  if(!tab) return;
  if(!_horasTabValidarFecha(desde)) return;
  for(var i=0; i<TAB_ITEMS.length; i++){
    var k=TAB_ITEMS[i], raw=String($('hTabV_'+k).value||'').replace(',','.').trim();
    var v=raw==='' ? 0 : parseFloat(raw);
    if(isNaN(v) || v<0){ showMsg('hTabMsg','Precio no válido en '+k+'.','error'); return; }
    valores[k]=Math.round(v*100)/100;
  }
  var versiones=(tab.versiones||[]).filter(function(x){ return x.desde!==desde; });
  versiones.push({desde:desde, valores:valores, creadoPor:window._sesion.nombre, fecha:Date.now()});
  versiones.sort(function(a,b){ return a.desde<b.desde?-1:(a.desde>b.desde?1:0); });
  _db.collection('tabuladores').doc(id).update({versiones:versiones}).then(function(){
    _horasTabDatos.tabs[id].versiones=versiones;
    horasRenderTab();
    showMsg('hTabMsg','Precios guardados desde '+tabFechaFmt(desde)+'.','success');
  }).catch(function(e){
    console.warn('Tabulador: no se pudieron guardar los precios', e);
    showMsg('hTabMsg','No se pudo guardar. Comprueba la conexión.','error');
  });
}

function horasTabGuardarTecnico(i){
  if(!_horasEsAdmin() || !_horasTabDatos) return;
  var nombre=_horasTabTecNombres[i];
  if(!nombre) return;
  var id=tabSlug(nombre), sel=$('hTecSel_'+i).value, desde=$('hTecDesde_'+i).value;
  if(!_horasTabValidarFecha(desde)) return;
  var a=_horasTabDatos.asig[id];
  var hist=((a && a.historial) || []).filter(function(x){ return x.desde!==desde; });
  hist.push({desde:desde, tabuladorId:sel||null, creadoPor:window._sesion.nombre, fecha:Date.now()});
  hist.sort(function(x,y){ return x.desde<y.desde?-1:(x.desde>y.desde?1:0); });
  _db.collection('tabuladorTecnicos').doc(id).set({tecnico:nombre, historial:hist}).then(function(){
    _horasTabDatos.asig[id]={id:id, tecnico:nombre, historial:hist};
    horasRenderTab();
    showMsg('hTabMsg',escHtml(nombre)+': '+(sel ? escHtml(_horasTabDatos.tabs[sel].nombre) : 'sin tabulador')+' desde '+tabFechaFmt(desde)+'.','success');
  }).catch(function(e){
    console.warn('Tabulador: no se pudo guardar al técnico', e);
    showMsg('hTabMsg','No se pudo guardar. Comprueba la conexión.','error');
  });
}

