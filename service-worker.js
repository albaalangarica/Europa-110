// Cambia la versión al publicar cambios para que los móviles descarguen la nueva.
const CACHE_NAME = 'europa110-v3';

const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './config.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './js/main.js',
  './js/api.js',
  './js/utils.js',
  './js/state.js',
  './js/nav.js',
  './js/agenda.js',
  './js/library.js',
  './js/panels.js',
  './js/guest.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .catch(() => Promise.resolve())
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Primero la red; si no hay conexión, la copia guardada.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Nunca se guardan las respuestas de Apps Script (datos privados).
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
