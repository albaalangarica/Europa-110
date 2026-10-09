// La app antigua (GitHub Pages) tenía un service worker que guardaba la web en el móvil.
// Esta versión borra lo guardado y se da de baja, para que la redirección a la app nueva funcione.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll())
      .then((clients) => clients.forEach((client) => client.navigate(client.url))),
  )
})
