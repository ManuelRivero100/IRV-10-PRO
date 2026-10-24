// ===== MÓDULO VERIFICACIÓN CONEXIÓN =====
// Función autocontenida — no depende de nada externo
// Intenta leer config/general de Firestore con timeout de 8 segundos
// Solo sirve con la sesión de Firebase abierta (las reglas no dejan leer a nadie más): antes de entrar,
// el login habla directamente con la función "entrar" y no usa esta comprobación.
// callback(true) = hay conexión real, callback(false) = sin conexión
function _verificarConexionFirestore(callback) {
  var respondido = false;
  var timer = setTimeout(function() {
    if (!respondido) { respondido = true; callback(false); }
  }, 8000);
  _authReady.then(function() {
    try {
      _db.collection('config').doc('general').get().then(function() {
        if (!respondido) { respondido = true; clearTimeout(timer); callback(true); }
      }).catch(function() {
        if (!respondido) { respondido = true; clearTimeout(timer); callback(false); }
      });
    } catch(e) {
      if (!respondido) { respondido = true; clearTimeout(timer); callback(false); }
    }
  }).catch(function() {
    if (!respondido) { respondido = true; clearTimeout(timer); callback(false); }
  });
}
// ===== FIN MÓDULO VERIFICACIÓN CONEXIÓN =====
