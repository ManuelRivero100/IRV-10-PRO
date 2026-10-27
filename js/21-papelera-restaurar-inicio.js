// ===== PAPELERA (pantalla) =====
function abrirPapelera(){
  if(!(window._sesion && window._sesion.rol==='admin')) return;
  _verificarConexionFirestore(function(hayConexion){
    if(!hayConexion){ _toast('Necesitas conexión a internet para acceder a la papelera.', _AVISO_ROJO); return; }
    goTo('w-papelera');
    _renderPapelera();
  });
}
function _renderPapelera(){
  var el=$('papeleraLista'); if(!el) return;
  el.innerHTML='<p style="font-size:.85rem;color:var(--text2);padding:10px 0;">Consultando…</p>';
  if(typeof _db==='undefined'||!_db){ el.innerHTML='<p style="font-size:.85rem;color:var(--text2);padding:10px 0;">Necesitas conexión a internet.</p>'; return; }
  _db.collection('papelera').get().then(function(snap){
    var items=[]; snap.forEach(function(d){ items.push(Object.assign({_id:d.id}, d.data())); });
    items.sort(function(a,b){ return (b.eliminadoFecha||0)-(a.eliminadoFecha||0); });
    if(!items.length){ el.innerHTML='<p style="font-size:.85rem;color:var(--text2);padding:10px 0;">La papelera está vacía.</p>'; return; }
    el.innerHTML = items.map(function(it){
      var d = it.datos||{};
      var etiqueta = it.coleccionOriginal==='partes'
        ? ('Parte · '+escHtml(d.tienda||'')+' · '+escHtml(d.fecha||'')+(d.numParte?(' · Nº '+escHtml(d.numParte)):''))
        : it.coleccionOriginal==='tareasPendientes'
        ? ('Tarea · '+escHtml(d.tienda||d.cliente||'')+' · '+escHtml(d.tecnico||''))
        : ('Incidencia · '+escHtml(d.tienda||'')+' · '+escHtml(d.pedido||''));
      return '<div class="card">'
        +'<div style="font-size:.9rem;font-weight:700;margin-bottom:4px;">'+etiqueta+'</div>'
        +'<div style="font-size:.78rem;color:var(--text2);margin-bottom:10px;">Borrado por '+escHtml(it.eliminadoPor||'—')+' · '+_fmtFechaHora(it.eliminadoFecha||0)+'<br>Motivo: '+escHtml(it.eliminadoRazon||'—')+'</div>'
        +'<div class="brow">'
        +'<button class="btn btn-g btn-sm" onclick="_restaurarDePapeleraUI(\''+it._id+'\')">&#9989; Restaurar</button>'
        +'</div></div>';
    }).join('');
  }).catch(function(){ el.innerHTML='<p style="font-size:.85rem;color:var(--red);padding:10px 0;">Error al consultar la papelera.</p>'; });
}
function _restaurarDePapeleraUI(idPapelera){
  _restaurarDePapelera(idPapelera).then(function(){ _renderPapelera(); }).catch(function(){ _toast('No se pudo restaurar. Comprueba tu conexión e inténtalo de nuevo.', _AVISO_ROJO); });
}

// Arranca la comprobación de versión automática, en el mismo bloque donde vive la función —
// funciona desde que carga la página, sin esperar a que haya sesión iniciada.
_iniciarActualizacionPeriodica();
