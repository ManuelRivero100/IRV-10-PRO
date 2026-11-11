'use strict';
// Funcion "avisos" de Partes IRV-10 (proyecto irv-10-pro).
// Cuando a un tecnico se le asigna una orden o una tarea (o se le reasigna), le manda un aviso al movil aunque la app este cerrada,
// con el numero de cosas que tiene sin iniciar (la app lo pone en el icono). No manda recordatorios ni avisos de "ya no tienes nada":
// el numero se mantiene hasta que el tecnico abre la app y esta lo recalcula. Los moviles estan en la coleccion dispositivosPush.
// Ademas avisa a los administradores de todo lo que sale en su panel de avisos (orden nueva, solicitud de reabrir, tarea, solape, acceso
// desactivado, material pendiente, parte sin guardar). Solo LEE datos; escribe en dispositivosPush para borrar un movil que ya no existe
// y marca avisadoAdmin en partesSinGuardar para no avisar dos veces del mismo parte.

const { onDocumentWritten, onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const webpush = require('web-push');
const L = require('./logica');

admin.initializeApp();
const db = admin.firestore();

const VAPID_PRIVADA = defineSecret('VAPID_PRIVADA');
const VAPID_PUBLICA = 'BGN6U_pFjvxglqvqhCwzE6zsXJks636whioHB9O08xfr36PQ7BdmVceoeFhDDARi7PjFAkEPpXXSCCaSsnkmsFw';
const REGION = 'europe-west1';
const TTL_SEGUNDOS = 3 * 24 * 60 * 60; // si el movil esta apagado, el aviso espera hasta 3 dias

async function contarSinIniciar(tec) {
  const [inc, tar] = await Promise.all([
    db.collection('incidencias').where('tecnicoPrincipal', '==', tec).where('vista', '==', false).get(),
    db.collection('tareasPendientes').where('tecnico', '==', tec).where('estado', '==', 'pendiente').get()
  ]);
  let n = 0;
  inc.forEach(function (d) { if (L.incidenciaSinIniciar(d.data(), tec)) n++; });
  tar.forEach(function (d) { if (L.tareaSinIniciar(d.data(), tec)) n++; });
  return n;
}

// Cada aviso lleva "para": 'tecnico' (lo que le pasa como tecnico) o 'admin' (lo que sale en su panel de administrador). La app lo usa al tocar el aviso
// para abrirlo en el rol que corresponde. Los moviles con la app anterior ignoran ese dato.
// Manda la carga a una lista de moviles (documentos de dispositivosPush).
async function enviar(docs, carga) {
  webpush.setVapidDetails('https://irv-10-pro.web.app', VAPID_PUBLICA, VAPID_PRIVADA.value());
  await Promise.all(docs.map(async function (doc) {
    const d = doc.data();
    try {
      await webpush.sendNotification({ endpoint: d.endpoint, keys: d.keys }, carga, { TTL: TTL_SEGUNDOS, urgency: 'high' });
    } catch (e) {
      // 404/410: el movil ya no existe (app desinstalada o permiso retirado). Se olvida para no volver a intentarlo.
      if (e && (e.statusCode === 404 || e.statusCode === 410)) await doc.ref.delete();
      else console.warn('aviso no enviado', doc.id, e && e.statusCode, e && e.message);
    }
  }));
}

async function avisar(aviso) {
  const disp = await db.collection('dispositivosPush').where('tecnico', '==', aviso.tecnico).get();
  if (disp.empty) return;
  const n = await contarSinIniciar(aviso.tecnico);
  await enviar(disp.docs, JSON.stringify({ titulo: aviso.titulo, texto: aviso.texto, n: n, para: 'tecnico' }));
}

// ---- Avisos para el administrador (lo mismo que ve en el panel de avisos de la app) ----
// Cuantas cosas tiene ahora el panel del administrador (el numero que se pone en el icono): ordenes nuevas y solicitudes, avisos de
// notificacionesTecnico, tareas sin ver, un grupo si hay materiales pendientes y partes sin guardar de mas de 15 min.
async function contarPanelAdmin() {
  const [inc, notif, mat, sg, tar] = await Promise.all([
    db.collection('incidencias').where('vistaAdmin', '==', false).get(),
    db.collection('notificacionesTecnico').get(),
    db.collection('materialesFlotantes').get(),
    db.collection('partesSinGuardar').get(),
    db.collection('tareasPendientes').where('vistaAdmin', '==', false).get()
  ]);
  const ahora = Date.now();
  let n = inc.size + notif.size + tar.size + (mat.empty ? 0 : 1);
  sg.forEach(function (d) { if ((ahora - (d.data().generadoEn || 0)) >= L.MIN_SIN_GUARDAR_MS) n++; });
  return n;
}

// Moviles de los usuarios con rol administrador o creador, activos (cada uno solo si activo los avisos en su movil).
async function dispositivosAdmin() {
  const us = await db.collection('usuario').where('roles', 'array-contains-any', ['admin', 'creador']).get();
  const nombres = [];
  us.forEach(function (u) { const d = u.data(); if (d.activo !== false && d.nombre) nombres.push(d.nombre); });
  const docs = [];
  for (const nombre of nombres) {
    const disp = await db.collection('dispositivosPush').where('tecnico', '==', nombre).get();
    disp.forEach(function (x) { docs.push(x); });
  }
  return docs;
}

async function avisarAdmins(aviso) {
  const docs = await dispositivosAdmin();
  if (!docs.length) return;
  const n = await contarPanelAdmin();
  await enviar(docs, JSON.stringify({ titulo: aviso.titulo, texto: aviso.texto, n: n, para: 'admin' }));
}

exports.avisosIncidencias = onDocumentWritten(
  { document: 'incidencias/{id}', region: REGION, secrets: [VAPID_PRIVADA] },
  async function (event) {
    const antes = event.data.before.exists ? event.data.before.data() : null;
    const despues = event.data.after.exists ? event.data.after.data() : null;
    const aviso = L.avisarIncidencia(antes, despues);
    if (aviso) await avisar(aviso);
    const rechazo = L.avisoTecnicoRechazo(antes, despues);
    if (rechazo) await avisar(rechazo);
    const avisoAdmin = L.avisoAdminIncidencia(antes, despues);
    if (avisoAdmin) await avisarAdmins(avisoAdmin);
  }
);

exports.avisosTareas = onDocumentWritten(
  { document: 'tareasPendientes/{id}', region: REGION, secrets: [VAPID_PRIVADA] },
  async function (event) {
    const antes = event.data.before.exists ? event.data.before.data() : null;
    const despues = event.data.after.exists ? event.data.after.data() : null;
    const aviso = L.avisarTarea(antes, despues);
    if (aviso) await avisar(aviso);
    const comentada = L.avisoTecnicoTareaComentada(antes, despues);
    if (comentada) await avisar(comentada);
    const avisoAdmin = L.avisoAdminTarea(antes, despues);
    if (avisoAdmin) await avisarAdmins(avisoAdmin);
  }
);

// Solape de horas y accesos de tecnicos desactivados (coleccion notificacionesTecnico)
exports.avisosNotificaciones = onDocumentCreated(
  { document: 'notificacionesTecnico/{id}', region: REGION, secrets: [VAPID_PRIVADA] },
  async function (event) {
    const aviso = L.avisoAdminNotificacion(event.data ? event.data.data() : null);
    if (aviso) await avisarAdmins(aviso);
  }
);

// Material que un tecnico anade y queda pendiente de clasificar en el catalogo
exports.avisosMateriales = onDocumentCreated(
  { document: 'materialesFlotantes/{id}', region: REGION, secrets: [VAPID_PRIVADA] },
  async function (event) {
    const aviso = L.avisoAdminMaterial(event.data ? event.data.data() : null);
    if (aviso) await avisarAdmins(aviso);
  }
);

// Recordatorio del registro de horas (lunes a viernes, hora de Madrid): una hora despues de lo ultimo que pase en la jornada del tecnico
// (17:00 si no hay partes o terminan a las 16:00; si un parte termina mas tarde, una hora despues de su fin, viaje de vuelta incluido).
// Se revisa cada 15 minutos entre las 17:00 y las 23:45; cada tecnico recibe el aviso UNA sola vez al dia (marca en avisosEnviados) y solo
// si todavia no ha llenado su registro de horas de ese dia.
exports.avisosHorasDiarias = onSchedule(
  { schedule: '*/15 17-23 * * 1-5', timeZone: 'Europe/Madrid', region: REGION, secrets: [VAPID_PRIVADA] },
  async function () {
    const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const g = function (t) { return (f.find(function (p) { return p.type === t; }) || {}).value; };
    const fecha = g('year') + '-' + g('month') + '-' + g('day');
    const diaSemana = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[g('weekday')];
    const ahoraMin = Number(g('hour')) * 60 + Number(g('minute'));
    const us = await db.collection('usuario').get();
    const candidatos = us.docs.map(function (d) { return d.data(); }).filter(function (u) { return L.faltaRegistroHoras(u, fecha, diaSemana, false); }); // activo, con alta, dia laborable y no festivo
    if (!candidatos.length) return;
    const partesHoy = (await db.collection('partes').where('fecha', '==', fecha).get()).docs.map(function (d) { return d.data(); });
    for (const u of candidatos) {
      const id = L.idRegistroHoras(u.nombre, fecha);
      const marca = db.collection('avisosEnviados').doc('horas_' + id);
      const [reg, yaMarca] = await Promise.all([db.collection('horasAdicionales').doc(id).get(), marca.get()]);
      if (!L.debeRecordarHoras(u, fecha, diaSemana, reg.exists, partesHoy, ahoraMin, yaMarca.exists)) continue;
      await marca.set({ tecnico: u.nombre, fecha: fecha, enviado: Date.now(), minutoPrevisto: L.minutoRecordatorio(partesHoy, u.nombre) });
      await avisar(Object.assign({ tecnico: u.nombre }, L.avisoRegistroHoras()));
    }
  }
);

// Partes generados y no guardados: cada 5 min se miran los que llevan 15 min o mas y se avisa UNA vez (se marca avisadoAdmin).
exports.avisosPartesSinGuardar = onSchedule(
  { schedule: 'every 5 minutes', timeZone: 'Europe/Madrid', region: REGION, secrets: [VAPID_PRIVADA] },
  async function () {
    const snap = await db.collection('partesSinGuardar').get();
    const ahora = Date.now();
    for (const doc of snap.docs) {
      const d = doc.data();
      if (!L.parteSinGuardarParaAvisar(d, ahora)) continue;
      await doc.ref.update({ avisadoAdmin: true });
      await avisarAdmins(L.avisoAdminParteSinGuardar(d));
    }
  }
);
