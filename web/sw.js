/* Service worker — cache statis saja, API GAS tidak pernah di-cache.

   Navigasi memakai cache-first: aplikasi terbuka seketika dari salinan yang
   tersimpan, lalu versi baru diperbarui diam-diam di belakang. Sebelumnya
   network-first, jadi setiap membuka aplikasi harus menunggu GitHub Pages
   menjawab dulu — itu sendiri bisa detik-detik, di atas dua detik yang sudah
   dibebankan oleh server. */
const VERSI = 'absensi-v3';
const INTI = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/theme.css',
  './css/app.css',
  './js/vendor/jsbarcode.min.js',
  './js/vendor/qrcode-generator.js',
  './js/vendor/html5-qrcode.min.js',
  './js/api.js',
  './js/ui.js',
  './js/page-setelan.js',
  './js/page-masuk.js',
  './js/page-beranda.js',
  './js/page-scan.js',
  './js/page-siswa.js',
  './js/page-kartu.js',
  './js/page-rekap.js',
  './js/page-admin.js',
  './js/page-akun.js',
  './js/app.js',
  './icons/icon.svg',
  './icons/icon-192.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSI).then(function (c) {
      return Promise.all(INTI.map(function (u) {
        return c.add(u).catch(function () { return null; });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (kunci) {
      return Promise.all(kunci.map(function (k) {
        return k === VERSI ? null : caches.delete(k);
      }));
    }).then(function () {
      // Beritahu semua tab yang sedang terbuka bahwa ada service worker
      // baru, supaya bisa sarankans reload sekarang juga.
      return self.clients.claim().then(function () {
        return self.clients.matchAll({ includeUncontrolled: true }).then(function (daftar) {
          daftar.forEach(function (c) { c.postMessage({ tipe: 'sw-baru' }); });
        });
      });
    })
  );
});

function kabariVersiBaru(baru, lama) {
  if (!baru || !lama) return;
  try {
    if (baru.headers.get('content-length') !== lama.headers.get('content-length')) {
      self.clients.matchAll({ includeUncontrolled: true }).then(function (daftar) {
        daftar.forEach(function (c) { c.postMessage({ tipe: 'sw-berubah' }); });
      });
    }
  } catch (e) { }
}

function dariCacheAwal(req) {
  return caches.match(req, { ignoreSearch: true }).then(function (ada) {
    if (ada) {
      const salinan = ada.clone();
      fetch(req).then(function (baru) {
        if (baru && baru.ok) {
          if (/\.(js|css)$/.test(url.pathname)) kabariVersiBaru(baru, ada);
          caches.open(VERSI).then(function (c) { c.put(req, baru); });
        }
      }).catch(function () { });
      return salinan;
    }
    return fetch(req).then(function (baru) {
      if (req.method === 'GET' && baru && baru.ok && baru.type === 'basic') {
        const salinan = baru.clone();
        caches.open(VERSI).then(function (c) { c.put(req, salinan); });
      }
      return baru;
    });
  });
}

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (/\/exec$/.test(url.pathname)) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html').then(function (ada) {
        const perbarui = function () {
          return fetch('./index.html').then(function (baru) {
            if (baru && baru.ok) {
              const s = baru.clone();
              caches.open(VERSI).then(function (c) { c.put('./index.html', s); });
            }
            return baru;
          }).catch(function () { return null; });
        };
        if (ada) {
          // Salinan lama langsung lanserve, pembaruan jalan di belakang tanpa
          // menunggu.
          perbarui();
          return ada;
        }
        return perbarui().then(function (baru) {
          return baru || Response.error();
        });
      })
    );
    return;
  }

  e.respondWith(dariCacheAwal(req).catch(function () {
    return new Response('', { status: 504, statusText: 'Offline' });
  }));
});