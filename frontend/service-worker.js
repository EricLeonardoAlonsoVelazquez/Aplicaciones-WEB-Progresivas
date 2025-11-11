// service-worker.js
console.log('🔧 Service Worker cargando...');

const CACHE_NAME = 'arbored-v6S';
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
  console.log('✅ Service Worker instalándose...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Cache abierto, agregando archivos...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('🎉 Todos los recursos cacheados correctamente');
        return self.skipWaiting(); // Activar inmediatamente
      })
      .catch((error) => {
        console.error('❌ Error durante la instalación:', error);
      })
  );
});

// Activar Service Worker
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activado');
  
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
      console.log('🎉 Service Worker listo para controlar clientes');
      return self.clients.claim(); // Tomar control inmediato
    })
  );
});

// Interceptar peticiones
self.addEventListener('fetch', (event) => {
  // Para solicitudes de navegación (páginas HTML)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cachear la respuesta
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone);
            });
          return response;
        })
        .catch(() => {
          // Si falla la red, servir desde cache
          return caches.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Fallback a la página principal
              return caches.match('/index.html');
            });
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
        
        return fetch(event.request)
          .then((response) => {
            // Verificar si la respuesta es válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Cachear la respuesta
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Fallback para recursos específicos
            if (event.request.url.includes('.css')) {
              return new Response('/* Fallback CSS */', {
                headers: { 'Content-Type': 'text/css' }
              });
            }
            if (event.request.url.includes('.js')) {
              return new Response('// Fallback JS', {
                headers: { 'Content-Type': 'application/javascript' }
              });
            }
          });
      })
  );
});

// Manejar mensajes
self.addEventListener('message', (event) => {
  console.log('📨 Mensaje recibido en Service Worker:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});


console.log('✅ Service Worker cargado correctamente');

