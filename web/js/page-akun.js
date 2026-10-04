Hal.daftar('#/akun', {
  nama: 'akun',
  render: function (wadah) {
    const u = Api.user() || {};
    const s = Api.sekolah() || {};
    let semuaSekolah = [];

    function baris(k, label, nilai) {
      return h('div', { class: 'kv' }, [
        h('div', { class: 'kv__k', text: label }),
        h('div', { class: 'kv__v' }, typeof nilai === 'string' || typeof nilai === 'number' ? String(nilai) : nilai)
      ]);
    }

    wadah.appendChild(h('h1', { text: 'Akun Saya' }));

    wadah.appendChild(h('a', {
      class: 'item',
      href: App.RUTE.PENGATURAN,
      style: 'text-decoration:none;color:inherit;margin-bottom:12px'
    }, [
      h('div', { class: 'item__body' }, [
        h('div', { class: 'item__nama', text: '⚙️ Pengaturan' }),
        h('div', { class: 'item__meta', text: 'Ubah data sekolah, titik absen, jam, dan URL server.' })
      ])
    ]));

    wadah.appendChild(h('div', { class: 'card' }, [
      h('div', { class: 'suhu' }, [
        Ui.avatar({ pravatar: (u.nama || u.username || '?').slice(0, 1).toUpperCase() }, 'lg'),
        h('div', { style: 'min-width:0' }, [
          h('div', { style: 'font-weight:900;font-size:1.1rem', text: u.nama || u.username }),
          h('div', { class: 'mono', style: 'font-size:0.8rem', text: '@' + (u.username || '-') }),
          h('div', { class: 'btn-row', style: 'margin-top:8px' }, [Ui.badge(u.role || 'guru'), Ui.badge(u.status || 'active')])
        ])
      ])
    ]));

    wadah.appendChild(h('div', { class: 'card' }, [
      h('h2', { class: 'card__title', text: 'Sekolah Aktif' }),
      h('div', { class: 'kv-list' }, [
        baris('nama', 'Nama', s.nama || 'Belum dipilih'),
        baris('kode', 'Kode', s.kode || '-'),
        baris('lokasi', 'Titik absen', (s.lat === undefined || s.lat === null) ? 'Belum diisi' : (s.lat + ', ' + s.lng + ' · ' + (s.radius_m || 0) + ' m')),
        baris('jam', 'Jam', (Ui.jam(s.jam_masuk) || '-') + ' – ' + (Ui.jam(s.jam_pulang) || '-'))
      ])
    ]));

    if (u.role === 'superadmin') {
      const sel = h('select', { class: 'input' });
      const btnSimpan = h('button', { class: 'btn btn--sm btn--primary', type: 'button', text: 'Ganti' });
      const blok = h('div', { class: 'card' }, [
        h('h2', { class: 'card__title', text: 'Ganti Sekolah' }),
        h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Pilih sekolah' }), sel]),
        h('div', { class: 'btn-row' }, [btnSimpan])
      ]);
      wadah.appendChild(blok);

      btnSimpan.addEventListener('click', function () {
        if (!sel.value) { Ui.toast('Pilih sekolah dulu.', 'err'); return; }
        const item = semuaSekolah.filter(function (x) { return String(x.id) === sel.value; })[0];
        if (!item) return;
        Ui.tombolMuat(btnSimpan, function () {
          return Api.panggil('sekolah.detail', { sekolah_id: item.id }).then(function (res) {
            Api.setSekolah(res.sekolah);
            Ui.toast('Sekolah aktif: ' + res.sekolah.nama, 'ok');
            App.render();
          });
        });
      });

      Api.panggil('sekolah.list', {}).then(function (res) {
        semuaSekolah = res.data || [];
        sel.appendChild(h('option', { value: '', text: '— pilih sekolah —' }));
        semuaSekolah.forEach(function (x) {
          sel.appendChild(h('option', { value: String(x.id), text: x.nama + ' (' + x.kode + ')', selected: String(x.id) === String(s.id) }));
        });
      }).catch(Ui.galat);
    }

    wadah.appendChild(h('div', { class: 'card' }, [
      h('h2', { class: 'card__title', text: 'Keamanan' }),
      h('p', { class: 'hint', text: 'Sesi berlaku 30 hari dan diperpanjang setiap dipakai.' }),
      h('div', { class: 'kv-list' }, [
        baris('s', 'Sesi berakhir', Simpan.ambil(K.EXPIRES, '-').replace('T', ' ')),
        baris('r', 'Peran', Ui.badge(u.role || 'guru'))
      ]),
      h('div', { class: 'btn-row', style: 'margin-top:12px' }, [
        (function () {
          const b = h('button', { class: 'btn btn--sm', type: 'button', text: '🔑 Ganti Password' });
          b.addEventListener('click', formPassword);
          return b;
        })(),
        (function () {
          const b = h('button', { class: 'btn btn--sm btn--red', type: 'button', text: '⏻ Keluar' });
          b.addEventListener('click', keluar);
          return b;
        })()
      ])
    ]));

    wadah.appendChild(h('div', { class: 'card' }, [
      h('h2', { class: 'card__title', text: 'Tampilan' }),
      h('div', { class: 'kv-list' }, [
        baris('t', 'Tema', document.documentElement.dataset.tema === 'gelap' ? 'Gelap' : 'Terang'),
        baris('i', 'Versi aplikasi', APP_WEB.VERSI)
      ]),
      h('div', { class: 'btn-row', style: 'margin-top:12px' }, [
        (function () {
          const b = h('button', { class: 'btn btn--sm', type: 'button', text: '🎨 Ganti Tema' });
          b.addEventListener('click', function () {
            Ui.gantiTema();
            App.render();
          });
          return b;
        })(),
        (function () {
          const b = h('button', { class: 'btn btn--sm', type: 'button', text: '🗑 Hapus Cache' });
          b.addEventListener('click', function () {
            if (window.caches) caches.keys().then(function (k) { k.forEach(function (n) { caches.delete(n); }); });
            Ui.toast('Cache dihapus. Muat ulang halaman.', 'ok');
          });
          return b;
        })()
      ])
    ]));

    function formPassword() {
      const lama = h('input', { class: 'input', type: 'password', autocomplete: 'current-password' });
      const baru = h('input', { class: 'input', type: 'password', autocomplete: 'new-password' });
      const ulang = h('input', { class: 'input', type: 'password', autocomplete: 'new-password' });
      Ui.modal({
        judul: 'Ganti Password',
        isi: h('div', {}, [
          h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Password lama' }), lama]),
          h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Password baru' }), baru]),
          h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Ulangi password baru' }), ulang]),
          h('p', { class: 'hint', text: 'Minimal 8 karakter. Sesi di perangkat lain ikut dikeluarkan.' })
        ]),
        aksi: [
          { label: 'Batal' },
          {
            label: 'Simpan', class: 'btn--primary', jalankan: function (tutup) {
              if (baru.value.length < 8) { Ui.toast('Password baru minimal 8 karakter.', 'err'); return; }
              if (baru.value !== ulang.value) { Ui.toast('Ulangi password tidak sama.', 'err'); return; }
              Api.panggil('auth.ganti_password', { password_lama: lama.value, password_baru: baru.value })
                .then(function (r) {
                  Ui.toast(r.message || 'Password diganti.', 'ok');
                  Api.bersihkanSesi();
                  tutup();
                  location.hash = App.RUTE.MASUK;
                  App.render();
                }).catch(Ui.galat);
            }
          }
        ]
      });
    }

    // Diagnostik. Satu panggilan API ke Apps Script selalu memakan waktu
    // beberapa detik karena biaya platformnya, jadi halaman ini menampilkan
    // angka nyata dari perangkat ini — bukan perkiraan.
    function kartuDiagnostik() {
      const d = Api.diag();
      const dtk = function (ms) { return (Math.round(ms / 100) / 10) + ' dtk'; };
      const kartu = h('div', { class: 'card' }, [
        h('h2', { class: 'card__title', text: 'Kondisi Server' }),
        h('div', { class: 'kv-list' }, [
          baris('build', 'Versi backend', d.build === null ? 'belum dicek' : d.build + (d.build < Api.BUILD_MIN ? ' (terlalu lama — perbarui deployment)' : ' (terbaru)')),
          baris('rata', 'Rata-rata panggilan', d.panggilan ? dtk(d.rerata) : 'belum ada data'),
          baris('akhir', 'Panggilan terakhir', d.terakhir ? dtk(d.terakhir) : '-'),
          baris('jml', 'Jumlah panggilan', String(d.panggilan)),
          baris('cache', 'Dilayani dari cache', String(d.cachePukul)),
          baris('lambat', 'Calls lebih dari 5 dtk', String(d.lambat)),
          baris('foto', 'Foto dimuat', String(d.foto)),
          baris('antre', 'Foto di antrean', String(Api._antrean.length)),
          baris('sw', 'Cache aplikasi', navigator.serviceWorker && navigator.serviceWorker.controller ? 'aktif' : 'belum aktif')
        ]),
        h('p', { class: 'teks-kecil', style: 'margin-top:10px', text: 'Angka diukur di perangkat ini. Salin dan kirim kalau ada complaint lambat.' })
      ]);
      return kartu;
    }

    wadah.appendChild(kartuDiagnostik());

    function keluar() {
      Ui.konfirmasi('Keluar dari akun ini di perangkat ini?', 'Keluar', 'Keluar').then(function () {
        return Api.panggil('auth.logout', {}).catch(function () { })
          .then(function () {
            Api.bersihkanSesi();
            location.hash = App.RUTE.MASUK;
            App.render();
          });
      });
    }
  }
});