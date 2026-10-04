Hal.daftar('#/kartu', {
  nama: 'kartu',
  render: function (wadah, query) {
    const sekolahId = (Api.sekolah() || {}).id;
    let kelas = query.kelas || '';
    let duaSisi = true;
    let semuaTerpilih = {};
    let data = [];

    const chipRow = h('div', { class: 'chip-row' });
    const daftarPilih = h('div', { class: 'list' });
    const areaCetak = h('div', { class: 'cetak-sisi', id: 'cetak-sisi' });
    const info = h('div', { class: 'card card--tight' });

    const tombolCetak = h('button', { class: 'btn btn--primary', type: 'button', text: '🖨 Cetak / Simpan PDF' });
    const cekDuaSisi = h('input', { type: 'checkbox', style: 'width:22px;height:22px' });
    cekDuaSisi.checked = true;
    cekDuaSisi.addEventListener('change', function () { duaSisi = cekDuaSisi.checked; gambar(); });

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
            h('label', { class: 'label', text: 'Format' }),
            h('label', { style: 'display:flex;align-items:center;gap:8px;min-height:56px;font-weight:800' }, [cekDuaSisi, 'Dua sisi (QR di belakang)'])
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
      Api.fotoBlob(s.foto_proxy, s.foto_uc || s.foto)
        .then(function (src) { img.src = src; })
        .catch(function () {
          box.textContent = '';
          box.appendChild(h('span', { class: 'avatar__galat', text: '!' }));
        });
      return box;
    }

    function kartuDepan(s, namaSekolah) {
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
        h('div', { class: 'kartu__kode' }, [h('svg', { class: 'js-kode', 'data-nilai': s.barcode })]),
        h('div', { class: 'kartu__nis', text: s.barcode }),
        h('div', { class: 'kartu__ttd' }, [
          h('span', { text: 'Kelas' }),
          h('span', { text: 'Orang Tua' })
        ])
      ]);
    }

    function kartuBelakang(s, namaSekolah) {
      return h('div', { class: 'kartu' }, [
        h('div', { class: 'kartu__kepala' }, [
          h('div', { class: 'kartu__identitas' }, [
            h('div', { class: 'kartu__sekolah', text: namaSekolah }),
            h('div', { class: 'kartu__nama', text: s.nama }),
            h('div', { class: 'kartu__meta', text: 'Kelas ' + (s.kelas || '-') })
          ])
        ]),
        h('div', { class: 'kartu__qr', style: 'width:34mm;margin:0 auto' }, [h('img', { class: 'js-qr', 'data-nilai': s.barcode, alt: '' })]),
        h('div', { class: 'kartu__nis', text: 'Pindai QR ini di aplikasi absen' }),
        h('div', { class: 'kartu__ttd' }, [
          h('span', { text: 'No. Kartu' }),
          h('span', { text: s.barcode })
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
      info.textContent = terpilih.length + ' kartu siap dicetak · ' +
        (duaSisi ? '2 sisi (QR di belakang)' : '1 sisi (QR di depan)');

      const namaSekolah = (Api.sekolah() || {}).nama || 'SEKOLAH';

      if (duaSisi) {
        areaCetak.appendChild(h('div', {}, [
          h('div', { class: 'cetak-sisi__judul', text: 'Sisi Depan' }),
          h('div', { class: 'cetak-sisi__sisi', id: 'sisi-depan' },
            terpilih.map(function (s) { return kartuDepan(s, namaSekolah); }))
        ]));
        areaCetak.appendChild(h('div', {}, [
          h('div', { class: 'cetak-sisi__judul', text: 'Sisi Belakang' }),
          h('div', { class: 'cetak-sisi__sisi', id: 'sisi-belakang' },
            terpilih.map(function (s) { return kartuBelakang(s, namaSekolah); }))
        ]));
      } else {
        areaCetak.appendChild(h('div', {}, [
          h('div', { class: 'cetak-sisi__sisi', id: 'sisi-depan' },
            terpilih.map(function (s) { return kartuGabung(s, namaSekolah); }))
        ]));
      }

      renderGambar();
    }

    function kartuGabung(s, namaSekolah) {
      const el = kartuDepan(s, namaSekolah);
      const qr = h('div', { class: 'kartu__qr', style: 'width:14mm' }, [h('img', { class: 'js-qr', 'data-nilai': s.barcode, alt: '' })]);
      el.insertBefore(qr, el.querySelector('.kartu__kode'));
      return el;
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
      list.forEach(function (s) {
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
      });
    }

    // Browser tidak menunggu <img> yang belum selesai diunduh ketika
    // window.print() dipanggil. Foto yang masih kosong akan hilang dari PDF,
    // jadi cetak baru jalan setelah semua gambar selesai ( atau gagal ).
    function tungguGambar() {
      const gambar = $$('img', areaCetak);
      return Promise.all(gambar.map(function (im) {
        if (im.complete && im.naturalWidth > 0) return Promise.resolve(true);
        return new Promise(function (res) {
          let selesai = false;
          const done = function (ok) {
            if (selesai) return;
            selesai = true;
            res(ok);
          };
          im.addEventListener('load', function () { done(true); }, { once: true });
          im.addEventListener('error', function () { done(false); }, { once: true });
          setTimeout(function () { done(!!im.naturalWidth); }, 8000);
        });
      })).then(function (hasil) {
        return hasil.filter(Boolean).length;
      });
    }

    tombolCetak.addEventListener('click', function () {
      const terpilih = data.filter(function (s) { return semuaTerpilih[String(s.id)]; });
      if (!terpilih.length) { Ui.toast('Pilih minimal satu siswa.', 'err'); return; }
      Ui.tombolMuat(tombolCetak, function () {
        return tungguGambar().then(function (jml) {
          const gagal = terpilih.length - jml;
          if (gagal > 0) {
            Ui.toast(gagal + ' foto gagal dimuat, kartu dicetak tanpa foto.', 'err');
          }
          return new Promise(function (res) {
            setTimeout(function () { window.print(); res(true); }, 120);
          });
        });
      });
    });

    function muat() {
      daftarPilih.innerHTML = '';
      daftarPilih.appendChild(Ui.muat('Memuat siswa…'));
      return Promise.all([
        Api.panggil('siswa.kelas', {}),
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
        daftarPilih.innerHTML = '';
        daftarPilih.appendChild(h('div', { class: 'card card--warn', text: Api.kelasGalat(err) }));
      });
    }

    return muat();
  }
});