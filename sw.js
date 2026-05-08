// ══════════════════════════════════════════════
// SERVICE WORKER — Apprends Avec Moi
// ETUD. SETONDJI — setondjimauriac@gmail.com
// ══════════════════════════════════════════════

var CACHE_NAME = 'apprends-v1';
var OFFLINE_URL = './index.html';

var FILES_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Baloo+2:wght@400;600;700;800&display=swap'
];

// ── INSTALLATION : mise en cache ──
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] Mise en cache des fichiers...');
      // On cache les fichiers locaux seulement (les fonts peuvent échouer hors ligne)
      return cache.addAll(['./index.html', './manifest.json']).catch(function(e) {
        console.log('[SW] Certains fichiers non mis en cache:', e);
      });
    })
  );
  // Activer immédiatement sans attendre
  self.skipWaiting();
});

// ── ACTIVATION : nettoyer anciens caches ──
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function(name) { return name !== CACHE_NAME; })
          .map(function(name) {
            console.log('[SW] Suppression ancien cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Prendre contrôle de toutes les pages immédiatement
  self.clients.claim();
});

// ── FETCH : réseau d'abord, cache ensuite ──
self.addEventListener('fetch', function(event) {
  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') return;

  // Pour les fichiers locaux (index.html, manifest.json)
  if (event.request.url.includes(self.location.origin)) {
    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          // Mettre à jour le cache avec la nouvelle version
          var responseClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(function() {
          // Hors ligne : servir depuis le cache
          return caches.match(event.request).then(function(cached) {
            return cached || caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // Pour les ressources externes (fonts, TTS) : réseau uniquement
  event.respondWith(
    fetch(event.request).catch(function() {
      // Hors ligne : retourner une réponse vide pour ne pas bloquer
      return new Response('', { status: 408, statusText: 'Hors ligne' });
    })
  );
});
