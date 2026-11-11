if('serviceWorker' in navigator){
  window.addEventListener('load', function(){
    // Versión de la app en pequeño en la pantalla de entrada: así se ve qué versión tiene cada móvil
    var _verApp = document.getElementById('verApp'); if(_verApp) _verApp.textContent = 'Versión ' + String(APP_BUILD_ID).replace(/^build-/, '');
    navigator.serviceWorker.register('sw.js?v=' + APP_BUILD_ID, {updateViaCache: 'none'}).catch(function(err){
      console.warn('SW error:', err);
    });
    // Ya no se recarga automáticamente al detectar un Service Worker nuevo en segundo
    // plano — eso causaba reinicios impredecibles durante el día, sin relación con las 6am.
    // El código nuevo llega igual, de forma controlada, a través del cierre de las 6am
    // (_comprobarReinicioDiario) o del chequeo de versión cuando no hay sesión activa
    // (_comprobarVersionNueva). La app se mantiene abierta y estable durante el día,
    // sin más interrupciones que esas dos, o que el técnico cierre sesión manualmente.
  });
}
