const CACHE_NAME = 'ballon-esquive-cache-v1';
const FILES_TO_CACHE = [
  '/',
  '/index.html',        // adapte si ton fichier s'appelle autrement
  '/game.js',           // script principal
  '/manifest.json',     // manifeste PWA
  '/rocket.png',
  '/meteorite.png',
  '/meteorite2.png',
  '/meteorite3.png',
  '/meteorite4.png',
  '/meteorite5.png',
  '/meteorite6.png',
  '/menu.png',
  // ajoute ici d'autres ressources statiques si besoin (css, fonts...)
];

// Installation du service worker et mise en cache des fichiers
self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activation du service worker (nettoyage des anciennes caches)
self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys().then(keys => 
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Interception des requêtes pour servir les fichiers depuis le cache
self.addEventListener('fetch', evt => {
  evt.respondWith(
    caches.match(evt.request)
      .then(cachedRes => {
        if (cachedRes) {
          return cachedRes;
        }
        // Sinon, faire une requête réseau normale
        return fetch(evt.request)
          .then(networkRes => {
            // Optionnel : mettre en cache la nouvelle ressource pour futur usage
            return caches.open(CACHE_NAME).then(cache => {
              // Attention à ne pas cacher les requêtes POST ou autres méthodes non GET
              if (evt.request.method === 'GET' && (evt.request.url.startsWith('http://') || evt.request.url.startsWith('https://'))) {
  cache.put(evt.request, networkRes.clone());
}
              return networkRes;
            });
          });
      })
      .catch(() => {
        // Optionnel: ici tu peux retourner un fallback (image, page offline...)
      })
  );
});
