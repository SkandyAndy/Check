// Name des Caches (wichtig für Versionierung)
const CACHE_NAME = 'check-app-cache-v1.2';

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
// Wird ausgelöst, wenn der Service Worker installiert wird.
self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Installiere...');
    
    // Wir warten, bis der Cache geöffnet und alle Dateien hinzugefügt wurden.
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[ServiceWorker] Caching App Shell...');
                return cache.addAll(FILES_TO_CACHE);
            })
    );
});

// Event 2: 'fetch'
// Wird bei JEDER Netzwerkanfrage (z.B. für CSS, JS, Bilder) ausgelöst.
self.addEventListener('fetch', (event) => {
    
    event.respondWith(
        // Wir schauen zuerst im Cache nach, ob die angefragte Datei schon da ist.
        caches.match(event.request)
            .then((response) => {
                // 1. Im Cache gefunden!
                // Wir geben die Datei direkt aus dem Cache zurück, ohne Internet.
                if (response) {
                    console.log('[ServiceWorker] Liefere aus Cache:', event.request.url);
                    return response;
                }

                // 2. Nicht im Cache gefunden.
                // Wir müssen die Datei normal aus dem Internet laden.
                console.log('[ServiceWorker] Lade vom Netzwerk:', event.request.url);
                return fetch(event.request);
            })
    );
});

// Event 3: 'activate'
// Wird ausgelöst, wenn ein neuer Service Worker aktiviert wird (z.B. nach einem Update).
// Hier löschen wir alte Caches.
self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Aktiviere...');
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                // Wenn der Cache-Name nicht unser aktueller ist, lösche ihn.
                if (key !== CACHE_NAME) {
                    console.log('[ServiceWorker] Lösche alten Cache:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    // Sorgen dafür, dass der neue Service Worker sofort die Kontrolle übernimmt
    return self.clients.claim();
});