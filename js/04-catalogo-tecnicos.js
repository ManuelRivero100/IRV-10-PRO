// ===== CATÁLOGO GLOBAL =====
var CAT_KEY='pm_catalogo',CAT_V_KEY='pm_catalogo_v',CAT_V='4';
var CAT_DEFAULT={
  grupos:[
    {id:'climatizacion',nombre:'Climatización',ico:'❄️',secciones:[
      {id:'valvulas',nombre:'Válvulas',subsecs:[],mats:[
        {nom:'Válvula de bola 1⅛'},{nom:'Válvula 5/8'},{nom:'Válvula de 1⅜'},{nom:'Válvula de 7/8'},{nom:'Obús completo con tapa'}
      ]},
      {id:'gases',nombre:'Gases y soldadura',subsecs:[],mats:[
        {nom:'Varilla de plata 5%'},{nom:'Carga de nitrógeno'},{nom:'Gas R410 (kg)'},{nom:'Gas R407 (kg)'},{nom:'Gas R32 (kg)'},{nom:'Gas R438 (kg)'},{nom:'Líquido trazador'},{nom:'Filtro deshidratador'},{nom:'Oxígeno y Propano'}
      ]},
      {id:'tuberias',nombre:'Tuberías',subsecs:[
        {id:'cobre',nombre:'Cobre',mats:[
          {nom:'Tubería cobre 1/4" (m)'},{nom:'Tubería cobre 3/8" (m)'},{nom:'Tubería cobre 1/2" (m)'},{nom:'Tubería cobre 5/8" (m)'},{nom:'Tubería cobre 3/4" (m)'}
        ]},
        {id:'pvc',nombre:'PVC',mats:[
          {nom:'Hidro Tubo 20mm (m)'},{nom:'Hidro Tubo 25mm (m)'},{nom:'Hidro Tubo cristal (m)'}
        ]}
      ],mats:[]},
      {id:'consumibles',nombre:'Consumibles',subsecs:[],mats:[
        {nom:'Coquilla negra adhesiva (m)'},{nom:'Cinta de aluminio (rollo)'},{nom:'Soportes Escuadras 50x50'},{nom:'Silen Block Escuadras'},{nom:'Silen Block Patas'},{nom:'Bomba Desagüe Maxi Hi Flow'}
      ]}
    ]},
    {id:'conductos',nombre:'Conductos',ico:'💨',secciones:[
      {id:'panel',nombre:'Panel y lámina',subsecs:[],mats:[
        {nom:'Conducto 80×80×120'},{nom:'Lámina fibra vidrio 120×300cm'}
      ]},
      {id:'fijacion',nombre:'Fijación y sellado',subsecs:[],mats:[
        {nom:'Cinta de aluminio (rollo)'},{nom:'Silicona'},{nom:'Tornillos autorroscantes (caja)'},{nom:'Brida metálica'}
      ]}
    ]},
    {id:'electricidad',nombre:'Electricidad',ico:'⚡',secciones:[
      {id:'cables',nombre:'Cables',subsecs:[],mats:[
        {nom:'Cable 1.5mm² (m)'},{nom:'Cable 2.5mm² (m)'},{nom:'Cable 4mm² (m)'},{nom:'Cable 6mm² (m)'},{nom:'Manguera 3×1.5mm² (m)'},{nom:'Manguera 3×2.5mm² (m)'}
      ]},
      {id:'mecanismos',nombre:'Mecanismos',subsecs:[
        {id:'simon',nombre:'Simon',mats:[
          {nom:'Interruptor Simon'},{nom:'Conmutador Simon'},{nom:'Enchufe 16A Simon'},{nom:'Enchufe 25A Simon'},{nom:'Base schuko Simon'}
        ]}
      ],mats:[]},
      {id:'proteccion',nombre:'Protección eléctrica',subsecs:[],mats:[
        {nom:'Magnetotérmico 10A'},{nom:'Magnetotérmico 16A'},{nom:'Magnetotérmico 20A'},{nom:'Magnetotérmico 25A'},{nom:'Diferencial 25A 30mA'},{nom:'Diferencial 40A 30mA'}
      ]},
      {id:'canalizacion',nombre:'Canalización',subsecs:[],mats:[
        {nom:'Tubo corrugado 16mm (m)'},{nom:'Tubo corrugado 20mm (m)'},{nom:'Caja de registro'},{nom:'Caja de empotrar 1 elemento'},{nom:'Regleta de conexión (ud)'},{nom:'Cinta aislante'},{nom:'Brida plástica (bolsa)'}
      ]}
    ]},
    {id:'obras',nombre:'Obras',ico:'🏗️',secciones:[
      {id:'general_obras',nombre:'General',subsecs:[],mats:[
        {nom:'Varilla de plata 5%'},{nom:'Carga de nitrógeno'},{nom:'Oxígeno y Propano'},{nom:'Coquilla negra adhesiva (m)'},{nom:'Cinta de aluminio (rollo)'},{nom:'Soportes Escuadras 50x50'},{nom:'Silen Block Escuadras'},{nom:'Silen Block Patas'},{nom:'Bomba Desagüe Maxi Hi Flow'},{nom:'Hidro Tubo 20mm (m)'},{nom:'Hidro Tubo 25mm (m)'}
      ]}
    ]}
  ],
  conceptos:[
    {id:'k1a',tipo:'Climatización',lab:'H. Normal (Oficial)',cod:'MF9344',precio:'31'},{id:'k1b',tipo:'Climatización',lab:'H. Normal (Peón)',cod:'MF9348',precio:'28.5'},
    {id:'k2a',tipo:'Climatización',lab:'H. Extra (Oficial)',cod:'MF9345',precio:'38.75'},{id:'k2b',tipo:'Climatización',lab:'H. Extra (Peón)',cod:'MF9349',precio:'35.63'},
    {id:'k3a',tipo:'Climatización',lab:'H. Nocturna (Oficial)',cod:'MF9346',precio:'38.75'},{id:'k3b',tipo:'Climatización',lab:'H. Nocturna (Peón)',cod:'MF9350',precio:'35.63'},
    {id:'k4a',tipo:'Climatización',lab:'H. Festiva (Oficial)',cod:'MF9347',precio:'54.25'},{id:'k4b',tipo:'Climatización',lab:'H. Festiva (Peón)',cod:'MF9351',precio:'49.88'},
    {id:'k5',tipo:'Climatización',lab:'Despl. Normal',cod:'M71077',precio:'28.8'},{id:'k6',tipo:'Climatización',lab:'Despl. Extra',cod:'MB8726',precio:'36'},
    {id:'k7',tipo:'Climatización',lab:'Despl. Nocturno',cod:'MB8728',precio:'36'},{id:'k8',tipo:'Climatización',lab:'Despl. Festivo',cod:'MB8727',precio:'50.4'},
    {id:'k9',tipo:'Climatización',lab:'Kilometraje',cod:'MF9352',precio:'0.38'},{id:'k10',tipo:'Climatización',lab:'½ Dieta',cod:'MF9895',precio:'12'},
    {id:'k11',tipo:'Conductos',lab:'H. Normal',cod:'MF9404',precio:'31'},{id:'k12',tipo:'Conductos',lab:'H. Extra',cod:'MF9405',precio:'38.75'},
    {id:'k13',tipo:'Conductos',lab:'H. Nocturna',cod:'MF9406',precio:'38.75'},{id:'k14',tipo:'Conductos',lab:'H. Festiva',cod:'MF9407',precio:'54.25'},
    {id:'k15',tipo:'Conductos',lab:'Despl. Normal',cod:'MK9OVB',precio:'28.8'},{id:'k16',tipo:'Conductos',lab:'Despl. Extra',cod:'MB8723',precio:'36'},
    {id:'k17',tipo:'Conductos',lab:'Despl. Nocturno',cod:'MB8725',precio:'36'},{id:'k18',tipo:'Conductos',lab:'Despl. Festivo',cod:'MB8724',precio:'50.4'},
    {id:'k19',tipo:'Conductos',lab:'Kilometraje',cod:'MF9412',precio:'0.38'},{id:'k20',tipo:'Conductos',lab:'½ Dieta',cod:'MF9896',precio:'12'},
    {id:'k21',tipo:'Obras',lab:'H. Normal',cod:'MA4836',precio:'31'},{id:'k22',tipo:'Obras',lab:'H. Extra',cod:'M71088',precio:'38.75'},
    {id:'k23',tipo:'Obras',lab:'H. Nocturna',cod:'MA4837',precio:'38.75'},{id:'k24',tipo:'Obras',lab:'H. Festiva',cod:'MA4838',precio:'54.25'},
    {id:'k25',tipo:'Obras',lab:'Despl. Normal',cod:'M71077',precio:'28.8'},{id:'k26',tipo:'Obras',lab:'Despl. Extra',cod:'MB8726',precio:'36'},
    {id:'k27',tipo:'Obras',lab:'Despl. Nocturno',cod:'MB8728',precio:'36'},{id:'k28',tipo:'Obras',lab:'Despl. Festivo',cod:'MB8727',precio:'50.4'},
    {id:'k29',tipo:'Obras',lab:'Kilometraje',cod:'MA4841',precio:'0.38'},{id:'k30',tipo:'Obras',lab:'½ Dieta',cod:'MA4839',precio:'12'},
    {id:'k31',tipo:'Electricidad',lab:'H. Normal',cod:'—',precio:'31'},{id:'k32',tipo:'Electricidad',lab:'H. Extra',cod:'—',precio:'38.75'},
    {id:'k33',tipo:'Electricidad',lab:'H. Nocturna',cod:'—',precio:'38.75'},{id:'k34',tipo:'Electricidad',lab:'H. Festiva',cod:'—',precio:'54.25'},
    {id:'k35',tipo:'Electricidad',lab:'Despl. Normal',cod:'—',precio:'28.8'},{id:'k36',tipo:'Electricidad',lab:'Kilometraje',cod:'—',precio:'0.38'},{id:'k37',tipo:'Electricidad',lab:'½ Dieta',cod:'—',precio:'12'}
  ]
};

function getCat(){
  if(localStorage.getItem(CAT_V_KEY)!==CAT_V){
    // Migrar datos anteriores si existen
    var viejo=JSON.parse(localStorage.getItem(CAT_KEY)||'null');
    var nuevo=JSON.parse(JSON.stringify(CAT_DEFAULT));
    // Solo migrar conceptos si el nuevo CAT_DEFAULT no los tiene (para no perder precios nuevos)
    if(viejo&&viejo.conceptos&&(!nuevo.conceptos||!nuevo.conceptos.length)){nuevo.conceptos=viejo.conceptos;}
    if(viejo&&viejo.tecnicos){nuevo.tecnicos=viejo.tecnicos;}
    if(viejo&&viejo.familias){
      // Convertir familias planas a grupos con sección general
      viejo.familias.forEach(function(f){
        var g=nuevo.grupos.find(function(x){return x.id===f.id;});
        if(g&&f.materiales&&f.materiales.length){
          // Agregar materiales que no existen ya
          var sec=g.secciones[0];if(!sec){sec={id:'general',nombre:'General',subsecs:[],mats:[]};g.secciones.push(sec);}
          f.materiales.forEach(function(m){
            var nom=m.nom||m.nombre||'';
            if(nom&&!sec.mats.find(function(x){return x.nom===nom;})){
              sec.mats.push({nom:nom});
            }
          });
        }
      });
    }
    localStorage.setItem(CAT_KEY,JSON.stringify(nuevo));
    localStorage.setItem(CAT_V_KEY,CAT_V);
    return nuevo;
  }
  var d=JSON.parse(localStorage.getItem(CAT_KEY)||'null');
  if(!d) return JSON.parse(JSON.stringify(CAT_DEFAULT));
  if(!d.grupos&&d.familias) d.grupos=d.familias;
  return d;
}
function setCat(d){localStorage.setItem(CAT_KEY,JSON.stringify(d));}

// Helpers catálogo jerárquico
function catGetGrupoParaJob(job){
  var cat=getCat();
  var j=(job||curJob||'').toLowerCase();
  if(!j) return null;
  // Try exact name match first, then partial match
  return cat.grupos.find(function(g){return g.nombre.toLowerCase()===j;})
    || cat.grupos.find(function(g){return j.includes(g.nombre.toLowerCase())||g.nombre.toLowerCase().includes(j);})
    || null;
}
function catAllMatsGrupo(grupoId){
  var cat=getCat();
  var g=cat.grupos.find(function(x){return x.id===grupoId;});
  if(!g) return [];
  var r=[];
  (g.secciones||[]).forEach(function(s){
    (s.mats||[]).forEach(function(m){r.push(m.nom);});
    (s.subsecs||[]).forEach(function(ss){(ss.mats||[]).forEach(function(m){r.push(m.nom);});});
  });
  return r;
}

// ===== FUNCIONES CATÁLOGO — JERÁRQUICO =====
var _catState={grupoAb:null,secAb:null,subAb:null,addCtx:null,addMode:null};

// ===== TÉCNICOS =====
var _tecJobs=[];

function getTecnicos(){ var cat=getCat(); return cat.tecnicos||[]; }

function migrarTecnicos(){
  // Relacionar nombres de partes antiguos con catálogo
  var tecs=getTecnicos(); if(!tecs.length) return;
  var h=getH(); var changed=false;
  h.forEach(function(r){
    // Extraer nombres si no tiene campo tecnicos
    if(!r.tecnicos||!r.tecnicos.length){
      var noms=[];
      // Intentar extraer del detalle HTML (fila Técnicos o div de nombres)
      if(r.detalle){
        var m1=r.detalle.match(/T[eé]cnicos<\/span><span[^>]*>([^<]+)<\/span>/i);
        var m2=r.detalle.match(/letter-spacing:[^>]*>([^<]+)<\/div>/);
        var raw=(m1&&m1[1])||(m2&&m2[1])||'';
        if(raw) noms=raw.split(/\s*[·•&]middot;\s*/).map(function(n){return n.trim();}).filter(Boolean);
      }
      if(noms.length){
        r.tecnicos=noms.map(function(nom){
          var nomL=nom.toLowerCase();
          var match=tecs.find(function(t){return t.nombre.toLowerCase()===nomL;})
            ||tecs.find(function(t){return t.nombre.toLowerCase().indexOf(nomL)===0||nomL.indexOf(t.nombre.toLowerCase().split(' ')[0])===0;});
          return match?match.nombre:nom;
        });
        changed=true;
      }
    } else {
      // Ya tiene tecnicos: intentar enriquecer con nombre completo del catálogo
      var updated=r.tecnicos.map(function(nom){
        var nomL=nom.toLowerCase();
        var match=tecs.find(function(t){return t.nombre.toLowerCase()===nomL;})
          ||tecs.find(function(t){return t.nombre.toLowerCase().indexOf(nomL)===0||nomL.indexOf(t.nombre.toLowerCase().split(' ')[0])===0;});
        return match?match.nombre:nom;
      });
      if(updated.join()!==r.tecnicos.join()){ r.tecnicos=updated; changed=true; }
    }
  });
  if(changed) setH(h);
}
function setTecnicos(arr){ var cat=getCat(); cat.tecnicos=arr; setCat(cat); }

function tecToggleJob(job,btn){
  var idx=_tecJobs.indexOf(job);
  if(idx>=0){ _tecJobs.splice(idx,1); btn.style.background='var(--surface2)'; btn.style.color='var(--text2)'; btn.style.borderColor='var(--border)'; }
  else { _tecJobs.push(job); btn.style.background='var(--green)'; btn.style.color='#fff'; btn.style.borderColor='var(--green)'; }
}

// Pide al servidor (función "fijarPin") que cifre y guarde el PIN de un técnico; solo lo admite si quien
// llama es admin. Siempre resuelve { ok } o { ok:false, error }.
function _fijarPin(nombre, pin){
  var usuarioFirebase = firebase.auth().currentUser;
  if(!usuarioFirebase) return Promise.resolve({ ok:false, error:'sin-sesion' });
  return usuarioFirebase.getIdToken().then(function(token){
    return fetch(URL_FIJARPIN, {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+token },
      body: JSON.stringify({ nombre: nombre, pin: pin })
    });
  }).then(function(r){ return r.json(); }).catch(function(){ return { ok:false, error:'sinConexion' }; });
}

function _textoErrorPin(error){
  if(error==='sinConexion') return 'Sin conexión a internet.';
  if(error==='sin-sesion' || error==='sesion-invalida') return 'Vuelve a entrar con tu PIN.';
  if(error==='solo-admin' || error==='solo-creador') return 'No tienes permiso para cambiar este PIN.';
  if(error==='no-existe') return 'La ficha de este técnico aún no está en el servidor. Inténtalo de nuevo en unos segundos.';
  if(error==='formato') return 'El PIN debe tener 4 cifras.';
  return 'Error del servidor.';
}

// Tras fijar el PIN en el servidor, se anota en el catálogo local que esa persona ya tiene PIN
function _tecMarcarConPin(id){
  var tecs=getTecnicos();
  var t=tecs.find(function(x){return x.id===id;});
  if(t){ t.tienePin=true; setTecnicos(tecs); }
  renderCatTecnicos();
  _cargarPinesVisibles();
}

function tecGuardar(){
  var nom=$('tec-nombre').value.trim();
  if(!nom){ showMsg('msgTec','Introduce el nombre.','error'); return; }
  var tecs=getTecnicos();
  if(tecs.find(function(t){return t.nombre.toLowerCase()===nom.toLowerCase();})){
    showMsg('msgTec','Ya existe un técnico con ese nombre.','warn'); return;
  }
  var pin=$('tec-pin').value.trim();
  if(pin && !/^\d{4}$/.test(pin)){ showMsg('msgTec','El PIN debe tener 4 cifras.','error'); return; }
  var nuevoTec={id:'tec_'+Date.now(), nombre:nom, tel:$('tec-tel').value.trim(), jobs:_tecJobs.slice(), tienePin:false, activo:true, activoDesde:hoy(), principal:false};
  tecs.push(nuevoTec);
  setTecnicos(tecs);
  var fichaSubida=_subirTecnicoAFirestore(nuevoTec);
  if(pin){
    // El PIN se fija cuando la ficha ya está en el servidor
    fichaSubida.then(function(){ return _fijarPin(nom, pin); }).then(function(r){
      if(r.ok) _tecMarcarConPin(nuevoTec.id);
      else alert('Técnico guardado, pero no se pudo fijar su PIN: '+_textoErrorPin(r.error)+' Ponlo de nuevo desde su ficha.');
    });
  }
  $('tec-nombre').value=''; $('tec-tel').value=''; $('tec-pin').value=''; _tecJobs=[];
  document.querySelectorAll('#tec-jobs-tgl button').forEach(function(b){
    b.style.background='var(--surface2)'; b.style.color='var(--text2)'; b.style.borderColor='var(--border)';
  });
  showMsg('msgTec','Técnico guardado.','success');
  renderCatTecnicos();
}

function tecEliminar(id){
  _confirmarApp('¿Eliminar este técnico?', function(){
    var tecs=getTecnicos();
    var tec=tecs.find(function(t){return t.id===id;});
    setTecnicos(tecs.filter(function(t){return t.id!==id;}));
    if(tec&&tec.nombre&&typeof _db!=='undefined'&&_db){
      var docId=tec.nombre.toLowerCase().replace(/ /g,'_');
      _db.collection('usuario').doc(docId).delete().catch(_fallo('tecEliminar usuario.delete'));
    }
    renderCatTecnicos();
  });
}

// PIN de consulta de los técnicos, solo en memoria (nunca en localStorage). Lo escribe únicamente el servidor
// y las reglas de Firestore solo dejan leerlo al admin. No existe el de quien es admin: esos PIN solo están cifrados.
var _pinesVisibles = {};
function _cargarPinesVisibles(){
  if(typeof _db === 'undefined' || !_db) return;
  _db.collection('pinesVisibles').get().then(function(snap){
    _pinesVisibles = {};
    snap.forEach(function(d){ _pinesVisibles[d.id] = d.data().pin; });
    renderCatTecnicos();
  }).catch(_fallo('_cargarPinesVisibles'));
}

function renderCatTecnicos(){
  var el=$('catTecnicosList'); if(!el) return;
  var tecs=getTecnicos().slice().sort(function(a,b){
    var aInactivo = a.activo===false?1:0, bInactivo = b.activo===false?1:0;
    return aInactivo - bInactivo; // activos primero, inactivos al final
  });

  if(!tecs.length){ el.innerHTML='<div style="font-size:.82rem;color:var(--text3);padding:10px 0;">No hay técnicos registrados.</div>'; return; }
  el.innerHTML=tecs.map(function(t){
    var inactivo = t.activo === false;
    return '<div class="card" style="margin-bottom:8px;opacity:'+(inactivo?'0.5':'1')+'">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">'
      +'<input value="'+escHtml(t.nombre)+'" style="font-weight:700;font-size:.9rem;border:none;background:transparent;color:var(--text);font-family:inherit;flex:1;padding:0;" onchange="tecEditarNombre(\''+t.id+'\',this.value)">'
      +'<button onclick="tecEliminar(\''+t.id+'\')" style="background:var(--red-light);color:var(--red);border:none;border-radius:var(--r-sm);padding:4px 10px;font-size:.8rem;cursor:pointer;">&#128465;</button>'
      +'</div>'
      +(t.tel?'<div style="font-size:.8rem;color:var(--text2);margin-top:4px;">📞 '+escHtml(t.tel)+'</div>':'')
      +(t.ultimaConexion?'<div style="font-size:.76rem;color:var(--text3);margin-top:2px;">🕓 Última conexión: '+_fmtFechaHora(t.ultimaConexion)+'</div>':'')
      +(t.jobs&&t.jobs.length?'<div style="font-size:.78rem;color:var(--green);margin-top:4px;">'+t.jobs.join(' · ')+'</div>':'')
      +'<div style="display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap;">'
      +'<label style="font-size:.75rem;color:var(--text2);font-weight:700;">PIN</label>'
      +'<input type="text" inputmode="numeric" maxlength="4" value="'+escHtml(_pinesVisibles[_idAcceso(t.nombre)]||'')+'" placeholder="'+(t.tienePin?'PIN nuevo':'sin PIN')+'" title="Escribe 4 cifras para '+(t.tienePin?'cambiar el PIN':'ponerle PIN')+'" style="width:80px;padding:5px 8px;border:1.5px solid var(--border);border-radius:var(--r-sm);font-size:.9rem;letter-spacing:.2em;text-align:center;background:var(--surface2);color:var(--text);font-family:inherit;" onchange="tecEditarPin(\''+t.id+'\',this)">'
      +(t.tienePin?'<span title="Tiene PIN" style="font-size:.9rem;">&#128274;</span>':'')
      +'<button onclick="tecTogglePrincipal(\''+t.id+'\','+(t.principal===false)+')" title="Llenar parte: ve toda la app. Sin marcar solo ve Estadísticas y Registro de horario" style="padding:4px 10px;border-radius:var(--r-sm);border:1.5px solid '+(t.principal!==false?'var(--green)':'var(--border)')+';background:'+(t.principal!==false?'var(--green-light)':'var(--surface2)')+';color:'+(t.principal!==false?'var(--green)':'var(--text2)')+';font-size:.76rem;font-family:inherit;cursor:pointer;">📝'+(t.principal!==false?' Llenar parte ✓':' Llenar parte')+'</button>'
      +'<button onclick="tecToggleMatFlotante(\''+t.id+'\','+(!t.matFlotante)+')" title="Permitir introducir material flotante" style="padding:4px 10px;border-radius:var(--r-sm);border:1.5px solid '+(t.matFlotante?'var(--green)':'var(--border)')+';background:'+(t.matFlotante?'var(--green-light)':'var(--surface2)')+';color:'+(t.matFlotante?'var(--green)':'var(--text2)')+';font-size:.76rem;font-family:inherit;cursor:pointer;">🧩'+(t.matFlotante?' Mat. flotante ✓':' Mat. flotante')+'</button>'
      +'<button onclick="tecToggleActivo(\''+t.id+'\','+inactivo+')" style="margin-left:auto;padding:4px 12px;border-radius:var(--r-sm);border:1.5px solid var(--border);background:var(--surface2);color:var(--text2);font-size:.78rem;font-family:inherit;cursor:pointer;">'+(inactivo?'✅ Activar':'⛔ Desactivar')+'</button>'
      +'</div>'
      +'</div>';
  }).join('');
}

// Devuelve una promesa que se resuelve al terminar (también si falla, el fallo queda registrado)
function _subirTecnicoAFirestore(t){
  try{
    if(typeof _db === 'undefined' || !_db) return Promise.resolve();
    if(!t.nombre) return Promise.resolve(); // solo se necesita el nombre — el PIN es opcional (ayudantes sin login propio)
    var docId = t.nombre.toLowerCase().replace(/ /g,'_');
    return _db.collection('usuario').doc(docId).get().then(function(doc){
      var rolesExistentes = (doc.exists && doc.data().roles) || [];
      var roles = rolesExistentes.indexOf('tecnico')>=0 ? rolesExistentes : rolesExistentes.concat(['tecnico']);
      var datos = {
        nombre: t.nombre, activo: t.activo!==false, roles: roles, matFlotante: !!t.matFlotante
      };
      if(t.activoDesde) datos.activoDesde = t.activoDesde;
      if(typeof t.principal==='boolean') datos.principal = t.principal;
      return _db.collection('usuario').doc(docId).set(datos, {merge:true});
    }).catch(_fallo('_subirTecnicoAFirestore usuario.set #1'));
  }catch(e) { _fallo('_subirTecnicoAFirestore usuario.set #2')(e); return Promise.resolve(); }
}

function tecEditarNombre(id, nuevoNombre){
  nuevoNombre = nuevoNombre.trim();
  if(!nuevoNombre) return;
  var tecs=getTecnicos();
  var t=tecs.find(function(t){return t.id===id;});
  if(t){
    var nombreViejo=t.nombre;
    t.nombre=nuevoNombre; setTecnicos(tecs); _subirTecnicoAFirestore(t);
    // Borrar el documento de Firestore con el nombre antiguo — si no, queda huérfano con
    // su PIN y su estado "activo" de siempre, y ese nombre antiguo seguiría sirviendo para
    // entrar aunque el técnico se desactive después bajo el nombre nuevo
    var docIdViejo=nombreViejo.toLowerCase().replace(/ /g,'_');
    var docIdNuevo=nuevoNombre.toLowerCase().replace(/ /g,'_');
    if(docIdViejo!==docIdNuevo && typeof _db !== 'undefined' && _db){
      _db.collection('usuario').doc(docIdViejo).delete().catch(_fallo('tecEditarNombre usuario.delete'));
    }
  }
}

function tecEditarPin(id, input){
  var pin = input.value.trim();
  if(!pin) return;
  if(!/^\d{4}$/.test(pin)){ input.value=''; alert('El PIN debe tener 4 cifras.'); return; }
  var t=getTecnicos().find(function(t){return t.id===id;});
  if(!t) return;
  _fijarPin(t.nombre, pin).then(function(r){
    if(r.ok){ _tecMarcarConPin(id); alert('PIN de '+t.nombre+' guardado.'); }
    else alert('No se pudo guardar el PIN: '+_textoErrorPin(r.error));
  });
}

function tecToggleActivo(id, activarAhora){
  var tecs=getTecnicos();
  var t=tecs.find(function(t){return t.id===id;});
  if(t){ t.activo=activarAhora; if(activarAhora) t.activoDesde=hoy(); setTecnicos(tecs); renderCatTecnicos(); _subirTecnicoAFirestore(t); }
}

function tecToggleMatFlotante(id, activarAhora){
  var tecs=getTecnicos();
  var t=tecs.find(function(t){return t.id===id;});
  if(t){ t.matFlotante=activarAhora; setTecnicos(tecs); renderCatTecnicos(); _subirTecnicoAFirestore(t); }
}

// Técnico principal: el que llena partes y ve toda la app. Sin "Principal" solo ve Estadísticas y Registro de horario.
// Solo cuenta como no principal si se desactivó a propósito (principal===false); sin marcar es principal, como hasta ahora.
function tecTogglePrincipal(id, activarAhora){
  var tecs=getTecnicos();
  var t=tecs.find(function(t){return t.id===id;});
  if(t){ t.principal=activarAhora; setTecnicos(tecs); renderCatTecnicos(); _subirTecnicoAFirestore(t); }
}
// Admin, y quien entra con rol de técnico siendo admin (multiRol), ven siempre toda la app.
function _esTecnicoSinPrincipal(){
  var s=window._sesion;
  if(!s || s.rol!=='tecnico' || s.multiRol) return false;
  var t=getTecnicos().find(function(x){ return x.nombre.toLowerCase()===s.nombre.toLowerCase(); });
  return !!(t && t.principal===false);
}

function catTab(tab,btn){
  document.querySelectorAll('.cat-tab').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
  var m=$('catTabMat'),c=$('catTabConc'),f=$('catFamiliaView'),tc=$('catTabTec'),ag=$('catTabAgenda');
  m.style.display=tab==='materiales'?'block':'none';
  c.style.display=tab==='conceptos'?'block':'none';
  if(tc) tc.style.display=tab==='tecnicos'?'block':'none';
  if(ag) ag.style.display=tab==='agenda'?'block':'none';
  if(f) f.style.display='none';
  if(tab==='materiales') renderCatGrupos();
  else if(tab==='tecnicos'){ renderCatTecnicos(); _cargarPinesVisibles(); }
  else if(tab==='agenda') renderCatAgenda();
  else renderCatConceptos();
}

function renderCatGrupos(){
  var cat=getCat();
  var el=$('catFamiliasList'); if(!el) return;
  var flotantes=getMaterialesFlotantes();
  var html='';
  cat.grupos.forEach(function(g,gi){
    var total=0;
    (g.secciones||[]).forEach(function(s){
      total+=(s.mats||[]).length;
      (s.subsecs||[]).forEach(function(ss){total+=(ss.mats||[]).length;});
    });
    var pendientes=flotantes.filter(function(f){return f.grupo===g.nombre;}).length;
    var badgeFlot=pendientes>0?'<span style="background:var(--amber);color:#fff;font-size:.66rem;font-weight:700;padding:1px 6px;border-radius:20px;margin-left:5px;">'+pendientes+'</span>':'';
    var div='<div class="cat-familia" data-gid="'+g.id+'" onclick="catAbrirGrupo(this.dataset.gid)">'
      +'<span class="cat-familia-ico">'+g.ico+'</span>'
      +'<span class="cat-familia-name">'+g.nombre+badgeFlot+'</span>'
      +'<span class="cat-familia-cnt">'+total+' &#8250;</span></div>';
    html+=div;
  });
  html+='<div style="margin-top:8px;"><button class="btn-add-mat" style="width:100%;padding:10px;" onclick="catNuevoGrupo()">+ Nuevo grupo</button></div>';
  el.innerHTML=html;
}
function catAbrirGrupo(gid){
  _catState.grupoAb=gid;_catState.secAb=null;_catState.subAb=null;_catState.addCtx=null;
  _catNav={nivel:'secciones',grupoId:gid,secIdx:-1,subIdx:-1};
  $('catTabMat').style.display='none';
  $('catFamiliaView').style.display='block';
  catNavRender();
}

