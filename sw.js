/**
 * Link Saver -Service Worker
 * Cache-First Offline
 */

const CACHE_NAME = 'afu-link-saver-v1.0.0';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.webmanifest',
    './assets/css/style.css',
    './assets/js/crypto.js',
    './assets/js/storage.js',
    './assets/js/ui.js',
    './assets/js/pwa.js',
    './assets/js/app.js',
    './assets/images/logo.jpg'
];

// Install Event - Pre-cache core assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing AFU Link Saver Service Worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching app shell assets');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[SW] Removing old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event - Serve from Cache, fallback to Network
self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    // Return cached asset, update cache asynchronously
                    fetch(event.request).then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200) {
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, networkResponse.clone());
                            });
                        }
                    }).catch(() => {/* Ignore network errors offline */});

                    return cachedResponse;
                }

                // If not in cache, fetch from network and store in cache
                return fetch(event.request).then((networkResponse) => {
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        return networkResponse;
                    }

                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });

                    return networkResponse;
                });
            })
            .catch(() => {
                // Offline fallback
                if (event.request.headers.get('accept').includes('text/html')) {
                    return caches.match('./index.html');
                }
            })
    );
});
