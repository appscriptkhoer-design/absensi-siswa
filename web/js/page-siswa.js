function kompresGambar(file, maksSisi, mutu) {
  return new Promise(function (res, rej) {
    const reader = new FileReader();
    reader.onerror = function () { rej(new Error('Gagal membaca berkas gambar.')); };
    reader.onload = function () {
      const img = new Image();
      img.onerror = function () { rej(new Error('Berkas gambar tidak valid.')); };
      img.onload = function () {
        const sisi = Math.min(img.width, img.height);
        const skala = Math.min(1, (maksSisi || 900) / sisi);
        const w = Math.round(img.width * skala);
        const hh = Math.round(img.height * skala);
        const kanvas = document.createElement('canvas');
        kanvas.width = w;
        kanvas.height = hh;
        kanvas.getContext('2d').drawImage(img, 0, 0, w, hh);
        res(kanvas.toDataURL('image/jpeg', mutu || 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function formSiswa(sekolahId, data) {
  const d = data || {};
  let fotoData = '';
  let fotoNama = '';
  const preview = h('div', { class: 'avatar avatar--lg' }, [
    h('span', { text: d.pravatar || '?' })
  ]);

  const fileInput = h('input', {
    type: 'file',
    accept: 'image/*',
    class: 'input',
    style: 'padding:8px'
  });
  fileInput.addEventListener('change', function () {
    const f = fileInput.files && fileInput.files[0];
    if (!f) return;
    kompresGambar(f, 900, 0.82).then(function (dataUrl) {
      fotoData = dataUrl;
      fotoNama = f.name || 'foto.jpg';
      preview.innerHTML = '';
      preview.appendChild(h('img', { src: dataUrl, alt: '' }));
    }).catch(function (e) { Ui.toast(e.message, 'err'); });
  });

  const inNis = h('input', { class: 'input mono', value: d.nis || '', inputmode: 'numeric' });
  const inNisn = h('input', { class: 'input mono', value: d.nisn || '', inputmode: 'numeric' });
  const inNama = h('input', { class: 'input', value: d.nama || '', placeholder: 'Nama lengkap siswa' });
  const inKelas = h('input', { class: 'input', value: d.kelas || '', placeholder: 'Contoh: 4A', list: 'opsi-kelas' });
  const inRombel = h('input', { class: 'input', value: d.rombel || '', placeholder: 'Contoh: 4A1' });
  const selGender = h('select', { class: 'input' }, [
    h('option', { value: '', text: '— Tidak diisi —' }),
    h('option', { value: 'L', text: 'Laki-laki' }),
    h('option', { value: 'P', text: 'Perempuan' })
  ]);
  selGender.value = d.gender || '';
  const inTgl = h('input', { class: 'input', type: 'date', value: d.tgl_lahir || '' });
  const inOrtU = h('input', { class: 'input', value: d.nama_ortu || '', placeholder: 'Nama orang tua/wali' });
  const inHp = h('input', { class: 'input mono', type: 'tel', value: d.no_hp_ortu || '', placeholder: '08xxxxxxxxxx' });
  const selKanal = h('select', { class: 'input' }, [
    h('option', { value: '-', text: 'Tanpa notifikasi' }),
    h('option', { value: 'telegram', text: 'Telegram' }),
    h('option', { value: 'whatsapp', text: 'WhatsApp (belum aktif)' })
  ]);
  selKanal.value = d.kanal_notif || '-';

  const form = h('form', { novalidate: true }, [
    h('div', { style: 'display:flex;gap:12px;align-items:flex-start;margin-bottom:14px' }, [
      preview,
      h('div', { style: 'flex:1' }, [
        h('label', { class: 'label', text: 'Foto siswa (opsional)' }),
        fileInput,
        h('div', { class: 'hint', text: 'Maksimal 8 MB. Otomatis dikompres di perangkat.' })
      ])
    ]),
    h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Nama *' }), inNama]),
    h('div', { class: 'field-row' }, [
      h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Kelas *' }), inKelas]),
      h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Rombel' }), inRombel])
    ]),
    h('div', { class: 'field-row' }, [
      h('div', { class: 'field' }, [h('label', { class: 'label', text: 'NIS' }), inNis]),
      h('div', { class: 'field' }, [h('label', { class: 'label', text: 'NISN' }), inNisn])
    ]),
    h('div', { class: 'field-row' }, [
      h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Jenis kelamin' }), selGender]),
      h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Tanggal lahir' }), inTgl])
    ]),
    h('div', { class: 'divider' }),
    h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Nama orang tua / wali' }), inOrtU]),
    h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Nomor HP orang tua' }), inHp]),
    h('div', { class: 'field' }, [
      h('label', { class: 'label', text: 'Kanal notifikasi' }), selKanal,
      h('div', { class: 'hint', text: 'Nomor HP dipakai untuk WhatsApp. Telegram memakai kode koneksi terpisah.' })
    ]),
    d.kode_ortu ? h('div', { class: 'card card--tight card--flat' }, [
      h('div', { class: 'label', text: 'Kode koneksi Telegram orang tua' }),
      h('div', { class: 'mono', style: 'font-size:1.3rem;font-weight:900;letter-spacing:.2em', text: d.kode_ortu })
    ]) : null
  ]);

  return {
    elemen: form,
    ambil: function () {
      return {
        sekolah_id: sekolahId,
        id: d.id,
        nama: inNama.value,
        kelas: inKelas.value,
        rombel: inRombel.value,
        nis: inNis.value,
        nisn: inNisn.value,
        gender: selGender.value,
        tgl_lahir: inTgl.value,
        nama_ortu: inOrtU.value,
        no_hp_ortu: inHp.value,
        kanal_notif: selKanal.value,
        foto_base64: fotoData,
        foto_mime: 'image/jpeg',
        foto_nama: fotoNama
      };
    }
  };
}

Hal.daftar('#/siswa', {
  nama: 'siswa',
  render: function (wadah, query) {
    const u = Api.user();
    const sekolahId = (Api.sekolah() || {}).id;
    let cari = query.cari || '';
    let kelas = query.kelas || '';
    let hanyaAktif = true;

    const inputCari = h('input', {
      class: 'input',
      type: 'search',
      placeholder: 'Cari nama, NIS, barcode…',
      value: cari
    });
    const chipRow = h('div', { class: 'chip-row' });
    const daftar = h('div', { class: 'list' });
    const totalEl = h('span', { class: 'badge', text: '…' });

    const tombolTambah = h('button', {
      class: 'btn btn--primary', type: 'button', text: '＋ Tambah Siswa'
    });
    tombolTambah.addEventListener('click', function () {
      bukaForm(null);
    });

    const tombolImpor = h('button', { class: 'btn btn--sm', type: 'button', text: '⭳ Impor CSV' });
    const tombolEkspor = h('button', { class: 'btn btn--sm', type: 'button', text: '⭱ Ekspor' });
    const ddlOpsiKelas = h('datalist', { id: 'opsi-kelas' });

    const barisAtas = h('div', { class: 'card card--tight' }, [
      h('div', { style: 'display:flex;gap:8px;align-items:center' }, [
        h('div', { class: 'topbar__brand', text: '🎒 DATA SISWA' }),
        h('div', { class: 'topbar__spacer' }),
        totalEl
      ]),
      h('div', { style: 'margin-top:10px' }, [inputCari]),
      chipRow,
      h('div', { class: 'btn-row' }, [tombolTambah, tombolImpor, tombolEkspor])
    ]);

    wadah.appendChild(barisAtas);
    wadah.appendChild(daftar);

    function chipKelas() {
      chipRow.innerHTML = '';
      const semua = h('button', { class: 'chip', type: 'button', 'aria-pressed': kelas ? 'false' : 'true', text: 'Semua' });
      semua.addEventListener('click', function () { kelas = ''; chipKelas(); muat(); });
      chipRow.appendChild(semua);
      Api.panggil('siswa.kelas', {}, { ttl: Api.TTL }).then(function (res) {
        (res.data || []).forEach(function (k) {
          const c = h('button', {
            class: 'chip', type: 'button', dataset: { k: k.kelas },
            'aria-pressed': k.kelas === kelas ? 'true' : 'false',
            text: k.kelas + ' (' + k.jumlah + ')'
          });
          c.addEventListener('click', function () { kelas = k.kelas; chipKelas(); muat(); });
          chipRow.appendChild(c);
        });
        ddlOpsiKelas.innerHTML = '';
        (res.data || []).forEach(function (k) {
          ddlOpsiKelas.appendChild(h('option', { value: k.kelas }));
        });
      }).catch(function () { });
    }

    let timerCari = null;
    inputCari.addEventListener('input', function () {
      clearTimeout(timerCari);
      timerCari = setTimeout(function () { cari = inputCari.value.trim(); muat(); }, 350);
    });

    function barisSiswa(s) {
      const el = h('div', { class: 'item' }, [
        Ui.avatar(s, 'sm'),
        h('div', { class: 'item__body' }, [
          h('div', { class: 'item__nama', text: s.nama }),
          h('div', { class: 'item__meta' }, [
            h('span', { text: s.kelas + (s.rombel ? ' · ' + s.rombel : '') }),
            h('span', { text: 'NIS ' + (s.nis || '-') }),
            s.aktif ? null : Ui.badge('rejected')
          ])
        ]),
        h('div', { class: 'item__aksi' }, [
          h('button', { class: 'btn btn--sm', type: 'button', text: '⋯', 'aria-label': 'Menu', onclick: function () { menuSiswa(s); } })
        ])
      ]);
      el.style.cursor = 'pointer';
      el.addEventListener('click', function (e) {
        if (e.target.closest('button')) return;
        menuSiswa(s);
      });
      return el;
    }

    function menuSiswa(s) {
      const isi = h('div', {}, [
        h('div', { class: 'item', style: 'box-shadow:none;margin-bottom:12px' }, [
          Ui.avatar(s),
          h('div', { class: 'item__body' }, [
            h('div', { class: 'item__nama', text: s.nama }),
            h('div', { class: 'item__meta' }, [
              h('span', { text: s.kelas }),
              h('span', { class: 'mono', text: s.barcode })
            ])
          ])
        ]),
        h('div', { class: 'kv' }, [h('span', { class: 'kv__k', text: 'NIS' }), h('span', { class: 'kv__v', text: s.nis || '-' })]),
        h('div', { class: 'kv' }, [h('span', { class: 'kv__k', text: 'NISN' }), h('span', { class: 'kv__v', text: s.nisn || '-' })]),
        h('div', { class: 'kv' }, [h('span', { class: 'kv__k', text: 'Orang tua' }), h('span', { class: 'kv__v', text: s.nama_ortu || '-' })]),
        h('div', { class: 'kv' }, [h('span', { class: 'kv__k', text: 'HP orang tua' }), h('span', { class: 'kv__v mono', text: s.no_hp_ortu || '-' })]),
        h('div', { class: 'kv' }, [
          h('span', { class: 'kv__k', text: 'Notifikasi' }),
          h('span', { class: 'kv__v', text: s.kanal_notif === '-' ? 'Nonaktif' : (s.telegram_chat_id ? s.kanal_notif + ' (terhubung)' : s.kanal_notif + ' (belum terhubung)') })
        ]),
        h('div', { class: 'kv' }, [h('span', { class: 'kv__k', text: 'Status' }), h('span', { class: 'kv__v', text: s.aktif ? 'Aktif' : 'Nonaktif' })]),
        h('div', { class: 'btn-row', style: 'margin-top:14px;flex-direction:column' }, [
          h('button', { class: 'btn btn--primary btn--block', type: 'button', text: 'Ubah Data', onclick: function () { m.tutup(); bukaForm(s); } }),
          h('button', { class: 'btn btn--block', type: 'button', text: 'Catat Izin / Sakit / Alpha', onclick: function () { m.tutup(); formManual(s); } }),
          h('button', { class: 'btn btn--block', type: 'button', text: s.aktif ? 'Nonaktifkan' : 'Aktifkan', onclick: function () { m.tutup(); UbahAktif(s); } }),
          h('button', { class: 'btn btn--block', type: 'button', text: 'Hubungkan Telegram', onclick: function () { m.tutup(); formTelegram(s); } }),
          (u && (u.role === 'admin' || u.role === 'superadmin'))
            ? h('button', { class: 'btn btn--red btn--block', type: 'button', text: 'Hapus Siswa', onclick: function () { m.tutup(); hapusSiswa(s); } })
            : null
        ])
      ]);
      const m = Ui.modal({ judul: s.nama, isi: isi, aksi: [{ label: 'Tutup' }] });
    }

    function bukaForm(s) {
      const f = formSiswa(sekolahId, s);
      const m = Ui.modal({
        judul: s ? 'Ubah Data Siswa' : 'Tambah Siswa',
        isi: f.elemen,
        aksi: [
          { label: 'Batal' },
          {
            label: s ? 'Simpan' : 'Tambah', class: 'btn--primary', jalankan: function (tutup) {
              const data = f.ambil();
              const aksi = s ? 'siswa.perbarui' : 'siswa.buat';
              return Api.gambar(aksi, data).then(function (res) {
                Ui.toast(res.message, 'ok');
                tutup();
                muat();
              }).catch(function (err) { Ui.galat(err); });
            }
          }
        ]
      });
    }

    function formManual(s) {
      const selStatus = h('select', { class: 'input' }, [
        h('option', { value: 'izin', text: 'Izin' }),
        h('option', { value: 'sakit', text: 'Sakit' }),
        h('option', { value: 'alpha', text: 'Alpha / tidak hadir' })
      ]);
      const selTipe = h('select', { class: 'input' }, [
        h('option', { value: 'masuk', text: 'Masuk' }),
        h('option', { value: 'pulang', text: 'Pulang' })
      ]);
      const inKet = h('input', { class: 'input', placeholder: 'Contoh: Pendamping orang tua' });
      Ui.modal({
        judul: 'Catat Manual · ' + s.nama,
        isi: h('div', {}, [
          h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Status' }), selStatus]),
          h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Tipe' }), selTipe]),
          h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Keterangan' }), inKet])
        ]),
        aksi: [
          { label: 'Batal' },
          {
            label: 'Simpan', class: 'btn--primary', jalankan: function (tutup) {
              Api.panggil('absen.manual', {
                sekolah_id: sekolahId, siswa_id: s.id,
                status: selStatus.value, tipe: selTipe.value, keterangan: inKet.value
              }).then(function (res) {
                Ui.toast(res.message, 'ok');
                tutup();
              }).catch(Ui.galat);
            }
          }
        ]
      });
    }

    function formTelegram(s) {
      const inChat = h('input', { class: 'input mono', value: s.telegram_chat_id || '', placeholder: 'Contoh: 123456789' });
      Ui.modal({
        judul: 'Hubungkan Telegram',
        isi: h('div', {}, [
          h('p', { class: 'hint', text: 'Cara termudah: minta orang tua mengirim /start ' + s.kode_ortu + ' ke bot Telegram sekolah. Chat ID terisi otomatis.' }),
          h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Chat ID Telegram' }), inChat]),
          h('div', { class: 'hint', text: 'Kode koneksi: ' + s.kode_ortu })
        ]),
        aksi: [
          { label: 'Batal' },
          {
            label: 'Simpan', class: 'btn--primary', jalankan: function (tutup) {
              if (!inChat.value.trim()) { Ui.toast('Chat ID masih kosong.', 'err'); return; }
              Api.panggil('notif.hubungkan', { sekolah_id: sekolahId, siswa_id: s.id, chat_id: inChat.value })
                .then(function (res) { Ui.toast(res.message, 'ok'); tutup(); muat(); }).catch(Ui.galat);
            }
          }
        ]
      });
    }

    function UbahAktif(s) {
      Api.panggil('siswa.set_aktif', { sekolah_id: sekolahId, id: s.id, aktif: !s.aktif })
        .then(function (res) { Ui.toast(res.message, 'ok'); muat(); }).catch(Ui.galat);
    }

    function hapusSiswa(s) {
      Ui.konfirmasi('Hapus ' + s.nama + '? Data absensinya tetap tersimpan di riwayat.', 'Hapus Siswa', 'Hapus')
        .then(function (ya) {
          if (!ya) return;
          return Api.panggil('siswa.hapus', { sekolah_id: sekolahId, id: s.id })
            .then(function (res) { Ui.toast(res.message, 'ok'); muat(); }).catch(Ui.galat);
        });
    }

    tombolImpor.addEventListener('click', function () {
      const area = h('textarea', { class: 'input mono', placeholder: 'nis;nisn;nama;kelas;rombel;gender;tgl_lahir;nama_ortu;no_hp_ortu;kanal_notif', style: 'min-height:150px' });
      const m = Ui.modal({
        judul: 'Impor Siswa dari CSV',
        isi: h('div', {}, [
          h('p', { class: 'hint', text: 'Gunakan titik koma (;) sebagai pemisah. Baris pertama adalah judul kolom. Kolom wajib: nama dan kelas.' }),
          area,
          h('button', {
            class: 'btn btn--sm btn--block', type: 'button', text: 'Isi contoh', style: 'margin-top:8px',
            onclick: function () {
              Api.panggil('siswa.template', {}).then(function (r) { area.value = r.csv; });
            }
          })
        ]),
        aksi: [
          { label: 'Batal' },
          {
            label: 'Impor', class: 'btn--primary', jalankan: function (tutup) {
              if (!area.value.trim()) { Ui.toast('Isi CSV terlebih dahulu.', 'err'); return; }
              Api.panggil('siswa.impor', { sekolah_id: sekolahId, csv: area.value })
                .then(function (res) {
                  Ui.toast(res.message, 'ok');
                  tutup();
                  chipKelas();
                  muat();
                }).catch(Ui.galat);
            }
          }
        ]
      });
    });

    tombolEkspor.addEventListener('click', function () {
      Api.panggil('siswa.daftar', { sekolah_id: sekolahId, hanya_aktif: false, kelas: kelas }, { ttl: Api.TTL }).then(function (res) {
        const baris = ['nis;nisn;nama;kelas;rombel;gender;tgl_lahir;nama_ortu;no_hp_ortu;kanal_notif;barcode'];
        (res.data || []).forEach(function (s) {
          baris.push([s.nis, s.nisn, s.nama, s.kelas, s.rombel, s.gender, s.tgl_lahir, s.nama_ortu, s.no_hp_ortu, s.kanal_notif, s.barcode]
            .map(function (v) { return String(v === null || v === undefined ? '' : v).replace(/[;\n]/g, ' '); }).join(';'));
        });
        Ui.unduh({ filename: 'data-siswa.csv', csv: baris.join('\n') });
      }).catch(Ui.galat);
    });

    // Daftar siswa diambil per bagian, bukan sekaligus. Satu panggilan API
    // sudah memakan waktu sekitar 2,4 detik di sisi server, jadi mengirim dan
    // menggambar ratusan baris sekaligus hanya menambah antrean tanpa
    // mempercepat apa pun.
    const BATAS = 30;
    let dimuat = 0;
    let adaLagi = false;

    function muat() {
      dimuat = 0;
      adaLagi = false;
      daftar.innerHTML = '';
      // Kerangka bayangan tampil seketika supaya halaman terasa hidup
      // selagi server bekerja.
      for (let i = 0; i < 6; i++) daftar.appendChild(Ui.rangka(1));
      return ambil(false);
    }

    function lebihLagi() {
      if (!adaLagi) return;
      const t = daftar.querySelector('.btn--more');
      if (t) t.remove();
      return ambil(true);
    }

    function ambil(sambung) {
      return Api.panggil('siswa.daftar', {
        sekolah_id: sekolahId, cari: cari, kelas: kelas, hanya_aktif: hanyaAktif,
        batas: BATAS, mulai: dimuat
      }, { ttl: Api.TTL }).then(function (res) {
        totalEl.textContent = res.total + ' siswa';
        if (!sambung) daftar.innerHTML = '';
        if (!res.data.length) {
          if (dimuat === 0) {
            daftar.appendChild(h('div', { class: 'kosong', text: 'Belum ada siswa. Tekan "Tambah Siswa" untuk memulai.' }));
          }
          adaLagi = false;
          return;
        }
        res.data.forEach(function (s) { daftar.appendChild(barisSiswa(s)); });
        dimuat += res.data.length;
        adaLagi = !!res.ada_lagi;
        if (adaLagi) {
          daftar.appendChild(h('button', {
            class: 'btn btn--block btn--more', type: 'button', text: 'Muat ' + Math.min(BATAS, (res.total || 0) - dimuat) + ' siswa lagi',
            onclick: lebihLagi
          }));
        }
      }).catch(function (err) {
        if (!sambung) daftar.innerHTML = '';
        daftar.appendChild(Ui.pesanGalat(Api.kelasGalat(err), lebihLagi));
      });
    }

    wadah.appendChild(ddlOpsiKelas);
    chipKelas();
    return muat();
  }
});