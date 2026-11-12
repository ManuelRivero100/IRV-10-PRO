// ===== REGISTRO DE CARGAS DE LA APP (para saber por que sale el logo) =====
// Cada vez que la pagina se carga de cero se anota en el movil: como arranco (apertura nueva, recarga o volver atras), si Android la habia
// descartado de memoria (document.wasDiscarded) y como quedo la vez anterior (en uso, en segundo plano o cerrada) y hace cuanto. Con eso se ve
// si el logo sale porque Android mata la app al estar en segundo plano o por otra causa. Solo anota; no cambia nada de como funciona la app.
(function(){
  var K = 'pm_cargas', V = 'pm_vivo';
  var s; try { s = window.localStorage; s.getItem(K); } catch(e){ return; }
  var ahora = Date.now(), prev = null;
  try { prev = JSON.parse(s.getItem(V) || 'null'); } catch(e){}
  var nav = '';
  try { var n = performance.getEntriesByType('navigation')[0]; nav = (n && n.type) || ''; } catch(e){}
  var reg = {ts: ahora, nav: nav, desc: document.wasDiscarded === true, vis: document.visibilityState, ses: !!s.getItem('irv_sesion'),
    prev: prev ? {estado: prev.estado, hace: ahora - prev.t} : null};
  var lista = [];
  try { lista = JSON.parse(s.getItem(K) || '[]'); } catch(e){}
  lista.push(reg); if(lista.length > 30) lista = lista.slice(-30);
  try { s.setItem(K, JSON.stringify(lista)); } catch(e){}
  // Lo ultimo que se supo de la pagina: la hora y si estaba en uso, en segundo plano o cerrandose
  function vivo(estado){ try { s.setItem(V, JSON.stringify({t: Date.now(), estado: estado})); } catch(e){} }
  vivo(document.visibilityState === 'visible' ? 'visible' : 'oculta');
  document.addEventListener('visibilitychange', function(){ vivo(document.visibilityState === 'visible' ? 'visible' : 'oculta'); });
  window.addEventListener('pagehide', function(){ vivo('cerrada'); });
  setInterval(function(){ if(document.visibilityState === 'visible') vivo('visible'); }, 20000);

  function z(n){ return (n < 10 ? '0' : '') + n; }
  function hora(ms){ var d = new Date(ms); return z(d.getDate()) + '/' + z(d.getMonth() + 1) + ' ' + z(d.getHours()) + ':' + z(d.getMinutes()) + ':' + z(d.getSeconds()); }
  function dur(ms){ if(ms < 90000) return Math.round(ms / 1000) + ' s'; if(ms < 5400000) return Math.round(ms / 60000) + ' min'; return (ms / 3600000).toFixed(1) + ' h'; }
  var NOMBRES = {navigate: 'apertura nueva', reload: 'recarga', back_forward: 'volver atras', prerender: 'precarga'};
  window._textoCargas = function(){
    var l = []; try { l = JSON.parse(s.getItem(K) || '[]'); } catch(e){}
    return 'CARGAS DE LA APP (las ultimas, la mas nueva arriba)\n' + (l.length ? l.slice(-12).reverse().map(function(x){
      var a = hora(x.ts) + ' - ' + (NOMBRES[x.nav] || x.nav || '?') + (x.desc ? ' - ANDROID LA HABIA DESCARTADO DE MEMORIA' : '') + ' - sesion ' + (x.ses ? 'si' : 'no');
      if(x.prev) a += ' - antes: ' + (x.prev.estado === 'visible' ? 'estaba en uso' : (x.prev.estado === 'oculta' ? 'estaba en segundo plano' : 'se cerro')) + ' hace ' + dur(x.prev.hace);
      return a;
    }).join('\n') : '(sin cargas anotadas todavia)');
  };
})();
