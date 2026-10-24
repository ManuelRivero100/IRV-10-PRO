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

// Fila de la lista "Partes de esta orden" del resumen de orden (p sale de _ordenActual.resumen.partes):
// título con su etiqueta (Cerrada / Certificados), horario y, si la hay, la fecha de certificación
function pdfParteOrdenRow(doc,y,p){
  var base='Parte '+p.n+(p.numParte?' ('+p.numParte+')':'')+' · '+p.fecha;
  var h=p.certificadoEl?13:9;
  y=pdfCheck(doc,y,h+1);
  doc.setFillColor(_PDF.bgSurf[0],_PDF.bgSurf[1],_PDF.bgSurf[2]);
  doc.rect(_PDF.mg,y,_PDF.cW,h,'F');
  doc.setDrawColor(_PDF.green[0],_PDF.green[1],_PDF.green[2]);
  doc.setLineWidth(0.5);
  doc.line(_PDF.mg,y,_PDF.mg,y+h);
  doc.setFontSize(7.5); doc.setFont('helvetica','bold');
  var col=p.color?_PDF.green:_PDF.textW;
  doc.setTextColor(col[0],col[1],col[2]);
  doc.text(base,_PDF.mg+3,y+5);
  if(p.etiqueta){
    var anchoBase=doc.getTextWidth(base); // se mide con el tamaño de letra del título, antes de cambiarlo
    var colEt=p.etiqueta==='Certificados'?_PDF.green:_PDF.text2;
    doc.setTextColor(colEt[0],colEt[1],colEt[2]);
    doc.setFontSize(6);
    doc.text('· '+p.etiqueta,_PDF.mg+3+anchoBase+2,y+5);
  }
  doc.setFont('helvetica','normal'); doc.setTextColor(_PDF.text2[0],_PDF.text2[1],_PDF.text2[2]);
  doc.setFontSize(6.5);
  doc.text(p.horario,_PDF.mg+3,y+8.5);
  if(p.certificadoEl){
    doc.setTextColor(_PDF.green[0],_PDF.green[1],_PDF.green[2]);
    doc.text(p.certificadoEl,_PDF.mg+3,y+11.5);
  }
  return y+h+1.5;
}

// La letra del PDF no tiene algunos símbolos que sí salen en la pantalla: las fracciones sueltas (⅛, ⅜…) se escriben
// como 1/8, 3/8… ("1⅛" pasa a "1 1/8"), la flecha como "->", el símbolo de grados como "°" y los emojis se quitan
function pdfLimpiar(txt){
  var f={'⅛':'1/8','⅜':'3/8','⅝':'5/8','⅞':'7/8','⅓':'1/3','⅔':'2/3'};
  return String(txt).replace(/(\d)([⅛-⅞⅓⅔])/g,function(m,d,c){ return d+' '+f[c]; })
    .replace(/[⅛-⅞⅓⅔]/g,function(c){ return f[c]; })
    .replace(/→/g,'->')
    .replace(/⁰/g,'°')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{23E9}-\u{23FF}\u{2B50}\u{FE0F}]/gu,'')
    .replace(/\s+/g,' ').trim();
}

// Fila de material como se ve en la pantalla de la orden: nombre a la izquierda y cantidad a la derecha
function pdfFilaNombreCantidad(doc,y,nombre,cantidad){
  var lines=doc.splitTextToSize(pdfLimpiar(nombre),_PDF.cW-20);
  var h=Math.max(_PDF.RH, lines.length*4+4);
  y=pdfCheck(doc,y,h+1);
  doc.setFillColor(_PDF.bgSurf[0],_PDF.bgSurf[1],_PDF.bgSurf[2]);
  doc.rect(_PDF.mg,y,_PDF.cW,h,'F');
  doc.setDrawColor(_PDF.border[0],_PDF.border[1],_PDF.border[2]);
  doc.setLineWidth(0.2); doc.rect(_PDF.mg,y,_PDF.cW,h);
  doc.setFontSize(7.5); doc.setFont('helvetica','normal');
  doc.setTextColor(_PDF.textW[0],_PDF.textW[1],_PDF.textW[2]);
  doc.text(lines,_PDF.mg+3,y+5);
  doc.setFont('helvetica','bold'); doc.setFontSize(8);
  doc.text(String(cantidad),_PDF.mg+_PDF.cW-3,y+5,{align:'right'});
  return y+h+0.5;
}

// Texto suelto en gris, para los avisos de "sin datos" que también salen en la pantalla
function pdfTextoVacio(doc,y,txt){
  y=pdfCheck(doc,y,8);
  doc.setFontSize(7); doc.setFont('helvetica','normal');
  doc.setTextColor(_PDF.text2[0],_PDF.text2[1],_PDF.text2[2]);
  doc.text(txt,_PDF.mg,y+4);
  return y+7;
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

function pdfSubtotalRow(doc,y,label,precio,tag){ // tag: la etiqueta de la columna izquierda ("Sub.")
  y=pdfCheck(doc,y,_PDF.RH+2);
  doc.setFillColor(15,42,26);
  doc.rect(_PDF.mg,y,_PDF.cW,_PDF.RH+1,'F');
  doc.setDrawColor(_PDF.green[0],_PDF.green[1],_PDF.green[2]);
  doc.setLineWidth(0.2); doc.rect(_PDF.mg,y,_PDF.cW,_PDF.RH+1);
  doc.setFontSize(6.5); doc.setFont('helvetica','bold');
  doc.setTextColor(74,222,128);
  doc.text(tag||'',_PDF.mg+4,y+5.5);
  doc.text((label||'Subtotal').toUpperCase(),_PDF.mg+4+_PDF.RC*0.55,y+5.5);
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

// Fila de texto a todo el ancho (lista de materiales, avisos…): el texto tal cual sale en la pantalla
function pdfFilaTexto(doc,y,txt){
  if(!txt) return y;
  var lines=doc.splitTextToSize(txt,_PDF.cW-6);
  var h=Math.max(_PDF.RH, lines.length*4+4);
  y=pdfCheck(doc,y,h+1);
  doc.setFillColor(_PDF.bgSurf[0],_PDF.bgSurf[1],_PDF.bgSurf[2]);
  doc.rect(_PDF.mg,y,_PDF.cW,h,'F');
  doc.setDrawColor(_PDF.border[0],_PDF.border[1],_PDF.border[2]);
  doc.setLineWidth(0.2); doc.rect(_PDF.mg,y,_PDF.cW,h);
  doc.setFontSize(7.5); doc.setFont('helvetica','normal');
  doc.setTextColor(_PDF.textW[0],_PDF.textW[1],_PDF.textW[2]);
  doc.text(lines,_PDF.mg+3,y+5);
  return y+h+0.5;
}

// Tarjeta de un técnico de la pantalla de Estadísticas: nombre y nº de partes, horas normal / extra / nocturna / festiva,
// total de horas y, debajo, el nº de clientes y las fechas. `tarjeta` es el elemento .tec-card-s de la pantalla.
function pdfTecnicoStats(doc,y,tarjeta,texto){
  var t=function(sel){ var e=tarjeta.querySelector(sel); return e?texto(e):''; };
  var celdas=[].slice.call(tarjeta.querySelectorAll('.tec-hcell')).map(function(c){
    return { lbl:texto(c.querySelector('.tec-hlbl')), val:texto(c.querySelector('.tec-hval')) };
  });
  var meta=[].slice.call(tarjeta.querySelectorAll('.tec-mmeta span')).map(function(s){ return texto(s).replace(/\s*->\s*/g,' a '); });
  y=pdfCheck(doc,y,36);
  // Nombre y nº de partes
  doc.setFillColor(_PDF.bgSurf2[0],_PDF.bgSurf2[1],_PDF.bgSurf2[2]);
  doc.rect(_PDF.mg,y,_PDF.cW,_PDF.RH+1,'F');
  doc.setDrawColor(_PDF.border[0],_PDF.border[1],_PDF.border[2]);
  doc.setLineWidth(0.2); doc.rect(_PDF.mg,y,_PDF.cW,_PDF.RH+1);
  doc.setFont('helvetica','bold'); doc.setFontSize(8.5);
  doc.setTextColor(_PDF.textW[0],_PDF.textW[1],_PDF.textW[2]);
  doc.text(t('.tec-sum-name'),_PDF.mg+3,y+5.5);
  doc.setFontSize(7); doc.setTextColor(_PDF.green[0],_PDF.green[1],_PDF.green[2]);
  doc.text(t('.tec-sum-badge'),_PDF.mg+_PDF.cW-3,y+5.5,{align:'right'});
  y+=_PDF.RH+1;
  // Horas por tipo
  var ancho=_PDF.cW/(celdas.length||1);
  celdas.forEach(function(c,i){
    var x=_PDF.mg+i*ancho;
    doc.setFillColor(_PDF.bgSurf[0],_PDF.bgSurf[1],_PDF.bgSurf[2]);
    doc.rect(x,y,ancho,_PDF.RH+2,'F');
    doc.setDrawColor(_PDF.border[0],_PDF.border[1],_PDF.border[2]);
    doc.rect(x,y,ancho,_PDF.RH+2);
    doc.setFont('helvetica','bold'); doc.setFontSize(5.5);
    doc.setTextColor(_PDF.text2[0],_PDF.text2[1],_PDF.text2[2]);
    doc.text(c.lbl.toUpperCase(),x+ancho/2,y+3.2,{align:'center'});
    doc.setFontSize(8);
    doc.setTextColor(_PDF.textW[0],_PDF.textW[1],_PDF.textW[2]);
    doc.text(c.val,x+ancho/2,y+7.6,{align:'center'});
  });
  y+=_PDF.RH+2;
  // Total de horas
  doc.setFillColor(_PDF.greenLt[0],_PDF.greenLt[1],_PDF.greenLt[2]);
  doc.rect(_PDF.mg,y,_PDF.cW,_PDF.RH,'F');
  doc.setDrawColor(_PDF.border[0],_PDF.border[1],_PDF.border[2]);
  doc.rect(_PDF.mg,y,_PDF.cW,_PDF.RH);
  doc.setFont('helvetica','normal'); doc.setFontSize(7);
  doc.setTextColor(_PDF.green[0],_PDF.green[1],_PDF.green[2]);
  doc.text(t('.tec-htotal span:first-child'),_PDF.mg+3,y+4.8);
  doc.setFont('helvetica','bold'); doc.setFontSize(9);
  doc.text(t('.tec-htval'),_PDF.mg+_PDF.cW-3,y+5,{align:'right'});
  y+=_PDF.RH;
  // Clientes y fechas
  doc.setFont('helvetica','normal'); doc.setFontSize(6.5);
  doc.setTextColor(_PDF.text2[0],_PDF.text2[1],_PDF.text2[2]);
  if(meta[0]) doc.text(meta[0],_PDF.mg+1,y+4.5);
  if(meta[1]) doc.text(meta[1],_PDF.mg+_PDF.cW-1,y+4.5,{align:'right'});
  return y+8;
}

// Una fila del cuerpo del parte (clase rrow): según su tipo, la fila que le corresponde en el PDF
function pdfFilaParte(doc,y,el,texto){
  var sp=function(cls){ var s=el.querySelector('.'+cls); return s?texto(s):''; };
  var rc=sp('rc'), rl=sp('rl'), rv=sp('rv');
  // El precio, si lo hay, es el cuarto elemento: lleva clase "rp" o, en partes antiguos, solo un estilo verde
  var spans=el.querySelectorAll('span');
  var elPrecio=el.querySelector('.rp')||(spans.length>3?spans[3]:null);
  var precio=elPrecio?texto(elPrecio):'';
  if(el.classList.contains('tipo-row')) return pdfTipoRow(doc,y,rl);
  if(el.classList.contains('info-row')) return pdfInfoRow(doc,y,rc.toUpperCase(),rl);
  if(el.classList.contains('obs-row')) return pdfNotaRow(doc,y,rl,rc.toUpperCase()||'OBS.',_PDF.amber,_PDF.amberLt);   // la etiqueta es la de la fila: "Obs." o "Auto"
  if(el.classList.contains('total-row')){
    y=precio?pdfTotalRowConPrecio(doc,y,rv,precio):pdfTotalRow(doc,y,rv);
    return y+2;
  }
  if(el.classList.contains('subtotal-row')) return pdfSubtotalRow(doc,y,rl,rv,rc);
  if(precio) return pdfCodeRowConPrecio(doc,y,rc,rl,rv,precio);
  return pdfCodeRow(doc,y,rc,rl,rv);
}

// PDF del parte: es la pantalla del parte (parteCuerpoHTML) sin los botones, elemento a elemento y en el mismo orden
function pdfDesde(r){
  if(!window.jspdf){ alert('PDF no disponible.'); return; }
  var doc=pdfNuevo();
  var y=12;
  var cuerpo=document.createElement('div');
  cuerpo.innerHTML=parteCuerpoHTML(r);
  var texto=function(el){ return pdfLimpiar(el.textContent.replace(/ /g,' ').replace(/\s+/g,' ').trim()); };

  Array.from(cuerpo.children).forEach(function(el){
    var estilo=el.getAttribute('style')||'';
    if(el.classList.contains('card-title')){ y=pdfHdr(doc,y,texto(el)); y+=2; }
    else if(el.classList.contains('divider')||estilo.indexOf('height:1px')>=0){ y+=2; }
    else if(el.classList.contains('rgroup-title')){ y=pdfGroupTitle(doc,y,texto(el)); }
    else if(el.classList.contains('nota-trayectoria')){ y=pdfNotaRow(doc,y,texto(el),'TRAYEC.',_PDF.text2,_PDF.bgSurf2); }
    else if(el.classList.contains('rrow')){ y=pdfFilaParte(doc,y,el,texto); }
    else if(estilo.indexOf('text-transform:uppercase')>=0){ y=pdfGroupTitle(doc,y,texto(el)); }   // título de sección ("Materiales")
    else if(estilo.indexOf('padding:6px 0')>=0){                                                    // lista de materiales
      Array.from(el.children).forEach(function(m){ y=pdfFilaTexto(doc,y,texto(m)); });
    }
    else if(estilo.indexOf('text-align:center')>=0){                                                // técnicos
      var nombres=texto(el);
      if(nombres){
        y=pdfCheck(doc,y,8);
        doc.setFontSize(7); doc.setFont('helvetica','normal');
        doc.setTextColor(_PDF.text2[0],_PDF.text2[1],_PDF.text2[2]);
        doc.text(nombres,_PDF.mg+_PDF.cW/2,y+4,{align:'center'});
        y+=8;
      }
    }
    else { y=pdfFilaTexto(doc,y,texto(el)); }                                                       // avisos, "Sin detalle."…
  });

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

