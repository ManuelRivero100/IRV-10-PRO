// ===== CATÁLOGO NAVEGACIÓN POR PANTALLAS =====
var _catNav = {nivel:'grupos', grupoId:null, secIdx:-1, subIdx:-1};

function catNavRender(){
  var el=$('catNavContainer'); if(!el) return;
  var cat=getCat();
  var g=_catNav.grupoId?cat.grupos.find(function(x){return x.id===_catNav.grupoId;}):null;

  if(_catNav.nivel==='secciones' && g){
    catNavRenderSecciones(g);
  } else if(_catNav.nivel==='materiales' && g){
    catNavRenderMateriales(g);
  }
}

function catNavRenderSecciones(g){
  var html='<div class="navrow"><button class="back" onclick="catVolverFamilias()">&#8592; Atr&aacute;s</button><button class="back" onclick="goTo(\'w-clientes\')">&#8962; Inicio</button></div>';
  html+='<div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--green);margin-bottom:12px;">'+g.ico+' '+g.nombre+'</div>';

  // Materiales flotantes pendientes de clasificar en este grupo
  var pendientes=getMaterialesFlotantes().filter(function(f){return f.grupo===g.nombre;});
  if(pendientes.length){
    html+='<div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--amber);margin:4px 0 8px;">&#129513; Pendientes de clasificar</div>';
    pendientes.forEach(function(f){
      var secOpts='<option value="">Secci&oacute;n...</option>'+g.secciones.map(function(s,si){return '<option value="'+si+'">'+s.nombre+'</option>';}).join('');
      html+='<div style="background:var(--amber-light);border:1px solid var(--amber);border-radius:var(--r-sm);margin-bottom:8px;padding:12px 14px;">'
        +'<input id="matFlotNom_'+f.id+'" value="'+escHtml(f.nombre)+'" title="Puedes corregir el nombre antes de asignarlo" onchange="catEditarNombreMaterialFlotante(\''+f.id+'\',this)" style="width:100%;font-size:.9rem;font-weight:700;background:transparent;border:none;border-bottom:1px dashed var(--amber);border-radius:0;color:var(--text);font-family:inherit;padding:2px 0;margin-bottom:2px;">'
        +'<div style="font-size:.74rem;color:var(--text2);margin-bottom:8px;">A&ntilde;adido por '+(f.creadoPor||'')+' &middot; '+_fmtFechaHora(f.fecha)+'</div>'
        +'<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">'
        +'<select id="matFlotSec_'+f.id+'" onchange="_matFlotSecCambiada(\''+f.id+'\')" style="flex:1;min-width:120px;padding:6px 8px;border:1.5px solid var(--border);border-radius:var(--r-sm);background:var(--surface2);color:var(--text);font-family:inherit;font-size:.84rem;">'+secOpts+'</select>'
        +'<select id="matFlotSub_'+f.id+'" style="flex:1;min-width:120px;padding:6px 8px;border:1.5px solid var(--border);border-radius:var(--r-sm);background:var(--surface2);color:var(--text);font-family:inherit;font-size:.84rem;display:none;"><option value="">Subsecci&oacute;n...</option></select>'
        +'<button onclick="catAsignarMaterialFlotante(\''+f.id+'\')" style="padding:7px 14px;background:var(--green);color:#fff;border:none;border-radius:var(--r-sm);font-weight:700;font-size:.82rem;cursor:pointer;">Asignar</button>'
        +'<button onclick="catDescartarMaterialFlotante(\''+f.id+'\')" title="Descartar: no se a&ntilde;ade al cat&aacute;logo" style="padding:7px 12px;background:var(--red-light);color:var(--red);border:1px solid var(--red);border-radius:var(--r-sm);font-weight:700;font-size:.82rem;cursor:pointer;">&#10005; Descartar</button>'
        +'</div></div>';
    });
  }

  // Secciones
  g.secciones.forEach(function(sec,si){
    var total=(sec.mats||[]).length+(sec.subsecs||[]).reduce(function(a,ss){return a+(ss.mats||[]).length;},0);
    var isEmpty=total===0;
    html+='<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r-sm);margin-bottom:6px;display:flex;align-items:center;padding:14px 16px;gap:10px;">'
      +'<span style="flex:1;font-size:.92rem;font-weight:700;cursor:pointer;" data-si="'+si+'" onclick="catNavEntrarSec(parseInt(this.dataset.si))">'+sec.nombre+'</span>'
      +'<span style="font-size:.78rem;color:var(--text3);cursor:pointer;" data-si="'+si+'" onclick="catNavEntrarSec(parseInt(this.dataset.si))">'+total+' &#8250;</span>'
      +(isEmpty?'<button data-si="'+si+'" data-nom="'+sec.nombre.replace(/"/g,'&quot;')+'" onclick="catNavDelSec(parseInt(this.dataset.si),this.dataset.nom)" style="padding:4px 10px;background:var(--red-light);color:var(--red);border:1px solid rgba(224,85,85,.2);border-radius:var(--r-sm);cursor:pointer;font-size:.78rem;flex-shrink:0;">&#10005;</button>':'')
      +'</div>';
  });

  html+='<button class="btn-add-mat" style="width:100%;padding:10px;margin-top:6px;" onclick="catNuevaSec()">+ Nueva secci&#243;n</button>';
  $('catNavContainer').innerHTML=html;
}

function _matFlotSecCambiada(flotId){
  var selSec=$('matFlotSec_'+flotId); var selSub=$('matFlotSub_'+flotId);
  if(!selSec||!selSub) return;
  var g=getCat().grupos.find(function(x){return x.id===_catNav.grupoId;});
  if(!g){ selSub.style.display='none'; return; }
  var sec=g.secciones[selSec.value];
  if(!sec||!sec.subsecs||!sec.subsecs.length){ selSub.style.display='none'; selSub.innerHTML='<option value="">Subsecci&oacute;n...</option>'; return; }
  selSub.innerHTML='<option value="">(ninguna, va directo a la secci&oacute;n)</option>'+sec.subsecs.map(function(ss,ssi){return '<option value="'+ssi+'">'+ss.nombre+'</option>';}).join('');
  selSub.style.display='block';
}

function catAsignarMaterialFlotante(flotId){
  var selSec=$('matFlotSec_'+flotId); var selSub=$('matFlotSub_'+flotId);
  if(!selSec||selSec.value===''){ showMsg('msgCat','Elige una secci&oacute;n primero.','error'); return; }
  var flotante=getMaterialesFlotantes().find(function(f){return f.id===flotId;});
  if(!flotante){ showMsg('msgCat','Este material ya no est&aacute; pendiente.','error'); return; }
  // El nombre es el que haya escrito ahora en el campo, aunque todavía no se hubiera guardado la corrección
  var inputNombre=$('matFlotNom_'+flotId);
  var nombreFinal=inputNombre ? inputNombre.value.trim() : flotante.nombre;
  if(!nombreFinal){ showMsg('msgCat','El nombre no puede quedar vac&iacute;o.','error'); return; }
  var si=parseInt(selSec.value);
  var ssi=(selSub && selSub.value!=='' && selSub.style.display!=='none') ? parseInt(selSub.value) : -1;
  _modificarCatalogoEnFirestore(function(cat){
    var g=cat.grupos.find(function(x){return x.id===_catNav.grupoId;});if(!g)return;
    var sec=g.secciones[si];if(!sec)return;
    if(ssi===-1){ sec.mats=sec.mats||[];sec.mats.push({nom:nombreFinal}); }
    else { var ss=sec.subsecs[ssi];if(ss){ss.mats=ss.mats||[];ss.mats.push({nom:nombreFinal});} }
  }, function(exito){
    if(!exito){ showMsg('msgCat','No se pudo guardar. Comprueba tu conexi&oacute;n.','error'); return; }
    // Ya quedó asignado en el catálogo — ahora se retira de pendientes, tanto local como en
    // Firestore. Se hace después del éxito anterior, nunca antes, para no perder el pendiente
    // si la escritura al catálogo hubiera fallado.
    _db.collection('materialesFlotantes').doc(flotId).delete().then(function(){
      var lista=getMaterialesFlotantes().filter(function(f){return f.id!==flotId;});
      setMaterialesFlotantes(lista);
      catActualizarBadge();
      catNavRender();
      showMsg('msgCat','Material asignado correctamente.','success');
    }).catch(function(){
      // El catálogo ya se guardó bien; si esto falla, el flotante queda visible una vez
      // más, pero no se pierde ni queda duplicado — el próximo intento de asignar
      // simplemente lo añadiría de nuevo, así que avisamos para que no se repita sin querer
      showMsg('msgCat','Asignado, pero no se pudo limpiar el pendiente. Vuelve a intentarlo si sigue apareciendo.','error');
      catNavRender();
    });
  });
}

// Corrige el nombre de un material flotante pendiente (el campo del nombre es editable). Se guarda al salir del campo.
function catEditarNombreMaterialFlotante(flotId, input){
  var lista=getMaterialesFlotantes();
  var f=lista.find(function(x){return x.id===flotId;});
  if(!f) return;
  var nombre=input.value.trim();
  if(!nombre){ input.value=f.nombre; showMsg('msgCat','El nombre no puede quedar vac&iacute;o.','error'); return; }
  if(nombre===f.nombre) return;
  _db.collection('materialesFlotantes').doc(flotId).update({nombre:nombre}).then(function(){
    f.nombre=nombre;
    setMaterialesFlotantes(lista);
    showMsg('msgCat','Nombre actualizado.','success');
  }).catch(function(){
    input.value=f.nombre;
    showMsg('msgCat','No se pudo guardar el nombre. Comprueba tu conexi&oacute;n.','error');
  });
}

// Descarta un material flotante pendiente: se quita de la lista sin añadirlo al catálogo. No toca los partes
// donde un técnico ya lo usó. Si un técnico lo vuelve a añadir, aparece otra vez como pendiente.
function catDescartarMaterialFlotante(flotId){
  var flotante=getMaterialesFlotantes().find(function(f){return f.id===flotId;});
  if(!flotante){ showMsg('msgCat','Este material ya no est&aacute; pendiente.','error'); return; }
  _confirmarApp('¿Descartar "'+flotante.nombre+'"? Se quitará de pendientes y no se añadirá al catálogo.', function(){
    _db.collection('materialesFlotantes').doc(flotId).delete().then(function(){
      setMaterialesFlotantes(getMaterialesFlotantes().filter(function(f){return f.id!==flotId;}));
      catActualizarBadge();
      catNavRender();
      showMsg('msgCat','Material descartado.','success');
    }).catch(function(){ showMsg('msgCat','No se pudo descartar. Comprueba tu conexi&oacute;n.','error'); });
  });
}

function catNavDelSec(si,nombreEsperado){
  _modificarCatalogoEnFirestore(function(cat){
    var g=cat.grupos.find(function(x){return x.id===_catNav.grupoId;});if(!g)return;
    var sec=g.secciones[si];if(!sec)return;
    if(sec.nombre!==nombreEsperado) return false;
    var total=(sec.mats||[]).length+(sec.subsecs||[]).reduce(function(a,ss){return a+(ss.mats||[]).length;},0);
    if(total>0) return; // solo si está vacía
    g.secciones.splice(si,1);
  }, function(exito, motivo){
    if(!exito){ showMsg('msgCat', motivo==='conflicto'?'El catálogo cambió mientras editabas, recarga e inténtalo de nuevo.':'No se pudo guardar. Comprueba tu conexión.', 'error'); return; }
    catNavRender();
  });
}
function catNavEntrarSec(si){
  _catNav.secIdx=si;_catNav.subIdx=-1;_catNav.nivel='materiales';
  catNavRender();
}

function catNavRenderMateriales(g){
  var si=_catNav.secIdx;
  var sec=g.secciones[si]; if(!sec) return;
  var html='<div class="navrow"><button class="back" onclick="catNavVolverSecs()">&#8592; Atr&aacute;s</button><button class="back" onclick="goTo(\'w-clientes\')">&#8962; Inicio</button></div>';
  html+='<div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--green);margin-bottom:12px;">'+sec.nombre+'</div>';

  // Subsecciones
  (sec.subsecs||[]).forEach(function(ss,ssi){
    var ssOpen=_catNav.subIdx===ssi;
    html+='<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--r-sm);margin-bottom:6px;overflow:hidden;">'
      +'<div style="display:flex;align-items:center;padding:12px 14px;cursor:pointer;gap:8px;" data-ssi="'+ssi+'" onclick="catNavToggleSub(parseInt(this.dataset.ssi))">'
      +'<span style="flex:1;font-size:.88rem;font-weight:600;">'+ss.nombre+'</span>'
      +'<span style="font-size:.75rem;color:var(--text3);margin-right:4px;">'+(ss.mats||[]).length+'</span>'
      +'<span style="color:var(--text3);">'+(ssOpen?'&#9650;':'&#9660;')+'</span>'
      +'</div>';
    if(ssOpen){
      html+='<div style="border-top:1px solid var(--border);">';
      (ss.mats||[]).forEach(function(m,mi){
        html+=catNavMatRow(m,si,ssi,mi,36);
      });
      html+=catNavAddRow(si,ssi,ss.nombre);
      html+='</div>';
    }
    html+='</div>';
  });

  // Materiales directos
  if((sec.mats||[]).length||(sec.subsecs||[]).length===0){
    (sec.mats||[]).forEach(function(m,mi){
      html+=catNavMatRow(m,si,-1,mi,0);
    });
  }

  // Agregar material / subsección
  html+=catNavAddRow(si,-1,sec.nombre);
  if((sec.subsecs||[]).length>0 || (sec.mats||[]).length>0){
    html+='<button class="btn-add-mat" style="width:100%;padding:9px;margin-top:4px;" data-si="'+si+'" onclick="catNavNuevaSub(parseInt(this.dataset.si))">+ Nueva subsecci&#243;n</button>';
  }

  $('catNavContainer').innerHTML=html;
}

function catNavMatRow(m,si,ssi,mi,indent){
  var nomAttr=(m.nom||'').replace(/"/g,'&quot;');
  return '<div style="display:flex;align-items:center;padding:10px 14px 10px '+(14+indent)+'px;border-bottom:1px solid var(--border);gap:8px;">'
    +'<span style="flex:1;font-size:.87rem;">'+m.nom+'</span>'
    +'<button data-si="'+si+'" data-ssi="'+ssi+'" data-mi="'+mi+'" onclick="catEditMat(parseInt(this.dataset.si),parseInt(this.dataset.ssi),parseInt(this.dataset.mi))" style="padding:5px 10px;background:var(--surface2);color:var(--text2);border:1px solid var(--border);border-radius:var(--r-sm);cursor:pointer;font-size:.78rem;">&#9999;</button>'
    +'<button data-si="'+si+'" data-ssi="'+ssi+'" data-mi="'+mi+'" data-nom="'+nomAttr+'" onclick="catDelMat(parseInt(this.dataset.si),parseInt(this.dataset.ssi),parseInt(this.dataset.mi),this.dataset.nom)" style="padding:5px 10px;background:var(--red-light);color:var(--red);border:1px solid rgba(224,85,85,.2);border-radius:var(--r-sm);cursor:pointer;font-size:.78rem;">&#10005;</button>'
    +'</div>';
}

function catNavAddRow(si,ssi,nomEsperado){
  var keyS='add_'+si+'_'+(ssi===-1?'root':ssi);
  var nomAttr=(nomEsperado||'').replace(/"/g,'&quot;');
  return '<div style="padding:8px 14px;border-top:1px dashed var(--border);">'
    +'<div style="display:flex;gap:6px;">'
    +'<input id="catAddInp_'+keyS+'" data-key="'+keyS+'" data-si="'+si+'" data-ssi="'+ssi+'" data-nom="'+nomAttr+'" style="flex:1;padding:7px 10px;border:1.5px solid var(--border);border-radius:var(--r-sm);font-size:.86rem;font-family:inherit;background:var(--surface2);color:var(--text);outline:none;" placeholder="+ A&#241;adir material..." autocomplete="off" onkeydown="catNavKeydown(event,this)" oninput="catNavAc(this.value,this.dataset.key)">'
    +'<button style="padding:7px 13px;background:var(--green);color:#fff;border:none;border-radius:var(--r-sm);font-weight:700;cursor:pointer;" data-key="'+keyS+'" data-si="'+si+'" data-ssi="'+ssi+'" data-nom="'+nomAttr+'" onclick="catNavAddMat(this.dataset.key,parseInt(this.dataset.si),parseInt(this.dataset.ssi),this.dataset.nom)">+</button>'
    +'</div>'
    +'<div id="catNavAcBox_'+keyS+'" style="display:none;background:var(--surface);border:1.5px solid var(--green);border-radius:var(--r-sm);max-height:150px;overflow-y:auto;"></div>'
    +'</div>';
}
function catNavKeydown(e,inp){
  if(e.key==='Enter') catNavAddMat(inp.dataset.key,parseInt(inp.dataset.si),parseInt(inp.dataset.ssi),inp.dataset.nom);
}

function catNavAc(val,key){
  var box=$('catNavAcBox_'+key);if(!box)return;
  if(!val||val.length<2){box.style.display='none';box.innerHTML='';return;}
  var todos=catAllMatsGrupo(_catNav.grupoId);
  var res=todos.filter(function(n){return n.toLowerCase().includes(val.toLowerCase());}).slice(0,5);
  if(!res.length){box.style.display='none';box.innerHTML='';return;}
  box.innerHTML=res.map(function(n){
    return '<div data-nom="'+n.replace(/"/g,'&quot;')+'" data-key="'+key+'" onmousedown="catNavAcSel(this.dataset.nom,this.dataset.key)" style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border);font-size:.85rem;">'+n+'</div>';
  }).join('');
  box.style.display='block';
}
function catNavAcSel(nom,key){
  var inp=$('catAddInp_'+key);if(inp)inp.value=nom;
  var box=$('catNavAcBox_'+key);if(box)box.style.display='none';
}

function catNavAddMat(key,si,ssi,nombreEsperado){
  var inp=$('catAddInp_'+key);
  var nom=inp?inp.value.trim():'';if(!nom)return;
  var todos=catAllMatsGrupo(_catNav.grupoId);
  if(todos.find(function(n){return n.toLowerCase()===nom.toLowerCase();})){
    inp.style.borderColor='var(--red)';
    setTimeout(function(){if(inp)inp.style.borderColor='';},1500);
    return;
  }
  _modificarCatalogoEnFirestore(function(cat){
    var g=cat.grupos.find(function(x){return x.id===_catNav.grupoId;});if(!g)return;
    var sec=g.secciones[si];if(!sec)return;
    if(ssi===-1){
      if(sec.nombre!==nombreEsperado) return false;
      sec.mats=sec.mats||[];sec.mats.push({nom:nom});
    } else {
      var ss=sec.subsecs[ssi];if(!ss)return;
      if(ss.nombre!==nombreEsperado) return false;
      ss.mats=ss.mats||[];ss.mats.push({nom:nom});
    }
  }, function(exito, motivo){
    if(!exito){ showMsg('msgCat', motivo==='conflicto'?'El catálogo cambió mientras editabas, recarga e inténtalo de nuevo.':'No se pudo guardar. Comprueba tu conexión.', 'error'); return; }
    if(inp)inp.value='';
    catNavRender();
  });
}

function catNavToggleSub(ssi){
  _catNav.subIdx=_catNav.subIdx===ssi?-1:ssi;
  catNavRender();
}

function catNavNuevaSub(si){
  dlgNombre('Nueva subsecci&#243;n','',function(nom){
    _modificarCatalogoEnFirestore(function(cat){
      var g=cat.grupos.find(function(x){return x.id===_catNav.grupoId;});if(!g)return;
      var sec=g.secciones[si];if(!sec)return;
      sec.subsecs=sec.subsecs||[];
      sec.subsecs.push({id:'ss_'+Date.now(),nombre:nom,mats:[]});
    }, function(exito){
      if(!exito){ showMsg('msgCat','No se pudo guardar. Comprueba tu conexión.','error'); return; }
      catNavRender();
    });
  });
}

function catNavVolverSecs(){
  _catNav.nivel='secciones';_catNav.secIdx=-1;_catNav.subIdx=-1;
  catNavRender();
}

// Override renderCatGrupoBody to use new nav system
function renderCatGrupoBody(){
  var cat=getCat();
  var g=cat.grupos.find(function(x){return x.id===_catState.grupoAb;});
  if(!g) return;
  _catNav.grupoId=_catState.grupoAb;
  catNavRender();
}

// old renderCatGrupoBody replaced above (función completa eliminada — código muerto, nunca se llamaba)

// catEditMat: ver definición real más abajo (redirige a catEditMat2, diálogo moderno)

// ===== DIÁLOGO NOMBRE (reemplaza prompt) =====
var _dlgNomCb = null;
function dlgNombre(titulo, valorInicial, callback){
  _dlgNomCb = callback;
  $('dlgNombreTitulo').textContent = titulo;
  $('dlgNombreInp').value = valorInicial || '';
  $('dlgNombre').classList.add('show');
  setTimeout(function(){ $('dlgNombreInp').focus(); $('dlgNombreInp').select(); }, 100);
}
function dlgNombreOk(){
  var val = $('dlgNombreInp').value.trim();
  $('dlgNombre').classList.remove('show');
  if(val && _dlgNomCb) _dlgNomCb(val);
  _dlgNomCb = null;
}
function dlgNombreCancelar(){
  $('dlgNombre').classList.remove('show');
  _dlgNomCb = null;
}

// ===== DIÁLOGO EDITAR MATERIAL =====
var _dlgEditMat = {si:-1, ssi:-1, mi:-1};
function catEditMat2(si, ssi, mi){
  var cat=getCat();
  var g=cat.grupos.find(function(x){return x.id===_catState.grupoAb;});if(!g)return;
  var sec=g.secciones[si];if(!sec)return;
  var mats=ssi===-1?(sec.mats||[]):(sec.subsecs[ssi]?sec.subsecs[ssi].mats||[]:[]);
  var m=mats[mi];if(!m)return;
  _dlgEditMat={si:si,ssi:ssi,mi:mi,nombreEsperado:m.nom};
  $('dlgEditMatNom').value=m.nom;
  $('dlgEditMatAcBox').innerHTML='';
  $('dlgEditMatAcBox').classList.remove('show');
  // Build sections list
  var html='';
  g.secciones.forEach(function(s,idx){
    var isCurrentSec=(ssi===-1&&idx===si);
    html+='<div data-si="'+idx+'" data-ssi="-1" onclick="dlgEditMatSelSec(this)" style="padding:9px 14px;cursor:pointer;border-bottom:1px solid var(--border);font-size:.88rem;'+(isCurrentSec?'background:var(--green-light);color:var(--green);font-weight:600;':'')+'">'
      +(isCurrentSec?'✓ ':'')+s.nombre+'</div>';
    (s.subsecs||[]).forEach(function(ss,ssidx){
      var isCurrSub=(ssi===ssidx&&idx===si);
      html+='<div data-si="'+idx+'" data-ssi="'+ssidx+'" onclick="dlgEditMatSelSec(this)" style="padding:8px 14px 8px 28px;cursor:pointer;border-bottom:1px solid var(--border);font-size:.84rem;color:var(--text2);'+(isCurrSub?'background:var(--green-light);color:var(--green);font-weight:600;':'')+'">'
        +(isCurrSub?'✓ ':'↳ ')+ss.nombre+'</div>';
    });
  });
  $('dlgEditMatSecs').innerHTML=html;
  $('dlgEditMat').classList.add('show');
  setTimeout(function(){ $('dlgEditMatNom').focus(); },100);
}
function dlgEditMatSelSec(el){
  // Highlight selected
  document.querySelectorAll('#dlgEditMatSecs > div').forEach(function(d){ d.style.background=''; d.style.color=''; d.style.fontWeight=''; d.innerHTML=d.innerHTML.replace('✓ ',''); });
  el.style.background='var(--green-light)';
  el.style.color='var(--green)';
  el.style.fontWeight='600';
  if(!el.innerHTML.startsWith('✓')) el.innerHTML='✓ '+el.innerHTML;
  _dlgEditMat.destSi=parseInt(el.dataset.si);
  _dlgEditMat.destSsi=parseInt(el.dataset.ssi);
}
function dlgEditMatAc(val){
  var box=$('dlgEditMatAcBox');
  if(!val||val.length<2){box.classList.remove('show');box.innerHTML='';return;}
  var todos=catAllMatsGrupo(_catState.grupoAb);
  var res=todos.filter(function(n){return n.toLowerCase().includes(val.toLowerCase());}).slice(0,5);
  if(!res.length){box.classList.remove('show');box.innerHTML='';return;}
  box.innerHTML=res.map(function(n){return '<div class="ac-item" data-nom="'+n.replace(/"/g,'&quot;')+'" onmousedown="$(\'dlgEditMatNom\').value=this.dataset.nom;$(\'dlgEditMatAcBox\').classList.remove(\'show\');">'+n+'</div>';}).join('');
  box.classList.add('show');
}
function dlgEditMatGuardar(){
  var nuevoNom=$('dlgEditMatNom').value.trim();
  if(!nuevoNom)return;
  // Check duplicate (comprobación previa contra la copia local, solo como aviso rápido)
  var todos=catAllMatsGrupo(_catState.grupoAb);
  var viejoNomPrevio=null;
  var siPrev=_dlgEditMat.si,ssiPrev=_dlgEditMat.ssi,miPrev=_dlgEditMat.mi;
  var gPrev=getCat().grupos.find(function(x){return x.id===_catState.grupoAb;});
  if(gPrev){ var secPrev=gPrev.secciones[siPrev]; if(secPrev){ var matsPrev=ssiPrev===-1?(secPrev.mats||[]):(secPrev.subsecs[ssiPrev]?secPrev.subsecs[ssiPrev].mats||[]:[]); if(matsPrev[miPrev]) viejoNomPrevio=matsPrev[miPrev].nom; } }
  if(viejoNomPrevio&&nuevoNom!==viejoNomPrevio&&todos.find(function(n){return n.toLowerCase()===nuevoNom.toLowerCase();})){
    _toast('"'+nuevoNom+'" ya existe.', _AVISO_ROJO);return;
  }
  var viejoNomFinal='';
  _modificarCatalogoEnFirestore(function(cat){
    var g=cat.grupos.find(function(x){return x.id===_catState.grupoAb;});if(!g)return;
    var si=_dlgEditMat.si,ssi=_dlgEditMat.ssi,mi=_dlgEditMat.mi;
    var sec=g.secciones[si];if(!sec)return;
    var mats=ssi===-1?(sec.mats||[]):(sec.subsecs[ssi]?sec.subsecs[ssi].mats||[]:[]);
    var m=mats[mi];if(!m)return;
    if(m.nom!==_dlgEditMat.nombreEsperado) return false;
    var viejoNom=m.nom;
    viejoNomFinal=viejoNom;
    // Rename
    m.nom=nuevoNom;
    // Move to different section if selected
    var destSi=_dlgEditMat.destSi;
    var destSsi=_dlgEditMat.destSsi;
    if(destSi!==undefined&&(destSi!==si||destSsi!==ssi)){
      // Remove from current
      mats.splice(mi,1);
      // Add to dest
      var destSec=g.secciones[destSi];
      if(destSec){
        var destMats=destSsi===-1?(destSec.mats||(destSec.mats=[])):(destSec.subsecs[destSsi]?(destSec.subsecs[destSsi].mats||(destSec.subsecs[destSsi].mats=[])):null);
        if(destMats&&!destMats.find(function(x){return x.nom===nuevoNom;})) destMats.push({nom:nuevoNom});
      }
    }
  }, function(exito, motivo){
    if(!exito){ showMsg('msgCat', motivo==='conflicto'?'El catálogo cambió mientras editabas, recarga e inténtalo de nuevo.':'No se pudo guardar. Comprueba tu conexión.', 'error'); return; }
    // Update _MS.sel if was selected
    if(viejoNomFinal&&_MS.sel[viejoNomFinal]!==undefined){_MS.sel[nuevoNom]=_MS.sel[viejoNomFinal];delete _MS.sel[viejoNomFinal];}
    $('dlgEditMat').classList.remove('show');
    renderCatGrupoBody();
  });
}
function dlgEditMatBorrar(){
  _modificarCatalogoEnFirestore(function(cat){
    var g=cat.grupos.find(function(x){return x.id===_catState.grupoAb;});if(!g)return;
    var si=_dlgEditMat.si,ssi=_dlgEditMat.ssi,mi=_dlgEditMat.mi;
    var sec=g.secciones[si];if(!sec)return;
    var mats=ssi===-1?(sec.mats||[]):(sec.subsecs[ssi]?sec.subsecs[ssi].mats||[]:[]);
    if(!mats[mi])return;
    if(mats[mi].nom!==_dlgEditMat.nombreEsperado) return false;
    mats.splice(mi,1);
  }, function(exito, motivo){
    if(!exito){ showMsg('msgCat', motivo==='conflicto'?'El catálogo cambió mientras editabas, recarga e inténtalo de nuevo.':'No se pudo guardar. Comprueba tu conexión.', 'error'); return; }
    $('dlgEditMat').classList.remove('show');
    renderCatGrupoBody();
  });
}

function catEditMat(si,ssi,mi){ catEditMat2(si,ssi,mi); }
function catDelMat(si,ssi,mi,nombreEsperado){
  _modificarCatalogoEnFirestore(function(cat){
    var g=cat.grupos.find(function(x){return x.id===_catState.grupoAb;});if(!g)return;
    var sec=g.secciones[si];if(!sec)return;
    var mats=ssi===-1?sec.mats:(sec.subsecs[ssi]?sec.subsecs[ssi].mats:null);
    if(!mats||!mats[mi])return;
    if(mats[mi].nom!==nombreEsperado) return false;
    mats.splice(mi,1);
  }, function(exito, motivo){
    if(!exito){ showMsg('msgCat', motivo==='conflicto'?'El catálogo cambió mientras editabas, recarga e inténtalo de nuevo.':'No se pudo guardar. Comprueba tu conexión.', 'error'); return; }
    renderCatGrupoBody();
  });
}
function catNuevaSec(){
  dlgNombre('Nueva sección','',function(nom){
    var gid=_catNav.grupoId||_catState.grupoAb;
    _modificarCatalogoEnFirestore(function(cat){
      var g=cat.grupos.find(function(x){return x.id===gid;});if(!g)return;
      g.secciones.push({id:'s_'+Date.now(),nombre:nom,subsecs:[],mats:[]});
    }, function(exito){
      if(!exito){ showMsg('msgCat','No se pudo guardar. Comprueba tu conexión.','error'); return; }
      catNavRender();
    });
  });
}
function catNuevoGrupo(){
  dlgNombre('Nombre del nuevo grupo','',function(nom){
    var icos={'climatización':'❄️','conductos':'💨','electricidad':'⚡','obras':'🏗️','fontanería':'🔧','pintura':'🎨'};
    var ico=icos[nom.toLowerCase()]||'🔧';
    _modificarCatalogoEnFirestore(function(cat){
      cat.grupos.push({id:'g_'+Date.now(),nombre:nom,ico:ico,secciones:[]});
    }, function(exito){
      if(!exito){ showMsg('msgCat','No se pudo guardar. Comprueba tu conexión.','error'); return; }
      renderCatGrupos();
    });
  });
}
function catVolverFamilias(){
  $('catFamiliaView').style.display='none';$('catTabMat').style.display='block';
  _catState={grupoAb:null,secAb:null,subAb:null,addCtx:null,addMode:null};
  _catNav={nivel:'grupos',grupoId:null,secIdx:-1,subIdx:-1};
  renderCatGrupos();
}
function agendaPendientesCount(){
  var a=getAgenda();
  return Object.keys(a).filter(function(k){return a[k].estado==='pendiente';}).length;
}
function catActualizarBadge(){
  // Actualiza badge en icono catálogo del inicio
  var esAdmin = window._sesion && window._sesion.rol === 'admin';
  var pendMatFlotante = esAdmin ? getMaterialesFlotantes().length : 0;
  var n=agendaPendientesCount() + pendMatFlotante;
  document.querySelectorAll('[data-cat-badge]').forEach(function(b){
    b.textContent=n;b.style.display=n>0?'block':'none';
  });
  var ab=$('catAgendaBadge');
  if(ab){ var np=agendaPendientesCount(); ab.textContent=np; ab.style.display=np>0?'inline-block':'none'; }
  var amb=$('catMatFlotanteBadge');
  if(amb){ amb.textContent=pendMatFlotante; amb.style.display=pendMatFlotante>0?'inline-block':'none'; }
}
function _agDomId(key){ return key.replace(/[^a-zA-Z0-9]/g,'_'); }

var _agClienteAbierto=null;
var _agSitioAbierto=null;
var _agNuevoClienteId=null;

function catToggleAgCliente(clienteId){
  _agClienteAbierto=_agClienteAbierto===clienteId?null:clienteId;
  _agSitioAbierto=null; _agNuevoClienteId=null; // al cambiar de cliente, cerrar lo demas
  renderCatAgenda();
}
function catToggleAgSitio(key){
  _agSitioAbierto=_agSitioAbierto===key?null:key;
  renderCatAgenda();
}
function catToggleNuevoSitioAgenda(clienteId){
  _agNuevoClienteId=_agNuevoClienteId===clienteId?null:clienteId;
  _agSitioAbierto=null;
  renderCatAgenda();
}

function _agRow(p, esPendiente){
  var id=_agDomId(p._key);
  var isAb=_agSitioAbierto===p._key;
  var accion=esPendiente
    ? '<button class="btn btn-p btn-sm" data-key="'+p._key+'" onclick="catAceptarAgenda(this.dataset.key)">&#10003; Aceptar</button>'
    : '<button class="btn btn-p btn-sm" data-key="'+p._key+'" onclick="catGuardarAgenda(this.dataset.key)">&#128190; Guardar cambios</button>';
  var html='<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r-sm);margin-bottom:6px;overflow:hidden;">'
    +'<div style="display:flex;align-items:center;padding:9px 12px;cursor:pointer;gap:8px;" data-key="'+p._key+'" onclick="catToggleAgSitio(this.dataset.key)">'
    +'<span style="flex:1;font-size:.85rem;font-weight:600;">'+p.centro+' &mdash; '+(p.tienda||'(sin nombre)')+'</span>'
    +(esPendiente?'<span style="background:var(--amber);color:#fff;font-size:.6rem;font-weight:700;padding:1px 6px;border-radius:20px;">pendiente</span>':'')
    +'<span style="color:var(--text3);font-size:.75rem;">'+(isAb?'&#9650;':'&#9660;')+'</span></div>';
  if(isAb){
    html+='<div style="border-top:1px solid var(--border);padding:10px;">'
      +(p.creadoPor?'<div style="font-size:.7rem;color:var(--text3);margin-bottom:8px;">Creado por '+p.creadoPor+'</div>':'')
      +'<div class="field"><label>Nombre / Tienda</label><input id="agNom_'+id+'" value="'+(p.tienda||'').replace(/"/g,'&quot;')+'"></div>'
      +'<div class="field"><label>Direcci&oacute;n</label><input id="agDir_'+id+'" value="'+(p.dir||'').replace(/"/g,'&quot;')+'"></div>'
      +'<div class="field"><label>Tel&eacute;fono</label><input id="agTel_'+id+'" value="'+(p.tel||'').replace(/"/g,'&quot;')+'"></div>'
      +'<div style="display:flex;gap:8px;">'
      +'<div class="field" style="flex:1;"><label>Km</label><input id="agKm_'+id+'" type="number" value="'+String(p.km||'').replace(/"/g,'&quot;')+'"></div>'
      +'<div class="field" style="flex:1;"><label>Despl. (min)</label><input id="agTr_'+id+'" type="number" value="'+String(p.tr||'').replace(/"/g,'&quot;')+'"></div>'
      +'</div>'
      +'<div class="brow">'+accion+'</div>'
      +'</div>';
  }
  html+='</div>';
  return html;
}

function _agFormNuevo(clienteId, esMerc){
  var id=_agDomId(clienteId);
  return '<div style="background:var(--surface);border:1.5px dashed var(--green);border-radius:var(--r-sm);padding:10px;margin-bottom:8px;">'
    +(esMerc?'<div class="field"><label>N&ordm; centro</label><input id="agNuevoCentro_'+id+'" inputmode="numeric" placeholder="Ej: 4540"></div>':'<div style="font-size:.72rem;color:var(--text3);margin-bottom:8px;">El c&oacute;digo se asigna autom&aacute;ticamente al guardar.</div>')
    +'<div class="field"><label>Nombre / Tienda</label><input id="agNuevoNom_'+id+'"></div>'
    +'<div class="field"><label>Direcci&oacute;n</label><input id="agNuevoDir_'+id+'"></div>'
    +'<div class="field"><label>Tel&eacute;fono</label><input id="agNuevoTel_'+id+'"></div>'
    +'<div style="display:flex;gap:8px;">'
    +'<div class="field" style="flex:1;"><label>Km</label><input id="agNuevoKm_'+id+'" type="number"></div>'
    +'<div class="field" style="flex:1;"><label>Despl. (min)</label><input id="agNuevoTr_'+id+'" type="number"></div>'
    +'</div>'
    +'<div class="brow">'
    +'<button class="btn btn-p btn-sm" data-cid="'+clienteId+'" onclick="catGuardarNuevoSitioAgenda(this.dataset.cid)">&#128190; Guardar centro</button>'
    +'<button class="btn btn-s btn-sm" data-cid="'+clienteId+'" onclick="catToggleNuevoSitioAgenda(this.dataset.cid)">Cancelar</button>'
    +'</div></div>';
}

function renderCatAgenda(){
  var el=$('catAgendaList'); if(!el) return;
  var a=getAgenda();
  var clientes=getClientes();
  var todas=Object.keys(a).map(function(k){ return Object.assign({_key:k},a[k]); });
  todas.sort(function(x,y){ return (y.fechaCreacion||0)-(x.fechaCreacion||0); });
  var porCliente={};
  todas.forEach(function(p){
    var cid=p.clienteId||'mercadona';
    if(!porCliente[cid]) porCliente[cid]=[];
    porCliente[cid].push(p);
  });
  // Asegurar que todos los clientes existentes aparecen, aunque no tengan sitios todavía
  clientes.forEach(function(c){ if(!porCliente[c.id]) porCliente[c.id]=[]; });
  var html='';
  Object.keys(porCliente).forEach(function(cid){
    var sitios=porCliente[cid];
    var cli=clientes.find(function(c){return c.id===cid;});
    var nombreCli=cli?cli.nombre:cid;
    var esMerc=cli&&cli.tipo==='mercadona';
    var pendCount=sitios.filter(function(p){return p.estado==='pendiente';}).length;
    var isAb=_agClienteAbierto===cid;
    html+='<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--r-sm);margin-bottom:8px;overflow:hidden;">'
      +'<div style="display:flex;align-items:center;padding:11px 13px;cursor:pointer;gap:8px;" data-cid="'+cid+'" onclick="catToggleAgCliente(this.dataset.cid)">'
      +'<span style="flex:1;font-size:.9rem;font-weight:700;">'+nombreCli+'</span>'
      +(pendCount?'<span style="background:var(--amber);color:#fff;font-size:.66rem;font-weight:700;padding:1px 6px;border-radius:20px;">'+pendCount+'</span>':'')
      +'<span style="font-size:.72rem;color:var(--text3);">'+sitios.length+'</span>'
      +'<span style="color:var(--text3);font-size:.8rem;">'+(isAb?'▲':'▼')+'</span></div>';
    if(isAb){
      var pendientes=sitios.filter(function(p){return p.estado==='pendiente';});
      var aceptadas=sitios.filter(function(p){return p.estado!=='pendiente';});
      html+='<div style="border-top:1px solid var(--border);padding:10px;">';
      if(_agNuevoClienteId===cid){
        html+=_agFormNuevo(cid, esMerc);
      } else {
        html+='<div class="brow" style="margin-bottom:10px;"><button class="btn btn-s btn-sm" data-cid="'+cid+'" onclick="catToggleNuevoSitioAgenda(this.dataset.cid)">&#43; Agregar centro</button></div>';
      }
      if(pendientes.length){
        html+='<div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--amber);margin-bottom:7px;">Pendientes de revisar</div>';
        html+=pendientes.map(function(p){ return _agRow(p,true); }).join('');
      }
      html+='<div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin:10px 0 7px;">Todos los sitios ('+aceptadas.length+')</div>';
      html+= aceptadas.length
        ? aceptadas.map(function(p){ return _agRow(p,false); }).join('')
        : '<div style="font-size:.82rem;color:var(--text3);padding:6px 0;">Sin sitios aceptados todav&iacute;a.</div>';
      html+='</div>';
    }
    html+='</div>';
  });
  el.innerHTML=html || '<div style="font-size:.82rem;color:var(--text3);padding:10px 0;">Sin clientes.</div>';
}

function catAceptarAgenda(key){
  var a=getAgenda();
  var p=a[key]; if(!p) return;
  var id=_agDomId(key);
  var docId=key.replace(/[\/\s]/g,'-');
  _db.collection('agenda').doc(docId).get().then(function(snap){
    var fresco=snap.exists?snap.data():p;
    var data=Object.assign({},fresco,{
      tienda:($('agNom_'+id)||{}).value ? $('agNom_'+id).value.trim() : fresco.tienda,
      dir:($('agDir_'+id)||{}).value ? $('agDir_'+id).value.trim() : fresco.dir,
      tel:($('agTel_'+id)||{}).value ? $('agTel_'+id).value.trim() : fresco.tel,
      km:($('agKm_'+id)||{}).value || fresco.km,
      tr:($('agTr_'+id)||{}).value || fresco.tr,
      estado:'aceptada'
    });
    return _db.collection('agenda').doc(docId).set(data).then(function(){
      a[key]=data; setAgenda(a);
      catActualizarBadge();
      renderCatAgenda();
    });
  }).catch(function(){ _toast('Error al guardar. Comprueba tu conexión e inténtalo de nuevo.', 'var(--red)'); });
}
function catGuardarAgenda(key){
  var a=getAgenda();
  var p=a[key]; if(!p) return;
  var id=_agDomId(key);
  var docId=key.replace(/[\/\s]/g,'-');
  _db.collection('agenda').doc(docId).get().then(function(snap){
    var fresco=snap.exists?snap.data():p;
    var data=Object.assign({},fresco,{
      tienda:$('agNom_'+id)?$('agNom_'+id).value.trim():fresco.tienda,
      dir:$('agDir_'+id)?$('agDir_'+id).value.trim():fresco.dir,
      tel:$('agTel_'+id)?$('agTel_'+id).value.trim():fresco.tel,
      km:$('agKm_'+id)?$('agKm_'+id).value.trim():fresco.km,
      tr:$('agTr_'+id)?$('agTr_'+id).value.trim():fresco.tr
    });
    return _db.collection('agenda').doc(docId).set(data).then(function(){
      a[key]=data; setAgenda(a);
      renderCatAgenda();
    });
  }).catch(function(){ _toast('Error al guardar. Comprueba tu conexión e inténtalo de nuevo.', 'var(--red)'); });
}
function catGuardarNuevoSitioAgenda(clienteId){
  var cli=getClientes().find(function(c){return c.id===clienteId;});
  var esMerc=cli&&cli.tipo==='mercadona';
  var id=_agDomId(clienteId);
  var nomEl=$('agNuevoNom_'+id);
  var nombre=nomEl?nomEl.value.trim():'';
  if(!nombre){ _toast('Introduce el nombre del centro.', _AVISO_ROJO); return; }
  var centro;
  if(esMerc){
    var centroEl=$('agNuevoCentro_'+id);
    centro=centroEl?centroEl.value.trim():'';
    if(!centro){ _toast('Introduce el número de centro.', _AVISO_ROJO); return; }
  } else {
    centro=getNextCodLugar();
  }
  var key=agendaKey(clienteId,centro);
  if(getAgenda()[key]){ _toast('Ese centro ya existe en la agenda — edítalo desde su ficha en vez de crear uno nuevo.', _AVISO_ROJO); return; }
  var data={
    clienteId:clienteId, centro:centro, tienda:nombre,
    dir:($('agNuevoDir_'+id)||{}).value ? $('agNuevoDir_'+id).value.trim() : '',
    tel:($('agNuevoTel_'+id)||{}).value ? $('agNuevoTel_'+id).value.trim() : '',
    km:($('agNuevoKm_'+id)||{}).value ? $('agNuevoKm_'+id).value.trim() : '',
    tr:($('agNuevoTr_'+id)||{}).value ? $('agNuevoTr_'+id).value.trim() : '',
    creadoPor:(window._sesion&&window._sesion.nombre)||'', fechaCreacion:Date.now(),
    estado:'aceptada', vistaAdmin:false
  };
  var docId=key.replace(/[\/\s]/g,'-');
  _db.collection('agenda').doc(docId).set(data).then(function(){
    var a=getAgenda(); a[key]=data; setAgenda(a);
    _agNuevoClienteId=null;
    catActualizarBadge();
    renderCatAgenda();
  }).catch(_fallo('catGuardarNuevoSitioAgenda agenda.set'));
}
function renderCatConceptos(){
  var cat=getCat();var porTipo={};
  cat.conceptos.forEach(function(c){if(!porTipo[c.tipo])porTipo[c.tipo]=[];porTipo[c.tipo].push(c);});
  var icosTipo={'Climatización':'❄️','Conductos':'💨','Obras':'🏗️','Electricidad':'⚡'};
  $('catConceptosList').innerHTML=Object.keys(porTipo).map(function(tipo){
    var items=porTipo[tipo];
    return '<div class="card" style="margin-bottom:10px;"><div class="card-title">'+(icosTipo[tipo]||'🔧')+' '+tipo+'</div>'
      +items.map(function(c){
        var gi=cat.conceptos.indexOf(c);
        return '<div class="cat-concepto-item"><span class="cat-concepto-cod">'+c.cod+'</span><span class="cat-concepto-name">'+c.lab+'</span>'
          +'<input class="cat-concepto-precio" type="number" min="0" step="0.01" placeholder="€" value="'+(c.precio||'')+'" oninput="window._catConc=window._catConc||{};window._catConc['+gi+']=this.value" title="Precio por unidad"></div>';
      }).join('')+'</div>';
  }).join('');
}
function catGuardarConceptos(){
  var cambios = window._catConc;
  _modificarCatalogoEnFirestore(function(cat){
    if(cambios){ Object.keys(cambios).forEach(function(i){ cat.conceptos[parseInt(i)].precio=cambios[i]; }); }
  }, function(exito){
    if(!exito){ showMsg('msgCat','No se pudo guardar. Comprueba tu conexión.','error'); return; }
    window._catConc={};
    showMsg('msgCat','Precios guardados.','success');
  });
}

