// =====================================================
// MÓDULO MATERIALES POR SECCIONES (ms*)
// =====================================================
var _MS={secAbierta:null,subAbierta:null,editSecAbierta:null,nuevaSecVis:false,sel:{},extras:{},modo:'parte',catJob:null};
function msRender(cid){
  var el=$(cid); if(!el) return;
  if(_MS.modo==='parte'){
    var g=catGetGrupoParaJob(_MS.catJob||curJob);
    if(!g){ el.innerHTML='<div style="font-size:.82rem;color:var(--text3);padding:10px 0;">No hay materiales para este tipo de trabajo.</div>'; return; }
    var html='';
    // Lista de materiales ya seleccionados (sel + extras) con cantidad editable y botón borrar
    var selActuales=[];
    Object.keys(_MS.sel).forEach(function(nom){selActuales.push({nom:nom,qty:_MS.sel[nom],tipo:'sel'});});
    Object.keys(_MS.extras||{}).forEach(function(nom){selActuales.push({nom:nom,qty:_MS.extras[nom],tipo:'ext'});});
    if(selActuales.length){
      html+='<div style="background:var(--surface2);border:1px solid var(--green);border-radius:var(--r-sm);margin-bottom:10px;overflow:hidden;">';
      html+='<div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--green);padding:8px 12px;border-bottom:1px solid var(--border);">Materiales del parte</div>';
      selActuales.forEach(function(m){
        var nomEsc=m.nom.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
        html+='<div style="display:flex;align-items:center;gap:8px;padding:7px 12px;border-bottom:1px solid var(--border2);">'
          +'<span style="flex:1;font-size:.88rem;">'+m.nom+'</span>'
          +'<input type="number" min="1" value="'+m.qty+'" '
          +'style="width:58px;padding:5px 8px;border:1.5px solid var(--green);border-radius:var(--r-sm);font-size:.88rem;text-align:center;background:var(--surface2);color:var(--text);font-family:inherit;" '
          +'data-nom="'+nomEsc+'" data-tipo="'+m.tipo+'" '
          +'oninput="msActualizarCantidad(this)" '
          +'onfocus="this.select()">'
          +'<button data-nom="'+nomEsc+'" data-tipo="'+m.tipo+'" data-cid="'+cid+'" '
          +'onclick="msBorrarMaterial(this)" '
          +'style="width:26px;height:26px;border-radius:50%;background:var(--red-light);color:var(--red);border:none;cursor:pointer;font-size:.9rem;flex-shrink:0;">&#x2715;</button>'
          +'</div>';
      });
      html+='</div>';
    }
    (g.secciones||[]).forEach(function(sec){
      var allM=[];
      (sec.mats||[]).forEach(function(m){allM.push(m.nom);});
      (sec.subsecs||[]).forEach(function(ss){(ss.mats||[]).forEach(function(m){allM.push(m.nom);});});
      var hasSel=allM.some(function(n){return !!_MS.sel[n];});
      var isAb=_MS.secAbierta===sec.id;
      html+='<div class="sec-row'+(hasSel?' has-selected':'')+'" data-secid="'+sec.id+'" onclick="msToggleCatSec(this.dataset.secid)">'
        +'<input type="checkbox" class="sec-check"'+(hasSel?' checked':'')+' readonly>'
        +'<span class="sec-name">'+sec.nombre+'</span>'
        +(sec.subsecs&&sec.subsecs.length?'<span style="font-size:.7rem;color:var(--text3);">&#9656;</span>':'')
        +'</div>';
      if(isAb){
        (sec.mats||[]).forEach(function(m,mi){
          var c=!!_MS.sel[m.nom],q=_MS.sel[m.nom]||1;
          html+='<div class="mat-sel-row'+(c?' checked':'')+'" data-secid="'+sec.id+'" data-ssi="-1" data-mi="'+mi+'" onclick="msToggleCatItem(this.dataset.secid,parseInt(this.dataset.ssi),parseInt(this.dataset.mi))">'
            +'<input type="checkbox" class="mat-sel-check"'+(c?' checked':'')+' readonly>'
            +'<span class="mat-sel-name">'+m.nom+'</span>'
            +'<input type="number" class="mat-sel-qty'+(c?' visible':'')+'" value="'+q+'" min="1" onclick="event.stopPropagation()" onfocus="this.select()" oninput="msUpdQtyEl(this)">'
            +'</div>';
        });
        (sec.subsecs||[]).forEach(function(ss,ssi){
          var ssHas=(ss.mats||[]).some(function(m){return !!_MS.sel[m.nom];});
          var ssKey=sec.id+'_'+ssi;
          var ssAb=_MS.subAbierta===ssKey;
          html+='<div class="sub-hdr'+(ssHas?' has-sel':'')+'" data-secid="'+sec.id+'" data-ssi="'+ssi+'" onclick="msToggleCatSub(this.dataset.secid,parseInt(this.dataset.ssi))">'
            +'<input type="checkbox" class="sub-check"'+(ssHas?' checked':'')+' readonly>'
            +'<span class="sub-name">'+ss.nombre+'</span>'
            +'<span style="color:var(--text3);font-size:.75rem;">'+(ssAb?'&#9650;':'&#9660;')+'</span>'
            +'</div>';
          if(ssAb){
            (ss.mats||[]).forEach(function(m,mi){
              var c=!!_MS.sel[m.nom],q=_MS.sel[m.nom]||1;
              html+='<div class="mat-sel-row mat-sub'+(c?' checked':'')+'" data-secid="'+sec.id+'" data-ssi="'+ssi+'" data-mi="'+mi+'" onclick="msToggleCatItem(this.dataset.secid,parseInt(this.dataset.ssi),parseInt(this.dataset.mi))">'
                +'<input type="checkbox" class="mat-sel-check"'+(c?' checked':'')+' readonly>'
                +'<span class="mat-sel-name">'+m.nom+'</span>'
            +'<input type="number" class="mat-sel-qty'+(c?' visible':'')+'" value="'+q+'" min="1" onclick="event.stopPropagation()" onfocus="this.select()" oninput="msUpdQtyEl(this)">'
                +'</div>';
            });
          }
        });
      }
    });
    html+='<div id="msExtrasList"></div>';
        // Single add button at the bottom
    html+='<div style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--border);">'
      +'<div style="font-size:.72rem;color:var(--text2);margin-bottom:6px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Buscar material</div>'
      +'<div style="display:flex;gap:8px;">'
      +'<div style="flex:1;position:relative;">'
      +'<input id="msAddGlobal" class="ac-inp" style="width:100%;padding:8px 11px;border:1.5px solid var(--border);border-radius:var(--r-sm);font-size:.88rem;color:var(--text);background:var(--surface2);outline:none;font-family:inherit;" placeholder="Buscar material..." oninput="msAcGlobal(this.value)" onfocus="msAddGlobalFocus(this)" autocomplete="off">'
      +'<div id="msAcGlobalBox" style="position:absolute;top:100%;left:0;right:0;background:var(--surface);border:1.5px solid var(--green);border-radius:var(--r-sm);z-index:100;max-height:200px;overflow-y:auto;display:none;box-shadow:0 4px 16px rgba(0,0,0,.3);"></div>'
      +'</div>'
      +'<button style="padding:8px 14px;background:var(--green);color:#fff;border:none;border-radius:var(--r-sm);font-weight:700;font-size:.9rem;cursor:pointer;" onclick="msAcGlobalConfirm()">+</button>'
      +'</div>'
      +'</div>';
    el.innerHTML=html;
    msRenderExtras();
    return;
  }
}
function msUpdQtyEl(inp){
  var row=inp.closest('.mat-sel-row');
  var nom=row?row.querySelector('.mat-sel-name'):null;
  if(nom&&_MS.sel[nom.textContent]!==undefined) _MS.sel[nom.textContent]=parseFloat(inp.value)||1;
}

// New catalog-based toggle functions for parte view
function msToggleCatSec(secId){
  msSaveQtys();
  _MS.secAbierta=_MS.secAbierta===secId?null:secId;
  _MS.subAbierta=null;
  msRender('parteMatCard');
}
function msToggleCatSub(secId,ssi){
  msSaveQtys();
  var key=secId+'_'+ssi;
  _MS.subAbierta=_MS.subAbierta===key?null:key;
  msRender('parteMatCard');
}
function msToggleCatItem(secId,ssi,mi){
  msSaveQtys();
  var g=catGetGrupoParaJob(_MS.catJob||curJob);if(!g)return;
  var sec=(g.secciones||[]).find(function(s){return s.id===secId;});if(!sec)return;
  var mats=ssi===-1?(sec.mats||[]):((sec.subsecs||[])[ssi]?(sec.subsecs[ssi].mats||[]):[]);
  var m=mats[mi];if(!m)return;
  var wasSelected=!!_MS.sel[m.nom];
  if(wasSelected) delete _MS.sel[m.nom]; else _MS.sel[m.nom]=1;
  msRender('parteMatCard');
  // If just selected, focus the qty input dentro de la propia sección/subsección (que sigue abierta)
  if(!wasSelected){
    setTimeout(function(){
      var rows=document.querySelectorAll('.mat-sel-row.checked .mat-sel-qty.visible');
      rows.forEach(function(inp){
        var nameEl=inp.parentElement.querySelector('.mat-sel-name');
        if(nameEl&&nameEl.textContent===m.nom) inp.select();
      });
    },50);
  }
}
function msSaveQtys(){
  document.querySelectorAll('[id^="msq_"]').forEach(function(inp){
    // Handle both old (si_mi) and new (cat_si_ssi_mi) formats
    var nom=inp.closest('.mat-sel-row')?inp.closest('.mat-sel-row').querySelector('.mat-sel-name'):null;
    if(nom&&_MS.sel[nom.textContent]!==undefined) _MS.sel[nom.textContent]=parseFloat(inp.value)||1;
  });
}

// Global autocomplete for parte material add

function msAddGlobalFocus(el){
  setTimeout(function(){
    el.scrollIntoView({behavior:'smooth',block:'center'});
  },300);
}
function msActualizarCantidad(inp){
  var nom=inp.dataset.nom; var tipo=inp.dataset.tipo; var qty=parseFloat(inp.value)||1;
  if(tipo==='sel') _MS.sel[nom]=qty; else _MS.extras[nom]=qty;
}
function msBorrarMaterial(btn){
  var nom=btn.dataset.nom; var tipo=btn.dataset.tipo; var cid=btn.dataset.cid||'parteMatCard';
  if(tipo==='sel') delete _MS.sel[nom]; else delete _MS.extras[nom];
  msRender(cid);
}
function msRenderExtras(){
  var el=document.getElementById('msExtrasList'); if(!el) return;
  var extras=_MS.extras||{};
  var keys=Object.keys(extras);
  if(!keys.length){ el.innerHTML=''; return; }
  var h='';
  keys.forEach(function(nom){
    var q=extras[nom]||1;
    var nomEsc=nom.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
    h+='<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border2);">'
      +'<span style="flex:1;font-size:.88rem;color:var(--text);">'+nom+'</span>'
      +'<input type="number" min="1" value="'+q+'" '
      +'style="width:60px;padding:5px 8px;border:1.5px solid var(--green);border-radius:var(--r-sm);font-size:.88rem;text-align:center;background:var(--surface2);color:var(--text);font-family:inherit;" '
      +'data-nom="'+nomEsc+'" '
      +'oninput="if(!_MS.extras)_MS.extras={};_MS.extras[this.dataset.nom]=parseFloat(this.value)||1" '
      +'onfocus="this.select()">'
      +'<button data-nom="'+nomEsc+'" '
      +'onclick="delete _MS.extras[this.dataset.nom];msRenderExtras();" '
      +'style="width:26px;height:26px;border-radius:50%;background:var(--red-light);color:var(--red);border:none;cursor:pointer;font-size:.9rem;flex-shrink:0;">&#x2715;</button>'
      +'</div>';
  });
  el.innerHTML=h;
}
function _normTexto(s){
  return (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
}
function msAcGlobal(val){
  val=val.trim();
  var box=$('msAcGlobalBox');if(!box)return;
  if(!val||val.length<1){box.style.display='none';box.innerHTML='';return;}
  var g=catGetGrupoParaJob(_MS.catJob||curJob);
  var todos=g?catAllMatsGrupo(g.id):[];
  var res=todos.filter(function(n){return _normTexto(n).includes(_normTexto(val));}).slice(0,8);
  var flotantes=getMaterialesFlotantes().filter(function(f){
    return !todos.some(function(n){return n.toLowerCase()===f.nombre.toLowerCase();}) && _normTexto(f.nombre).includes(_normTexto(val));
  }).slice(0,4);
  var html='';
  res.forEach(function(nom){
    html+='<div class="ms-ac-item" data-nom="'+nom.replace(/"/g,'&quot;')+'" onmousedown="msAcGlobalSel(this.dataset.nom)" style="padding:9px 12px;font-size:.86rem;cursor:pointer;border-bottom:1px solid var(--border2);">🔧 '+nom+'</div>';
  });
  flotantes.forEach(function(f){
    html+='<div class="ms-ac-item" data-nom="'+f.nombre.replace(/"/g,'&quot;')+'" onmousedown="msAcGlobalSel(this.dataset.nom)" style="padding:9px 12px;font-size:.86rem;cursor:pointer;border-bottom:1px solid var(--border2);color:var(--amber);">🧩 '+f.nombre+' <span style="font-size:.72rem;opacity:.8;">(pendiente clasificar)</span></div>';
  });
  box.innerHTML=html;
  box.style.display=html?'block':'none';
}
function msAcGlobalSel(nom){
  if(!_MS.extras) _MS.extras={};
  if(!_MS.extras[nom]) _MS.extras[nom]=1;
  var inp=$('msAddGlobal');if(inp)inp.value='';
  var box=$('msAcGlobalBox');if(box){box.style.display='none';box.innerHTML='';}
  msRenderExtras();
}
// Admin en rol de técnico, o un técnico con el permiso individual activado, puede
// introducir un material que no existe todavía en el catálogo — queda pendiente de
// clasificar (flotante) hasta que un admin lo asigne a una sección/subsección.
function _puedeMaterialFlotante(){
  var s = window._sesion;
  if (!s || s.rol !== 'tecnico') return false;
  if (s.multiRol) return true; // admin actuando como técnico
  var t = getTecnicos().find(function(x){ return x.nombre.toLowerCase() === s.nombre.toLowerCase(); });
  return !!(t && t.matFlotante);
}
function msAcGlobalConfirm(){
  var inp=$('msAddGlobal');
  var val=inp?inp.value.trim():'';if(!val)return;
  var g=catGetGrupoParaJob(_MS.catJob||curJob);
  var todos=g?catAllMatsGrupo(g.id):[];
  var exacto=todos.find(function(n){return n.toLowerCase()===val.toLowerCase();});
  if(exacto){ msAcGlobalSel(exacto); return; }
  // ¿Ya existe como flotante pendiente (de cualquier grupo)? Se reutiliza tal cual,
  // sin crear un segundo pendiente con el mismo nombre
  var flotantes = getMaterialesFlotantes();
  var flotanteExacto = flotantes.find(function(f){ return f.nombre.toLowerCase()===val.toLowerCase(); });
  if(flotanteExacto){ msAcGlobalSel(flotanteExacto.nombre); return; }
  if(!_puedeMaterialFlotante()){
    _toast('Material no encontrado en el catálogo', 'var(--red)');
    return;
  }
  _crearMaterialFlotante(val, g ? g.nombre : (_MS.catJob||curJob), function(exito){
    if(exito) msAcGlobalSel(val);
    else _toast('No se pudo guardar el material. Comprueba tu conexión.', 'var(--red)');
  });
}
function _crearMaterialFlotante(nombre, grupo, callback){
  if(typeof _db === 'undefined' || !_db){ if(callback) callback(false); return; }
  var doc = {
    nombre: nombre,
    grupo: grupo,
    fecha: Date.now(),
    creadoPor: (window._sesion && window._sesion.nombre) || ''
  };
  _db.collection('materialesFlotantes').add(doc).then(function(ref){
    var lista = getMaterialesFlotantes();
    lista.push(Object.assign({id:ref.id}, doc));
    setMaterialesFlotantes(lista);
    catActualizarBadge();
    if(callback) callback(true);
  }).catch(function(){ if(callback) callback(false); });
}
function msInitSel(mats){
  _MS.sel={};_MS.extras={};_MS.secAbierta=null;
  if(!mats||!mats.length) return;
  // Separar materiales del catálogo de los extras (añadidos manualmente)
  var g=catGetGrupoParaJob(_MS.catJob||curJob);
  var todos=g?catAllMatsGrupo(g.id):[];
  (mats||[]).forEach(function(m){
    if(!m.cantidad||+m.cantidad<=0) return;
    var nom=m.nombre||m.nom||'';
    if(!nom) return;
    // Si está en el catálogo va a sel, si no va a extras
    var enCat=todos.some(function(n){return n.toLowerCase()===nom.toLowerCase();});
    if(enCat) _MS.sel[nom]=+m.cantidad;
    else _MS.extras[nom]=+m.cantidad;
  });
}
function msGetSel(){
  var r=Object.keys(_MS.sel).map(function(nom){
    return {cod:'',nombre:nom,cantidad:_MS.sel[nom]};
  });
  Object.keys(_MS.extras||{}).forEach(function(nom){
    if(!_MS.sel[nom]) r.push({cod:'',nombre:nom,cantidad:_MS.extras[nom]||1});
  });
  return r;
}

// ===== AUTOCOMPLETE MATERIALES =====

function statsToggleMes(mesId){
  var d=document.getElementById(mesId);
  if(d) d.style.display=d.style.display==='none'?'block':'none';
}

function _esAdmin() {
  var rol = window._sesion && window._sesion.rol;
  return rol === 'admin';
}
function _getEstadoIncidencia(pedido, centro) {
  try {
    var estados = JSON.parse(localStorage.getItem('pm_incidencias_estados') || '{}');
    var k = (pedido||'') + '||' + (centro||'');
    return estados[k] || null;
  } catch(e) { return null; }
}

function renderClientes(){
  var lista=getClientes();
  var h=getHVisible();
  // Todos los clientes salen al técnico principal, tenga o no partes en ellos (sin partes, su historial sale vacío
  // y puede generar una incidencia con parte nuevo).
  var stats={};
  lista.forEach(function(c){stats[c.id]={activas:0,ultimaFin:''};});
  var ordenes={};
  var _miNombreL = window._sesion ? window._sesion.nombre.toLowerCase() : '';
  var _esTec = window._sesion && window._sesion.rol === 'tecnico';
  h.forEach(function(r){
    var cid=r.clienteId||'mercadona';
    var k=cid+'||'+r.pedido+'||'+(r.centro||'');
    if(!ordenes[k]) ordenes[k]={cid:cid,estado:'terminado',fecha:'',esPrincipal:false};
    if(r.fecha>ordenes[k].fecha){ordenes[k].fecha=r.fecha;}
    // Usar estado de incidencia de Firestore si está disponible
    var _estInc = _getEstadoIncidencia(r.pedido, r.centro);
    ordenes[k].estado = _estInc || r.estado || 'terminado';
    // Marcar si el técnico es principal actual (registro global) en esta incidencia
    if(_esTec){
      var reg=_registroGlobal(r.pedido, r.clienteId||'mercadona');
      var tecReal = reg ? reg.tecnicoPrincipal : (r.tecnicos && r.tecnicos[0]);
      if(tecReal && tecReal.toLowerCase()===_miNombreL){
        ordenes[k].esPrincipal=true;
      }
    }
  });
  // Clientes sin asignación: cuentan todas sus órdenes activas, porque cualquier técnico principal puede continuarlas
  if(_esTec){
    var _sinAsigIds={};
    lista.forEach(function(c){ if(c.conAsignacion===false) _sinAsigIds[c.id]=true; });
    var _regG={};
    try { _regG=JSON.parse(localStorage.getItem('pm_registro_global')||'{}'); } catch(e) { _fallo('renderClientes')(e); }
    Object.keys(_regG).forEach(function(kg){
      var g=_regG[kg];
      if(!_sinAsigIds[g.clienteId]) return;
      var k=g.clienteId+'||'+g.pedido+'||'+(g.centro||'');
      if(!ordenes[k]) ordenes[k]={cid:g.clienteId,estado:g.estado,fecha:'',esPrincipal:true};
    });
    Object.values(ordenes).forEach(function(o){ if(_sinAsigIds[o.cid]) o.esPrincipal=true; });
  }
  Object.values(ordenes).forEach(function(o){
    if(!stats[o.cid]) return;
    if(o.estado==='en-ejecucion' && (!_esTec || o.esPrincipal)){stats[o.cid].activas++;}
    else{if(o.fecha>stats[o.cid].ultimaFin)stats[o.cid].ultimaFin=o.fecha;}
  });
  lista=lista.slice().sort(function(a,b){
    var sa=stats[a.id]||{activas:0,ultimaFin:''};
    var sb=stats[b.id]||{activas:0,ultimaFin:''};
    if(sb.activas!==sa.activas) return sb.activas-sa.activas;
    if(sb.ultimaFin>sa.ultimaFin) return 1;
    if(sb.ultimaFin<sa.ultimaFin) return -1;
    return 0;
  });
  var el=$('clientesGrid');
  if(!el) return;
  // Técnico no principal: no ve clientes, solo Estadísticas y Registro de horario
  var _sinP=_esTecnicoSinPrincipal(), _lblC=document.querySelector('#w-clientes > .section-label');
  if(_lblC) _lblC.style.display=_sinP ? 'none' : '';
  el.style.display=_sinP ? 'none' : '';
  el.innerHTML='';
  if(_sinP) return;
  lista.forEach(function(c){
    var s=stats[c.id]||{activas:0,ultimaFin:''};
    var ico=c.tipo==='mercadona'?'&#127978;':c.tipo==='particular'?'&#128100;':'&#127970;';
    var cls=c.tipo==='mercadona'?'ico-mercadona':c.tipo==='particular'?'ico-particular':'ico-other';
    var div=document.createElement('div');
    div.className='app-icon';
    if(c.id!=='mercadona' && _esAdmin()){
      var db=document.createElement('button');
      db.className='app-del-btn';
      db.innerHTML='&#x2715;';
      (function(cid2){db.addEventListener('click',function(e){e.stopPropagation();borrarCliente(cid2);});})(c.id);
      div.appendChild(db);
    }
    var imgDiv=document.createElement('div');
    imgDiv.className='app-icon-img '+cls;
    imgDiv.innerHTML=ico;
    div.appendChild(imgDiv);
    if(s.activas>0){
      var badge=document.createElement('span');
      badge.className='app-badge';
      badge.textContent=s.activas;
      div.appendChild(badge);
    }
    var lbl=document.createElement('span');
    lbl.className='app-icon-label';
    lbl.textContent=c.nombre;
    div.appendChild(lbl);
    (function(cid2){div.addEventListener('click',function(){seleccionarCliente(cid2);});})(c.id);
    el.appendChild(div);
  });
  if(_esAdmin()){
    var addDiv=document.createElement('div');
    addDiv.className='app-icon';
    var ai=document.createElement('div');
    ai.className='app-icon-img ico-nuevo';
    ai.style.fontSize='28px';
    ai.innerHTML='&#43;';
    addDiv.appendChild(ai);
    var al=document.createElement('span');
    al.className='app-icon-label';
    al.style.color='rgba(255,255,255,.5)';
    al.textContent='Añadir';
    addDiv.appendChild(al);
    addDiv.addEventListener('click',function(){goTo('w-nuevo-cliente');});
    el.appendChild(addDiv);
  }
}

function onFechaChange(){
  var f=$('fecha').value;
  if(f){
    var dom=new Date(f+'T12:00:00').getDay()===0; var fn=esFN(f);
    if(dom||fn){
      esFestivo=true;
      document.querySelectorAll('#festivoTgl button').forEach(function(b,i){ b.classList.toggle('active',i===1); b.disabled=false; b.style.opacity='1'; b.style.cursor='pointer'; });
    } else {
      esFestivo=false;
      document.querySelectorAll('#festivoTgl button').forEach(function(b,i){ b.classList.toggle('active',i===0); b.disabled=false; b.style.opacity='1'; b.style.cursor='pointer'; });
    }
  }
  checkAutoEnlace();
}

