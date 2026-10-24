try {
  firebase.initializeApp({
    apiKey: "AIzaSyD497jbjxdiBZsj7LZZBMX5OqGw5hjt5Ho",
    authDomain: "irv-10-pro.firebaseapp.com",
    projectId: "irv-10-pro",
    storageBucket: "irv-10-pro.firebasestorage.app",
    messagingSenderId: "828319929826",
    appId: "1:828319929826:web:96fda06ee0ba09ddf115bb"
  });
} catch(e) { /* App ya inicializada */ }
var _db = firebase.firestore();
// Funciones del servidor: "entrar" comprueba nombre + PIN y devuelve el permiso para abrir la sesión de
// Firebase; "fijarPin" cifra y guarda el PIN de un técnico (solo admin). Los PIN nunca viajan en Firestore.
var URL_ENTRAR = 'https://entrar-828319929826.europe-west1.run.app';
var URL_FIJARPIN = 'https://fijarpin-828319929826.europe-west1.run.app';
// No hay sesión anónima: las reglas de Firestore solo dejan pasar a quien ha entrado con su PIN (ver
// _iniciarSesion). _authReady se resuelve cuando Firebase ha recuperado la sesión guardada en este
// dispositivo, si la hay (también sin internet); _verificarConexionFirestore espera a esto antes de consultar.
var _authReady = new Promise(function(resolve){
  var dejarDeEscuchar = firebase.auth().onAuthStateChanged(function(){ dejarDeEscuchar(); resolve(); });
});

// Si hay una sesión guardada de una vez anterior, entrar directamente sin pedir PIN otra
// vez — así la app sobrevive a que el móvil descargue la pestaña de memoria al salir a
// otra app. Se mantiene indefinidamente hasta el reinicio diario de las 6am o un cierre
// de sesión manual (los dos ya borran esta misma clave, sin cambios necesarios en ellos).
// Espera a _authReady para que Firestore esté listo antes de sincronizar nada.
_authReady.then(function(){
  try {
    var _sesionGuardada = JSON.parse(localStorage.getItem('irv_sesion') || 'null');
    if (!_sesionGuardada || !_sesionGuardada.nombre || !_sesionGuardada.rol) return;
    // Sin la sesión de Firebase de este dispositivo no hay acceso a los datos: se pide el PIN otra vez
    if (!firebase.auth().currentUser) return;
    // Si ya tocan las 6am de un día no marcado todavía, no restaurar — dejar ver el login
    // normal, que al escribir el PIN disparará el ciclo de reinicio de siempre sin haber
    // malgastado sincronizaciones que se cancelarían de inmediato al recargar
    var ahora = new Date();
    var hoy = ahora.toISOString().slice(0,10);
    var ultimoDiaActivo = localStorage.getItem('pm_ultimo_dia_activo');
    if (ultimoDiaActivo !== hoy && ahora.getHours() >= 6) {
      localStorage.setItem('pm_ultimo_dia_activo', hoy);
      try { localStorage.removeItem('irv_sesion'); } catch(e) { _fallo('iniciarSplash #1')(e); }
      return;
    }
    _iniciarPresentacionLogin(_sesionGuardada.nombre);
    _aplicarSesion(_sesionGuardada.nombre, _sesionGuardada.rol, !!_sesionGuardada.multiRol);
  } catch(e) { _fallo('iniciarSplash #2')(e); }
});

