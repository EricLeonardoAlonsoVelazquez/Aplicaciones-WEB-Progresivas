// service-worker.js
console.log('🔧 Service Worker cargando (solo modo offline)...');

const CACHE_NAME = 'arbored-offline-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/login.html',
  '/dashboard.html',
  '/css/style.css',
  '/css/index.css',
  '/css/dashboard.css',
  '/js/app-shell.js',
  '/js/auth.js',
  '/js/index.js',
  '/js/dashboard.js',
  '/manifest.json',
  '/icons/ArbolRed.png',
  '/screenshots/image.png'
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('✅ Service Worker instalándose (modo offline)...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Cache abierto, agregando archivos offline...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('🎉 Recursos offline cacheados correctamente');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Error durante la instalación offline:', error);
      })
  );
});

// Activar Service Worker
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker offline activado');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('🎉 Service Worker offline listo');
      return self.clients.claim();
    })
  );
});

// Interceptar peticiones - SOLO cuando no hay conexión
self.addEventListener('fetch', (event) => {
  // Si hay conexión, NO usar el Service Worker
  if (navigator.onLine) {
    return;
  }

  console.log('🌐 Sin conexión - Service Worker manejando petición:', event.request.url);

  // Para solicitudes de navegación (páginas HTML)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback a la página principal
          return caches.match('/index.html');
        })
    );
    return;
  }

  // Para otros recursos (CSS, JS, imágenes)
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Fallback para recursos específicos
        if (event.request.url.includes('.css')) {
          return new Response('/* Fallback CSS para modo offline */', {
            headers: { 'Content-Type': 'text/css' }
          });
        }
        if (event.request.url.includes('.js')) {
          return new Response('// Fallback JS para modo offline', {
            headers: { 'Content-Type': 'application/javascript' }
          });
        }
        
        // Para otros tipos de recursos, intentar fetch (aunque estemos offline)
        return fetch(event.request);
      })
  );
});

// Manejar mensajes
self.addEventListener('message', (event) => {
  console.log('📨 Mensaje recibido en Service Worker offline:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('✅ Service Worker offline cargado correctamente');