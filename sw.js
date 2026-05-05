// SIMBA Service Worker v1.0
const CACHE_NAME = 'simba-v1';
const ASSETS = [
  '/',
  '/index.html',
];

// Install — cache halaman utama
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — hapus cache lama
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_NAME; })
            .map(function(k){ return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch — network first, fallback ke cache
self.addEventListener('fetch', function(e) {
  // Skip non-GET dan Firebase requests
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('firestore.googleapis.com')) return;
  if (e.request.url.includes('firebase')) return;

  e.respondWith(
    fetch(e.request)
      .then(function(res) {
        // Cache response baru
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return res;
      })
      .catch(function() {
        // Offline — ambil dari cache
        return caches.match(e.request).then(function(cached) {
          return cached || caches.match('/index.html');
        });
      })
  );
});

// Push notification handler
self.addEventListener('push', function(e) {
  if (!e.data) return;
  const data = e.data.json();
  e.waitUntil(
    self.registration.showNotification(data.title || 'SIMBA', {
      body   : data.body || 'Ada notifikasi baru',
      icon   : '/icon-192.png',
      badge  : '/icon-72.png',
      tag    : data.tag || 'simba',
      data   : { url: data.url || '/' },
    })
  );
});

// Klik notifikasi — buka/fokus app
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type:'window', includeUncontrolled:true }).then(function(list) {
      for (var i=0; i<list.length; i++) {
        if (list[i].url && list[i].focus) {
          return list[i].focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(e.notification.data?.url || '/');
      }
    })
  );
});

// Periodic sync — cek perawatan di background (jika browser support)
self.addEventListener('periodicsync', function(e) {
  if (e.tag === 'simba-maintenance-check') {
    e.waitUntil(
      self.registration.showNotification('SIMBA – Cek Perawatan', {
        body : 'Buka aplikasi untuk melihat jadwal perawatan terbaru',
        icon : '/icon-192.png',
        tag  : 'simba-periodic',
      })
    );
  }
});
