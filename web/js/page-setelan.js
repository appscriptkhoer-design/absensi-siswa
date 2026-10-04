const defPengaturan = {
  nama: 'pengaturan',

  render: function (wadah) {
    const u = Api.user() || {};
    const s = Api.sekolah() || {};
    const bolehUbah = u.role === 'superadmin' || u.role === 'admin';

    wadah.appendChild(h('h1', { text: 'Pengaturan' }));

    /* ---------- kartu: data sekolah ---------- */

    const kartuSekolah = h('div', { class: 'card' });
    const loader = Ui.muat('Memuat data sekolah…');
    kartuSekolah.appendChild(loader);
    wadah.appendChild(kartuSekolah);

    /* ---------- kartu: koneksi ---------- */

    const inUrl = h('input', {
      class: 'input mono',
      type: 'url',
      id: 'in-url',
      inputmode: 'url',
      autocomplete: 'off',
      placeholder: 'https://script.google.com/macros/s/AKfy.../exec',
      value: Api.url()
    });
    const stUrl = h('div', {
      class: 'hint',
      id: 'st-url',
      text: Api.adaUrl()
        ? 'Tersimpan. Basis URL: ' + Api.url() + ' — permintaan dikirim ke ' + Api.urlAwal()
        : 'Belum diisi. URL ini diperoleh setelah Deploy → New deployment → Web app.'
    });
    const btnUji = h('button', { class: 'btn btn--primary btn--block', type: 'button', text: 'Simpan & Uji Koneksi' });

    btnUji.addEventListener('click', function () {
      const v = inUrl.value.trim();
      if (!/^https:\/\/.+\/exec\/?$/i.test(v)) {
        Ui.toast('URL harus diawali https:// dan diakhiri /exec', 'err');
        return;
      }
      Ui.tombolMuat(btnUji, function () {
        Api.aturUrl(v);
        return Api.panggil('app.info', {}).then(function (res) {
          stUrl.textContent = 'Tersimpan. Basis URL: ' + Api.url() + ' — permintaan dikirim ke ' + Api.urlAwal();
          Ui.toast('Terhubung. ' + res.app + ' v' + res.versi, 'ok');
          return true;
        });
      }).then(function (ok) {
        if (ok && Api.adaToken()) { App.pergi(App.RUTE.BERANDA); }
      });
    });

    wadah.appendChild(h('div', { class: 'card' }, [
      h('h2', { class: 'card__title', text: 'Koneksi Server' }),
      h('div', { class: 'field' }, [
        h('label', { class: 'label', for: 'in-url', text: 'URL Web App' }),
        inUrl
      ]),
      stUrl,
      h('div', { style: 'margin-top:14px' }, [btnUji]),
      h('p', {
        class: 'hint',
        text: 'Boleh paste URL lengkap yang berakhiran /exec. Bagian /exec dilepas otomatis agar alamat tidak menjadi /exec/exec.'
      })
    ]));

    /* ---------- kartu: lain-lain ---------- */

    const lain = h('div', { class: 'card' }, [
      h('h2', { class: 'card__title', text: 'Lainnya' })
    ]);

    if (bolehUbah) {
      lain.appendChild(h('a', {
        class: 'item',
        href: '#/admin',
        style: 'text-decoration:none;color:inherit'
      }, [
        h('div', { class: 'item__body' }, [
          h('div', { class: 'item__nama', text: '👥 Pengguna, Notifikasi & Log' }),
          h('div', { class: 'item__meta', text: 'Kelola guru/kelas, uji pesan Telegram, dan riwayat aktivitas.' })
        ])
      ]));
    }

    lain.appendChild(h('div', { class: 'item' }, [
      h('div', { class: 'item__body' }, [
        h('div', { class: 'item__nama', text: '🗑 Hapus Cache & Muat Ulang' }),
        h('div', { class: 'item__meta', text: 'Paksa ambil versi terbaru aplikasi dari server.' })
      ]),
      h('div', { class: 'item__aksi' }, [
        h('button', {
          class: 'btn btn--sm',
          type: 'button',
          text: '↻',
          title: 'Bersihkan cache',
          onclick: function () {
            if (window.caches && caches.keys) {
              caches.keys().then(function (k) {
                Promise.all(k.map(function (n) { return caches.delete(n); }));
              });
            }
            location.reload();
          }
        })
      ])
    ]));

    wadah.appendChild(lain);

    /* ---------- isi form sekolah ---------- */

    if (!Api.adaUrl() || !Api.adaToken()) {
      kartuSekolah.innerHTML = '';
      kartuSekolah.appendChild(h('div', { class: 'card card--tight' }, [
        h('p', {
          class: 'hint',
          text: 'Isi URL Web App dan masuk terlebih dahulu sebelum mengubah data sekolah.'
        })
      ]));
      return Promise.resolve();
    }

    if (!bolehUbah) {
      kartuSekolah.innerHTML = '';
      kartuSekolah.appendChild(h('div', { class: 'card card--tight' }, [
        h('p', { text: 'Data sekolah hanya dapat diubah oleh admin sekolah atau super admin.' })
      ]));
      return Promise.resolve();
    }

    return Api.panggil('sekolah.detail', { sekolah_id: s.id }).then(function (res) {
      const sk = res.sekolah;
      kartuSekolah.innerHTML = '';
      if (!sk) {
        kartuSekolah.appendChild(h('p', { text: 'Belum ada sekolah yang dipilih.' }));
        return;
      }

      const inNama = h('input', { class: 'input', value: sk.nama });
      const inKode = h('input', { class: 'input mono', value: sk.kode, maxlength: '6' });
      const inNpsn = h('input', { class: 'input mono', value: sk.npsn || '', placeholder: '10 digit NPSN', inputmode: 'numeric' });
      const inAlamat = h('textarea', { class: 'input', rows: '2' });
      inAlamat.value = sk.alamat || '';
      const inLat = h('input', { class: 'input mono', value: sk.lat === null ? '' : String(sk.lat), placeholder: '-6.200000', inputmode: 'decimal' });
      const inLng = h('input', { class: 'input mono', value: sk.lng === null ? '' : String(sk.lng), placeholder: '106.816666', inputmode: 'decimal' });
      const inRadius = h('input', { class: 'input', type: 'number', value: String(sk.radius_m || 0), min: '20', step: '10' });
      const inMasuk = h('input', { class: 'input', type: 'time', value: Ui.jam(sk.jam_masuk) || '07:00' });
      const inTelat = h('input', { class: 'input', type: 'number', value: String(sk.batas_telat_mnt || 0), min: '0', max: '120' });
      const inPulang = h('input', { class: 'input', type: 'time', value: Ui.jam(sk.jam_pulang) || '13:00' });
      const cekFoto = h('input', { type: 'checkbox', style: 'width:22px;height:22px' });
      cekFoto.checked = !!sk.foto_publik;
      const cekWa = h('input', { type: 'checkbox', style: 'width:22px;height:22px' });
      cekWa.checked = !!sk.wa_aktif;

      const btnSimpan = h('button', { class: 'btn btn--primary', type: 'submit', text: '💾 Simpan Data Sekolah' });

      const form = h('form', { class: 'pengaturan-grid', autocomplete: 'off' }, [
        h('div', { class: 'card card--flat' }, [
          h('h3', { text: 'Identitas' }),
          h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Nama sekolah' }), inNama]),
          h('div', { class: 'field-row' }, [
            h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Kode' }), inKode]),
            h('div', { class: 'field' }, [h('label', { class: 'label', text: 'NPSN' }), inNpsn])
          ]),
          h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Alamat' }), inAlamat])
        ]),
        h('div', { class: 'card card--flat' }, [
          h('h3', { text: 'Waktu & Lokasi Absen' }),
          h('div', { class: 'field-row' }, [
            h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Jam masuk' }), inMasuk]),
            h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Batas telat (menit)' }), inTelat])
          ]),
          h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Jam pulang' }), inPulang]),
          h('div', { class: 'field-row' }, [
            h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Latitude' }), inLat]),
            h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Longitude' }), inLng])
          ]),
          h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Radius absen (meter)' }), inRadius]),
          h('p', { class: 'hint', text: 'Koordinat diambil dari Google Maps: klik lokasi sekolah, lalu salin latitude/longitude. Radius terlalu kecil membuat absen ditolak.' })
        ]),
        h('div', { class: 'card card--flat' }, [
          h('h3', { text: 'Foto & Integrasi' }),
          h('label', { class: 'item', style: 'cursor:pointer' }, [
            cekFoto,
            h('div', { class: 'item__body' }, [
              h('div', { class: 'item__nama', text: 'Foto siswa publik' }),
              h('div', { class: 'item__meta', text: 'Matikan agar foto hanya lewat link bertoken.' })
            ])
          ]),
          h('label', { class: 'item', style: 'cursor:pointer' }, [
            cekWa,
            h('div', { class: 'item__body' }, [
              h('div', { class: 'item__nama', text: 'WhatsApp Cloud API' }),
              h('div', { class: 'item__meta', text: 'Adapter sudah ada; butuh token & template Meta yang disetujui.' })
            ])
          ])
        ]),
        h('div', { class: 'btn-row', style: 'grid-column:1/-1' }, [btnSimpan])
      ]);

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        Ui.tombolMuat(btnSimpan, function () {
          return Api.panggil('sekolah.perbarui', {
            sekolah_id: sk.id,
            nama: inNama.value,
            kode: inKode.value,
            npsn: inNpsn.value,
            alamat: inAlamat.value,
            lat: inLat.value,
            lng: inLng.value,
            radius_m: inRadius.value,
            jam_masuk: inMasuk.value,
            batas_telat_mnt: inTelat.value,
            jam_pulang: inPulang.value,
            foto_publik: cekFoto.checked,
            wa_aktif: cekWa.checked
          }).then(function (r) {
            Api.setSekolah(r.sekolah);
            Ui.toast(r.message || 'Data sekolah disimpan.', 'ok');
          });
        });
      });

      kartuSekolah.appendChild(h('h2', { class: 'card__title', text: 'Data Sekolah' }));
      kartuSekolah.appendChild(form);

      if (u.role === 'superadmin') {
        kartuSekolah.appendChild(h('p', {
          class: 'hint',
          text: 'Kode sekolah dipakai sebagai awalan kode absen siswa. Mengubahnya tidak mengubah kode yang sudah tercetak.'
        }));
      }
    }).catch(function (err) {
      kartuSekolah.innerHTML = '';
      kartuSekolah.appendChild(h('div', { class: 'card card--warn', text: Api.kelasGalat(err) }));
    });
  }
};

Hal.daftar('#/pengaturan', defPengaturan);
Hal.daftar('#/setelan', defPengaturan);
