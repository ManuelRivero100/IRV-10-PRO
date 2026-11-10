'use strict';
// Pizarra de novedades de la app de uso (proyecto irv-grup). Es UN documento pequeño, config/novedades, donde se anota cuando cambio por ultima
// vez cada cosa. Cada movil lo lee cada pocos minutos (una lectura) y baja SOLO lo que cambio; asi no vuelve a bajar lo que ya tiene.
// Un cambio es crear, modificar o BORRAR un documento. Sin dependencias, para poder probarlo suelto.

// Coleccion vigilada -> clave de la pizarra. (config/catalogo se vigila aparte, con la clave "catalogo".)
const COLECCIONES = [
  'clientes', 'agenda', 'materialesFlotantes', 'enlacesTiendas', 'usuario',
  'incidencias', 'partes', 'tareasPendientes', 'notificacionesTecnico', 'partesSinGuardar'
];
const CLAVE_CATALOGO = 'catalogo';
const DOC_PIZARRA = 'novedades'; // dentro de la coleccion config

// Lo que se escribe en la pizarra cuando cambia algo de una clave. Un reloj que nunca retrocede dentro de una misma instancia.
let ultimo = 0;
function marcaDeTiempo(ahora) {
  ultimo = Math.max(ahora, ultimo + 1);
  return ultimo;
}
function anotacion(clave, ahora) {
  const o = {};
  o[clave] = marcaDeTiempo(ahora);
  return o;
}

// Del lado del movil: que claves cambiaron desde la ultima vez que las vio.
function clavesCambiadas(vistas, actuales) {
  vistas = vistas || {};
  actuales = actuales || {};
  return Object.keys(actuales).filter(function (k) {
    return Number(actuales[k]) > Number(vistas[k] || 0);
  });
}

module.exports = { COLECCIONES, CLAVE_CATALOGO, DOC_PIZARRA, marcaDeTiempo, anotacion, clavesCambiadas };
