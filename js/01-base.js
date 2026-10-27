
/*
=======================================================================
PARTES IRV-10 — GUÍA DE ARQUITECTURA Y DIRECTRICES DE MODIFICACIÓN
=======================================================================

FILOSOFÍA PRINCIPAL:
  Antes de crear algo nuevo, busca qué protocolo ya existe y reutilízalo.
  El error más común es crear lógica nueva para algo que ya está resuelto.

=======================================================================
PROTOCOLOS EXISTENTES
=======================================================================

1. TIPO DE TRABAJO — setJob(job, btn)
   - Determina códigos de facturación, franjas y secciones de materiales
   - TOCA cuando cambies tipos de trabajo o códigos
   - NO TOQUES para añadir campos al formulario

2. DATOS DE LA ORDEN — leer(), buscarPorOrden(), buscarPorCentroORef(), rellenarDatos()
   - Auto-relleno desde texto pegado o desde historial
   - Clientes no-Mercadona usan getNextCodLugar() y buscarRefNoMerc()
   - TOCA solo aquí para cambiar cómo se rellenan campos
   - NO CREES un nuevo auto-relleno si ya existe uno

3. TRAYECTORIA — setOrigen(), setLink(), checkAutoEnlace(), resetAE(), _activarEnlaceAuto()
   - Origen: Desde la nave (normal) / Otro punto (ida y vuelta manuales, no sale de la nave)
   - "Desde la nave" tiene 3 modos de enlace: No / Si / Auto (detecta parte anterior del mismo día)
   - "Otro punto" NO usa enlace — checkAutoEnlace() se sale sin hacer nada si curOrigen==='otro'
   - Auto-enlace se activa de 2 formas (checkAutoEnlace()): (1) por tienda destino ya anunciada
     — si el parte anterior declaró "Con enlace" hacia el Nº de centro que se acaba de escribir,
     enlaza al instante sin mirar la hora (más fiable en trayectos largos); (2) si no hay destino
     anunciado o no coincide, cae al margen de 15 min sobre la hora de llegada estimada, como antes
   - TOCA solo aquí para cambiar cálculos de km y desplazamiento

4. FRANJAS HORARIAS — calcMin(), franjas(), gc()
   - calcMin() calcula minutos por tipo (Normal/Extra/Nocturna/Festiva)
   - gc() asigna códigos de facturación según tipo de trabajo y rol
   - NO TOQUES estas funciones salvo para cambiar tarifas o códigos

5. TRABAJADORES — renderWorkers(), setWR()
   - wRoles[] = roles (Oficial/Peón), wNames[] = nombres (en memoria)
   - Los nombres NO se guardan en el objeto del parte, solo en el detalle HTML
   - Para recuperar nombres al editar: extraer del detalle HTML

6. DIETA — calculada en generarCore()
   - Automática: acumula totalMin del día por cliente
   - NO crear lógica de dieta fuera de generarCore()

7. MATERIALES — msRender(cid), msInitSel(mats), msGetSel()
   - _MS.sel = materiales del catálogo seleccionados
   - _MS.extras = materiales encontrados por búsqueda y añadidos manualmente
   - msGetSel() devuelve AMBOS — usar siempre para recoger materiales
   - msInitSel() separa automáticamente sel de extras según catálogo
   - El parámetro cid indica el contenedor donde renderizar
   - REGLA: para usar materiales en un contexto nuevo, pasar el cid correcto
   - NO crear un nuevo sistema de materiales, reutilizar ms*

8. FORMULARIO COMPLETO — nuevo(), adaptarFormularioACliente()
   - nuevo() resetea TODO el formulario (incluyendo _editIdx)
   - adaptarFormularioACliente() adapta campos según tipo de cliente
   - REGLA: para precargar datos en el formulario, llamar nuevo() primero
     y luego sobreescribir los campos necesarios

9. GUARDADO — guardarConEstado(), _finalizarGuardado()
   - Si _editIdx !== null, reemplaza el parte existente en lugar de añadir
   - Si _editIdx === null, añade un parte nuevo
   - REGLA: para editar un parte, setear _editIdx antes de guardar

10. HISTORIAL — getH(), setH(), getOrdenes(), verOrden(), verParte()
    - getH()/setH() son el único punto de acceso al almacenamiento
    - NO acceder a localStorage directamente para partes

11. HORAS ADICIONALES (control interno por técnico) — abrirHoras(), horasCalcular(), horasGuardar()
    - Un registro por técnico y día: colección propia horasAdicionales + copia local pm_horas
    - NO toca partes ni facturación; reutiliza calcMin()/franjas() sin modificarlas
    - Guarda primero en local (_pendienteSync) y sube a Firestore al haber conexión
    - Lun-vie: adicionales = total - 8 h (las horas fuera de 8:00-16:00, en orden); sábado, domingo y festivo: todo es adicional
    - Casilla Dieta (viaje con pernocta): se guarda como dieta:true/false en cada registro; sale marcada sola si el día
      anterior la tenía. Primer día = ida; intermedio = solo tienda; el día que se quita = regreso (vuelta). El papel de
      cada día se deduce del registro del día anterior, no se guarda

=======================================================================
REGLAS DE MODIFICACIÓN
=======================================================================

  ✓ Para EDITAR un parte existente:
    → Cargar datos en el formulario con abrirEdicionParte()
    → El formulario ya tiene todos los protocolos activos
    → Al guardar, _editIdx indica qué parte reemplazar

  ✓ Para AÑADIR un campo nuevo:
    → Añadirlo al HTML del formulario
    → Guardarlo en window.recTmp dentro de generarCore()
    → Leerlo en verParte() para mostrarlo

  ✓ Para REUTILIZAR un protocolo en otro contexto:
    → No copiar la lógica, llamar a la función original
    → Pasar los parámetros necesarios (ej: cid en msRender)

  ✗ NO crear lógica paralela a algo que ya existe
  ✗ NO hardcodear IDs de contenedores en funciones reutilizables
  ✗ NO modificar franjas/codigos sin entender el impacto en facturación
  ✗ NO guardar en localStorage directamente, usar getH()/setH()

=======================================================================
*/

// Marca de versión — se actualiza en cada entrega. Sirve para que la app detecte sola cuando hay una versión nueva desplegada.
// APP_BUILD_ID: se define en index.html (ahi lo lee la comprobacion de version).

var $ = function(id){ return document.getElementById(id); };

function hoy(){
  var d=new Date();
  var y=d.getFullYear();
  var m=String(d.getMonth()+1).padStart(2,'0');
  var day=String(d.getDate()).padStart(2,'0');
  return y+'-'+m+'-'+day;
}
function goToRaw(id){
  document.querySelectorAll('.win').forEach(function(w){ w.classList.remove('active'); });
  var el=$(id); if(el) el.classList.add('active');
  window.scrollTo(0,0);
}
// Aviso de parte sin guardar: se dispara al intentar salir del formulario con
// contenido real (observación y/o materiales marcados) sin haber guardado, y
// también automáticamente al minuto 4 de inactividad (1 min antes de que la
// pantalla se apague por el Wake Lock). No guarda ni restaura nada — solo avisa.
function _parteTieneContenidoSinGuardar(){
  // En la pantalla del parte generado, está sin guardar mientras el botón "Guardar parte" siga activo
  var res=$('w-result');
  if(res && res.classList.contains('active')){ var g=$('gbtn'); return !!(g && !g.disabled); }
  var w=$('w-form');
  if(!w || !w.classList.contains('active')) return false;
  var obs=$('obs');
  var tieneObs = !!(obs && obs.value.trim().length>0);
  var tieneMat = !!((window._MS && _MS.sel && Object.keys(_MS.sel).some(function(k){return _MS.sel[k];}))
    || (window._MS && _MS.extras && Object.keys(_MS.extras).length>0));
  return tieneObs || tieneMat;
}
function _vibrarAviso(){
  if(navigator.vibrate) navigator.vibrate([200,100,200,100,200]);
}
var _gotoPendiente=null;
var _saltarAvisoParteSinGuardar=false;
function _mostrarAvisoParteSinGuardar(destino){
  _gotoPendiente=destino||null;
  _vibrarAviso();
  var d=$('dlgParteSinGuardar'); if(d) d.classList.add('show');
}
function _cerrarAvisoParteSinGuardar(salir){
  var d=$('dlgParteSinGuardar'); if(d) d.classList.remove('show');
  if(salir && _gotoPendiente){
    var destino=_gotoPendiente;
    _gotoPendiente=null;
    _saltarAvisoParteSinGuardar=true;
    goTo(destino);
  } else {
    _gotoPendiente=null;
  }
}
function goTo(id){
  if(id!=='w-form' && !_saltarAvisoParteSinGuardar && _parteTieneContenidoSinGuardar()){
    _mostrarAvisoParteSinGuardar(id);
    return;
  }
  _saltarAvisoParteSinGuardar=false;
  goToRaw(id);
  if(id==='w-form'&&!_keepForm){ mostrarDlgInicioOrden(); } if(id==='w-form') setTimeout(function(){ if($('pedido')&&$('pedido').value.length>2) ocultarLectura(); },100);
  _keepForm=false;
  if(id==='w-hist'){
    // Al entrar en el historial la búsqueda empieza vacía: si no, el texto de la visita anterior seguía recortando listas y contadores
    if($('busca')) $('busca').value=''; if($('buscaF')) $('buscaF').value='';
    refreshCounts(); renderHistTecBtns(); renderSearchResults();
  }
  if(id==='w-stats') statsInit();
  if(id==='w-catalogo'){
    // Siempre se abre en la pestaña Materiales: se oculta también la pestaña en la que se salió (Técnicos, Agenda…), que si no quedaba a la vista junto a Materiales
    var pestMat=document.querySelector('#w-catalogo .cat-tab');
    if(pestMat) catTab('materiales',pestMat);
    catActualizarBadge();
  }
  if(id==='w-clientes'){
    curCliente=null;
    $('hdr-sub').textContent='Selecciona un cliente';
    // Resetear vistas del historial (solo visibilidad, no contenido)
    ['secView','centrosView','incidenciasView','ordenView','parteView'].forEach(function(vid){
      var el=document.getElementById(vid); if(el) el.style.display='none';
    });
    var rtv=$('resumenTotalView'); if(rtv) rtv.style.display='none';
    var rcv=$('resumenCentroView'); if(rcv) rcv.style.display='none';
    var ho=$('histOpts'); if(ho) ho.style.display='block';
    window._ordenActual=null;
    window._incidenciasCache=[];
    _centrosCache=[];
    _secActual='';
    _sincronizarClientesDesdeFirestore();
    renderClientes();
    renderAsgTecnico();
    renderAsgAdmin();
    actualizarBadgeTareas();
  }
  if(id==='w-menu'&&curCliente){ resetearEstadoCompleto(); renderMenu(); }
}

// Botones "Atrás" / "Inicio" (.navrow): la barra de la pantalla se oculta cuando una vista interior (historial, estadísticas,
// catálogo) muestra la suya, y en el formulario "Inicio" sobra si "Atrás" ya lleva al inicio (incidencia asignada).
// Se vuelve a calcular cuando cambia el estilo o la clase de cualquier elemento, para no depender de cada función que muestra u oculta vistas.
function _navSincronizar(){
  var w=document.querySelector('.win.active'); if(!w) return;
  var barras=w.querySelectorAll('.navrow'); if(!barras.length) return;
  var top=null;
  for(var i=0;i<w.children.length;i++){ if(w.children[i].classList.contains('navrow')){ top=w.children[i]; break; } }
  if(top){
    var interiorVisible=false;
    for(var j=0;j<barras.length;j++){ if(barras[j]!==top && barras[j].getClientRects().length) interiorVisible=true; }
    var v=interiorVisible?'none':'';
    if(top.style.display!==v) top.style.display=v;
  }
  var fi=$('formInicio');
  if(fi){ var vf=window._asgTecActual?'none':''; if(fi.style.display!==vf) fi.style.display=vf; }
}
var _navPendiente=false;
function _navProgramar(){
  if(_navPendiente) return;
  _navPendiente=true;
  setTimeout(function(){ _navPendiente=false; _navSincronizar(); },30);   // un temporizador y no requestAnimationFrame: éste se pausa con la página en segundo plano
}
function _navIniciar(){
  _navSincronizar();
  new MutationObserver(_navProgramar).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class']});
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',_navIniciar); else _navIniciar();

