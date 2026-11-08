'use strict';
// Reglas de "pendiente de iniciar" de la funcion "avisos". Son las mismas que usa la app nueva para el numero del icono
// (js/20b-tareas-pendientes.js: _tareaSinIniciar y _badgeIconoContar). Sin dependencias, para poder probarlas sueltas.

const ESTADOS_ABIERTOS = ['pendiente', 'en-ejecucion'];

// Una orden asignada al tecnico que todavia no ha empezado: nace con vista:false, se reinicia al reasignar o reabrir y pasa a
// true cuando el tecnico guarda su primer parte.
function incidenciaSinIniciar(d, tec) {
  return !!d && d.tecnicoPrincipal === tec && d.vista === false && ESTADOS_ABIERTOS.indexOf(d.estado) >= 0;
}

// Una tarea pendiente del tecnico en la que todavia no ha escrito ninguna nota (despues de la ultima reasignacion).
function tareaSinIniciar(d, tec) {
  if (!d || d.estado !== 'pendiente') return false;
  const yo = String(tec || '').toLowerCase();
  const coms = d.comentarios || [];
  let desde = 0;
  coms.forEach(function (c) { if (/^Reasignada de /.test(c.texto || '') && (c.ts || 0) > desde) desde = c.ts; });
  return !coms.some(function (c) {
    return String(c.por || '').toLowerCase() === yo && (c.ts || 0) > desde && !/^Reasignada de /.test(c.texto || '');
  });
}

// ¿Hay que avisar? Solo cuando algo pasa a estar sin iniciar PARA ESTE TECNICO (nuevo, o reasignado a el); no en cada cambio.
function avisarIncidencia(antes, despues) {
  if (!despues) return null;
  const tec = despues.tecnicoPrincipal;
  if (!tec || !incidenciaSinIniciar(despues, tec)) return null;
  if (antes && incidenciaSinIniciar(antes, tec)) return null;
  return { tecnico: tec, titulo: 'Nueva asignación', texto: despues.tienda || 'Tienes una orden nueva' };
}
function avisarTarea(antes, despues) {
  if (!despues) return null;
  const tec = despues.tecnico;
  if (!tec || !tareaSinIniciar(despues, tec)) return null;
  if (antes && antes.tecnico === tec && tareaSinIniciar(antes, tec)) return null;
  return { tecnico: tec, titulo: 'Nueva tarea', texto: despues.tienda || despues.cliente || 'Tienes una tarea nueva' };
}

// ---- Avisos para el ADMINISTRADOR: todo lo que aparece en su panel de avisos de la app llega tambien al movil ----
const MIN_SIN_GUARDAR_MS = 15 * 60 * 1000; // el panel solo muestra un parte sin guardar a partir de 15 min

function fechaCorta(dia) { return String(dia || '').split('-').reverse().join('/'); }
function unir(partes) { return partes.filter(Boolean).join(' · '); }

// Orden nueva creada por un tecnico (nace con vistaAdmin:false) o solicitud de reabrir. Avisa solo cuando ocurre, no en cada cambio.
function avisoAdminIncidencia(antes, despues) {
  if (!despues) return null;
  const ref = unir([despues.pedido ? 'Orden ' + despues.pedido : '', despues.centro ? 'Centro ' + despues.centro : '']);
  const sol = despues.solicitudReabrir;
  if (sol && !(antes && antes.solicitudReabrir)) {
    return { titulo: 'Solicitud de reabrir', texto: unir([sol.tecnico, despues.tienda, ref]) };
  }
  if (despues.vistaAdmin === false && !sol && !(antes && antes.vistaAdmin === false)) {
    return { titulo: 'Orden nueva', texto: unir([despues.tienda, ref, despues.creadoPor ? 'creada por ' + despues.creadoPor : '']) };
  }
  return null;
}
// Tarea que un tecnico creo o comento y el administrador aun no ha visto (vistaAdmin:false).
function avisoAdminTarea(antes, despues) {
  if (!despues || despues.vistaAdmin !== false) return null;
  if (antes && antes.vistaAdmin === false) return null;
  return { titulo: antes ? 'Tarea comentada' : 'Tarea nueva', texto: unir([despues.tienda || despues.cliente, despues.tecnico]) };
}
// Avisos de la coleccion notificacionesTecnico: solape de horas, acceso de un tecnico desactivado.
function avisoAdminNotificacion(n) {
  if (!n) return null;
  if (n.tipo === 'solape') return { titulo: 'Solape de horas', texto: unir([(n.tecnicos || []).join(', '), fechaCorta(n.dia)]) };
  const quien = n.tecnico || 'Un técnico';
  if (n.tipo === 'intento_desactivado') return { titulo: 'Acceso desactivado', texto: quien + ' intentó entrar estando desactivado' };
  return { titulo: 'Acceso desactivado', texto: quien + ' entró a la app estando desactivado' };
}
function avisoAdminMaterial(m) {
  if (!m) return null;
  return { titulo: 'Material pendiente', texto: unir([m.nombre, m.grupo]) };
}
// Parte generado y no guardado: se avisa una sola vez, cuando lleva 15 min o mas.
function parteSinGuardarParaAvisar(d, ahora) {
  return !!d && !d.avisadoAdmin && (ahora - (d.generadoEn || 0)) >= MIN_SIN_GUARDAR_MS;
}
function avisoAdminParteSinGuardar(d) {
  return { titulo: 'Parte sin guardar', texto: unir([d.tecnicoGenerador, d.tienda]) };
}

// ---- Recordatorio de las 17:00: tecnico que no ha llenado su registro de horas de hoy ----
// Misma regla que el control horario de la app: de lunes a viernes, tecnicos con fecha de alta (activoDesde) y sin registro ese dia.
// Festivos nacionales de la app (11-calculos-utilidades.js: FN y FF) para no avisar en dias que no se trabajan.
const FESTIVOS_NAC = ['01-01', '01-06', '05-01', '08-15', '10-12', '11-01', '12-06', '12-08', '12-25'];
const FESTIVOS_FIJOS = ['2026-04-03', '2026-04-02'];
function esFestivoNacional(fecha) {
  if (!fecha) return false;
  if (FESTIVOS_FIJOS.indexOf(fecha) !== -1) return true;
  const p = fecha.split('-');
  return FESTIVOS_NAC.indexOf(p[1] + '-' + p[2]) !== -1;
}
function idRegistroHoras(nombre, fecha) { return String(nombre || '').toLowerCase().replace(/[\/\s]+/g, '_') + '_' + fecha; }
// u = ficha de usuario; fecha = 'AAAA-MM-DD' de hoy en Madrid; diaSemana 0=domingo..6=sabado
function faltaRegistroHoras(u, fecha, diaSemana, hayRegistro) {
  if (!u || u.activo === false || !u.nombre || !u.activoDesde) return false;
  if (diaSemana < 1 || diaSemana > 5) return false;
  if (fecha < u.activoDesde) return false;
  if (esFestivoNacional(fecha)) return false;
  return !hayRegistro;
}
function avisoRegistroHoras() {
  return { titulo: 'Registro de horas', texto: 'Aún no has llenado tu registro de horas de hoy' };
}

module.exports = {
  esFestivoNacional, idRegistroHoras, faltaRegistroHoras, avisoRegistroHoras,
  incidenciaSinIniciar, tareaSinIniciar, avisarIncidencia, avisarTarea,
  avisoAdminIncidencia, avisoAdminTarea, avisoAdminNotificacion, avisoAdminMaterial,
  parteSinGuardarParaAvisar, avisoAdminParteSinGuardar, MIN_SIN_GUARDAR_MS
};
