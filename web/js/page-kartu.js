Hal.daftar('#/kartu', {
  nama: 'kartu',
  render: function (wadah, query) {
    const sekolahId = (Api.sekolah() || {}).id;
    let kelas = query.kelas || '';
    let semuaTerpilih = {};
    let data = [];

    const chipRow = h('div', { class: 'chip-row' });
    const daftarPilih = h('div', { class: 'list' });
    const areaCetak = h('div', { class: 'cetak-sisi', id: 'cetak-sisi' });
    const info = h('div', { class: 'card card--tight' });

    const tombolCetak = h('button', { class: 'btn btn--primary', type: 'button', text: '🖨 Cetak / Simpan PDF' });
    // Menunggu foto sampai tuntas itu lambat untuk kelas besar, jadi bukan
    // bawaan. Yang bawaan: cetak sekarang, foto yang sudah siap ikut tercetak.
    const cekTungguFoto = h('input', { type: 'checkbox', style: 'width:22px;height:22px' });

    const tombolSemua = h('button', { class: 'btn btn--sm', type: 'button', text: 'Pilih semua' });
    const tombolKosong = h('button', { class: 'btn btn--sm', type: 'button', text: 'Kosongkan' });
    tombolSemua.addEventListener('click', function () {
      data.forEach(function (s) { semuaTerpilih[String(s.id)] = true; });
      gambarDaftar();
      gambar();
    });
    tombolKosong.addEventListener('click', function () {
      semuaTerpilih = {};
      gambarDaftar();
      gambar();
    });

    const kelasFilter = h('select', { class: 'input' });
    kelasFilter.addEventListener('change', function () { kelas = kelasFilter.value; muat(); });

    wadah.appendChild(h('div', { class: 'cetak-aksi' }, [
      h('h1', { text: 'Cetak Kartu Siswa' }),
      h('div', { class: 'card card--tight' }, [
        h('div', { class: 'field-row' }, [
          h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Kelas' }), kelasFilter]),
          h('div', { class: 'field' }, [
            h('label', { class: 'label', text: 'Foto' }),
            h('label', { style: 'display:flex;align-items:center;gap:8px;min-height:56px;font-weight:800' }, [cekTungguFoto, 'Tunggu semua foto (lambat)'])
          ])
        ]),
        chipRow,
        h('div', { class: 'btn-row' }, [tombolSemua, tombolKosong])
      ]),
      info,
      daftarPilih,
      h('div', { class: 'btn-row', style: 'margin-top:14px' }, [tombolCetak])
    ]));
    wadah.appendChild(areaCetak);

    function fotoSiswa(s, besar) {
      const box = h('div', { class: 'kartu__foto' });
      if (besar) box.style.width = '30mm';
      if (!s.foto_proxy && !s.foto) {
        box.textContent = s.pravatar || '?';
        return box;
      }
      const img = h('img', { alt: '' });
      box.appendChild(img);
      Api.pasangFoto(img, s.foto_proxy, s.foto_uc || s.foto, function (err) {
        box.textContent = '';
        box.appendChild(h('span', { class: 'avatar__galat', title: (err && err.message) || '', text: '!' }));
      })['catch'](function () { });
      return box;
    }

    // Satu kartu untuk satu sisi saja: foto, identitas, QR, barcode, dan kolom
    // tanda tangan semuanya muat di kartu 63x88mm. Versi lama memakai
    // kartuDepan + kartuBelakang untuk cetak dua sisi; sesuai permintaan,
    // mode dua sisi dihapus seluruhnya.
    function kartuGabung(s, namaSekolah) {
      return h('div', { class: 'kartu' }, [
        h('div', { class: 'kartu__kepala' }, [
          fotoSiswa(s),
          h('div', { class: 'kartu__identitas' }, [
            h('div', { class: 'kartu__sekolah', text: namaSekolah }),
            h('div', { class: 'kartu__nama', text: s.nama }),
            h('div', { class: 'kartu__meta', text: 'Kelas ' + (s.kelas || '-') + (s.rombel ? ' · ' + s.rombel : '') }),
            h('div', { class: 'kartu__meta', text: (s.nis ? 'NIS ' + s.nis : '') + (s.gender ? ' · ' + (s.gender === 'L' ? 'L' : 'P') : '') })
          ])
        ]),
        h('div', { class: 'kartu__qr', style: 'width:16mm;margin:0 auto' }, [h('img', { class: 'js-qr', 'data-nilai': s.barcode, alt: '' })]),
        h('div', { class: 'kartu__kode' }, [h('svg', { class: 'js-kode', 'data-nilai': s.barcode })]),
        h('div', { class: 'kartu__nis', text: s.barcode }),
        h('div', { class: 'kartu__ttd' }, [
          h('span', { text: 'Kelas' }),
          h('span', { text: 'Orang Tua' })
        ])
      ]);
    }

    function gambar() {
      areaCetak.innerHTML = '';
      const terpilih = data.filter(function (s) { return semuaTerpilih[String(s.id)]; });
      if (!terpilih.length) {
        areaCetak.appendChild(h('div', { class: 'kosong', text: 'Pilih siswa terlebih dahulu di daftar di atas.' }));
        info.textContent = 'Belum ada siswa dipilih.';
        return;
      }
      info.textContent = terpilih.length + ' kartu siap dicetak · 1 sisi (QR di depan)';

      const namaSekolah = (Api.sekolah() || {}).nama || 'SEKOLAH';

      // Satu siswa yang gagal dibuat tidak boleh mengosongkan seluruh
      // halaman. Tanpa try/catch di sini, satu data aneh membuat SEMUA
      // kartu hilang dan yang tampil cuma pesan galat generik.
      let gagal = 0;
      const bangun = function (pabrik) {
        return function (s) {
          try {
            return pabrik(s, namaSekolah);
          } catch (err) {
            gagal += 1;
            if (typeof console !== 'undefined' && console.error) {
              // Hanya s.id: s.nama justru bisa jadi penyebab lemparnya
              // error, jadi tidak boleh ikut diubah jadi teks di sini.
              console.error('Kartu gagal dibuat untuk siswa #' + s.id, err);
            }
            return null;
          }
        };
      };

      areaCetak.appendChild(h('div', { class: 'cetak-sisi__sisi', id: 'sisi-depan' },
        terpilih.map(bangun(kartuGabung)).filter(Boolean)));

      renderGambar();

      if (gagal > 0) {
        info.textContent += ' · ' + gagal + ' kartu gagal dibuat (lihat konsol browser)';
        Ui.toast(gagal + ' kartu gagal dibuat. Kartu lain tetap dicetak.', 'err', 6000);
      }
    }

    function renderGambar() {
      $$('.js-kode', areaCetak).forEach(function (svg) {
        try {
          JsBarcode(svg, svg.dataset.nilai, {
            format: 'CODE128',
            width: 1.6,
            height: 34,
            displayValue: false,
            margin: 0,
            font: 'monospace'
          });
        } catch (e) { }
      });
      $$('.js-qr', areaCetak).forEach(function (img) {
        try {
          const qr = qrcode(0, 'M');
          qr.addData(img.dataset.nilai);
          qr.make();
          img.src = qr.createDataURL(4, 0);
        } catch (e) { }
      });
    }

    function gambarDaftar() {
      daftarPilih.innerHTML = '';
      const list = data.filter(function (s) { return kelas ? s.kelas === kelas : true; });
      if (!list.length) {
        daftarPilih.appendChild(h('div', { class: 'kosong', text: 'Tidak ada siswa pada filter ini.' }));
        return;
      }
      // Sama seperti di gambar(): satu data rusak tidak boleh mengosongkan
      // halaman. Tanpa ini, satu siswa membuat daftar siswa ikut hilang,
      // dan karena itu tidak ada satu pun kartu yang bisa dicetak.
      let gagal = 0;
      list.forEach(function (s) {
        try {
          barisSiswa(s);
        } catch (err) {
          gagal += 1;
          if (typeof console !== 'undefined' && console.error) {
            console.error('Baris siswa gagal dibuat untuk #' + s.id, err);
          }
          daftarPilih.appendChild(h('div', { class: 'item' }, [
            h('div', { class: 'item__nama', text: 'Satu siswa gagal ditampilkan' }),
            h('div', { class: 'item__meta', text: 'Data #' + s.id + ' - lihat konsol browser' })
          ]));
        }
      });
      if (gagal > 0) {
        Ui.toast(gagal + ' siswa gagal ditampilkan. Sisanya tetap bisa dicetak.', 'err', 6000);
      }
    }

    function barisSiswa(s) {
      const cek = h('input', { type: 'checkbox', style: 'width:22px;height:22px;flex-shrink:0' });
      cek.checked = !!semuaTerpilih[String(s.id)];
      cek.addEventListener('change', function () {
        semuaTerpilih[String(s.id)] = cek.checked;
        gambar();
      });
      daftarPilih.appendChild(h('label', { class: 'item', style: 'cursor:pointer' }, [
        cek,
        Ui.avatar(s, 'sm'),
        h('div', { class: 'item__body' }, [
          h('div', { class: 'item__nama', text: s.nama }),
          h('div', { class: 'item__meta' }, [
            h('span', { text: s.kelas }),
            h('span', { class: 'mono', text: s.barcode }),
            s.punya_foto ? null : h('span', { text: 'foto belum ada' })
          ])
        ])
      ]));
    }

    // Cetak tidak boleh bergantung pada foto: kartu yang fotonya kosong tetap
    // berguna karena barcode dan QR digambar dari data.
    //
    // Batas 2,5 detik sudah cukup untuk foto yang hampir selesai. Foto dialirkan
    // lewat antrean (maksimal 6 sekaligus), jadi untuk kelas besar antreannya
    // memang belum habis — dan itu bukan alasan untuk menahan pencetakan.
    // Yang lambat bisa dicentang sendiri di panel atas.
    const TUNGGU_CETAK_MS = 2500;
    const TUNGGU_CETAK_PENUH_MS = 60000;

    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('afterprint', function () { Ui.pulihkanFotoCetak(areaCetak); });
    }

    tombolCetak.addEventListener('click', function () {
      const terpilih = data.filter(function (s) { return semuaTerpilih[String(s.id)]; });
      if (!terpilih.length) { Ui.toast('Pilih minimal satu siswa.', 'err'); return; }
      Ui.tombolMuat(tombolCetak, function () {
        const batas = cekTungguFoto.checked ? TUNGGU_CETAK_PENUH_MS : TUNGGU_CETAK_MS;
        return Ui.tungguFotoCetak(areaCetak, batas).then(function (hasil) {
          // Disembunyikan hanya untuk mencetak. Foto tetap ada di DOM, jadi
          // cetak berikutnya bisa memakainya begitu sampai.
          const kosong = Ui.sembunyikanFotoBelumSiap(areaCetak);
          if (kosong > 0) {
            Ui.toast(kosong + ' foto belum siap, kartu dicetak tanpa foto. ' +
              'Cetak lagi nanti untuk lengkapi.', 'info', 6000);
          }
          return new Promise(function (res) {
            setTimeout(function () { window.print(); res(true); }, 150);
          });
        });
      });
    });

    function muat() {
      daftarPilih.innerHTML = '';
      daftarPilih.appendChild(Ui.muat('Memuat siswa…'));
      return Promise.all([
        Api.panggil('siswa.kelas', {}, { ttl: Api.TTL }),
        Api.panggil('siswa.kartu', { sekolah_id: sekolahId, kelas: kelas })
      ]).then(function (hasil) {
        const kelasList = hasil[0].data || [];
        if (kelasFilter.dataset.siap !== '1') {
          kelasFilter.appendChild(h('option', { value: '', text: 'Semua kelas' }));
          kelasList.forEach(function (k) {
            kelasFilter.appendChild(h('option', { value: k.kelas, text: k.kelas + ' (' + k.jumlah + ')' }));
          });
          kelasFilter.dataset.siap = '1';
        }
        if (!kelas && kelasList.length === 1) {
          kelas = kelasList[0].kelas;
          kelasFilter.value = kelas;
        }
        chipRow.innerHTML = '';
        kelasList.forEach(function (k) {
          const c = h('button', {
            class: 'chip', type: 'button',
            'aria-pressed': k.kelas === kelas ? 'true' : 'false',
            text: k.kelas + ' (' + k.jumlah + ')'
          });
          c.addEventListener('click', function () {
            kelas = (k.kelas === kelas) ? '' : k.kelas;
            kelasFilter.value = kelas;
            muat();
          });
          chipRow.appendChild(c);
        });

        data = hasil[1].data || [];
        if (!Object.keys(semuaTerpilih).length) {
          data.forEach(function (s) { semuaTerpilih[String(s.id)] = true; });
        }
        gambarDaftar();
        gambar();
      }).catch(function (err) {
        // Daftar yang sudah ada tetap dipakai; error cukup ditambahkan di
        // bawahnya. Versi lama menimpanya, jadi siswa yang sebenarnya bisa
        // dicetak ikut hilang begitu satu panggilan gagal.
        if (typeof console !== 'undefined' && console.error) console.error('muat kartu gagal', err);
        daftarPilih.appendChild(Ui.pesanGalat('Gagal memuat data siswa: ' + Api.kelasGalat(err), muat));
      });
    }

    return muat();
  }
});