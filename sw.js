// NEU: Name des Caches auf v1.4 geändert
const CACHE_NAME = 'check-app-cache-v1.4';

// Dateien, die für die App-Shell benötigt werden
const FILES_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

// Event 1: 'install'
// (Unverändert)
self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Installiere...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[ServiceWorker] Caching App Shell...');
                return cache.addAll(FILES_TO_CACHE);
            })
    );
});

// Event 2: 'fetch'
// (Unverändert)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    console.log('[ServiceWorker] Liefere aus Cache:', event.request.url);
                    return response;
                }
                console.log('[ServiceWorker] Lade vom Netzwerk:', event.request.url);
                return fetch(event.request);
            })
    );
});

// Event 3: 'activate'
// (Unverändert - die Logik löscht automatisch alle Caches, die NICHT v1.4 heissen)
self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Aktiviere...');
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[ServiceWorker] Lösche alten Cache:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim();
});