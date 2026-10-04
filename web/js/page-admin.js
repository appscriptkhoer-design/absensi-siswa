Hal.daftar('#/admin', {
  nama: 'admin',
  perluRole: ['superadmin', 'admin'],
  render: function (wadah) {
    const sekolahId = (Api.sekolah() || {}).id;
    const user = Api.user() || {};
    let tab = 'sekolah';

    const tabRow = h('div', { class: 'chip-row' });
    const panel = h('div', {});

    const daftarTab = [
      { k: 'sekolah', t: '🏫 Sekolah' },
      { k: 'pengguna', t: '👥 Pengguna' },
      { k: 'notif', t: '🔔 Notifikasi' },
      { k: 'log', t: '📜 Log' }
    ];

    wadah.appendChild(h('h1', { text: 'Administrasi' }));
    wadah.appendChild(tabRow);
    wadah.appendChild(panel);

    function gambarTab() {
      tabRow.innerHTML = '';
      daftarTab.forEach(function (x) {
        const c = h('button', {
          class: 'chip', type: 'button',
          'aria-pressed': x.k === tab ? 'true' : 'false',
          text: x.t
        });
        c.addEventListener('click', function () { tab = x.k; gambarTab(); muat(); });
        tabRow.appendChild(c);
      });
    }

    function baris(kunci, label, nilai) {
      return h('div', { class: 'kv' }, [
        h('div', { class: 'kv__k', text: label }),
        h('div', { class: 'kv__v' }, typeof nilai === 'string' || typeof nilai === 'number' ? String(nilai) : nilai)
      ]);
    }

    function panelSekolah() {
      panel.innerHTML = '';
      panel.appendChild(Ui.muat('Memuat data sekolah…'));
      return Api.panggil('sekolah.detail', { sekolah_id: sekolahId }).then(function (res) {
        const s = res.sekolah;
        if (!s) {
          panel.innerHTML = '';
          panel.appendChild(h('div', { class: 'card card--warn' }, [
            h('p', { text: 'Belum ada sekolah yang dipilih.' }),
            user.role === 'superadmin' ? h('p', { class: 'hint', text: 'Pilih sekolah di menu Akun → Ganti Sekolah.' }) : null
          ]));
          return;
        }

        const inNama = h('input', { class: 'input', value: s.nama });
        const inKode = h('input', { class: 'input mono', value: s.kode, maxlength: '6' });
        const inNpsn = h('input', { class: 'input mono', value: s.npsn || '', placeholder: '10 digit NPSN' });
        const inAlamat = h('textarea', { class: 'input', rows: '2' });
        inAlamat.value = s.alamat || '';
        const inLat = h('input', { class: 'input mono', value: s.lat === null ? '' : String(s.lat), placeholder: '-6.200000', inputmode: 'decimal' });
        const inLng = h('input', { class: 'input mono', value: s.lng === null ? '' : String(s.lng), placeholder: '106.816666', inputmode: 'decimal' });
        const inRadius = h('input', { class: 'input', type: 'number', value: String(s.radius_m || 0), min: '0', step: '10' });
        const inMasuk = h('input', { class: 'input', type: 'time', value: s.jam_masuk || '07:00' });
        const inTelat = h('input', { class: 'input', type: 'number', value: String(s.batas_telat_mnt || 0), min: '0', max: '120' });
        const inPulang = h('input', { class: 'input', type: 'time', value: s.jam_pulang || '13:00' });
        const cekFoto = h('input', { type: 'checkbox', style: 'width:22px;height:22px' });
        cekFoto.checked = !!s.foto_publik;
        const cekWa = h('input', { type: 'checkbox', style: 'width:22px;height:22px' });
        cekWa.checked = !!s.wa_aktif;

        const form = h('form', { class: 'pengaturan-grid', autocomplete: 'off' }, [
          h('div', { class: 'card' }, [
            h('h2', { class: 'card__title', text: 'Identitas' }),
            h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Nama sekolah' }), inNama]),
            h('div', { class: 'field-row' }, [
              h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Kode' }), inKode]),
              h('div', { class: 'field' }, [h('label', { class: 'label', text: 'NPSN' }), inNpsn])
            ]),
            h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Alamat' }), inAlamat])
          ]),
          h('div', { class: 'card' }, [
            h('h2', { class: 'card__title', text: 'Waktu & Lokasi' }),
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
            h('p', { class: 'hint', text: 'Isi koordinat dari Google Maps: klik lokasi sekolah → salin angka latitude/longitude.' })
          ]),
          h('div', { class: 'card' }, [
            h('h2', { class: 'card__title', text: 'Foto & Integrasi' }),
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
          ])
        ]);

        const tombolSimpan = h('button', { class: 'btn btn--primary', type: 'submit', text: '💾 Simpan Pengaturan' });
        form.appendChild(h('div', { class: 'btn-row', style: 'grid-column:1/-1' }, [tombolSimpan]));

        form.addEventListener('submit', function (e) {
          e.preventDefault();
          Ui.tombolMuat(tombolSimpan, function () {
            return Api.panggil('sekolah.perbarui', {
              sekolah_id: sekolahId,
              nama: inNama.value, kode: inKode.value, npsn: inNpsn.value, alamat: inAlamat.value,
              lat: inLat.value, lng: inLng.value, radius_m: inRadius.value,
              jam_masuk: inMasuk.value, batas_telat_mnt: inTelat.value, jam_pulang: inPulang.value,
              foto_publik: cekFoto.checked, wa_aktif: cekWa.checked
            }).then(function (r) {
              Ui.toast(r.message, 'ok');
              Api.setSekolah(r.sekolah);
              return muat();
            });
          });
        });

        panel.innerHTML = '';
        panel.appendChild(form);
        panel.appendChild(h('div', { class: 'card' }, [
          h('h2', { class: 'card__title', text: 'Ringkasan' }),
          h('div', { class: 'kv-list' }, [
            baris('kode', 'Kode sekolah', s.kode),
            baris('latlng', 'Titik absen', (s.lat === null || s.lng === null) ? 'Belum diisi' : s.lat + ', ' + s.lng),
            baris('buka', 'Absen dibuka', s.jam_masuk + ' · telat setelah ' + s.batas_telat_mnt + ' menit'),
            baris('tutup', 'Absen ditutup', s.jam_pulang),
            baris('foto', 'Foto siswa', s.foto_publik ? 'publik' : 'token')
          ])
        ]));
      });
    }

    function aksiPengguna(u) {
      const tombol = h('div', { class: 'item__aksi' });

      if (u.status === 'pending') {
        const ya = h('button', { class: 'btn btn--sm btn--green', type: 'button', text: '✓ Setujui' });
        ya.addEventListener('click', function () {
          Ui.tombolMuat(ya, function () {
            return Api.panggil('auth.set_status', { sekolah_id: sekolahId, user_id: u.id, status: 'active' })
              .then(function (r) { Ui.toast(r.message, 'ok'); muat(); });
          });
        });
        const tidak = h('button', { class: 'btn btn--sm btn--red', type: 'button', text: '✕ Tolak' });
        tidak.addEventListener('click', function () {
          Ui.tombolMuat(tidak, function () {
            return Api.panggil('auth.set_status', { sekolah_id: sekolahId, user_id: u.id, status: 'rejected' })
              .then(function (r) { Ui.toast(r.message, 'ok'); muat(); });
          });
        });
        tombol.appendChild(ya);
        tombol.appendChild(tidak);
      }

      if (u.status === 'active' && String(u.id) !== String(user.id)) {
        const matikan = h('button', { class: 'btn btn--sm', type: 'button', text: '🚫' , title: 'Nonaktifkan' });
        matikan.addEventListener('click', function () {
          Ui.konfirmasi('Nonaktifkan akun ' + u.username + '?', 'Nonaktifkan Akun', 'Nonaktifkan').then(function () {
            return Api.panggil('auth.set_status', { sekolah_id: sekolahId, user_id: u.id, status: 'rejected' })
              .then(function (r) { Ui.toast(r.message, 'ok'); muat(); }).catch(Ui.galat);
          });
        });
        tombol.appendChild(matikan);
      }

      if (u.status !== 'active') {
        const aktifkan = h('button', { class: 'btn btn--sm btn--green', type: 'button', text: '✓' , title: 'Aktifkan' });
        aktifkan.addEventListener('click', function () {
          Ui.tombolMuat(aktifkan, function () {
            return Api.panggil('auth.set_status', { sekolah_id: sekolahId, user_id: u.id, status: 'active' })
              .then(function (r) { Ui.toast(r.message, 'ok'); muat(); });
          });
        });
        tombol.appendChild(aktifkan);
      }

      if (String(u.id) !== String(user.id)) {
        const role = h('button', { class: 'btn btn--sm', type: 'button', text: u.role === 'admin' ? '→ Guru' : '→ Admin' });
        role.addEventListener('click', function () {
          Ui.tombolMuat(role, function () {
            const baru = u.role === 'admin' ? 'guru' : 'admin';
            return Api.panggil('auth.set_role', { sekolah_id: sekolahId, user_id: u.id, role: baru })
              .then(function (r) { Ui.toast(r.message, 'ok'); muat(); });
          });
        });
        tombol.appendChild(role);

        const pw = h('button', { class: 'btn btn--sm', type: 'button', text: '🔑' , title: 'Ganti password' });
        pw.addEventListener('click', function () { formPassword(u); });
        tombol.appendChild(pw);
      }

      return tombol;
    }

    function formPassword(u) {
      const in1 = h('input', { class: 'input', type: 'password', autocomplete: 'new-password' });
      const in2 = h('input', { class: 'input', type: 'password', autocomplete: 'new-password' });
      Ui.modal({
        judul: 'Password Baru untuk ' + u.username,
        isi: h('div', {}, [
          h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Password' }), in1]),
          h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Ulangi password' }), in2]),
          h('p', { class: 'hint', text: 'Minimal 8 karakter. Semua sesi pengguna ini akan dikeluarkan.' })
        ]),
        aksi: [
          { label: 'Batal' },
          {
            label: 'Simpan', class: 'btn--primary', jalankan: function (tutup) {
              if (in1.value.length < 8) { Ui.toast('Password minimal 8 karakter.', 'err'); return; }
              if (in1.value !== in2.value) { Ui.toast('Ulangi password tidak sama.', 'err'); return; }
              Api.panggil('auth.ganti_password_orang', {
                sekolah_id: sekolahId, user_id: u.id, password: in1.value
              }).then(function (r) { Ui.toast(r.message, 'ok'); tutup(); }).catch(Ui.galat);
            }
          }
        ]
      });
    }

    function panelPengguna() {
      panel.innerHTML = '';
      panel.appendChild(Ui.muat('Memuat pengguna…'));
      return Api.panggil('auth.daftar', { sekolah_id: sekolahId }).then(function (res) {
        panel.innerHTML = '';
        const data = res.data || [];
        if (!data.length) {
          panel.appendChild(h('div', { class: 'kosong', text: 'Belum ada pengguna di sekolah ini.' }));
          return;
        }
        const pending = data.filter(function (u) { return u.status === 'pending'; }).length;
        panel.appendChild(h('div', { class: 'card' }, [
          h('div', { class: 'suhu', text: (pending ? '⏳ ' + pending + ' pendaftaran menunggu persetujuan.' : '✓ Semua pendaftaran sudah diproses.') })
        ]));
        const list = h('div', { class: 'list' });
        data.forEach(function (u) {
          list.appendChild(h('div', { class: 'item' }, [
            Ui.avatar({ pravatar: (u.nama || u.username).slice(0, 1).toUpperCase() }, 'sm'),
            h('div', { class: 'item__body' }, [
              h('div', { class: 'item__nama', text: u.nama || u.username }),
              h('div', { class: 'item__meta' }, [
                h('span', { class: 'mono', text: '@' + u.username }),
                Ui.badge(u.role),
                Ui.badge(u.status),
                u.dibuat_pada ? h('span', { text: '📅 ' + String(u.dibuat_pada).slice(0, 10) }) : null,
                u.lock_sampai ? h('span', { text: '🔒 terkunci' }) : null
              ])
            ]),
            aksiPengguna(u)
          ]));
        });
        panel.appendChild(list);
      });
    }

    function panelNotif() {
      panel.innerHTML = '';
      panel.appendChild(Ui.muat('Memuat riwayat…'));
      const chipStatus = h('div', { class: 'chip-row' });
      let status = '';

      function gambarChip() {
        chipStatus.innerHTML = '';
        [['', 'Semua'], ['sent', 'Terkirim'], ['gagal', 'Gagal'], ['lewati', 'Dilewati']].forEach(function (x) {
          const c = h('button', {
            class: 'chip', type: 'button',
            'aria-pressed': x[0] === status ? 'true' : 'false',
            text: x[1]
          });
          c.addEventListener('click', function () { status = x[0]; gambarChip(); muat(); });
          chipStatus.appendChild(c);
        });
      }

      const inChat = h('input', { class: 'input mono', placeholder: 'Chat ID Telegram (opsional)' });
      const btnTes = h('button', { class: 'btn btn--sm btn--blue', type: 'button', text: '📨 Kirim Pesan Tes' });
      btnTes.addEventListener('click', function () {
        Ui.tombolMuat(btnTes, function () {
          return Api.panggil('notif.tes', { sekolah_id: sekolahId, chat_id: inChat.value.trim() })
            .then(function (r) { Ui.toast(r.message, r.ok ? 'ok' : 'err'); });
        });
      });

      panel.appendChild(h('div', { class: 'card' }, [
        h('h2', { class: 'card__title', text: 'Uji Notifikasi' }),
        h('div', { class: 'field-row' }, [
          h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Tujuan' }), inChat]),
          h('div', { class: 'field', style: 'display:flex;align-items:flex-end' }, [btnTes])
        ]),
        h('p', { class: 'hint', text: 'Token bot disimpan di Script Properties API (TELEGRAM_TOKEN), bukan di sini.' })
      ]));
      panel.appendChild(chipStatus);

      return Api.panggil('notif.riwayat', { limit: 150, status: status }).then(function (res) {
        const holder = h('div', { class: 'list' });
        if (!res.data.length) {
          holder.appendChild(h('div', { class: 'kosong', text: 'Belum ada notifikasi terkirim.' }));
        } else {
          res.data.forEach(function (n) {
            const item = h('div', { class: 'item' }, [
              Ui.avatar({ pravatar: (n.nama || '?').slice(0, 1).toUpperCase() }, 'sm'),
              h('div', { class: 'item__body' }, [
                h('div', { class: 'item__nama', text: n.nama }),
                h('div', { class: 'item__meta' }, [
                  h('span', { text: n.kanal.toUpperCase() }),
                  h('span', { class: 'mono', text: n.tujuan }),
                  h('span', { text: String(n.dibuat_pada || '').slice(0, 16).replace('T', ' ') }),
                  n.error ? h('span', { text: '⚠ ' + n.error }) : null
                ]),
                h('div', { class: 'item__meta', style: 'white-space:normal' }, [h('span', { text: n.pesan })])
              ])
            ]);
            if (n.status === 'gagal') {
              const ulang = h('button', { class: 'btn btn--sm', type: 'button', text: '↻' , title: 'Kirim ulang' });
              ulang.addEventListener('click', function () {
                Ui.tombolMuat(ulang, function () {
                  return Api.panggil('notif.kirim_ulang', { id: n.id })
                    .then(function (r) { Ui.toast('Permintaan kirim ulang diproses.', 'ok'); muat(); });
                });
              });
              item.appendChild(ulang);
            }
            holder.appendChild(item);
          });
        }
        panel.appendChild(h('div', { class: 'card' }, [
          h('h2', { class: 'card__title', text: 'Riwayat (' + res.total + ')' }),
          holder
        ]));
      });
    }

    function panelLog() {
      panel.innerHTML = '';
      panel.appendChild(Ui.muat('Memuat log…'));
      return Api.panggil('log.riwayat', {}).then(function (res) {
        panel.innerHTML = '';
        if (!res.data.length) {
          panel.appendChild(h('div', { class: 'kosong', text: 'Belum ada aktivitas tercatat.' }));
          return;
        }
        const list = h('div', { class: 'list' });
        res.data.forEach(function (l) {
          list.appendChild(h('div', { class: 'item' }, [
            h('div', { class: 'item__body' }, [
              h('div', { class: 'item__nama mono', text: l.aksi }),
              h('div', { class: 'item__meta' }, [
                h('span', { text: '@' + l.username }),
                h('span', { text: String(l.waktu || '').slice(0, 16).replace('T', ' ') }),
                h('span', { style: 'white-space:normal' }, [h('span', { text: l.detail || '' })])
              ])
            ])
          ]));
        });
        panel.appendChild(list);
      });
    }

    function muat() {
      gambarTab();
      if (tab === 'sekolah') return panelSekolah();
      if (tab === 'pengguna') return panelPengguna();
      if (tab === 'notif') return panelNotif();
      return panelLog();
    }

    return muat();
  }
});