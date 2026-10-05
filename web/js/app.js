const Hal = {};

Hal.daftar = function (nama, def) { Hal[nama] = def; };

const APP_WEB = { NAMA: 'ASI (Absensi Siswa)', VERSI: '1.0.0' };

function kartuGagal(err) {
  return h('div', { class: 'card card--warn' }, [
    h('h2', { text: 'Gagal memuat halaman' }),
    h('p', { text: Api.kelasGalat(err) }),
    h('button', {
      class: 'btn btn--primary', type: 'button', text: '↻ Coba lagi',
      onclick: function () { App.render(); }
    })
  ]);
}

const App = {
  RUTE: {
    MASUK: '#/masuk',
    BERANDA: '#/',
    SCAN: '#/scan',
    SISWA: '#/siswa',
    KARTU: '#/kartu',
    REKAP: '#/rekap',
    ADMIN: '#/admin',
    AKUN: '#/akun',
    PENGATURAN: '#/pengaturan',
    SETELAN: '#/pengaturan'
  },

  PERLU_AUTH: ['#/', '#/scan', '#/siswa', '#/kartu', '#/rekap', '#/admin', '#/akun'],

  NAV: [
    { rute: '#/', label: 'Beranda', ikon: '🏠' },
    { rute: '#/scan', label: 'Scan', ikon: '📷' },
    { rute: '#/siswa', label: 'Siswa', ikon: '🎒' },
    { rute: '#/rekap', label: 'Rekap', ikon: '📊' },
    { rute: '#/akun', label: 'Akun', ikon: '👤' },
    { rute: '#/pengaturan', label: 'Atur', ikon: '⚙️' }
  ],

  parse: function () {
    const hash = location.hash || '#/';
    const pisah = hash.indexOf('?');
    const rute = pisah >= 0 ? hash.slice(0, pisah) : hash;
    const query = {};
    if (pisah >= 0) {
      hash.slice(pisah + 1).split('&').forEach(function (bagian) {
        if (!bagian) return;
        const p = bagian.split('=');
        query[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || '').replace(/\+/g, ' '));
      });
    }
    const bersih = rute.replace(/\/+$/, '') || '#/';
    return { rute: bersih, query: query };
  },

  topbar: function () {
    const u = Api.user();
    const s = Api.sekolah();
    const tombolTema = h('button', {
      class: 'btn btn--sm btn--icon',
      type: 'button',
      'aria-label': 'Ganti tema',
      text: document.documentElement.dataset.tema === 'gelap' ? '☀' : '☾',
      onclick: function () {
        Ui.gantiTema();
        App.gambarUlang();
      }
    });
    return h('header', { class: 'topbar' }, [
      h('div', {}, [
        h('div', { class: 'topbar__brand', text: 'ABSENSI SISWA' }),
        h('div', { class: 'topbar__sub', text: (s && s.nama ? s.nama : '') + (u ? ' · ' + u.nama : '') })
      ]),
      h('div', { class: 'topbar__spacer' }),
      tombolTema
    ]);
  },

  nav: function (ruteAktif) {
    const bar = h('nav', { class: 'navbawah', 'aria-label': 'Menu utama' });
    this.NAV.forEach(function (item) {
      const el = h('a', {
        class: 'navbawah__item',
        href: item.rute
      }, [
        h('span', { class: 'navbawah__ikon', text: item.ikon }),
        h('span', { text: item.label })
      ]);
      if (item.rute === ruteAktif) el.setAttribute('aria-current', 'page');
      bar.appendChild(el);
    });
    return bar;
  },

  tambahNav: function (ruteAktif) {
    const shell = $('#shell');
    if (!shell) return;
    shell.appendChild(this.nav(ruteAktif));
  },

  pergi: function (rute) {
    if (location.hash === rute) { App.render(); return; }
    location.hash = rute;
  },

  gambarUlang: function () {
    const shell = $('#shell');
    if (!shell) return;
    const topBaru = this.topbar();
    const topLama = shell.querySelector('.topbar');
    if (topLama) topLama.replaceWith(topBaru);
    else shell.insertBefore(topBaru, shell.firstChild);

    const navBaru = this.nav(this.parse().rute);
    const navLama = shell.querySelector('.navbawah');
    if (navLama) navLama.replaceWith(navBaru);
    else shell.appendChild(navBaru);
  },

  // PWA sendiri ter-update otomatis lewat GitHub Pages, tapi backend /exec
  // hanya berubah kalau versi deployment-nya diganti manual di Apps Script.
  // Selama backend masih versi lama, gejalanya muncul tanpa error sama sekali
  // (foto siswa tidak tampil, pengaturan sekolah tidak tersimpan). Pita
  // peringatan ini membuat ketidakcocokan versi itu kelihatan.
  // Pita peringatan versi backend.
  //
  // Diletakkan sebagai anak pertama <body>, sebelum #shell, dan memakai
  // position: sticky — jadi mendorong konten ke bawah, bukan menutupi
  // apa pun. Versi sebelumnya position: fixed di bawah layar dengan z-index
  // lebih besar dari navbar, jadi pita itu menutupi navigation bawah.
  //
  // Teksnya dibuat ringkas; langkah perbaikan ada di balik tombol "Detail"
  // supaya pita ini tidak memakan layar.
  peringatanBuild: function () {
    return Api.cekBuild().then(function (build) {
      // Pita yang sudah ada dibersihkan lebih dulu, lalu dipasang lagi kalau
      // memang masih perlu. Kalau tidak, pita lama akan tetap menempel
      // padahal server sudah diperbarui.
      const lama = document.getElementById('peringatan-build');
      if (lama) lama.remove();
      if (!Api.buildRendah()) return;
      const ringkas = build
        ? 'Server masih build ' + build + ', aplikasi butuh ' + Api.BUILD_MIN + '.'
        : 'Server tidak melaporkan versi build.';
      const rinci = h('div', { class: 'peringatan-build__rinci', hidden: true }, [
        h('p', { text: 'Foto siswa bisa tidak tampil, pengaturan sekolah bisa gagal tersimpan, dan daftar siswa belum terpaginasi.' }),
        h('p', {}, [
          h('strong', { text: 'Di Apps Script: ' }),
          'Deploy > Manage deployments > edit deployment yang dipakai > Version: New version > Authorize.'
        ]),
        h('p', { text: 'Jangan buat deployment baru — URL barunya tidak tersimpan di perangkat yang lain.' })
      ]);
      const btn = h('button', {
        class: 'peringatan-build__tombol', type: 'button', text: 'Detail',
        onclick: function () {
          const buka = rinci.hasAttribute('hidden');
          if (buka) rinci.removeAttribute('hidden');
          else rinci.setAttribute('hidden', '');
          btn.textContent = buka ? 'Tutup' : 'Detail';
        }
      });
      const el = h('div', { id: 'peringatan-build', class: 'peringatan-build' }, [
        h('div', { class: 'peringatan-build__baris' }, [
          h('strong', { text: 'Server belum diperbarui' }),
          h('span', { class: 'peringatan-build__ringkas', text: ringkas }),
          btn
        ]),
        rinci
      ]);
      document.body.insertBefore(el, document.body.firstChild);
    });
  },

  render: function () {
    const shell = $('#shell');
    if (!shell) return;
    shell.innerHTML = '';
    const p = this.parse();
    const perluAuth = this.PERLU_AUTH.indexOf(p.rute) >= 0;

    if (!Api.adaUrl()) {
      shell.appendChild(this.topbar());
      const wadah = h('section', { class: 'halaman aktif', id: 'hal-pengaturan' });
      shell.appendChild(wadah);
      Hal[this.RUTE.PENGATURAN].render(wadah);
      this.tambahNav(p.rute);
      return;
    }

    if (perluAuth && !Api.adaToken()) {
      this.pergi(this.RUTE.MASUK);
      return;
    }
    if (!perluAuth && Api.adaToken() && (p.rute === this.RUTE.MASUK)) {
      this.pergi(this.RUTE.BERANDA);
      return;
    }

    const def = Hal[p.rute] || Hal['#/'];

    if (perluAuth && def.perluRole) {
      const u = Api.user();
      const boleh = !u || def.perluRole.indexOf(u.role) >= 0;
      if (!boleh) {
        shell.appendChild(this.topbar());
        shell.appendChild(h('section', { class: 'halaman aktif', id: 'hal-' + def.nama }, [
          h('div', { class: 'card card--warn' }, [
            h('h2', { text: 'Akses Ditolak' }),
            h('p', { text: 'Halaman ini hanya untuk peran: ' + def.perluRole.join(', ') + '.' }),
            h('button', {
              class: 'btn btn--primary', type: 'button', text: '← Kembali',
              onclick: function () { App.pergi(App.RUTE.BERANDA); }
            })
          ])
        ]));
        this.tambahNav(p.rute);
        return;
      }
    }

    shell.appendChild(this.topbar());

    const wadah = h('section', { class: 'halaman aktif', id: 'hal-' + def.nama });
    const loader = Ui.muat();
    wadah.appendChild(loader);
    shell.appendChild(wadah);
    this.tambahNav(p.rute);

    const buangLoader = function () { if (loader.parentNode) loader.remove(); };
    let jalankan;
    try {
      jalankan = def.render(wadah, p.query);
    } catch (err) {
      buangLoader();
      wadah.appendChild(kartuGagal(err));
      return;
    }
    if (jalankan && typeof jalankan.then === 'function') {
      jalankan.then(buangLoader).catch(function (err) {
        buangLoader();
        wadah.appendChild(kartuGagal(err));
      });
    } else {
      buangLoader();
    }
  },

  mulai: function () {
    Ui.tema();
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const dengar = function () {
        if (Simpan.ambil(K.TEMA, 'auto') === 'auto') {
          document.documentElement.dataset.tema = mq.matches ? 'gelap' : 'terang';
          App.gambarUlang();
        }
      };
      if (mq.addEventListener) mq.addEventListener('change', dengar);
    }
    window.addEventListener('hashchange', function () {
      window.scrollTo(0, 0);
      App.render();
    });
    if (!location.hash) location.hash = App.RUTE.BERANDA;
    App.render();
    if (Api.adaUrl()) App.peringatanBuild();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(function () { });
      // Service worker memberi tahu kalau ada versi yang lebih baru. Tanpa
      // ini, pengguna bisa berlama-lama memakai JavaScript lama tanpa sadar.
      navigator.serviceWorker.addEventListener('message', function (ev) {
        if (!ev.data || (ev.data.tipe !== 'sw-berubah' && ev.data.tipe !== 'sw-baru')) return;
        App.tawarMuatUlang(ev.data.tipe === 'sw-baru');
      });
    }
  },

  // Nama cache aktif dibaca langsung dari Cache Storage, bukan ditulis manual
  // di dalam kode. Dulu menu Akun hanya menampilkan APP_WEB.VERSI yang
  // hardcoded '1.0.0', jadi begitu cache naik ke v3 layarnya tetap menulis 1.
  versiAset: function () {
    if (!window.caches || !window.caches.keys) return Promise.resolve('');
    return caches.keys().then(function (kunci) {
      const milikKita = kunci.filter(function (k) { return /^absensi-v[0-9]+$/.test(k); });
      if (!milikKita.length) return '';
      milikKita.sort();
      return milikKita[milikKita.length - 1];
    })['catch'](function () { return ''; });
  },

  // Memaksa service worker mengambil sw.js terbaru. Tombol "Periksa
  // pembaruan" tidak menunggu aplikasi dibuka dua kali.
  periksaPembaruan: function () {
    if (!('serviceWorker' in navigator)) return Promise.reject(new Error('Browser ini tidak mendukung service worker'));
    return navigator.serviceWorker.getRegistration().then(function (reg) {
      if (!reg) return navigator.serviceWorker.register('sw.js').then(function () { return true; });
      return reg.update().then(function () { return true; });
    });
  },

  tawarMuatUlang: function (swBaru) {
    if (Simpan.ambil(K.SW_DISARANKAN, false)) return;
    Simpan.simpan(K.SW_DISARANKAN, true);
    const tombol = h('button', {
      class: 'btn btn--sm', type: 'button', text: 'Muat ulang',
      onclick: function () {
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          navigator.serviceWorker.getRegistration().then(function (r) {
            if (r) r.unregister();
          });
        }
        location.reload();
      }
    });
    Ui.toast(swBaru ? 'Aplikasi punya versi baru.' : 'Ada file baru terunduh.', 'info', tombol);
  }
};