// ===== COMPARAR CÁLCULO (app nueva contra app de uso) =====
// Cada parte que trae el bloque "entrada" (el formulario tal cual lo llenó el técnico en la app de
// uso) se calcula aquí por su cuenta, con la misma generarCore que usará un técnico, y el
// resultado se guarda en la colección partesNueva (mismo id que el parte). Después se compara
// campo por campo con lo que calculó la app de uso, que es lo que trae el propio parte (lo copia
// `copiar`). Solo escribe en partesNueva: nunca toca partes ni nada que ya exista.
// El cálculo se ejecuta en "modo simulación" (window._modoSimulacion): no guarda borradores, no
// guarda parejas de tiendas y no cambia de pantalla. Ocupa el formulario, por eso solo se lanza
// desde su propia pantalla (admin).

var _CMP_CAMPOS=['dieta','totalMin','fin','horaEnlace','tipoDia','linkType','km','tr','kmDif','trDif','trS'];
var _CMP_ROTULOS={dieta:'Dieta',totalMin:'Minutos totales',fin:'Fin',horaEnlace:'Hora de enlace',tipoDia:'Tipo de día',linkType:'Enlace',km:'Km',tr:'Desplazamiento',kmDif:'Km de diferencia',trDif:'Despl. de diferencia',trS:'Despl. de salida'};
var _cmpEnCurso=false;
var _cmpFilas=[];

// Los partes del mismo día y técnico que la app de uso tuvo en cuenta (la dieta y el enlace
// automático dependen de ellos), con la forma que espera generarCore.
function _cmpHistorialDe(en){
  var tec=(en.nombres&&en.nombres[0])||'';
  return (en.previos||[]).map(function(x){
    return {fecha:en.fecha, tecnicos:[tec], clienteId:x.clienteId, pedido:x.pedido, centro:x.centro, arr:x.arr, lea:x.lea,
      totalMin:x.totalMin, dieta:x.dieta, linkType:x.linkType, horaEnlace:x.horaEnlace, kmDif:x.kmDif, trDif:x.trDif};
  });
}

// Pone en el formulario y en las variables de la app lo mismo que tenía el técnico al generar.
function _cmpRellenar(parte, enlaceInicial){
  var en=parte.entrada;
  var setv=function(id,v){ var e=document.getElementById(id); if(e){ e.readOnly=false; e.value=(v==null)?'':String(v); } };
  curCliente=getClientes().find(function(c){ return c.id===(parte.clienteId||'mercadona'); })||null;
  if(!curCliente) throw new Error('El cliente del parte ya no está en el catálogo.');
  curJob=en.job; curLink=enlaceInicial; curOrigen=(en.origen==='otro')?'otro':'nave';
  aeData=(enlaceInicial==='Auto'&&en.enlaceAuto)?{kmDif:en.enlaceAuto.kmDif||0, trDif:en.enlaceAuto.trDif||0}:null;
  esFestivo=!!en.festivo; _nocturnoConfirmado=!!en.nocturno;
  _editIdx=null; window._editIdxBackup=undefined;
  _pedidoNoMerc=parte.pedido||null; _actObrasSeleccionada=parte.actObras||null; window._centroSeleccionado=null;
  var roles=(en.roles&&en.roles.length)?en.roles:['Oficial','Oficial'];
  wRoles=roles.slice(); wNames=[];
  for(var i=0;i<roles.length;i++) wNames.push((en.nombres&&en.nombres[i])||('Técnico '+(i+1)));
  ['pedido','numParte','tienda','dir','tel','centro','obs','km','tr','kmE','kmS','trE','trS','kmA','trA','enlaceDestino','enlaceDestinoCentro','otroPartidaDesde','otroLlegadaHacia','kmOtroIda','trOtroIda','kmOtroVuelta','trOtroVuelta','kmAdicionales','kmAdicionalesJust','descIncidencia'].forEach(function(id){ setv(id,''); });
  setv('fecha',en.fecha); setv('arr',en.arr); setv('lea',en.lea); setv('w',roles.length); setv('link',enlaceInicial); setv('origen',curOrigen);
  setv('pedido',en.pedido||parte.pedido); setv('numParte',en.numParte||'0000'); setv('tienda',en.tienda||'x'); setv('dir',en.dir||'x'); setv('tel',en.tel||'x'); setv('centro',en.centro||parte.centro||''); setv('obs','x');
  setv('ncoches',en.ncoches||'1'); setv('todosEnlazan',en.todosEnlazan||'Si');
  setv('kmAdicionales',en.kmAdicionales); setv('kmAdicionalesJust',en.kmAdicionalesJust||(+en.kmAdicionales>0?'(sin justificación)':''));
  setv('km',en.km); setv('tr',en.tr);
  setv('kmE',en.kmE); setv('trE',en.trE); setv('kmS',en.kmS); setv('trS',en.trS);
  setv('enlaceDestinoCentro',en.enlaceDestinoCentro||(enlaceInicial==='Si'?'x':'')); setv('enlaceDestino',en.enlaceDestino||(enlaceInicial==='Si'?'x':''));
  setv('kmA',en.kmA); setv('trA',en.trA);
  setv('kmOtroIda',en.kmOtroIda); setv('trOtroIda',en.trOtroIda); setv('kmOtroVuelta',en.kmOtroVuelta); setv('trOtroVuelta',en.trOtroVuelta);
  setv('otroPartidaDesde',en.otroPartidaDesde); setv('otroLlegadaHacia',en.otroLlegadaHacia);
}

// Calcula el parte con generarCore y devuelve {r, extra}: r es el resultado (recTmp) y extra, las
// diferencias propias de la decisión de enlace automático (solo cuando la app de uso lo aplicó:
// ahí el cálculo parte del enlace ya decidido, así que además se comprueba si esta app lo habría
// decidido igual).
function _cmpCalcular(parte){
  var en=parte.entrada;
  var getH0=window.getH, hist=_cmpHistorialDe(en), extra=[];
  try{
    window._modoSimulacion=true;
    window.getH=function(){ return hist; };
    _cmpRellenar(parte, en.enlace||'No');
    window.recTmp=null;
    generarCore();
    var r=window.recTmp||null;
    if(r && en.enlace==='Auto'){
      _cmpRellenar(parte, 'No');
      checkAutoEnlace();
      if(curLink!=='Auto') extra.push({campo:'Enlace automático', uso:'sí', nueva:'no'});
    }
    return {r:r, extra:extra};
  } finally {
    window.getH=getH0; window._modoSimulacion=false;
  }
}

function _cmpValor(v){ return v===undefined?null:v; }

function _cmpDiferencias(parte, r){
  var d=[];
  _CMP_CAMPOS.forEach(function(k){
    var a=parte[k], b=r[k];
    if(k==='dieta'){ a=!!a; b=!!b; }
    if(a===undefined&&(b===0||b===null||b===undefined||b==='')) return;
    if(String(a)!==String(b)) d.push({campo:_CMP_ROTULOS[k]||k, uso:_cmpValor(a), nueva:_cmpValor(b)});
  });
  var norm=function(c){ var o={}; (c||[]).forEach(function(x){ o[x.lab]=Math.round((+x.v||0)*100)/100; }); return o; };
  var A=norm(parte.codigos), B=norm(r.codigos);
  Object.keys(Object.assign({},A,B)).forEach(function(l){
    if(A[l]!==B[l]) d.push({campo:'Código '+l, uso:_cmpValor(A[l]), nueva:_cmpValor(B[l])});
  });
  return d;
}

function _cmpGuardar(id, parte, r, difs){
  var doc={
    parteId:id, fecha:parte.fecha||'', centro:parte.centro||'', pedido:parte.pedido||'', tienda:parte.tienda||'', clienteId:parte.clienteId||'mercadona',
    build:APP_BUILD_ID, calculadoEn:Date.now(), parteModificadoEn:(parte.fechaModificacion||parte._fm||0),
    resultado:{dieta:!!r.dieta, totalMin:r.totalMin, fin:r.fin, horaEnlace:r.horaEnlace, tipoDia:r.tipoDia, linkType:r.linkType,
      km:r.km, tr:r.tr, kmDif:r.kmDif, trDif:r.trDif, trS:r.trS, codigos:r.codigos},
    coincide:difs.length===0, diferencias:difs
  };
  return _db.collection('partesNueva').doc(id).set(JSON.parse(JSON.stringify(doc)));
}

function abrirComparar(){
  if(!(window._sesion && window._sesion.rol==='admin')) return;
  _verificarConexionFirestore(function(hayConexion){
    if(!hayConexion){ _toast('Necesitas conexión a internet para comparar el cálculo.', _AVISO_ROJO); return; }
    goTo('w-comparar');
    _cmpEjecutar(false);
  });
}

// Calcula los partes con formulario que aún no tienen cálculo de esta versión de la app (o que
// cambiaron desde entonces); con forzar=true recalcula todos. Va por tandas para no bloquear.
function _cmpEjecutar(forzar){
  if(_cmpEnCurso) return;
  if(typeof _db==='undefined'||!_db){ _toast('Necesitas conexión a internet.', _AVISO_ROJO); return; }
  _cmpEnCurso=true;
  var prog=$('cmpProgreso'); if(prog){ prog.style.display='block'; prog.textContent='Consultando…'; }
  Promise.all([_db.collection('partes').get(), _db.collection('partesNueva').get()]).then(function(res){
    var conForm=[]; res[0].forEach(function(d){ var p=d.data(); if(p&&p.entrada) conForm.push({id:d.id,p:p}); });
    var hechos={}; res[1].forEach(function(d){ hechos[d.id]=d.data(); });
    var pend=conForm.filter(function(x){
      var h=hechos[x.id];
      return forzar||!h||h.build!==APP_BUILD_ID||h.parteModificadoEn!==(x.p.fechaModificacion||x.p._fm||0);
    });
    var i=0, errores=[];
    function tanda(){
      var fin=Math.min(i+10,pend.length), ps=[];
      for(;i<fin;i++){
        var x=pend[i];
        try{
          var c=_cmpCalcular(x.p);
          if(!c.r){ errores.push(x.id+': no se pudo calcular (faltan datos del formulario).'); continue; }
          var difs=_cmpDiferencias(x.p,c.r).concat(c.extra);
          hechos[x.id]={parteId:x.id,fecha:x.p.fecha||'',centro:x.p.centro||'',pedido:x.p.pedido||'',tienda:x.p.tienda||'',build:APP_BUILD_ID,coincide:difs.length===0,diferencias:difs};
          ps.push(_cmpGuardar(x.id,x.p,c.r,difs).catch(function(e){ errores.push('No se pudo guardar el resultado: '+(e&&e.message||e)); }));
        }catch(e){ errores.push(x.id+': '+(e&&e.message||e)); }
      }
      if(prog) prog.textContent='Calculando… '+Math.min(i,pend.length)+' de '+pend.length;
      return Promise.all(ps).then(function(){
        if(i<pend.length) return new Promise(function(ok){ setTimeout(ok,0); }).then(tanda);
      });
    }
    return tanda().then(function(){
      try{ nuevo(); }catch(e){}
      _cmpFilas=conForm.map(function(x){ return hechos[x.id]; }).filter(Boolean);
      _cmpRender(conForm.length, pend.length, errores);
    });
  }).catch(function(e){
    var el=$('cmpResumen'); if(el) el.innerHTML='<p style="font-size:.85rem;color:var(--red);padding:6px 0;">No se pudo comparar: '+escHtml(e&&e.message||e)+'</p>';
  }).then(function(){
    _cmpEnCurso=false;
    var p=$('cmpProgreso'); if(p) p.style.display='none';
  });
}

function _cmpRender(totalConForm, calculados, errores){
  var res=$('cmpResumen'), lista=$('cmpLista'); if(!res||!lista) return;
  var difieren=_cmpFilas.filter(function(f){ return !f.coincide; });
  if(!totalConForm){
    res.innerHTML='<p style="font-size:.85rem;color:var(--text2);padding:6px 0;">Todavía no hay partes con el formulario de la app de uso. Se guardan desde la versión del 2 de noviembre de 2026; a medida que los técnicos guarden partes irán apareciendo aquí.</p>';
    lista.innerHTML=''; return;
  }
  var porCampo={};
  difieren.forEach(function(f){ (f.diferencias||[]).forEach(function(d){ porCampo[d.campo]=(porCampo[d.campo]||0)+1; }); });
  var campos=Object.keys(porCampo).sort(function(a,b){ return porCampo[b]-porCampo[a]; }).map(function(k){ return escHtml(k)+': '+porCampo[k]; }).join(' · ');
  res.innerHTML='<div style="font-size:.9rem;font-weight:700;padding:6px 0;">'+totalConForm+' partes con formulario · <span style="color:var(--green);">'+(totalConForm-difieren.length)+' coinciden</span> · <span style="color:'+(difieren.length?'var(--red)':'var(--green)')+';">'+difieren.length+' con diferencias</span></div>'
    +(campos?'<div style="font-size:.78rem;color:var(--text2);padding-bottom:6px;">'+campos+'</div>':'')
    +'<div style="font-size:.75rem;color:var(--text3);">Calculados ahora: '+calculados+'. Versión: '+escHtml(APP_BUILD_ID)+'.</div>'
    +(errores.length?'<div style="font-size:.78rem;color:var(--amber);padding-top:6px;">Sin calcular ('+errores.length+'): '+errores.map(escHtml).join(' · ')+'</div>':'');
  lista.innerHTML=difieren.length?difieren.sort(function(a,b){ return String(b.fecha).localeCompare(String(a.fecha)); }).map(function(f){
    return '<div class="card"><div style="font-size:.9rem;font-weight:700;margin-bottom:4px;">'+escHtml(f.tienda||'')+' · '+escHtml(f.fecha||'')+'</div>'
      +'<div style="font-size:.78rem;color:var(--text2);margin-bottom:6px;">Orden '+escHtml(f.pedido||'—')+' · Centro '+escHtml(f.centro||'—')+'</div>'
      +(f.diferencias||[]).map(function(d){ return '<div style="font-size:.85rem;padding:6px 0;border-top:1px solid var(--border2);"><strong>'+escHtml(d.campo)+'</strong>: app de uso <strong>'+escHtml(d.uso)+'</strong> · app nueva <strong>'+escHtml(d.nueva)+'</strong></div>'; }).join('')
      +'</div>';
  }).join(''):'<p style="font-size:.85rem;color:var(--green);padding:10px 0;">Todos los partes coinciden con la app de uso.</p>';
}

function _cmpCopiarInforme(){
  var difieren=_cmpFilas.filter(function(f){ return !f.coincide; });
  var lineas=['COMPARACIÓN DE CÁLCULO — '+_cmpFilas.length+' partes con formulario, '+difieren.length+' con diferencias (versión '+APP_BUILD_ID+')'];
  difieren.forEach(function(f){
    lineas.push(f.fecha+' · '+(f.tienda||'')+' · orden '+(f.pedido||'—')+' · centro '+(f.centro||'—')+': '+(f.diferencias||[]).map(function(d){ return d.campo+' (uso '+d.uso+' / nueva '+d.nueva+')'; }).join('; '));
  });
  navigator.clipboard.writeText(lineas.join('\n')).then(function(){ _toast('Informe copiado.'); }).catch(function(){ _toast('No se pudo copiar.', _AVISO_ROJO); });
}
