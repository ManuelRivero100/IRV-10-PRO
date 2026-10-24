// ===== COPIAS DE SEGURIDAD =====
// Se genera sola, una vez al día, al entrar como admin (ver _comprobarBackupDiario,
// llamada desde _aplicarSesion). Vive en su propia colección 'backups', separada de los datos
// reales, para que un dato mal escrito en 'partes' nunca toque una copia ya guardada. Los
// partes se dividen en bloques de hasta ~90% de 1MB por antigüedad porque un documento de
// Firestore no puede superar 1MB y el historial de partes no deja de crecer; el resto
// (incidencias/catálogo/agenda/técnicos) es pequeño y cabe siempre en un solo documento.
var BACKUP_LIMITE_BYTES = 900*1024;

function _tamanoJSON(obj){ return new Blob([JSON.stringify(obj)]).size; }

function _construirBloquesPartes(partesOrdenados){
  var bloques=[], actual=[], actualBytes=2;
  partesOrdenados.forEach(function(p){
    var tam=_tamanoJSON(p)+1;
    if(actual.length && (actualBytes+tam)>BACKUP_LIMITE_BYTES){
      bloques.push(actual); actual=[]; actualBytes=2;
    }
    actual.push(p); actualBytes+=tam;
  });
  if(actual.length || !bloques.length) bloques.push(actual);
  return bloques;
}

function _comprobarBackupDiario(){
  if(typeof _db==='undefined'||!_db) return;
  var hoy=new Date().toISOString().slice(0,10);
  _db.collection('backups').doc('meta').get().then(function(doc){
    var meta=doc.exists?doc.data():null;
    if(meta && meta.ultimaFechaBackup===hoy) return; // ya se hizo hoy, en cualquier dispositivo
    _generarBackupCompleto(hoy);
  }).catch(_fallo('_comprobarBackupDiario backups.get'));
}

// callback (opcional) recibe (true) si se guardó, o (false, motivo) si falló; lo usa el botón "Generar ahora"
function _generarBackupCompleto(hoy, callback){
  if(typeof _db==='undefined'||!_db){ if(callback) callback(false,'Sin conexión.'); return; }
  _db.collection('partes').get().then(function(snap){
    var partes=[]; snap.forEach(function(d){ partes.push(d.data()); });
    partes.sort(function(a,b){ return (a.fecha||'').localeCompare(b.fecha||''); });
    var bloques=_construirBloquesPartes(partes);
    var batch=_db.batch();
    bloques.forEach(function(items,i){
      batch.set(_db.collection('backups').doc('partes_'+i), {
        items:items, cantidad:items.length,
        fechaDesde: items.length?items[0].fecha:null,
        fechaHasta: items.length?items[items.length-1].fecha:null,
        cerrado: i<bloques.length-1,
        tamanoBytes: _tamanoJSON(items)
      });
    });
    return batch.commit().then(function(){
      return Promise.all([
        _db.collection('config').doc('catalogo').get(),
        _db.collection('incidencias').get(),
        _db.collection('agenda').get(),
        _db.collection('usuario').get()
      ]);
    }).then(function(res){
      var catDoc=res[0], incSnap=res[1], agSnap=res[2], usrSnap=res[3];
      var incidencias=[]; incSnap.forEach(function(d){ incidencias.push(Object.assign({_id:d.id},d.data())); });
      var agenda=[]; agSnap.forEach(function(d){ agenda.push(Object.assign({_id:d.id},d.data())); });
      var usuarios=[]; usrSnap.forEach(function(d){ usuarios.push(Object.assign({_id:d.id},d.data())); });
      var batch2=_db.batch();
      batch2.set(_db.collection('backups').doc('incidencias'), {items:incidencias, cantidad:incidencias.length});
      batch2.set(_db.collection('backups').doc('catalogo'), {data: catDoc.exists?(catDoc.data().catalogo||null):null});
      batch2.set(_db.collection('backups').doc('agenda'), {items:agenda, cantidad:agenda.length});
      batch2.set(_db.collection('backups').doc('usuarios'), {items:usuarios, cantidad:usuarios.length});
      batch2.set(_db.collection('backups').doc('meta'), {
        ultimaFechaBackup:hoy, numBloquesPartes:bloques.length,
        totalPartesRespaldados:partes.length, totalIncidencias:incidencias.length,
        fechaActualizacion:Date.now()
      });
      return batch2.commit();
    });
  }).then(function(){ if(callback) callback(true); }).catch(function(e){
    if(callback) callback(false, e && e.message); else _fallo('_generarBackupCompleto')(e);
  });
}

function abrirBackups(){
  if(!(window._sesion && window._sesion.rol==='admin')) return;
  _verificarConexionFirestore(function(hayConexion){
    if(!hayConexion){ alert('Necesitas conexión a internet para acceder a las copias de seguridad.'); return; }
    goTo('w-backups');
    _verEstadoBackups();
  });
}

function _verEstadoBackups(){
  var el=$('backupsEstado'); if(el) el.textContent='Consultando…';
  _db.collection('backups').doc('meta').get().then(function(doc){
    if(!el) return;
    if(!doc.exists){ el.textContent='Todavía no se ha generado ninguna copia de seguridad.'; return; }
    var m=doc.data();
    var bloquesLlenos=Math.max(0,m.numBloquesPartes-1);
    return _db.collection('backups').doc('partes_'+(m.numBloquesPartes-1)).get().then(function(ultimoBloque){
      var tam = ultimoBloque.exists?(ultimoBloque.data().tamanoBytes||0):0;
      var porcentaje = Math.min(100, Math.round((tam/BACKUP_LIMITE_BYTES)*100));
      el.innerHTML = 'Última copia: <strong>'+escHtml(m.ultimaFechaBackup||'—')+'</strong><br>'
        +m.totalPartesRespaldados+' partes · '+(m.totalIncidencias||0)+' incidencias<br>'
        +bloquesLlenos+' bloque'+(bloquesLlenos===1?'':'s')+' lleno'+(bloquesLlenos===1?'':'s')+' y '
        +'bloque actual al '+porcentaje+'% ('+(tam/1024).toFixed(1)+' KB de '+(BACKUP_LIMITE_BYTES/1024).toFixed(0)+' KB)';
    });
  }).catch(function(){ if(el) el.textContent='Error al consultar.'; });
}

function _generarBackupManual(){
  if(!(window._sesion && window._sesion.rol==='admin')) return;
  var btn=$('btnGenerarBackupManual'); if(btn){ btn.disabled=true; btn.textContent='Generando…'; }
  var hoy=new Date().toISOString().slice(0,10);
  _generarBackupCompleto(hoy, function(exito, error){
    if(btn){ btn.disabled=false; btn.innerHTML='&#128190; Generar ahora'; }
    if(exito){ showMsg('backupsMsg','Copia de seguridad generada.','success'); _verEstadoBackups(); }
    else { showMsg('backupsMsg','Error al generar: '+(error||'desconocido'),'error'); }
  });
}
