// ===== INIT APP =====
function parsearCodigos(detalle, roles){
  var nTrabajadores = roles ? roles.length : 1;
  var codigos=[];
  var tmp=document.createElement('div'); tmp.innerHTML=detalle||'';
  tmp.querySelectorAll('.rrow:not(.info-row):not(.total-row):not(.obs-row):not(.tipo-row)').forEach(function(row){
    var rc=row.querySelector('.rc')?row.querySelector('.rc').textContent.trim():'';
    var rl=row.querySelector('.rl')?row.querySelector('.rl').textContent.trim():'';
    var rv=row.querySelector('.rv')?row.querySelector('.rv').textContent.trim():'';
    if(!rc||!rl||!rv) return;
    var km=rv.match(/^([\d.]+)\s*km$/i);
    if(km){ codigos.push({cod:rc,lab:rl,v:parseFloat(km[1]),u:'km'}); return; }
    if(/^[×x×]\s*\d+$/.test(rv.trim())){ codigos.push({cod:rc,lab:rl,v:nTrabajadores,u:'dieta'}); return; }
    var idx=rv.lastIndexOf('=');
    var hs=idx>=0?rv.slice(idx+1).trim():rv.trim();
    var total=0;
    var entero=hs.match(/^(\d+)h/); if(entero) total+=parseInt(entero[1]);
    var frac=hs.match(/(\d+)\/(\d+)/); if(frac) total+=parseInt(frac[1])/parseInt(frac[2]);
    if(total>0) codigos.push({cod:rc,lab:rl,v:total,u:'h'});
  });
  return codigos;
}

// =====================================================
// MÓDULO ESTADÍSTICAS v2
// =====================================================
var _statsPeriodo = 'todo';
var _statsVista = 'concepto';

function fmtHStats(h){
  if(!h) return '-';
  var w=Math.floor(h); var d=Math.round((h-w)*4)/4;
  if(d===0) return w+' h';
  if(d===0.25) return w+' h 1/4';
  if(d===0.5) return w+' h 1/2';
  if(d===0.75) return w+' h 3/4';
  return h+' h';
}

function statsRenderTecnicos(datos){
  var sec=$('statsTecSection'); var list=$('statsTecList');
  if(!sec||!list) return;
  if(!datos||!datos.length){ sec.style.display='none'; return; }
  var tecMap={};
  datos.forEach(function(p){
    var tecs=p.tecnicos||[]; if(!tecs.length) return;
    var n=tecs.length; var codigos=p.codigos||[];
    var hNor=codigos.filter(function(c){return c.u==='h'&&c.lab.indexOf('Nor')>=0&&c.lab.indexOf('Dsp')<0;}).reduce(function(a,c){return a+c.v;},0);
    var hExt=codigos.filter(function(c){return c.u==='h'&&c.lab.indexOf('Ext')>=0&&c.lab.indexOf('Dsp')<0;}).reduce(function(a,c){return a+c.v;},0);
    var hNoc=codigos.filter(function(c){return c.u==='h'&&c.lab.indexOf('Noc')>=0&&c.lab.indexOf('Dsp')<0;}).reduce(function(a,c){return a+c.v;},0);
    var hFes=codigos.filter(function(c){return c.u==='h'&&c.lab.indexOf('Fes')>=0&&c.lab.indexOf('Dsp')<0;}).reduce(function(a,c){return a+c.v;},0);
    tecs.forEach(function(tec){
      if(!tecMap[tec]) tecMap[tec]={partes:[],nor:0,ext:0,noc:0,fes:0,fechas:[]};
      var s=tecMap[tec];
      s.partes.push(p); s.nor+=hNor/n; s.ext+=hExt/n; s.noc+=hNoc/n; s.fes+=hFes/n;
      s.fechas.push(p.fecha||'');
    });
  });
  var tecs=Object.keys(tecMap);
  if(window._sesion && window._sesion.rol==='tecnico'){
    var miNombre=window._sesion.nombre.toLowerCase();
    tecs=tecs.filter(function(t){ return t.toLowerCase()===miNombre; });
  }
  if(!tecs.length){ sec.style.display='none'; return; }
  sec.style.display='block';
  list.innerHTML=tecs.sort().map(function(tec){
    var s=tecMap[tec]; var total=s.nor+s.ext+s.noc+s.fes;
    var fechas=s.fechas.filter(Boolean).sort();
    var f1=fechas[0]?fechas[0].split('-').reverse().join('/').slice(0,5):'';
    var f2=fechas[fechas.length-1]?fechas[fechas.length-1].split('-').reverse().join('/'):'';
    var tiendaMap={};
    s.partes.forEach(function(p){
      var tienda=p.tienda||'Sin tienda';
      if(!tiendaMap[tienda]) tiendaMap[tienda]={ordenes:{}};
      var ord=p.pedido||p.actObras||'S/N';
      if(!tiendaMap[tienda].ordenes[ord]) tiendaMap[tienda].ordenes[ord]=[];
      tiendaMap[tienda].ordenes[ord].push(p);
    });
    var tecId='tec_'+tec.replace(/[^a-zA-Z0-9]/g,'_');
    var nClientes=Object.keys(tiendaMap).length;
    var tiendaHTML=Object.keys(tiendaMap).sort().map(function(tienda,ti){
      var ordenes=tiendaMap[tienda].ordenes;
      var nOrd=Object.keys(ordenes).length;
      var nParts=Object.values(ordenes).reduce(function(a,b){return a+b.length;},0);
      var tId=tecId+'_t'+ti;
      var ordenHTML=Object.keys(ordenes).sort().map(function(ord,oi){
        var ps=ordenes[ord].slice().sort(function(a,b){return (a.fecha||'').localeCompare(b.fecha||'');});
        var oId=tId+'_o'+oi;
        var h=getH();
        var partesHTML=ps.map(function(p,pi){
          var realIdx=-1;
          for(var k=0;k<h.length;k++){if(h[k].fecha===p.fecha&&h[k].pedido===p.pedido&&h[k].centro===p.centro){realIdx=k;break;}}
          var fP=p.fecha?p.fecha.split('-').reverse().join('/'):'--';
          return '<div class="tec-parte-row" onclick="'+(realIdx>=0?'verParte('+realIdx+')':'')+'">'+
            '<span class="tec-parte-label">Parte '+(pi+1)+(p.numParte?' ('+p.numParte+')':'')+'</span>'+
            '<span class="tec-parte-fecha">'+fP+'</span>'+
            '<span style="color:var(--text3);font-size:.75rem;">&#8250;</span></div>';
        }).join('');
        return '<div class="tec-orden-item">'+
          '<div class="tec-orden-hdr" onclick="tecToggleNivel(this,\''+oId+'\',\'o\')">'+
          '<div><div class="tec-orden-num">N&#186; '+ord+'</div><div class="tec-orden-count">'+ps.length+' parte'+(ps.length>1?'s':'')+'</div></div>'+
          '<span class="tec-chev" id="chev_o_'+oId+'">&#9660;</span></div>'+
          '<div class="tec-orden-body" id="'+oId+'">'+partesHTML+'</div></div>';
      }).join('');
      return '<div class="tec-tienda-item">'+
        '<div class="tec-tienda-hdr" onclick="tecToggleNivel(this,\''+tId+'\',\'t\')">'+
        '<div><div class="tec-tienda-name">'+tienda+'</div>'+
        '<div class="tec-tienda-sub">'+nOrd+' incidencia'+(nOrd>1?'s':'')+' &middot; '+nParts+' parte'+(nParts>1?'s':'')+'</div></div>'+
        '<span class="tec-chev" id="chev_t_'+tId+'">&#9660;</span></div>'+
        '<div class="tec-tienda-body" id="'+tId+'">'+ordenHTML+'</div></div>';
    }).join('');
    return '<div class="tec-card-s">'+
      '<div class="tec-sum">'+
        '<div class="tec-sum-hdr"><span class="tec-sum-name">'+tec+'</span><span class="tec-sum-badge">'+s.partes.length+' parte'+(s.partes.length>1?'s':'')+'</span></div>'+
        '<div class="tec-hgrid">'+
          '<div class="tec-hcell"><div class="tec-hlbl">Normal</div><div class="tec-hval'+(s.nor?'':' dim')+'">'+fmtHStats(s.nor)+'</div></div>'+
          '<div class="tec-hcell"><div class="tec-hlbl">Extra</div><div class="tec-hval'+(s.ext?'':' dim')+'">'+fmtHStats(s.ext)+'</div></div>'+
          '<div class="tec-hcell"><div class="tec-hlbl">Nocturna</div><div class="tec-hval'+(s.noc?'':' dim')+'">'+fmtHStats(s.noc)+'</div></div>'+
          '<div class="tec-hcell"><div class="tec-hlbl">Festiva</div><div class="tec-hval'+(s.fes?'':' dim')+'">'+fmtHStats(s.fes)+'</div></div>'+
          '<div class="tec-htotal"><span style="font-size:.72rem;color:var(--green);">Total horas</span><span class="tec-htval">'+fmtHStats(total)+'</span></div>'+
        '</div>'+
        '<div class="tec-mmeta"><span>&#128205; '+nClientes+' cliente'+(nClientes>1?'s':'')+'</span><span>&#128197; '+f1+' &rarr; '+f2+'</span></div>'+
      '</div>'+
      '<button class="tec-btn-ver" onclick="tecToggleDetalle(this,\''+tecId+'\')">&#9660; Ver partes trabajados</button>'+
      '<div class="tec-detalle-body" id="'+tecId+'">'+tiendaHTML+'</div>'+
    '</div>';
  }).join('');
}

function tecToggleDetalle(btn,id){
  var body=document.getElementById(id); if(!body) return;
  var open=body.classList.toggle('tec-open');
  btn.classList.toggle('tec-open',open);
  btn.innerHTML=open?'&#9650; Ocultar partes trabajados':'&#9660; Ver partes trabajados';
}
// Abre/cierra un nivel del detalle por técnico cerrando sus hermanos: nivel 't' = tienda, 'o' = orden.
function tecToggleNivel(hdr,id,nivel){
  var esTienda=nivel==='t';
  var parent=hdr.closest(esTienda?'.tec-detalle-body':'.tec-tienda-body');
  parent.querySelectorAll((esTienda?'.tec-tienda-body':'.tec-orden-body')+'.tec-open').forEach(function(b){
    if(b.id!==id){b.classList.remove('tec-open');var ch=document.getElementById('chev_'+nivel+'_'+b.id);if(ch)ch.innerHTML='&#9660;';}
  });
  var body=document.getElementById(id); if(!body) return;
  var open=body.classList.toggle('tec-open');
  var chev=document.getElementById('chev_'+nivel+'_'+id); if(chev) chev.innerHTML=open?'&#9650;':'&#9660;';
}

function statsInit(){
  var sel=$('statsCliente');
  if(!sel) return;
  var lista=getClientes();
  var opts='<option value="todos">Todos los clientes</option>';
  lista.forEach(function(c){ opts+='<option value="'+c.id+'">'+c.nombre+'</option>'; });
  sel.innerHTML=opts;
  statsActualizar();
}

function statsSetPeriodo(v,btn){
  _statsPeriodo=v;
  document.querySelectorAll('#statsTglP button').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
  statsActualizar();
}

function statsSetVista(v,btn){
  _statsVista=v;
  document.querySelectorAll('#statsBtnCon,#statsBtnCod').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
  statsRenderResumen(statsFiltrar());
}

function statsInclActivas(){
  var cb=$('statsInclActivas');
  return cb && cb.checked;
}

function statsGetOrdenEstados(){
  var _os={};
  getHVisible().forEach(function(r){
    var k=(r.pedido||'')+'||'+(r.centro||'');
    if(!_os[k]||r.fecha>_os[k].fecha) _os[k]={fecha:r.fecha,estado:r.estado||'terminado'};
  });
  return _os;
}

function statsFiltrar(){
  var cli=$('statsCliente')?$('statsCliente').value:'todos';
  var hoy=new Date();
  var h=getHVisible();
  var _os=statsGetOrdenEstados();
  var ia=statsInclActivas();
  var hoy=new Date();
  return h.filter(function(r){
    var k=(r.pedido||'')+'||'+(r.centro||'');
    var est=_os[k]?_os[k].estado:'terminado';
    if(!ia && est!=='terminado') return false;
    if(cli!=='todos'&&(r.clienteId||'mercadona')!==cli) return false;
    var f=new Date(r.fecha+'T12:00:00');
    if(_statsPeriodo==='mes'){if(f.getMonth()!==hoy.getMonth()||f.getFullYear()!==hoy.getFullYear())return false;}
    if(_statsPeriodo==='semana'){var diff=(hoy-f)/(1000*60*60*24);if(diff<0||diff>7)return false;}
    return true;
  });
}

function statsActualizar(){
  statsVolverMain();
  var datos=statsFiltrar();
  var _os=statsGetOrdenEstados();
  var ia=statsInclActivas();
  // Banner activas
  var banner=$('statsActivasBanner');
  var bannerTxt=$('statsActivasBannerTxt');
  if(ia){
    var cAct={},hAct=0,kAct=0;
    datos.forEach(function(r){
      var k=(r.pedido||'')+'||'+(r.centro||'');
      if(_os[k]&&_os[k].estado==='en-ejecucion'){
        cAct[r.centro||'?']=1;
        (r.codigos||[]).forEach(function(c){if(c.u==='h')hAct+=c.v;if(c.u==='km')kAct+=c.v;});
      }
    });
    var nc=Object.keys(cAct).length;
    if(nc>0){
      if(bannerTxt) bannerTxt.textContent=nc+' centro'+(nc>1?'s':'')+' en ejecuci\u00f3n \u00b7 '+statsFmtH(hAct)+' \u00b7 '+Math.round(kAct)+' km pendientes de cierre';
      if(banner) banner.style.display='block';
    } else { if(banner) banner.style.display='none'; }
  } else { if(banner) banner.style.display='none'; }
  statsRenderKPIs(datos);
  statsRenderResumen(datos);
  statsRenderTecnicos(datos);
}

function statsRenderKPIs(datos){
  var centros={},incs={},horas=0,km=0,dietas=0;
  datos.forEach(function(r){
    centros[r.centro||'?']=1;
    incs[(r.pedido||'')+'||'+(r.centro||'')]=1;
    (r.codigos||[]).forEach(function(c){if(c.u==='h')horas+=c.v;if(c.u==='km')km+=c.v;if(c.u==='dieta')dietas+=c.v;});
  });
  function mkKpi(val,label,cls,tipo){
    var d=document.createElement('div');
    d.className='kpi '+cls;
    d.style.cursor='pointer';
    d.style.position='relative';
    d.innerHTML='<div class="kpi-val">'+val+'</div>'
      +'<div class="kpi-label">'+label+'</div>'
      +'<span style="position:absolute;bottom:5px;right:8px;font-size:.6rem;color:var(--text3);">\u203a</span>';
    d.addEventListener('click',function(){statsVerDetalle(tipo);});
    return d;
  }
  var el=$('statsKpiGrid');if(!el)return;
  el.innerHTML='';
  el.appendChild(mkKpi(Object.keys(centros).length,'Centros','','centros'));
  el.appendChild(mkKpi(Object.keys(incs).length,'Incidencias','','incidencias'));
  el.appendChild(mkKpi(datos.length,'Partes','','partes'));
  el.appendChild(mkKpi(statsFmtH(horas),'Horas','amber','horas'));
  el.appendChild(mkKpi(Math.round(km)+' km','Km','blue','km'));
  el.appendChild(mkKpi(dietas,'Dietas','purple','dietas'));
}

function statsFmtH(v){
  var h=Math.floor(v),dec=Math.round((v-h)*4)/4;
  var f=dec===0.25?'1/4':dec===0.5?'1/2':dec===0.75?'3/4':'';
  if(f) return h?h+' h '+f:f+' h';
  return h+' h';
}

function statsRenderResumen(datos){
  var el=$('statsResumen');if(!el)return;
  if(!datos.length){el.innerHTML='<div style="text-align:center;padding:24px;color:var(--text3);font-size:.86rem;">Sin datos para este per\u00edodo.</div>';return;}
  var _os=statsGetOrdenEstados();
  var ia=statsInclActivas();
  var html='';
  if(_statsVista==='concepto'){
    var totT=0,totD=0,totDieta=0,totKm=0,actT=0,actD=0,actKm=0;
    datos.forEach(function(r){
      var k=(r.pedido||'')+'||'+(r.centro||'');
      var activa=_os[k]&&_os[k].estado==='en-ejecucion';
      (r.codigos||[]).forEach(function(c){
        var lab=(c.lab||'').toLowerCase();
        if(c.u==='h'){
          if(lab.indexOf('dsp')>=0){totD+=c.v;if(activa)actD+=c.v;}
          else{totT+=c.v;if(activa)actT+=c.v;}
        }
        if(c.u==='km'){totKm+=c.v;if(activa)actKm+=c.v;}
        if(c.u==='dieta')totDieta+=c.v;
      });
    });
    function crow(lab,val,act){
      var extra=ia&&act>0?' <span style="font-size:.72rem;color:var(--amber);">(+'+act+')</span>':'';
      var cls=ia&&act>0?' style="color:var(--amber);"':'';
      return '<div class="rrow"><span class="rl"'+cls+'>'+lab+'</span><span class="rv">'+val+extra+'</span></div>';
    }
    if(totT>0) html+=crow('Horas en tienda',statsFmtH(totT),actT);
    if(totD>0) html+=crow('Desplazamiento',statsFmtH(totD),actD);
    if(totDieta>0) html+=crow('Dietas (&frac12;)',totDieta+'',0);
    if(totKm>0) html+=crow('Kilometraje',Math.round(totKm)+' km',actKm);
  } else {
    var acum={};
    datos.forEach(function(r){(r.codigos||[]).forEach(function(c){
      if(!acum[c.cod])acum[c.cod]={cod:c.cod,lab:c.lab,v:0,u:c.u};
      acum[c.cod].v+=c.v;
    });});
    var hs=[],ks=[],ds=[];
    Object.values(acum).forEach(function(c){if(c.u==='h')hs.push(c);else if(c.u==='km')ks.push(c);else if(c.u==='dieta')ds.push(c);});
    if(hs.length){html+='<div class="rgroup-title">Horas</div>';var th=0;hs.forEach(function(c){html+=cRow(c.cod,c.lab,statsFmtH(c.v));th+=c.v;});if(hs.length>1)html+=totRow(statsFmtH(th));}
    if(ks.length){html+='<div class="rgroup-title">Kilometraje</div>';var tk=0;ks.forEach(function(c){html+=cRow(c.cod,c.lab,Math.round(c.v)+' km');tk+=c.v;});if(ks.length>1)html+=totRow(Math.round(tk)+' km');}
    if(ds.length){html+='<div class="rgroup-title">Dietas</div>';ds.forEach(function(c){html+=cRow(c.cod,c.lab,c.v+'');});}
  }
  el.innerHTML=html;
}

function statsVerDetalle(tipo){
  var datos=statsFiltrar();
  var _os=statsGetOrdenEstados();
  var ia=statsInclActivas();
  var hdr='',content='';
  function aTag(activa){return ia&&activa?' <span style="font-size:.65rem;color:var(--amber);">\u23f3</span>':'';}
  function aCls(activa){return ia&&activa?' style="color:var(--amber);"':'';}

  if(tipo==='centros'){
    hdr='<div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(145deg,#1a6b3a,#2d9e5f);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">&#127978;</div>'
      +'<div><div style="font-size:1.3rem;font-weight:700;color:var(--green);">Centros</div><div style="font-size:.78rem;color:var(--text2);">Detalle por centro</div></div>';
    var cm={};
    datos.forEach(function(r){
      var c=r.centro||'?';var t=r.tienda||('Centro '+c);
      if(!cm[c])cm[c]={tienda:t,incs:{},partes:0,activa:false};
      cm[c].partes++;cm[c].incs[r.pedido||'?']=1;
      var k=(r.pedido||'')+'||'+c;
      if(_os[k]&&_os[k].estado==='en-ejecucion')cm[c].activa=true;
    });
    content=Object.values(cm).map(function(c){
      var ni=Object.keys(c.incs).length;
      return '<div class="rrow full"><span class="rl"'+aCls(c.activa)+'>'+c.tienda+aTag(c.activa)+'</span>'
        +'<span class="rv" style="flex-direction:column;align-items:flex-end;gap:1px;">'
        +'<span style="font-size:.76rem;color:var(--text2);">'+ni+' incidencia'+(ni!==1?'s':'')+'</span>'
        +'<span>'+c.partes+' parte'+(c.partes!==1?'s':'')+'</span></span></div>';
    }).join('');
  } else if(tipo==='incidencias'){
    hdr='<div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(145deg,#1d4ed8,#3b82f6);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">&#128203;</div>'
      +'<div><div style="font-size:1.3rem;font-weight:700;color:var(--blue);">Incidencias</div><div style="font-size:.78rem;color:var(--text2);">Detalle por orden</div></div>';
    var im={};
    datos.forEach(function(r){
      var k=(r.pedido||'?')+'||'+(r.centro||'?');
      if(!im[k])im[k]={tienda:r.tienda||('Centro '+(r.centro||'?')),pedido:r.pedido||'?',partes:0,activa:false};
      im[k].partes++;
      if(_os[k]&&_os[k].estado==='en-ejecucion')im[k].activa=true;
    });
    content=Object.values(im).map(function(o){
      return '<div class="rrow full"><span class="rl"'+aCls(o.activa)+'>'
        +'<span style="display:flex;flex-direction:column;gap:2px;">'
        +'<span>'+o.tienda+aTag(o.activa)+'</span>'
        +'<span style="font-size:.74rem;color:var(--text3);">Orden '+o.pedido+'</span>'
        +'</span></span>'
        +'<span class="rv">'+o.partes+' parte'+(o.partes!==1?'s':'')+'</span></div>';
    }).join('');
  } else if(tipo==='partes'){
    hdr='<div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(145deg,#374151,#6b7280);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">&#128196;</div>'
      +'<div><div style="font-size:1.3rem;font-weight:700;color:var(--text);">Partes</div><div style="font-size:.78rem;color:var(--text2);">'+datos.length+' partes generados</div></div>';
    var meses={};
    datos.forEach(function(r){
      var m=r.fecha?r.fecha.slice(0,7):'?';
      if(!meses[m]) meses[m]={total:0,centros:{}};
      meses[m].total++;
      var c=r.tienda||r.centro||'?';
      if(!meses[m].centros[c]) meses[m].centros[c]=0;
      meses[m].centros[c]++;
    });
    content='<div class="rgroup-title">Por mes</div>';
    Object.keys(meses).sort().reverse().forEach(function(m){
      var p=m.split('-');var lbl=p.length>1?p[1]+'/'+p[0]:m;
      var mesId='mes_'+m.replace('-','_');
      var centrosHTML='';
      Object.keys(meses[m].centros).sort(function(a,b){return meses[m].centros[b]-meses[m].centros[a];}).forEach(function(c){
        centrosHTML+='<div style="display:flex;justify-content:space-between;padding:5px 12px 5px 24px;font-size:.82rem;border-bottom:1px solid var(--border);">'
          +'<span style="color:var(--text2);">'+c+'</span>'
          +'<span style="font-weight:600;color:var(--text);">'+meses[m].centros[c]+'</span></div>';
      });
      content+='<div style="background:var(--surface2);border-radius:var(--r-sm);margin-bottom:4px;">'
        +'<div data-mesid="'+mesId+'" onclick="statsToggleMes(this.dataset.mesid)" style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;cursor:pointer;">'
        +'<span class="rl" style="font-weight:700;">'+lbl+'</span>'
        +'<span class="rv">'+meses[m].total+' parte'+(meses[m].total!==1?'s':'')+'</span>'
        +'</div>'
        +'<div id="'+mesId+'" style="display:none;border-top:1px solid var(--border);padding:4px 0;">'+centrosHTML+'</div>'
        +'</div>';
    });
  } else if(tipo==='horas'){
    var th=0,td=0,hc={};
    datos.forEach(function(r){
      var c=r.tienda||r.centro||'?';if(!hc[c])hc[c]={v:0,activa:false};
      var k=(r.pedido||'')+'||'+(r.centro||'');
      (r.codigos||[]).forEach(function(cod){
        if(cod.u!=='h')return;
        var lab=(cod.lab||'').toLowerCase();
        if(lab.indexOf('dsp')>=0)td+=cod.v;else th+=cod.v;
        hc[c].v+=cod.v;
      });
      if(_os[k]&&_os[k].estado==='en-ejecucion')hc[c].activa=true;
    });
    var ta=th+td;
    hdr='<div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(145deg,#b45309,#f59e0b);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">&#9201;</div>'
      +'<div><div style="font-size:1.3rem;font-weight:700;color:var(--amber);">'+statsFmtH(ta)+'</div><div style="font-size:.78rem;color:var(--text2);">Horas totales</div></div>';
    content='<div class="rgroup-title">Por tipo</div>'
      +'<div class="rrow"><span class="rl">Horas en tienda</span><span class="rv">'+statsFmtH(th)+'</span></div>'
      +'<div class="rrow"><span class="rl">Desplazamiento</span><span class="rv">'+statsFmtH(td)+'</span></div>'
      +(ta>0?'<div class="rrow tot"><span class="rl">Total</span><span class="rv">'+statsFmtH(ta)+'</span></div>':'')
      +'<div class="rgroup-title">Por centro</div>';
    Object.keys(hc).forEach(function(c){
      content+='<div class="rrow"><span class="rl"'+aCls(hc[c].activa)+'>'+c+aTag(hc[c].activa)+'</span><span class="rv">'+statsFmtH(hc[c].v)+'</span></div>';
    });
  } else if(tipo==='km'){
    var kc={};
    datos.forEach(function(r){
      var c=r.tienda||r.centro||'?';if(!kc[c])kc[c]={v:0,activa:false};
      var k=(r.pedido||'')+'||'+(r.centro||'');
      (r.codigos||[]).forEach(function(cod){if(cod.u==='km')kc[c].v+=cod.v;});
      if(_os[k]&&_os[k].estado==='en-ejecucion')kc[c].activa=true;
    });
    var tk=Object.values(kc).reduce(function(s,c){return s+c.v;},0);
    hdr='<div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(145deg,#1d4ed8,#60a5fa);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">&#128663;</div>'
      +'<div><div style="font-size:1.3rem;font-weight:700;color:var(--blue);">'+Math.round(tk)+' km</div><div style="font-size:.78rem;color:var(--text2);">Kilometraje total</div></div>';
    content='<div class="rgroup-title">Por centro</div>';
    Object.keys(kc).forEach(function(c){
      content+='<div class="rrow"><span class="rl"'+aCls(kc[c].activa)+'>'+c+aTag(kc[c].activa)+'</span><span class="rv">'+Math.round(kc[c].v)+' km</span></div>';
    });
  } else if(tipo==='dietas'){
    var td2=0,dm={},dt={};
    datos.forEach(function(r){
      var dv=0;
      (r.codigos||[]).forEach(function(c){if(c.u==='dieta'){td2+=c.v;dv+=c.v;}});
      if(dv>0){
        var m=r.fecha?r.fecha.slice(0,7):'?';if(!dm[m])dm[m]=0;dm[m]+=dv;
        var t=r.tienda||r.centro||'?';if(!dt[t])dt[t]=0;dt[t]+=dv;
      }
    });
    hdr='<div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(145deg,#7c3aed,#a78bfa);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">&#127860;</div>'
      +'<div><div style="font-size:1.3rem;font-weight:700;color:var(--purple);">'+td2+' dieta'+(td2!==1?'s':'')+'</div><div style="font-size:.78rem;color:var(--text2);">Medias dietas</div></div>';
    content='<div class="rgroup-title">Por mes</div>';
    Object.keys(dm).sort().reverse().forEach(function(m){
      var p=m.split('-');var lbl=p.length>1?p[1]+'/'+p[0]:m;
      content+='<div class="rrow"><span class="rl">'+lbl+'</span><span class="rv">'+dm[m]+' dieta'+(dm[m]!==1?'s':'')+'</span></div>';
    });
    content+='<div class="rgroup-title">Por tienda</div>';
    Object.keys(dt).sort(function(a,b){return dt[b]-dt[a];}).forEach(function(t){
      content+='<div class="rrow"><span class="rl">'+t+'</span><span class="rv">'+dt[t]+' dieta'+(dt[t]!==1?'s':'')+'</span></div>';
    });
  }

  var det=$('statsDetalle');
  var mains=document.querySelectorAll('#w-stats > *:not(#statsDetalle)');
  if(det){
    mains.forEach(function(el){el.style.display='none';});
    det.style.display='block';
    var hEl=$('statsDetalleHdr');if(hEl)hEl.innerHTML=hdr;
    var cEl=$('statsDetalleContent');if(cEl)cEl.innerHTML=content||'<div style="text-align:center;padding:16px;color:var(--text3);">Sin datos.</div>';
    window.scrollTo(0,0);
  }
}

function statsVolverMain(){
  var det=$('statsDetalle');
  var mains=document.querySelectorAll('#w-stats > *:not(#statsDetalle)');
  if(det)det.style.display='none';
  mains.forEach(function(el){el.style.display='';});
}

function statsExportarPDF(){
  var datos=statsFiltrar();
  if(!datos.length){ showMsg('msgRes','Sin datos para exportar.','warn'); return; }
  if(!window.jspdf){ alert('PDF no disponible.'); return; }
  var doc=pdfNuevo();
  var y=12;

  // El PDF es la pantalla de Estad\u00edsticas sin los botones, en el mismo orden y con los mismos textos
  var texto=function(el){ return pdfLimpiar(el.textContent.replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim()); };
  var cli=$('statsCliente')?$('statsCliente').options[$('statsCliente').selectedIndex].text:'Todos';
  y=pdfHdr(doc,y,'Estad\u00edsticas IRV-10 \u00b7 '+cli);
  y+=2;

  var btnPeriodo=document.querySelector('#statsTglP button.active');
  y=pdfInfoRow(doc,y,'PER\u00cdODO',btnPeriodo?texto(btnPeriodo):'Todo');
  y=pdfInfoRow(doc,y,'INCLUIR',texto($('statsInclActivas').parentNode.querySelector('label'))+': '+(statsInclActivas()?'S\u00ed':'No'));
  var banner=$('statsActivasBanner');
  if(banner&&banner.style.display!=='none') y=pdfFilaTexto(doc,y,texto(banner));
  y+=3;

  // Los seis totales (Centros, Incidencias, Partes, Horas, Km, Dietas)
  document.querySelectorAll('#statsKpiGrid .kpi').forEach(function(k){
    var lab=texto(k.querySelector('.kpi-label'));
    y=pdfCodeRow(doc,y,{Horas:'h',Km:'km',Dietas:'½'}[lab]||'#',lab,texto(k.querySelector('.kpi-val')));
  });
  y+=3;

  // Resumen, en la vista que est\u00e9 elegida (por concepto o por c\u00f3digo)
  var vista=document.querySelector('#statsBtnCon.active,#statsBtnCod.active');
  y=pdfGroupTitle(doc,y,'Resumen'+(vista?' \u00b7 '+texto(vista):''));
  Array.from($('statsResumen').children).forEach(function(el){
    if(el.classList.contains('rgroup-title')) y=pdfGroupTitle(doc,y,texto(el));
    else if(el.classList.contains('rrow')){
      if(el.classList.contains('total-row')) y=pdfTotalRow(doc,y,texto(el.querySelector('.rv')));
      else if(el.querySelector('.rc')) y=pdfCodeRow(doc,y,texto(el.querySelector('.rc')),texto(el.querySelector('.rl')),texto(el.querySelector('.rv')));
      else y=pdfFilaNombreCantidad(doc,y,texto(el.querySelector('.rl')),texto(el.querySelector('.rv')));
    }
    else y=pdfTextoVacio(doc,y,texto(el));
  });

  // Por t\u00e9cnico: la tarjeta de resumen de cada uno (el desplegable "Ver partes trabajados" no se incluye: en la pantalla sale cerrado)
  var sec=$('statsTecSection');
  if(sec&&sec.style.display!=='none'){
    y+=3;
    y=pdfGroupTitle(doc,y,'Por t\u00e9cnico');
    document.querySelectorAll('#statsTecList .tec-card-s').forEach(function(c){ y=pdfTecnicoStats(doc,y,c.querySelector('.tec-sum'),texto); });
  }

  pdfFooter(doc,y+8);
  pdfGuardar(doc,'IRV_estadisticas_'+cli.replace(/\s/g,'_'));
}

function statsCompartir(){
  var datos=statsFiltrar();
  var cli=$('statsCliente')?$('statsCliente').options[$('statsCliente').selectedIndex].text:'Todos';
  var periodos={todo:'Todo',mes:'Este mes',semana:'Esta semana'};
  var centros={},incs={},horas=0,km=0,dietas=0;
  datos.forEach(function(r){
    centros[r.centro||'?']=1;incs[(r.pedido||'')+'||'+(r.centro||'')]=1;
    (r.codigos||[]).forEach(function(c){if(c.u==='h')horas+=c.v;if(c.u==='km')km+=c.v;if(c.u==='dieta')dietas+=c.v;});
  });
  var txt='Estad\u00edsticas IRV-10 \u2014 '+cli+' \u2014 '+periodos[_statsPeriodo]+'\n'
    +'Centros: '+Object.keys(centros).length+'  |  Incidencias: '+Object.keys(incs).length+'  |  Partes: '+datos.length+'\n'
    +'Horas: '+statsFmtH(horas)+'  |  Km: '+Math.round(km)+'  |  Dietas: '+dietas;
  if(navigator.share){navigator.share({text:txt});}
  else{navigator.clipboard.writeText(txt).then(function(){alert('Copiado al portapapeles');});}
}

