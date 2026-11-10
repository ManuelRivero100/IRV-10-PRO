'use strict';
// Funcion "novedades" de la app de uso (proyecto irv-grup, region europe-west1): cada vez que se crea, cambia o borra un documento de las
// colecciones vigiladas anota la hora en config/novedades. NO lee ni copia datos de nadie; solo escribe esa marca.
// OJO: no vigila "config" entera (la propia pizarra esta ahi y se produciria un bucle); solo el documento config/catalogo.

const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const L = require('./logica');

admin.initializeApp();
const db = admin.firestore();
const REGION = 'europe-west1';

function anotar(clave) {
  return db.collection('config').doc(L.DOC_PIZARRA).set(L.anotacion(clave, Date.now()), { merge: true });
}

L.COLECCIONES.forEach(function (col) {
  exports['novedades_' + col] = onDocumentWritten({ document: col + '/{id}', region: REGION }, async function () {
    await anotar(col);
  });
});

exports.novedades_catalogo = onDocumentWritten({ document: 'config/catalogo', region: REGION }, async function () {
  await anotar(L.CLAVE_CATALOGO);
});
