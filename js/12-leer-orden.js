// ===== LEER ORDEN =====

function getGrupKey(r){ return r.pedido+'||'+r.centro; }

function getNextCodLugar(){
  // Contador global para todos los clientes no-Mercadona
  // Usa la agenda (espejo completo sincronizado de Firestore, igual para todos)
  // en vez del historial de partes, que para un técnico solo contiene los suyos propios.
  var a=getAgenda();
  var maxN=0;
  Object.keys(a).forEach(function(k){
    var c=a[k].centro||'';
    var m=c.match(/^CL(\d+)$/);
    if(m) maxN=Math.max(maxN,parseInt(m[1]));
  });
  return 'CL'+String(maxN+1).padStart(4,'0');
}

function buscarRefNoMerc(val){
  var box=document.getElementById('acRef');
  if(!box) return;
  // Solo activo para clientes no-Mercadona
  if(!curCliente||curCliente.tipo==='mercadona'){ box.classList.remove('show'); return; }
  if(!val||val.length<1){ box.classList.remove('show'); box.innerHTML=''; return; }
  var h=getH();
  var clienteId=curCliente.id;
  var seen={}, activas=[];
  for(var i=h.length-1;i>=0;i--){
    var r=h[i];
    if((r.clienteId||'mercadona')!==clienteId) continue;
    if((r.estado||'terminado')!=='en-ejecucion') continue;
    var k=r.centro; // CL0001 etc
    if(seen[k]) continue;
    seen[k]=true;
    if((r.tienda||'').toLowerCase().includes(val.toLowerCase())){
      activas.push({r:r,idx:i});
    }
  }
  var agendaItems=[];
  if(!activas.length){
    var a=getAgenda();
    Object.keys(a).forEach(function(k2){
      var ag=a[k2];
      if(ag.clienteId!==clienteId) return;
      if((ag.tienda||'').toLowerCase().includes(val.toLowerCase())) agendaItems.push(ag);
    });
  }
  if(!activas.length && !agendaItems.length){ box.classList.remove('show'); box.innerHTML=''; return; }
  var h2='';
  activas.forEach(function(x){
    var cod=x.r.centro||'';
    var nombre=x.r.tienda||'';
    h2+='<div class="ac-item" onclick="seleccionarRefNoMerc('+x.idx+')">'+
      '<span style="font-size:.75rem;color:var(--green);font-weight:700;margin-right:6px;">'+cod+'</span>'+nombre+
      ' <span class="badge badge-a" style="font-size:.66rem;">En ejecuci&oacute;n</span>'+
      '<div style="font-size:.72rem;color:var(--text2);">'+( x.r.dir||'' )+'</div></div>';
  });
  agendaItems.forEach(function(ag){
    h2+='<div class="ac-item" onclick="seleccionarRefAgenda(\''+clienteId+'\',\''+ag.centro+'\')">'+
      '<span style="font-size:.75rem;color:var(--green);font-weight:700;margin-right:6px;">'+ag.centro+'</span>'+ag.tienda+
      ' <span class="badge badge-g" style="font-size:.66rem;">Agenda</span>'+
      '<div style="font-size:.72rem;color:var(--text2);">'+(ag.dir||'')+'</div></div>';
  });
  box.innerHTML=h2;
  box.classList.add('show');
}

function seleccionarRefAgenda(clienteId,centro){
  var ag=agendaBuscar(clienteId,centro); if(!ag) return;
  _rellenarFormulario({ tienda:ag.tienda, dir:ag.dir, tel:ag.tel, km:ag.km, tr:ag.tr });
  window._centroSeleccionado=ag.centro;
  var box=document.getElementById('acRef');
  if(box){ box.classList.remove('show'); box.innerHTML=''; }
}

function seleccionarRefNoMerc(idx){
  var r=getH()[idx]; if(!r) return;
  _rellenarFormulario({ tienda:r.tienda, dir:r.dir, tel:r.tel, km:r.km, tr:r.tr });
  // Si la orden sigue en ejecución, rellenar el número de pedido
  if((r.estado||'terminado')==='en-ejecucion' && r.pedido){
    if(_pedidoNoMerc!==r.pedido){ _pedidoNoMerc=r.pedido; $('pedidoGenDisplay').textContent=r.pedido; }
    _autoNumParte0000(r.pedido, r.centro);
  }
  // Guardar el código del centro para no crear uno nuevo
  window._centroSeleccionado=r.centro;
  var box=document.getElementById('acRef');
  if(box){ box.classList.remove('show'); box.innerHTML=''; }
}
function buscarPorCentroORef(val){
  var box=$('acCentro');
  var esMerc=curCliente&&curCliente.tipo==='mercadona';
  var clienteId=curCliente?curCliente.id:'mercadona';
  if(esMerc){
    // Mercadona: nada visible mientras escribe — solo se comprueba en silencio al
    // completar los 4 dígitos del centro; si existe, se rellena todo bloqueado
    box.classList.remove('show'); box.innerHTML='';
    if(val && val.trim().length===4){
      var agExacto=agendaBuscar(clienteId,val.trim());
      if(agExacto) rellenarDesdeAgenda(clienteId, val.trim());
    }
    return;
  }
  if(!val||val.length<1){ box.classList.remove('show'); box.innerHTML=''; return; }
  var h=getH();
  var campo='tienda';
  var esTecnico=window._sesion && window._sesion.rol==='tecnico';
  var miNombre=esTecnico?window._sesion.nombre.toLowerCase():null;
  var seen={},activas=[],cerradas=[];
  for(var i=h.length-1;i>=0;i--){
    var r=h[i];
    var esDeCliente=(r.clienteId||'mercadona')===clienteId;
    if(!esDeCliente) continue;
    if(esTecnico && !(r.tecnicos && r.tecnicos[0] && r.tecnicos[0].toLowerCase()===miNombre)) continue;
    var campoVal=(r[campo]||'').toLowerCase();
    if(!campoVal.includes(val.toLowerCase())) continue;
    var k=r[campo];
    if(seen[k]) continue;
    seen[k]=true;
    if((r.estado||'terminado')==='en-ejecucion') activas.push({r:r,idx:i});
    else cerradas.push({r:r,idx:i});
  }
  var otrosClientes=[];
  var seenOtros={};
  for(var j=h.length-1;j>=0;j--){
    var r2=h[j];
    if((r2.clienteId||'mercadona')===clienteId) continue;
    if(!(r2.tienda||'').toLowerCase().includes(val.toLowerCase())) continue;
    if((r2.estado||'terminado')!=='en-ejecucion') continue;
    var k2=r2.tienda+'|'+r2.clienteId;
    if(seenOtros[k2]) continue;
    seenOtros[k2]=true;
    var nombreCliente=r2.clienteId;
    var cl=getClientes().find(function(c){ return c.id===r2.clienteId; });
    if(cl) nombreCliente=cl.nombre;
    otrosClientes.push({r:r2,idx:j,nombreCliente:nombreCliente});
  }
  var html='';
  activas.forEach(function(x){
    html+='<div class="ac-item" onclick="rellenarDatos('+x.idx+',false)">'+
      '<span style="margin-right:6px;">&#9203;</span>'+x.r.tienda+
      ' <span class="badge badge-a" style="font-size:.66rem;">En ejecuci&oacute;n</span></div>';
  });
  if(!activas.length&&cerradas.length){
    var x=cerradas[0];
    html+='<div class="ac-item" style="color:var(--text2)" onclick="rellenarDatos('+x.idx+',false)">'+
      '<span style="margin-right:6px;">&#128203;</span>'+x.r.tienda+
      ' <span class="badge badge-g" style="font-size:.66rem;">Datos anteriores</span></div>';
  }
  otrosClientes.forEach(function(x){
    html+='<div class="ac-item" style="color:var(--amber)" onclick="avisoCruzadoIdx('+x.idx+')">'+
      '<span style="margin-right:6px;">&#9888;&#65039;</span>&quot;'+x.r.tienda+'&quot; activa en <strong>'+x.nombreCliente+'</strong></div>';
  });
  if(!html){ box.classList.remove('show'); box.innerHTML=''; return; }
  box.innerHTML=html; box.classList.add('show');
}

// Bloqueo real (no solo un aviso) cuando un técnico intenta trabajar en una incidencia
// que ya es de otro técnico — se usa tanto al escribir el pedido como justo antes de
// guardar, para que no se pueda saltar escribiendo el número directamente en el campo.
function _mostrarBloqueoIncidenciaDeOtro(){
  var dlg=$('dlgIncidenciaDeOtro'); if(dlg) dlg.classList.add('show');
}
function _continuarTrasIncidenciaDeOtro(){
  var dlg=$('dlgIncidenciaDeOtro'); if(dlg) dlg.classList.remove('show');
  nuevo();
  mostrarDlgInicioOrden();
}

function buscarPorOrden(val){
  var box=$('acOrden');
  box.classList.remove('show'); box.innerHTML='';
  if(!val || val.trim().length<6) return;
  var esTecnico=window._sesion && window._sesion.rol==='tecnico';
  var esTecnicoPuro=esTecnico && !window._sesion.multiRol;
  var miNombre=esTecnico?window._sesion.nombre.toLowerCase():null;
  var sinAsig=_clienteSinAsignacion(curCliente?curCliente.id:'mercadona');
  // Bloqueo por registro global (funciona offline): solo en coincidencia EXACTA y solo para técnico
  if(esTecnico){
    var reg=_registroGlobal(val.trim(), curCliente && curCliente.id);
    if(reg){
      var esDeOtro = !sinAsig && reg.tecnicoPrincipal && reg.tecnicoPrincipal.toLowerCase()!==miNombre;
      if(esDeOtro){
        _mostrarBloqueoIncidenciaDeOtro();
        return;
      }
      if(reg.estado==='terminado' && sinAsig){
        box.innerHTML='<div class="ac-item" style="color:var(--text2)"><span style="margin-right:6px;">&#128274;</span>Orden '+val.trim()+' &mdash; cerrada. Solo el administrador puede reabrirla.</div>';
        box.classList.add('show');
        return;
      }
      if(reg.estado==='terminado'){
        box.innerHTML='<div class="ac-item" style="color:var(--text2)" onclick="solicitarReabrirPorPedido(\''+val.trim().replace(/'/g,"\\'")+'\')">'+
          '<span style="margin-right:6px;">&#128274;</span>Orden '+val.trim()+' &mdash; cerrada. <strong>'+(esTecnicoPuro?'Solicitar reabrir':'Reabrir')+'</strong></div>';
        box.classList.add('show');
        return;
      }
    }
  }
  var h=getH();
  var clienteId=curCliente?curCliente.id:'mercadona';
  var delCliente=h.filter(function(r){
    if((r.clienteId||'mercadona')!==clienteId) return false;
    if(esTecnico && !(r.tecnicos && r.tecnicos[0] && r.tecnicos[0].toLowerCase()===miNombre)) return false;
    return true;
  });
  // Solo coincidencia EXACTA con el pedido completo, sin sugerencias parciales
  var exacta=null, exactaIdx=null;
  for(var i=delCliente.length-1;i>=0;i--){
    var r=delCliente[i];
    if(r.pedido && r.pedido.toLowerCase()===val.trim().toLowerCase()){
      exacta=r; exactaIdx=h.indexOf(r); break;
    }
  }
  if(!exacta) return;
  if((exacta.estado||'terminado')==='en-ejecucion'){
    seleccionarOrdenActiva(exactaIdx);
    return;
  }
  if(esTecnico && sinAsig){
    box.innerHTML='<div class="ac-item" style="color:var(--text2)"><span style="margin-right:6px;">&#128274;</span>'+exacta.pedido+' &mdash; '+(exacta.tienda||exacta.centro)+
      ' <span class="badge badge-g" style="font-size:.66rem;">Cerrada &middot; Solo el administrador puede reabrirla</span></div>';
  } else if(esTecnicoPuro){
    box.innerHTML='<div class="ac-item" style="color:var(--text2)" onclick="solicitarReabrirPorPedido(\''+exacta.pedido.replace(/'/g,"\\'")+'\')">'+
      '<span style="margin-right:6px;">&#128274;</span>'+exacta.pedido+' &mdash; '+(exacta.tienda||exacta.centro)+
      ' <span class="badge badge-g" style="font-size:.66rem;">Cerrada &middot; Solicitar reabrir</span></div>';
  } else {
    box.innerHTML='<div class="ac-item" style="color:var(--text2)" onclick="pedirReabrirOrden('+exactaIdx+')">'+
      '<span style="margin-right:6px;">&#128274;</span>'+exacta.pedido+' &mdash; '+(exacta.tienda||exacta.centro)+
      ' <span class="badge badge-g" style="font-size:.66rem;">Cerrada</span></div>';
  }
  box.classList.add('show');
}

function compartirOrden(){
  var o=window._ordenActual; if(!o) return;
  var lines=['RESUMEN ORDEN DE SERVICIO','===================='];
  lines.push(o.tienda);
  var ordenTitle=o.actObras?o.actObras+' · '+o.job:'Orden '+o.pedido+' · '+o.job;
  lines.push(ordenTitle+' · '+(o.estado==='en-ejecucion'?'En ejecución':'Finalizado'));
  lines.push('Fechas: '+o.fechas.join(', '));
  lines.push('');
  lines.push('CÓDIGOS ACUMULADOS');
  Object.values(o.codAcum).forEach(function(c){
    var v=c.u==='km'?Math.round(c.v)+' km':c.u==='dieta'?''+Math.round(c.v):fmtH(c.v);
    lines.push(c.rc+' · '+c.rl+': '+v);
  });
  if(Object.keys(o.matAcum).length){
    lines.push(''); lines.push('MATERIALES ACUMULADOS');
    Object.keys(o.matAcum).forEach(function(n){ lines.push(n+': '+o.matAcum[n]); });
  }
  var texto=lines.join('\n');
  if(navigator.share){ try{ navigator.share({title:'Resumen '+ordenTitle,text:texto}); return; }catch(e){ if(e.name==='AbortError') return; } }
  // Antes salían dos avisos seguidos ("Copiado" y "Resumen copiado."); ahora uno, cuando ya se ha copiado
  try{ navigator.clipboard.writeText(texto).then(function(){ _toast('Resumen copiado.'); }).catch(function(){ _toast('No se pudo compartir.', _AVISO_ROJO); }); }catch(e){ _toast('No se pudo compartir.', _AVISO_ROJO); }
}

function compartirResumenCentro(){
  var tit=$('resumenCentroTitle').innerText,txt=$('resumenCentroContent').innerText;
  navigator.clipboard.writeText(tit+' - '+txt).then(function(){_toast('Copiado.');}).catch(function(){_toast('No se pudo copiar.', _AVISO_ROJO);});
}

function compartirResumenTotal(){
  var txt=$('resumenTotalContent').innerText;
  navigator.clipboard.writeText('RESUMEN TOTAL - '+txt).then(function(){_toast('Copiado.');}).catch(function(){_toast('No se pudo copiar.', _AVISO_ROJO);});
}

function guardarConEstado(estado){
  $('dlgEstado').classList.remove('show');
  if(!window.recTmp) return;
  // Observaciones guarda SOLO lo que escribe el técnico — la descripción de la incidencia y
  // la nota de km adicionales se guardan aparte (recTmp.descIncidencia / recTmp.notaKmAdicional)
  // y se juntan únicamente al mostrar el parte, para que editar nunca las duplique ni las mezcle.
  window.recTmp.obs=$('obs').value.trim();
  window.recTmp.estado=estado;
  window.recTmp.materiales=msGetSel();

  // Detectar si tienda/dir/tel cambiaron respecto al historial del mismo centro
  var r=window.recTmp;
  var h=getH();
  var anterior=null;
  for(var i=h.length-1;i>=0;i--){
    if(h[i].centro===r.centro&&h[i].clienteId===r.clienteId){ anterior=h[i]; break; }
  }
  if(anterior){
    var difs=[];
    if(anterior.tienda&&r.tienda&&anterior.tienda!==r.tienda)
      difs.push('Tienda: <em>'+escHtml(anterior.tienda)+'</em> → <strong>'+escHtml(r.tienda)+'</strong>');
    if(anterior.dir&&r.dir&&anterior.dir!==r.dir)
      difs.push('Dirección: <em>'+escHtml(anterior.dir)+'</em> → <strong>'+escHtml(r.dir)+'</strong>');
    if(anterior.tel&&r.tel&&anterior.tel!==r.tel)
      difs.push('Teléfono: <em>'+escHtml(anterior.tel)+'</em> → <strong>'+escHtml(r.tel)+'</strong>');
    if(difs.length){
      $('dlgCorregirDifs').innerHTML=difs.join('<br>');
      window._corregirEstado=estado;
      $('dlgCorregir').classList.add('show');
      return;
    }
  }

  _finalizarGuardado(estado);
}

function cap(re,t){ var m=t.match(re); return m?m[1]:null; }
function ocultarLectura(){var c=$('cardLectura');if(c)c.style.display='none';}
function leer(){
  var t=$('raw').value; if(!t.trim()){ showMsg('msgForm','Pega el texto primero.','warn'); return; }

  // Extraer campos básicos
  var pedido=cap(/PEDIDO DE SERVICIO\s+N[º°ª]?[:\s]+(\d+)/i,t)||cap(/N[º°ª]\s*ORDEN[:\s]+(\S+)/i,t)||cap(/(\d{6,})/,t);
  var centro=cap(/N[º°ª]?\s*de\s*Centro[:\s]+(\d+)/i,t)||cap(/Centro[:\s-]+(\d+)/i,t);
  var denom=cap(/(?:TIENDA|Denominaci[oó]n)[:\s]+([\s\S]+?)(?=\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ° ]+:|\n|$)/i,t);
  // Centro desde número final del nombre de tienda si no vino explícito
  if(!centro&&denom){ var cm=denom.trim().match(/(\d{3,5})\s*$/); if(cm) centro=cm[1]; }
  var tel=cap(/TEL[EÉ]FONO[^:]*[:\s]+(\+?\d[\d\s\-]{6,})/i,t);
  var dir=cap(/DIRECCI[OÓ]N[:\s]+([\s\S]+?)(?=\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ° ]+:|\n|$)/i,t);
  if(dir) dir = dir.replace(/\s+Persona\s+de\s*$/i,'').trim();
  // Si el texto trae un bloque "Información del centro" con su propia Dirección (más completa,
  // con número y localidad — los pedidos de Mercadona solo traen el nombre de la calle arriba,
  // sin número), se prefiere esa sobre la de arriba.
  var dirCompleta=cap(/Informaci[oó]n del centro:[\s\S]*?Direcci[oó]n:\s*([^\n]+(?:\n(?!\s*[A-ZÁÉÍÓÚÑ][a-záéíóúñ° ]*:)[^\n]+)*)/i,t);
  if(dirCompleta) dir = dirCompleta.replace(/\s*\n\s*/g,' ').trim();
  var jobKeysParte=(curCliente&&curCliente.jobs&&curCliente.jobs.length)?curCliente.jobs:['Climatización','Conductos','Obras'];
  var job=null;
  var clasifParte=cap(/Clasificaci[oó]n[:\s]+([^\n]+)/i,t);
  if(clasifParte){
    for(var jip=0;jip<jobKeysParte.length;jip++){ if(clasifParte.toLowerCase().indexOf(jobKeysParte[jip].toLowerCase())>=0){ job=jobKeysParte[jip]; break; } }
  }
  if(!job){
    for(var jkp=0;jkp<jobKeysParte.length;jkp++){ if(t.toLowerCase().indexOf(jobKeysParte[jkp].toLowerCase())>=0){ job=jobKeysParte[jkp]; break; } }
  }
  var arr=cap(/LLEGADA[:\s]+(\d{1,2}:\d{2})/i,t);
  var lea=cap(/SALIDA[:\s]+(\d{1,2}:\d{2})/i,t);

  // Si no hay LLEGADA/SALIDA explícitas, extraer de primera y última franja
  if(!arr||!lea){
    var franjas=t.match(/\((\d{1,2}:\d{2})\)\s*-\s*\((\d{1,2}:\d{2})\)/g)||[];
    if(franjas.length>=1){
      var pF=franjas[0].match(/\((\d{1,2}:\d{2})\)\s*-\s*\((\d{1,2}:\d{2})\)/);
      var uF=franjas[franjas.length-1].match(/\((\d{1,2}:\d{2})\)\s*-\s*\((\d{1,2}:\d{2})\)/);
      if(!arr&&pF) arr=pF[2]; // llegada = fin de franja ida
      if(!lea&&uF) lea=uF[1]; // salida = inicio de franja vuelta
      // Si solo hay una franja es tienda
      if(franjas.length===1&&pF){ arr=pF[1]; lea=pF[2]; }
    }
  }

  // Extraer km desde franja · X KM
  var kmM=t.match(/·\s*([\d\.]+)\s*KM/i);
  var kmVal=kmM?parseFloat(kmM[1]):null;

  // Extraer desplazamiento desde duración de franja km (primera franja)
  var trVal=null;
  var franjaKm=t.match(/\((\d{1,2}:\d{2})\)\s*-\s*\((\d{1,2}:\d{2})\)\s*·\s*[\d\.]+\s*KM/i);
  if(franjaKm){
    var fkM=franjaKm[0].match(/\((\d{1,2}:\d{2})\)\s*-\s*\((\d{1,2}:\d{2})\)/);
    if(fkM){
      var t1=fkM[1].split(':'); var t2=fkM[2].split(':');
      var min1=+t1[0]*60+ +t1[1]; var min2=+t2[0]*60+ +t2[1];
      var diff=min2-min1; if(diff<0) diff+=1440;
      trVal=diff;
    }
  }

  // Extraer materiales MAT. nombre xN
  var matsExtraidos=[];
  var matLines=t.match(/MAT\.\s+(.+?)\s+x(\d+)/gi)||[];
  matLines.forEach(function(ml){
    var mm=ml.match(/MAT\.\s+(.+?)\s+x(\d+)/i);
    if(mm) matsExtraidos.push({nombre:mm[1].trim(), cantidad:+mm[2]});
  });

  // Extraer observaciones (bloque OBS. hasta fin o MATERIALES)
  var obsM=t.match(/OBS\.?\n([\s\S]+?)(?=\nMATERIALES|\nPartes IRV|$)/i);
  var obsVal=obsM?obsM[1].replace(/^\s+|\s+$/g,''):'';

  // Extraer avería reportada (bloque DESCRIPCIÓN del pedido original, ej. pedidos de Mercadona) —
  // se detiene en la primera línea en blanco o encabezado en mayúsculas (mismo criterio que ya
  // usa leerAsg() para este mismo dato), para no arrastrar bloques posteriores como
  // "COMENTARIOS Y OBSERVACIONES" cuando el texto pegado no trae "MATERIALES"/"Partes IRV".
  var averiaTop=cap(/DESCRIPCI[OÓ]N\s*\n?([^\n]+(?:\n(?!\s*[A-ZÁÉÍÓÚÑ ]{4,}[:\n])[^\n]+)*)/,t);
  var causaVal=cap(/Causa:\s*([^\n]+)/i,t);
  // Se completa con Clasificación (ya extraída más arriba para detectar el tipo de trabajo) y
  // Causa, en el mismo orden en que aparecen en el PDF de Mercadona, para que la avería
  // guardada en la incidencia quede completa sin importar si el parte lo crea un técnico
  // directo o viene de Asignación — ambos caminos leen el mismo texto pegado.
  var averiaVal=[averiaTop&&averiaTop.trim(), clasifParte&&('Clasificación: '+clasifParte.trim()), causaVal&&('Causa: '+causaVal.trim())].filter(function(s){return s;}).join('\n');

  // Rellenar campos
  var n=0;
  if(pedido&&!$('pedido').value){ $('pedido').value=pedido.trim(); n++; }
  if(centro){ $('centro').value=centro.trim(); n++; }
  var _agendaExistente = centro ? agendaBuscar(curCliente?curCliente.id:'mercadona', centro.trim()) : null;
  if(_agendaExistente){
    // Centro ya registrado: usar los datos verificados de la Agenda, no los del texto pegado
    rellenarDesdeAgenda(curCliente?curCliente.id:'mercadona', centro.trim());
    n++;
  } else {
    if(denom){
      var nombreBase=denom.trim().replace(/\s*\d{3,5}\s*$/,'').replace(/^Mercadona\s+/i,'').trim();
      $('tienda').value = centro ? ('Mercadona '+nombreBase+' '+centro.trim()) : ('Mercadona '+nombreBase);
      n++;
    }
    if(dir){ $('dir').value=dir.trim(); n++; }
    if(tel){ $('tel').value=tel.trim(); n++; }
    if(kmVal){ $('km').value=kmVal; n++; }
    if(trVal){ $('tr').value=trVal; n++; }
  }
  // La fecha que trae el texto pegado es la programada por Mercadona, no el día en que se hizo el trabajo:
  // no se lee, el parte conserva la fecha del formulario.
  if(arr){ $('arr').value=arr; n++; }
  if(lea){ $('lea').value=lea; n++; }
  if(obsVal){ $('obs').value=obsVal; n++; }
  if(averiaVal){ _averiaReportada=averiaVal; n++; }

  // Tipo de trabajo — primero activar el botón, luego cargar materiales en setTimeout
  // para que setJob() termine antes de que msInitSel() lea curJob
  var _matsParaCargar=matsExtraidos.slice();
  if(job){
    var jobT=job.trim();
    ['Climatización','Conductos','Obras','Electricidad'].forEach(function(j){
      if(jobT.toLowerCase()===j.toLowerCase()){
        document.querySelectorAll('[onclick*="setJob"]').forEach(function(btn){
          if(btn.textContent.trim()===j){ btn.click(); }
        });
        n++;
      }
    });
  }

  // Materiales — cargar después de que setJob() haya terminado
  if(_matsParaCargar.length){
    n+=_matsParaCargar.length;
    setTimeout(function(){
      var matsFormato=_matsParaCargar.map(function(m){ return {nombre:m.nombre,cantidad:m.cantidad}; });
      msInitSel(matsFormato);
      msRender('parteMatCard');
    },200);
  }

  // Extraer técnicos: línea justo antes de "Partes IRV-10"
  var _tecLine=t.match(/([^\n]+)\nPartes IRV/i);
  if(_tecLine){
    var _nomsTxt=_tecLine[1].trim();
    if(_nomsTxt&&!/^MAT\.|^\d|^MF|^MB|^MK|^M[A-Z]/.test(_nomsTxt)){
      var _noms=_nomsTxt.split(/\s*[·•]\s*/).map(function(n){return n.trim();}).filter(Boolean);
      if(_noms.length){
        wNames=_noms.slice();
        setTimeout(function(){
          var _wInp=$('w'); if(_wInp) _wInp.value=_noms.length;
          renderWorkers();
        },300);
        n+=_noms.length;
      }
    }
  }

  // Rellenar km desde historial si no vino en el texto
  if(centro){
    buscarPorCentroORef(centro);
    var _centroVal=(centro+'').trim();
    setTimeout(function(){
      var _h=getH();
      for(var _i=_h.length-1;_i>=0;_i--){
        var _r=_h[_i];
        if((_r.centro||'')=== _centroVal&&_r.km){
          if(!$('km').value){ $('km').value=_r.km; $('tr').value=_r.tr||''; }
          break;
        }
      }
    },100);
  }

  setTimeout(ocultarLectura,600);
  if(n) window._origenAutoLectura=true;
  showMsg('msgForm',n?n+' campo(s) autocompletados.':'No se encontraron datos.',n?'success':'warn');
}

function renderSearchResults(){
  var q=($('busca')?($('busca').value||''):'').toLowerCase();
  var qf=$('buscaF')?($('buscaF').value||''):'';
  var el=$('searchResults'); if(!el) return;
  if(!q&&!qf){ el.style.display='none'; el.innerHTML=''; return; }
  var ords=getOrdenes(); // sin filtro de estado — muestra todos
  if(!ords.length){
    el.style.display='block';
    el.innerHTML='<div class="empty"><div class="empty-ico">🔍</div><div>Sin resultados para "'+q+'"</div></div>';
    return;
  }
  // Con fecha concreta filtrada: reordenar por técnico principal (alfabético, solo
  // admin) y luego por hora de inicio del parte, de más temprano a más tarde.
  // En modo técnico (que ya solo ve sus propios partes) se ordena solo por hora.
  var _esAdmin = window._sesion && window._sesion.rol==='admin';
  if(qf){
    ords.sort(function(a,b){
      var ra=a.partes[0].r, rb=b.partes[0].r;
      if(_esAdmin){
        var ta=(ra.tecnicos&&ra.tecnicos[0])||'', tb=(rb.tecnicos&&rb.tecnicos[0])||'';
        var cmpTec=ta.localeCompare(tb);
        if(cmpTec!==0) return cmpTec;
      }
      return (ra.arr||'').localeCompare(rb.arr||'');
    });
  }
  var html='<div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin-bottom:8px;">'+ords.length+' resultado'+(ords.length===1?'':'s')+'</div>';
  html+=ords.map(function(g,gi){
    var f1=g.fechaMin.split('-').reverse().join('/');
    var f2=g.fechaMax.split('-').reverse().join('/');
    var fr=f1===f2?f1:f1+' → '+f2;
    var dot='<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:'+(g.estado==='en-ejecucion'?'var(--amber)':'var(--green)')+';margin-right:6px;flex-shrink:0;"></span>';
    var badge=g.estado==='en-ejecucion'?'<span class="badge badge-a">En ejecución</span>':'<span class="badge badge-g">Finalizado</span>';
    var enc=encodeURIComponent(g.pedido)+'||'+encodeURIComponent(g.centro);
    var subTitle=g.actObras?g.actObras+' · '+g.job:'Orden '+g.pedido+' · '+g.job;
    if(qf){
      // Fecha concreta filtrada: título y "Orden · Job ·" en su propia línea completa;
      // "N parte" con la fecha a la derecha en una fila; "(numParte)" con la hora a la
      // derecha en otra fila; badge y técnico en sus propias líneas completas debajo.
      // Las horas del parte: se toma la hora más baja y la más alta entre paréntesis
      // que aparecen en el propio detalle del parte (r.detalle) — cubre cualquier caso
      // (sin enlace, con enlace corto o largo) sin depender de linkType/tr/trS.
      var _rPrincipal=g.partes[0].r;
      var _numParteTxt=_rPrincipal.numParte?'('+_rPrincipal.numParte+')':'';
      var _horaTxt='';
      if(_rPrincipal.detalle){
        var _horasEnParte=(_rPrincipal.detalle.match(/\((\d{2}:\d{2})\)/g)||[]).map(function(s){ return s.slice(1,-1); });
        if(_horasEnParte.length){
          var _minMax=_horasEnParte.reduce(function(acc,h){
            var mh=tm(h);
            if(acc.min===null||mh<acc.min) acc.min=mh;
            if(acc.max===null||mh>acc.max) acc.max=mh;
            return acc;
          },{min:null,max:null});
          _horaTxt=fT(_minMax.min)+' - '+fT(_minMax.max);
        }
      }
      // Posición real de este parte dentro de TODOS los partes de la incidencia
      // (no solo los del día filtrado) — para mostrar "Parte 3" si es el 3º de 5, etc.
      // Se compara por fecha (getGrupKey ya garantiza mismo pedido+centro), no por
      // referencia de objeto, ya que getHVisible() vuelve a parsear el JSON cada vez
      // y genera objetos nuevos que nunca coincidirían con === aunque sean "el mismo" parte.
      var _todosDeLaOrden=getHVisible().filter(function(x){ return getGrupKey(x)===getGrupKey(_rPrincipal); }).sort(function(a,b){ return a.fecha.localeCompare(b.fecha); });
      var _posReal=_todosDeLaOrden.findIndex(function(x){ return x.fecha===_rPrincipal.fecha; });
      var _numParteEtiqueta='Parte '+(_posReal>=0?(_posReal+1):1);
      var _tecLinea=(_esAdmin&&_rPrincipal.tecnicos&&_rPrincipal.tecnicos[0])?'<div class="hi-sub" style="margin-top:4px;">'+escHtml(_rPrincipal.tecnicos[0])+'</div>':'';
      return '<div class="hist-item" data-enc="'+enc+'" data-idx="'+gi+'" style="display:block;">'+
        '<div class="hi-title">'+dot+escHtml(g.tienda)+'</div>'+
        '<div class="hi-sub">'+subTitle+' ·</div>'+
        '<div style="display:flex;justify-content:space-between;gap:8px;"><div class="hi-sub">'+_numParteEtiqueta+'</div><div class="hi-date">'+fr+'</div></div>'+
        (_numParteTxt||_horaTxt?'<div style="display:flex;justify-content:space-between;gap:8px;"><div class="hi-sub">'+_numParteTxt+'</div><div class="hi-date">'+_horaTxt+'</div></div>':'')+
        '<div style="margin-top:4px;">'+badge+'</div>'+
        _tecLinea+
        '</div>';
    }
    return '<div class="hist-item" data-enc="'+enc+'" data-idx="'+gi+'">'+
      '<div><div class="hi-title">'+dot+escHtml(g.tienda)+'</div>'+
      '<div class="hi-sub">'+subTitle+' · '+g.partes.length+' parte'+(g.partes.length===1?'':'s')+'</div>'+badge+'</div>'+
      '<div class="hi-date">'+fr+'</div></div>';
  }).join('');
  el.style.display='block';
  el.innerHTML=html;
  // Añadir eventos click después de insertar en DOM
  el.querySelectorAll('.hist-item[data-enc]').forEach(function(item){
    item.addEventListener('click', function(){
      verOrdenDesdeSearch(this.getAttribute('data-enc'));
    });
  });
  return;
}

function verOrdenDesdeSearch(enc){
  // Ocultar resultados y mostrar la orden
  var el=$('searchResults'); if(el) el.style.display='none';
  var pp=enc.split('||');
  verOrden(pp[0]+'||'+pp[1]);
  $('histOpts').style.display='none';
  $('ordenView').style.display='block';
}

function limpiarFiltros(){ $('busca').value=''; $('buscaF').value=''; refreshCounts(); renderSearchResults(); }

// Cliente sin asignación (conAsignacion:false en su ficha): cualquier técnico principal continúa sus órdenes.
function _clienteSinAsignacion(id){
  var c=getClientes().find(function(x){ return x.id===id; });
  return !!(c && c.conAsignacion===false);
}
function mostrarDialogoEstado(){
  if(!window.recTmp){ showMsg('msgRes','Genera el parte primero.','warn'); return; }
  // En un cliente sin asignación no se pregunta: la orden sigue abierta y solo el administrador la cierra o reabre.
  if(_clienteSinAsignacion(window.recTmp.clienteId||'mercadona')){
    guardarConEstado(_getEstadoIncidencia(window.recTmp.pedido, window.recTmp.centro) || 'en-ejecucion');
    return;
  }
  $('dlgEstadoSub').textContent='Orden '+window.recTmp.pedido+' — '+window.recTmp.tienda;
  var btnCert=$('btnCertificarDialogo');
  if(btnCert){
    var r=window.recTmp;
    var cid=r.clienteId||'mercadona';
    // Índice real de edición: _editIdx puede haberse perdido (ver _finalizarGuardado, mismo
    // caso), por eso se cae a window._editIdxBackup igual que hace el guardado real.
    var _idxEdicion=(_editIdx!==null&&_editIdx!==undefined)?_editIdx:window._editIdxBackup;
    // Contar sin certificar de la misma orden, excluyendo el propio idx si se está editando
    // (ese ya está en el historial con sus datos viejos) y sumando 1 por el parte actual
    // que se va a guardar ahora mismo.
    var sinCert=getH().filter(function(x,i){
      return i!==_idxEdicion && x.pedido===r.pedido && x.centro===r.centro && (x.clienteId||'mercadona')===cid && !x.bloqueCertificado;
    }).length+1;
    btnCert.style.display=(_esAdmin() && sinCert>=4)?'flex':'none';
  }
  $('dlgEstado').classList.add('show');
}
function _mostrarAvisoKmAdicObligatoria(){
  var dlg=$('dlgKmAdicObligatoria'); if(dlg) dlg.classList.add('show');
}
function _cerrarAvisoKmAdicObligatoria(){
  var dlg=$('dlgKmAdicObligatoria'); if(dlg) dlg.classList.remove('show');
  var el=$('kmAdicionalesJust'); if(el) el.focus();
}

// PDF del resumen de la orden: es la pantalla de la orden (lista de datos _ordenActual.resumen) sin los botones
function pdfOrden(){
  var o=window._ordenActual; if(!o) return;
  if(!window.jspdf){ _toast('PDF no disponible.', _AVISO_ROJO); return; }
  var m=o.resumen;
  var doc=pdfNuevo();
  var y=12;

  y=pdfHdr(doc,y,m.tienda+' · '+m.titulo);
  y+=2;
  // La letra del PDF no tiene la flecha que usa la pantalla entre las dos fechas
  y=pdfInfoRow(doc,y,'FECHAS',m.fechas.replace(' → ',' a '));
  y=pdfInfoRow(doc,y,'PARTES',m.nPartes+' parte'+(m.nPartes===1?'':'s'));
  y=pdfInfoRow(doc,y,'ESTADO',m.estado==='en-ejecucion'?'En ejecución':'Finalizado');
  y+=3;

  y=pdfGroupTitle(doc,y,'Partes de esta orden');
  m.partes.forEach(function(p){ y=pdfParteOrdenRow(doc,y,p); });
  y+=2;

  y=pdfGroupTitle(doc,y,'Códigos acumulados');
  if(m.codigos.length) m.codigos.forEach(function(c){ y=pdfCodeRow(doc,y,c.cod,c.lab,c.valor); });
  else y=pdfTextoVacio(doc,y,'Sin datos.');
  if(m.total) y=pdfTotalRowConPrecio(doc,y,m.total.horas,m.total.precio);
  y+=3;

  y=pdfGroupTitle(doc,y,'Materiales acumulados');
  if(m.materiales.length) m.materiales.forEach(function(x){ y=pdfFilaNombreCantidad(doc,y,x.nombre,x.cantidad); });
  else y=pdfTextoVacio(doc,y,'Sin materiales registrados.');

  pdfFooter(doc,y+4);
  pdfGuardar(doc,'IRV_resumen_'+(o.actObras||o.pedido)+'_'+o.centro);
}

function respCorregir(actualizar){
  $('dlgCorregir').classList.remove('show');
  var r=window.recTmp; if(!r) return;
  var h=getH();
  if(actualizar){
    // Actualizar tienda, dir, tel en todos los partes del mismo centro
    h.forEach(function(p){
      if(p.centro===r.centro&&p.clienteId===r.clienteId){
        p.tienda=r.tienda; p.dir=r.dir; p.tel=r.tel;
        // También actualizar en el detalle HTML
        if(p.detalle){
          p.detalle=p.detalle
            .replace(/(<span class="rc">Tienda<\/span><span class="rl">)[^<]*/g, '$1'+r.tienda)
            .replace(/(<span class="rc">Direcci[oó]n<\/span><span class="rl">)[^<]*/g, '$1'+r.dir)
            .replace(/(<span class="rc">Tel[eé]fono<\/span><span class="rl">)[^<]*/g, '$1'+r.tel);
        }
      }
    });
    setH(h);
  } else {
    // Revertir campos del parte nuevo a los valores del historial
    var anterior=null;
    for(var i=h.length-1;i>=0;i--){
      if(h[i].centro===r.centro&&h[i].clienteId===r.clienteId){ anterior=h[i]; break; }
    }
    if(anterior){
      r.tienda=anterior.tienda; r.dir=anterior.dir; r.tel=anterior.tel;
    }
  }
  _finalizarGuardado(window._corregirEstado);
}

// "+ Orden nueva" del diálogo "¿Cómo seguimos?". Las órdenes activas ya salen listadas debajo del botón.
function respInicioOrden(){
  $('dlgInicioOrden').classList.remove('show');
  goToRaw('w-form');
  nuevo();
  adaptarFormularioACliente();
  // No-Mercadona: pre-asignar IRV
  var esMerc=curCliente&&curCliente.tipo==='mercadona';
  if(!esMerc&&!_pedidoNoMerc){
    _pedidoNoMerc=nextIRV();
    $('pedidoGenDisplay').textContent=_pedidoNoMerc;
  }
}

function respReabrir(si){
  if(!si){
    // "Ver activas": en vez de duplicar aquí una lista propia, reutilizar la pantalla
    // "¿Cómo seguimos?" que ya existe y ya filtra correctamente por técnico (mismo camino
    // que sigue "No te corresponde" al tocar para continuar) — evita mantener dos veces la
    // misma lógica de qué es "una orden activa mía".
    $('dlgReabrir').classList.remove('show');
    nuevo();
    mostrarDlgInicioOrden();
    return;
  }
  // Si=true: reabrir directo (admin, o técnico que también tiene rol admin) o solicitar reabrir (técnico puro)
  var esTecnicoPuro=window._sesion && window._sesion.rol==='tecnico' && !window._sesion.multiRol;
  if(esTecnicoPuro){
    _confirmarSolicitudReabrir();
    return;
  }
  $('dlgReabrir').classList.remove('show');
  var h=getH();
  h.forEach(function(r){
    if(r.pedido===window._reabrirPedido&&r.centro===window._reabrirCentro) r.estado='en-ejecucion';
  });
  setH(h);
  for(var i=h.length-1;i>=0;i--){
    if(h[i].pedido===window._reabrirPedido&&h[i].centro===window._reabrirCentro){
      $('pedido').value=window._reabrirPedido; rellenarDatos(i, true); break;
    }
  }
}

function _confirmarSolicitudReabrir(){
  $('dlgReabrir').classList.remove('show');
  var pedido=window._reabrirPedido;
  var miNombre=window._sesion.nombre;
  var _tec=getTecnicos().find(function(t){ return t.nombre.toLowerCase()===miNombre.toLowerCase(); });
  if(_tec) miNombre=_tec.nombre;
  if(typeof _db === 'undefined' || !_db){
    _toast('Sin conexión — no se puede enviar la solicitud ahora mismo. Inténtalo cuando tengas internet.', 'var(--red)');
    return;
  }
  _db.collection('incidencias').where('pedido','==',pedido).get().then(function(snap){
    if(snap.empty){
      _toast('No se encontró esa incidencia en el servidor. Actualiza e inténtalo de nuevo.', 'var(--red)');
      return;
    }
    var doc=snap.docs[0];
    doc.ref.update(Object.assign({
      solicitudReabrir: { tecnico: miNombre, fecha: Date.now() },
      vistaAdmin: false
    }, _marcaModificacion('Técnico solicitó reabrir'))).then(function(){
      _toast('Solicitud enviada. Un administrador debe aprobarla antes de continuar con esta orden.');
      $('pedido').value='';
      goTo('w-clientes');
    }).catch(function(){
      _toast('No se pudo enviar la solicitud. Comprueba tu conexión e inténtalo de nuevo.', 'var(--red)');
    });
  }).catch(function(){
    _toast('No se pudo enviar la solicitud. Comprueba tu conexión e inténtalo de nuevo.', 'var(--red)');
  });
}

