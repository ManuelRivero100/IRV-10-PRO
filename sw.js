// sw.js: la aplicación se ha movido a https://irv-10-pro.web.app/IRV-10-PRO/
// Este service worker sustituye al de la copia antigua: al activarse borra las cachés de esa copia ("irv10-build-…"), se desinstala solo y lleva
// las pestañas abiertas a la dirección nueva. No guarda nada y no intercepta ninguna petición.
self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(e){
  e.waitUntil((async function(){
    try {
      var claves = await caches.keys();
      await Promise.all(claves.filter(function(k){ return k.indexOf('irv10-build-') === 0; }).map(function(k){ return caches.delete(k); }));
    } catch (x) {}
    // Para poder llevar las pestañas abiertas a la dirección nueva, este worker tiene que tomar su control primero.
    try { await self.clients.claim(); } catch (x) {}
    try {
      var clientes = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      await Promise.all(clientes.map(function(c){ return c.navigate('https://irv-10-pro.web.app/IRV-10-PRO/').catch(function(){}); }));
    } catch (x) {}
    try { await self.registration.unregister(); } catch (x) {}
  })());
});
