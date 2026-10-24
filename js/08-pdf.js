// ===== PDF PARTE INDIVIDUAL =====
function hacerPDF(i){ var r=getH()[i]; if(!r) return; pdfDesde(r); }
function compartirParte(i){
  var r=getH()[i]; if(!r) return;
  var mats=(r.materiales||[]).filter(function(m){return m.cantidad&&+m.cantidad>0;});
  var matsText=mats.length?'\nMateriales\n'+mats.map(function(m){return m.cantidad+' '+m.nombre;}).join('\n'):'';
  compartirDesde(r.detalle||'',observacionesCompletas(r),matsText);
}

// =====================================================
// SISTEMA PDF UNIFICADO — todos los PDF usan estas funciones
// Para cambiar diseño: editar solo aquí
// =====================================================
var _PDF = {
  mg: 45,      // margen lateral (centra tarjeta de 120mm en A4 de 210mm)
  cW: 120,     // ancho de la tarjeta
  RH: 7,       // altura de fila estándar
  RC: 26,      // ancho columna código
  RL: 50,      // ancho columna label
  // Colores claros — optimizados para impresión
  bgPage:  [255,255,255],  // blanco
  bgSurf:  [243,244,246],  // gris muy claro
  bgSurf2: [229,231,235],  // gris claro
  green:   [26,107,58],    // verde oscuro
  greenDk: [26,107,58],    // verde oscuro
  greenLt: [240,253,244],  // verde muy claro
  purple:  [124,58,237],   // morado
  purpleLt:[245,243,255],  // morado muy claro
  amber:   [245,158,11],   // amarillo
  amberLt: [255,251,235],  // amarillo muy claro
  textW:   [17,24,39],     // negro
  text2:   [107,114,128],  // gris medio
  border:  [229,231,235],  // gris claro
  red:     [220,38,38],    // rojo
};
_PDF.RV = _PDF.cW - _PDF.RC - _PDF.RL;

function pdfNuevo(){
  var jsPDF=window.jspdf.jsPDF;
  var doc=new jsPDF({unit:'mm',format:'a4',orientation:'portrait'});
  // Fondo página
  doc.setFillColor(_PDF.bgPage[0],_PDF.bgPage[1],_PDF.bgPage[2]);
  doc.rect(0,0,210,297,'F');
  return doc;
}

function pdfNuevaPagina(doc){
  doc.addPage();
  doc.setFillColor(_PDF.bgPage[0],_PDF.bgPage[1],_PDF.bgPage[2]);
  doc.rect(0,0,210,297,'F');
}

function pdfCheck(doc,y,need){
  if(y+need>285){ pdfNuevaPagina(doc); return _PDF.mg; }
  return y;
}

function pdfHdr(doc,y,titulo){
  y=pdfCheck(doc,y,14);
  doc.setFillColor(_PDF.green[0],_PDF.green[1],_PDF.green[2]);
  doc.roundedRect(_PDF.mg,y,_PDF.cW,10,2,2,'F');
  doc.setFontSize(8); doc.setFont('helvetica','bold');
  doc.setTextColor(255,255,255);
  var lines=doc.splitTextToSize(titulo,_PDF.cW-6);
  doc.text(lines,_PDF.mg+3,y+6);
  return y+12;
}

function pdfTipoRow(doc,y,tipo){
  y=pdfCheck(doc,y,_PDF.RH+1);
  doc.setFillColor(_PDF.purple[0],_PDF.purple[1],_PDF.purple[2]);
  doc.rect(_PDF.mg,y,_PDF.RC,_PDF.RH,'F');
  doc.setFillColor(_PDF.purpleLt[0],_PDF.purpleLt[1],_PDF.purpleLt[2]);
  doc.rect(_PDF.mg+_PDF.RC,y,_PDF.cW-_PDF.RC,_PDF.RH,'F');
  doc.setDrawColor(_PDF.border[0],_PDF.border[1],_PDF.border[2]);
  doc.setLineWidth(0.2); doc.rect(_PDF.mg,y,_PDF.cW,_PDF.RH);
  doc.setFontSize(6.5); doc.setFont('helvetica','bold');
  doc.setTextColor(255,255,255);
  doc.text('TIPO',_PDF.mg+_PDF.RC/2,y+5,{align:'center'});
  doc.setFontSize(9); doc.setTextColor(_PDF.purple[0],_PDF.purple[1],_PDF.purple[2]);
  doc.text(tipo,_PDF.mg+_PDF.RC+3,y+5.5);
  return y+_PDF.RH+1;
}

function pdfGroupTitle(doc,y,txt){
  y=pdfCheck(doc,y,6);
  doc.setFontSize(6); doc.setFont('helvetica','bold');
  doc.setTextColor(_PDF.text2[0],_PDF.text2[1],_PDF.text2[2]);
  doc.text(txt.toUpperCase(),_PDF.mg,y+4);
  return y+6;
}

function pdfInfoRow(doc,y,label,val){
  if(!val) return y;
  var lines=doc.splitTextToSize(val,_PDF.cW-_PDF.RC-4);
  var h=Math.max(_PDF.RH, lines.length*4+4);
  y=pdfCheck(doc,y,h+1);
  doc.setFillColor(_PDF.bgSurf2[0],_PDF.bgSurf2[1],_PDF.bgSurf2[2]);
  doc.rect(_PDF.mg,y,_PDF.RC,h,'F');
  doc.setFillColor(_PDF.bgSurf[0],_PDF.bgSurf[1],_PDF.bgSurf[2]);
  doc.rect(_PDF.mg+_PDF.RC,y,_PDF.cW-_PDF.RC,h,'F');
  doc.setDrawColor(_PDF.border[0],_PDF.border[1],_PDF.border[2]);
  doc.setLineWidth(0.2); doc.rect(_PDF.mg,y,_PDF.cW,h);
  doc.setFontSize(6); doc.setFont('helvetica','bold');
  doc.setTextColor(_PDF.text2[0],_PDF.text2[1],_PDF.text2[2]);
  doc.text(label,_PDF.mg+_PDF.RC/2,y+h/2+2,{align:'center'});
  doc.setFontSize(7.5); doc.setFont('helvetica','normal');
  doc.setTextColor(_PDF.textW[0],_PDF.textW[1],_PDF.textW[2]);
  doc.text(lines,_PDF.mg+_PDF.RC+3,y+5);
  return y+h+0.5;
}

function pdfCodeRow(doc,y,cod,lab,val){
  y=pdfCheck(doc,y,_PDF.RH+1);
  doc.setFillColor(_PDF.greenDk[0],_PDF.greenDk[1],_PDF.greenDk[2]);
  doc.rect(_PDF.mg,y,_PDF.RC,_PDF.RH,'F');
  doc.setFillColor(_PDF.greenLt[0],_PDF.greenLt[1],_PDF.greenLt[2]);
  doc.rect(_PDF.mg+_PDF.RC,y,_PDF.RL,_PDF.RH,'F');
  doc.setFillColor(_PDF.bgSurf2[0],_PDF.bgSurf2[1],_PDF.bgSurf2[2]);
  doc.rect(_PDF.mg+_PDF.RC+_PDF.RL,y,_PDF.RV,_PDF.RH,'F');
  doc.setDrawColor(_PDF.border[0],_PDF.border[1],_PDF.border[2]);
  doc.setLineWidth(0.2); doc.rect(_PDF.mg,y,_PDF.cW,_PDF.RH);
  doc.setFontSize(6.5); doc.setFont('helvetica','bold');
  doc.setTextColor(255,255,255);
  doc.text(cod,_PDF.mg+_PDF.RC/2,y+5,{align:'center'});
  doc.setTextColor(_PDF.green[0],_PDF.green[1],_PDF.green[2]);
  doc.setFontSize(7);
  doc.text(lab,_PDF.mg+_PDF.RC+3,y+5);
  doc.setTextColor(_PDF.textW[0],_PDF.textW[1],_PDF.textW[2]);
  doc.setFont('helvetica','bold'); doc.setFontSize(8);
  doc.text(val,_PDF.mg+_PDF.cW-3,y+5,{align:'right'});
  return y+_PDF.RH+0.5;
}

function pdfTotalRow(doc,y,val){
  y=pdfCheck(doc,y,_PDF.RH+3);
  doc.setFillColor(_PDF.greenDk[0],_PDF.greenDk[1],_PDF.greenDk[2]);
  doc.rect(_PDF.mg,y,_PDF.cW,_PDF.RH+2,'F');
  doc.setDrawColor(_PDF.green[0],_PDF.green[1],_PDF.green[2]);
  doc.setLineWidth(0.3); doc.rect(_PDF.mg,y,_PDF.cW,_PDF.RH+2);
  doc.setFontSize(8); doc.setFont('helvetica','bold');
  doc.setTextColor(255,255,255);
  doc.text('TOTAL',_PDF.mg+4,y+6);
  doc.setFontSize(10);
  doc.text(val,_PDF.mg+_PDF.cW-4,y+6,{align:'right'});
  return y+_PDF.RH+3;
}

function pdfMatRow(doc,y,nombre,cantidad){
  var lines=doc.splitTextToSize(nombre,_PDF.cW-_PDF.RC-20);
  var h=Math.max(_PDF.RH, lines.length*4+4);
  y=pdfCheck(doc,y,h+1);
  doc.setFillColor(_PDF.bgSurf2[0],_PDF.bgSurf2[1],_PDF.bgSurf2[2]);
  doc.rect(_PDF.mg,y,_PDF.RC,h,'F');
  doc.setFillColor(_PDF.bgSurf[0],_PDF.bgSurf[1],_PDF.bgSurf[2]);
  doc.rect(_PDF.mg+_PDF.RC,y,_PDF.cW-_PDF.RC,h,'F');
  doc.setDrawColor(_PDF.border[0],_PDF.border[1],_PDF.border[2]);
  doc.setLineWidth(0.2); doc.rect(_PDF.mg,y,_PDF.cW,h);
  doc.setFontSize(6); doc.setFont('helvetica','bold');
  doc.setTextColor(_PDF.text2[0],_PDF.text2[1],_PDF.text2[2]);
  doc.text('MAT.',_PDF.mg+_PDF.RC/2,y+h/2+2,{align:'center'});
  doc.setFontSize(7.5); doc.setFont('helvetica','normal');
  doc.setTextColor(_PDF.textW[0],_PDF.textW[1],_PDF.textW[2]);
  doc.text(lines,_PDF.mg+_PDF.RC+3,y+5);
  doc.setFont('helvetica','bold'); doc.setFontSize(8);
  doc.setTextColor(_PDF.green[0],_PDF.green[1],_PDF.green[2]);
  doc.text('x'+cantidad,_PDF.mg+_PDF.cW-3,y+h/2+2,{align:'right'});
  return y+h+0.5;
}

// Fila de nota a todo el ancho del PDF: la etiqueta va en la columna izquierda con el color base y el texto sobre el fondo indicado.
function pdfNotaRow(doc,y,txt,etiqueta,color,fondo){
  if(!txt) return y;
  var lines=doc.splitTextToSize(txt,_PDF.cW-_PDF.RC-4);
  var h=Math.max(_PDF.RH+2, lines.length*4.5+5);
  y=pdfCheck(doc,y,h+1);
  doc.setFillColor(color[0],color[1],color[2]);
  doc.rect(_PDF.mg,y,_PDF.RC,h,'F');
  doc.setFillColor(fondo[0],fondo[1],fondo[2]);
  doc.rect(_PDF.mg+_PDF.RC,y,_PDF.cW-_PDF.RC,h,'F');
  doc.setDrawColor(_PDF.border[0],_PDF.border[1],_PDF.border[2]);
  doc.setLineWidth(0.2); doc.rect(_PDF.mg,y,_PDF.cW,h);
  doc.setFontSize(6.5); doc.setFont('helvetica','bold');
  doc.setTextColor(255,255,255);
  doc.text(etiqueta,_PDF.mg+_PDF.RC/2,y+h/2+2,{align:'center'});
  doc.setFontSize(7.5); doc.setFont('helvetica','normal');
  doc.setTextColor(color[0],color[1],color[2]);
  doc.text(lines,_PDF.mg+_PDF.RC+3,y+5);
  return y+h+1;
}

function pdfDivider(doc,y){
  y=pdfCheck(doc,y,5);
  doc.setDrawColor(_PDF.border[0],_PDF.border[1],_PDF.border[2]);
  doc.setLineWidth(0.3);
  doc.line(_PDF.mg,y,_PDF.mg+_PDF.cW,y);
  return y+4;
}

function pdfFooter(doc,y){
  doc.setFontSize(6); doc.setFont('helvetica','normal');
  doc.setTextColor(_PDF.text2[0],_PDF.text2[1],_PDF.text2[2]);
  doc.text('Partes IRV-10 \u00b7 Soluciones a tu Medida',_PDF.mg+_PDF.cW/2,y+4,{align:'center'});
}

function pdfGuardar(doc,nombre){
  doc.save(nombre+'.pdf');
}

function pdfSubtotalRow(doc,y,label,precio){
  y=pdfCheck(doc,y,_PDF.RH+2);
  doc.setFillColor(15,42,26);
  doc.rect(_PDF.mg,y,_PDF.cW,_PDF.RH+1,'F');
  doc.setDrawColor(_PDF.green[0],_PDF.green[1],_PDF.green[2]);
  doc.setLineWidth(0.2); doc.rect(_PDF.mg,y,_PDF.cW,_PDF.RH+1);
  doc.setFontSize(6.5); doc.setFont('helvetica','bold');
  doc.setTextColor(74,222,128);
  doc.text((label||'Subtotal').toUpperCase(),_PDF.mg+4,y+5.5);
  if(precio){ doc.setFontSize(8); doc.text(precio,_PDF.mg+_PDF.cW-3,y+5.5,{align:'right'}); }
  return y+_PDF.RH+3;
}

function pdfCodeRowConPrecio(doc,y,cod,lab,val,precio){
  y=pdfCheck(doc,y,_PDF.RH+1);
  var rvW=precio?Math.round(_PDF.RV*0.52):_PDF.RV;
  var rpW=precio?(_PDF.RV-rvW):0;
  doc.setFillColor(_PDF.greenDk[0],_PDF.greenDk[1],_PDF.greenDk[2]);
  doc.rect(_PDF.mg,y,_PDF.RC,_PDF.RH,'F');
  doc.setFillColor(_PDF.greenLt[0],_PDF.greenLt[1],_PDF.greenLt[2]);
  doc.rect(_PDF.mg+_PDF.RC,y,_PDF.RL,_PDF.RH,'F');
  doc.setFillColor(_PDF.bgSurf2[0],_PDF.bgSurf2[1],_PDF.bgSurf2[2]);
  doc.rect(_PDF.mg+_PDF.RC+_PDF.RL,y,rvW,_PDF.RH,'F');
  if(precio){ doc.setFillColor(10,30,18); doc.rect(_PDF.mg+_PDF.RC+_PDF.RL+rvW,y,rpW,_PDF.RH,'F'); }
  doc.setDrawColor(_PDF.border[0],_PDF.border[1],_PDF.border[2]);
  doc.setLineWidth(0.2); doc.rect(_PDF.mg,y,_PDF.cW,_PDF.RH);
  doc.setFontSize(6.5); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255);
  doc.text(cod,_PDF.mg+_PDF.RC/2,y+5,{align:'center'});
  doc.setTextColor(_PDF.green[0],_PDF.green[1],_PDF.green[2]); doc.setFontSize(7);
  doc.text(lab,_PDF.mg+_PDF.RC+3,y+5);
  doc.setTextColor(_PDF.textW[0],_PDF.textW[1],_PDF.textW[2]); doc.setFont('helvetica','bold'); doc.setFontSize(8);
  doc.text(val,_PDF.mg+_PDF.RC+_PDF.RL+rvW-2,y+5,{align:'right'});
  if(precio){ doc.setTextColor(74,222,128); doc.setFontSize(7.5); doc.text(precio,_PDF.mg+_PDF.cW-2,y+5,{align:'right'}); }
  return y+_PDF.RH+0.5;
}

function pdfTotalRowConPrecio(doc,y,horas,precio){
  y=pdfCheck(doc,y,_PDF.RH+3);
  doc.setFillColor(_PDF.greenDk[0],_PDF.greenDk[1],_PDF.greenDk[2]);
  doc.rect(_PDF.mg,y,_PDF.cW,_PDF.RH+2,'F');
  doc.setDrawColor(_PDF.green[0],_PDF.green[1],_PDF.green[2]);
  doc.setLineWidth(0.3); doc.rect(_PDF.mg,y,_PDF.cW,_PDF.RH+2);
  doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255);
  doc.text('TOTAL',_PDF.mg+4,y+6);
  if(horas){
    var midX=precio?(_PDF.mg+_PDF.cW*0.48):(_PDF.mg+_PDF.cW-4);
    doc.setFontSize(9); doc.text(horas,midX,y+6,{align:precio?'center':'right'});
  }
  if(precio){ doc.setTextColor(74,222,128); doc.setFontSize(10); doc.text(precio,_PDF.mg+_PDF.cW-3,y+6,{align:'right'}); }
  return y+_PDF.RH+3;
}

function pdfDesde(r){
  if(!window.jspdf){ alert('PDF no disponible.'); return; }
  var doc=pdfNuevo();
  var y=12;
  var conPrecios=curCliente&&curCliente.precios===true;

  var titulo=(r.tienda||'')+(r.fecha?' \u00b7 '+r.fecha.split('-').reverse().join('/'):'');
  y=pdfHdr(doc,y,titulo);
  y+=2;

  if(r.job) y=pdfTipoRow(doc,y,r.job);
  y+=2;

  y=pdfGroupTitle(doc,y,'Datos generales');
  if(r.fecha)    y=pdfInfoRow(doc,y,'FECHA',   r.fecha.split('-').reverse().join('/'));
  if(r.actObras) y=pdfInfoRow(doc,y,'ACTUACI\u00d3N',r.actObras);
  else if(r.pedido) y=pdfInfoRow(doc,y,'N\u00ba ORDEN',r.pedido);
  if(r.tienda)   y=pdfInfoRow(doc,y,'TIENDA',  r.tienda);
  if(r.dir)      y=pdfInfoRow(doc,y,'DIRECCI\u00d3N',r.dir);
  if(r.tel)      y=pdfInfoRow(doc,y,'TEL\u00c9FONO',r.tel);
  y+=3;

  // Parsear detalle HTML para mostrar rgroup-title (franjas horarias) en orden
  if(r.detalle){
    var _tmp=document.createElement('div'); _tmp.innerHTML=r.detalle;
    var _nodos=Array.from(_tmp.childNodes).filter(function(n){
      return n.nodeType===1&&(n.classList.contains('rgroup-title')||n.classList.contains('rrow')||n.classList.contains('nota-trayectoria'));
    });
    var hTotal=0;
    _nodos.forEach(function(el){
      if(el.classList.contains('nota-trayectoria')){
        y=pdfNotaRow(doc,y,el.textContent.replace(/^\s*🔗\s*/,'').trim(),'TRAYEC.',_PDF.text2,_PDF.bgSurf2);
      } else if(el.classList.contains('rgroup-title')){
        var txt=el.textContent.trim();
        if(txt&&txt!=='Datos generales') y=pdfGroupTitle(doc,y,txt);
      } else if(el.classList.contains('info-row')&&el.querySelector('.rc')&&el.querySelector('.rc').textContent.trim()==='Técnicos'){
        var _rcT=el.querySelector('.rc').textContent.trim();
        var _rlT=el.querySelector('.rl')?el.querySelector('.rl').textContent.trim():'';
        y=pdfInfoRow(doc,y,_rcT.toUpperCase(),_rlT);
      } else if(el.classList.contains('info-row')||el.classList.contains('tipo-row')){
        // ya mostradas arriba
      } else if(el.classList.contains('total-row')){
        var _rv=el.querySelector('.rv')?el.querySelector('.rv').textContent.trim():'';
        var _rp=el.querySelector('.rp')?el.querySelector('.rp').textContent.trim():'';
        if(_rp) y=pdfTotalRowConPrecio(doc,y,_rv,_rp);
        else y=pdfTotalRow(doc,y,_rv);
        y+=2;
      } else if(el.classList.contains('subtotal-row')){
        var _rl=el.querySelector('.rl')?el.querySelector('.rl').textContent.trim():'';
        var _rv2=el.querySelector('.rv')?el.querySelector('.rv').textContent.trim():'';
        y=pdfSubtotalRow(doc,y,_rl,_rv2);
      } else if(!el.classList.contains('obs-row')){
        var _rc=el.querySelector('.rc')?el.querySelector('.rc').textContent.trim():'';
        var _rl2=el.querySelector('.rl')?el.querySelector('.rl').textContent.trim():'';
        var _rv3=el.querySelector('.rv')?el.querySelector('.rv').textContent.trim():'';
        var _rp2=el.querySelector('.rp')?el.querySelector('.rp').textContent.trim():'';
        if(_rc&&_rl2&&_rv3){
          if(_rp2) y=pdfCodeRowConPrecio(doc,y,_rc,_rl2,_rv3,_rp2);
          else y=pdfCodeRow(doc,y,_rc,_rl2,_rv3);
        }
      }
    });
    y+=2;
  } else {
    // Fallback: usar r.codigos[] sin franjas (partes antiguos)
    var codigos=r.codigos||[];
    if(codigos.length){
      y=pdfGroupTitle(doc,y,'Códigos de facturación');
      codigos.forEach(function(c){
        var val=c.u==='km'?Math.round(c.v)+' km':c.u==='dieta'?'× '+Math.round(c.v):fmtH(c.v);
        var _pr=conPrecios?getPrecioPorCod(c.cod,c.lab,r.job||''):0;
        if(_pr>0) y=pdfCodeRowConPrecio(doc,y,c.cod,c.lab,val,fmtPrecio(_pr*c.v));
        else y=pdfCodeRow(doc,y,c.cod,c.lab,val);
      });
      y+=2;
      var hTotal=0; var precioTotal=0;
      codigos.forEach(function(c){
        if(c.u==='h'&&(c.lab||'').indexOf('Dsp')===-1) hTotal+=c.v;
        if(conPrecios) precioTotal+=getPrecioPorCod(c.cod,c.lab,r.job||'')*c.v;
      });
      if(hTotal>0){
        if(conPrecios&&precioTotal>0) y=pdfTotalRowConPrecio(doc,y,fmtH(hTotal),fmtPrecio(precioTotal));
        else y=pdfTotalRow(doc,y,fmtH(hTotal));
        y+=2;
      }
    }
  }

  // Materiales desde r.materiales (partes guardados antes del nuevo sistema)
  // Los nuevos partes ya incluyen materiales en el detalle HTML
  var _matsEnDetalle=r.detalle&&r.detalle.indexOf('Mat.')>=0;
  if(!_matsEnDetalle){
    var mats=(r.materiales||[]).filter(function(m){return m.cantidad&&+m.cantidad>0;});
    if(mats.length){
      y=pdfGroupTitle(doc,y,'Materiales');
      mats.forEach(function(m){ y=pdfMatRow(doc,y,m.nombre,m.cantidad); });
      y+=2;
    }
  }

  // Trabajadores — extraer del detalle HTML
  if(r.detalle){
    var _tmpW=document.createElement('div'); _tmpW.innerHTML=r.detalle;
    var _nomDiv=Array.from(_tmpW.querySelectorAll('div')).find(function(d){
      return d.style&&d.style.textAlign==='center'&&d.textContent.indexOf('·')>=0;
    });
    if(_nomDiv){
      var _nomTxt=_nomDiv.textContent.trim();
      if(_nomTxt){
        y=pdfCheck(doc,y,8);
        doc.setFontSize(7); doc.setFont('helvetica','normal');
        doc.setTextColor(_PDF.text2[0],_PDF.text2[1],_PDF.text2[2]);
        doc.text(_nomTxt,_PDF.mg+_PDF.cW/2,y+4,{align:'center'});
        y+=8;
      }
    }
  }

  var _obsPdf=observacionesCompletas(r);
  if(_obsPdf) y=pdfNotaRow(doc,y,_obsPdf,'OBS.',_PDF.amber,_PDF.amberLt);

  pdfFooter(doc,y+4);
  pdfGuardar(doc,'IRV_'+(r.pedido||r.actObras||'parte')+'_'+(r.centro||'')+'_'+(r.fecha||'').replace(/-/g,''));
}

function compartirDesde(detalle,obsVal,matsText){
  var tmp=document.createElement('div'); tmp.innerHTML=detalle||'';
  var sep='====================',lines=['PARTE DE TRABAJO',sep];
  var skipNext=false;
  Array.from(tmp.children).forEach(function(el){
    // Saltar bloque de materiales del detalle (lo añadimos aparte)
    if(skipNext){ skipNext=false; return; }
    var t2=el.textContent?el.textContent.trim():'';
    if(t2==='Materiales'){ skipNext=true; return; }
    if(el.classList.contains('rgroup-title')){
      if(t2&&t2!=='Datos generales'){ lines.push(''); lines.push(t2); }
    } else if(el.classList.contains('rrow')){
      var rc=el.querySelector('.rc')?el.querySelector('.rc').textContent.trim():'';
      var rl=el.querySelector('.rl')?el.querySelector('.rl').textContent.trim():'';
      var rv=el.querySelector('.rv')?el.querySelector('.rv').textContent.trim():'';
      if(el.classList.contains('info-row')||el.classList.contains('tipo-row')) lines.push(rc+': '+rl);
      else if(el.classList.contains('total-row')){ lines.push(''); lines.push(sep); lines.push('TOTAL: '+rv); }
      else if(el.classList.contains('obs-row')) lines.push(rc+': '+rl);
      else if(rv) lines.push(rc+' | '+rl+'\n'+rv);
      else lines.push(rc+' | '+rl);
    } else {
      if(t2){ lines.push(''); lines.push(t2); }
    }
  });
  // Materiales: usar matsText (partes nuevos) o extraer del detalle (partes antiguos)
  if(matsText){
    lines.push(matsText);
  } else {
    var matsLines=[];
    var inMats=false;
    Array.from(tmp.children).forEach(function(el){
      var t=el.textContent?el.textContent.trim():'';
      if(t==='Materiales'){ inMats=true; return; }
      if(inMats){
        Array.from(el.children).forEach(function(item){
          var it=item.textContent?item.textContent.trim():'';
          if(it) matsLines.push(it);
        });
        inMats=false;
      }
    });
    if(matsLines.length) lines.push('\nMateriales\n'+matsLines.join('\n'));
  }
  if(obsVal){ lines.push(''); lines.push('Obs.: '+obsVal); }
  var texto=lines.join('\n').trim();
  if(navigator.share){ navigator.share({title:'Parte de Trabajo',text:texto}); }
  else { navigator.clipboard.writeText(texto).then(function(){ alert('Texto copiado.'); }).catch(function(){ alert('No se pudo compartir.'); }); }
}

