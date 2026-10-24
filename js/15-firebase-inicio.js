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

