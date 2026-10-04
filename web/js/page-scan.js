Hal.daftar('#/scan', {
  nama: 'scan',
  render: function (wadah) {
    let tipe = 'masuk';
    let geo = { lat: '', lng: '', akurasi: '' };
    let scanner = null;
    let sibuk = false;
    let sudahGeo = false;

    const boxes = [
      { tipe: 'masuk', ikon: '✅', nama: 'MASUK', warna: 'btn--green' },
      { tipe: 'pulang', ikon: '👋', nama: 'PULANG', warna: 'btn--blue' }
    ];

    const petaStatus = {
      hadir: { judul: 'HADIR', kelas: 'hasil-scan--hadir' },
      telat: { judul: 'TERLAMBAT', kelas: 'hasil-scan--telat' },
      izin: { judul: 'IZIN', kelas: 'hasil-scan--hadir' },
      sakit: { judul: 'SAKIT', kelas: 'hasil-scan--hadir' },
      alpha: { judul: 'TIDAK HADIR', kelas: 'hasil-scan--hadir' }
    };

    wadah.appendChild(h('h1', { text: 'Scan Absen' }));

    const kartuPilih = h('div', { class: 'card card--tight' });
    const barisTipe = h('div', { class: 'pilih-tipe' });
    const tombolTipe = {};
    boxes.forEach(function (b) {
      const el = h('button', {
        class: 'btn ' + b.warna,
        type: 'button',
        'aria-pressed': b.tipe === tipe ? 'true' : 'false'
      }, [
        h('span', { style: 'font-size:1.3rem', text: b.ikon }),
        h('span', { text: b.nama })
      ]);
      el.addEventListener('click', function () {
        tipe = b.tipe;
        Object.keys(tombolTipe).forEach(function (k) {
          tombolTipe[k].setAttribute('aria-pressed', k === tipe ? 'true' : 'false');
        });
      });
      tombolTipe[b.tipe] = el;
      barisTipe.appendChild(el);
    });
    kartuPilih.appendChild(barisTipe);
    kartuPilih.appendChild(h('div', { class: 'gps', id: 'gps-info', style: 'margin-top:10px' }, [
      h('span', { text: '📍 Meminta lokasi…' })
    ]));
    wadah.appendChild(kartuPilih);

    const reader = h('div', { id: 'reader' });
    const idle = h('div', { class: 'pindai__idle' }, [
      h('div', { style: 'font-size:2rem', text: '📷' }),
      h('div', { text: 'Menyiapkan kamera…' })
    ]);
    const pindai = h('div', { class: 'pindai' }, [reader, idle]);
    wadah.appendChild(h('div', { class: 'kartu-area', id: 'hal-scan-kamera' }, [pindai]));

    const inputKode = h('input', {
      class: 'input mono',
      id: 'in-kode',
      type: 'text',
      inputmode: 'none',
      autocomplete: 'off',
      autocapitalize: 'characters',
      placeholder: 'Scan atau ketik kode'
    });
    const tombolKirim = h('button', { class: 'btn btn--primary', type: 'button', text: 'Kirim' });
    const kirim = function () {
      const v = inputKode.value.trim().toUpperCase();
      if (!v) { Ui.toast('Kode masih kosong.', 'err'); return; }
      proses(v);
    };
    tombolKirim.addEventListener('click', kirim);
    Ui.kirimEnter(inputKode, kirim);

    const kartuKode = h('div', { class: 'card card--tight' }, [
      h('label', { class: 'label', for: 'in-kode', text: 'Kode barcode / QR' }),
      h('div', { class: 'pindai__kode' }, [inputKode, tombolKirim]),
      h('div', { class: 'hint', text: 'Cocok untuk scanner barcode USB/Bluetooth dan mengetik kode manual.' })
    ]);
    wadah.appendChild(kartuKode);

    const hasilKartu = h('div', { id: 'hasil-scan' });
    wadah.appendChild(hasilKartu);

    function setGps(teks, warna) {
      const el = $('#gps-info');
      if (!el) return;
      el.innerHTML = '';
      el.appendChild(h('span', { text: teks }));
      if (warna) el.style.color = warna;
    }

    function ambilGeo() {
      if (!navigator.geolocation) {
        setGps('📍 GPS tidak didukung perangkat ini');
        return;
      }
      setGps('📍 Meminta lokasi…');
      navigator.geolocation.getCurrentPosition(function (pos) {
        geo = {
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
          akurasi: Math.round(pos.coords.accuracy)
        };
        sudahGeo = true;
        setGps('📍 Lokasi terkunci (±' + geo.akurasi + ' m)');
      }, function (err) {
        sudahGeo = false;
        const pesan = err.code === 1
          ? '📍 Izin lokasi ditolak — absen tetap dicatat tanpa lokasi'
          : '📍 Lokasi tidak ditemukan — aktifkan GPS';
        setGps(pesan, '#b00');
      }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 });
    }

    function tampilGagal(pesan, kode) {
      hasilKartu.innerHTML = '';
      hasilKartu.appendChild(h('div', { class: 'hasil-scan hasil-scan--gagal' }, [
        h('div', { style: 'font-size:2.2rem', text: '⛔' }),
        h('div', { class: 'hasil-scan__nama', text: 'GAGAL' }),
        h('div', { style: 'font-weight:700', text: pesan })
      ]));
      if (kode === 'AUTH') { Ui.galat({ kode: 'AUTH', pesan: pesan }); return; }
      setTimeout(lanjut, 2200);
    }

    function tampilSukses(res) {
      const a = res.absensi;
      const info = petaStatus[a.status] || { judul: a.status.toUpperCase(), kelas: 'hasil-scan--hadir' };
      hasilKartu.innerHTML = '';
      const box = h('div', { class: 'hasil-scan ' + info.kelas });
      box.appendChild(Ui.avatar(res.siswa, 'lg'));
      box.appendChild(h('div', { class: 'hasil-scan__nama', text: res.siswa.nama }));
      box.appendChild(h('div', { style: 'font-weight:800', text: (res.siswa.kelas || '-') + ' · ' + (res.siswa.nis || res.siswa.barcode) }));
      box.appendChild(h('div', { class: 'hasil-scan__jam', text: fmtJam(a.waktu) }));
      box.appendChild(h('div', { style: 'font-size:1rem;font-weight:900', text: info.judul + ' · ' + a.tipe.toUpperCase() }));
      if (a.jarak_m !== '' && a.jarak_m !== undefined) {
        box.appendChild(h('div', { class: 'badge', text: a.jarak_m + ' m dari sekolah' }));
      }
      if (a.keterangan) box.appendChild(h('div', { style: 'font-weight:700', text: a.keterangan }));

      if (res.notif) {
        const t = res.notif.status === 'sent'
          ? '📨 Notifikasi orang tua terkirim'
          : (res.notif.status === 'lewati'
            ? '📭 Notifikasi dilewati: ' + (res.notif.error || '')
            : '⚠️ Notifikasi gagal: ' + (res.notif.error || ''));
        box.appendChild(h('div', { class: 'hint', style: 'color:inherit', text: t }));
      }
      hasilKartu.appendChild(box);
      if (navigator.vibrate) navigator.vibrate(60);
      setTimeout(lanjut, 2600);
    }

    function proses(kode) {
      if (sibuk) return;
      sibuk = true;
      hasilKartu.innerHTML = '';
      hasilKartu.appendChild(h('div', { class: 'hasil-scan' }, [h('div', { class: 'muat__spin' }), h('div', { text: 'Mencatat…' })]));
      stopKamera();
      Api.panggil('absen.scan', {
        kode: kode,
        tipe: tipe,
        lat: geo.lat,
        lng: geo.lng,
        akurasi: geo.akurasi,
        device: (navigator.userAgent.match(/Android/i) ? 'Android' : 'Web') + (sudahGeo ? ' +GPS' : '')
      }).then(function (res) {
        if (navigator.vibrate) navigator.vibrate(40);
        inputKode.value = '';
        tampilSukses(res);
      }).catch(function (err) {
        inputKode.value = '';
        tampilGagal(Api.kelasGalat(err), err && err.kode);
      }).then(function () {
        sibuk = false;
      });
    }

    function lanjut() {
      hasilKartu.innerHTML = '';
      if (document.visibilityState === 'visible') startKamera();
    }

    function stopKamera() {
      if (scanner) {
        try {
          const s = scanner;
          scanner = null;
          s.stop().then(function () { s.clear(); }).catch(function () { });
        } catch (e) { scanner = null; }
      }
      idle.style.display = 'flex';
    }

    function pesanKamera(teks) {
      idle.innerHTML = '';
      idle.appendChild(h('div', { style: 'font-size:2rem', text: '📷' }));
      idle.appendChild(h('div', { text: teks }));
      idle.style.display = 'flex';
    }

    function startKamera() {
      if (!window.isSecureContext) {
        pesanKamera('Kamera hanya bisa aktif di alamat https://. Akses lewat http:// tidak diizinkan browser.');
        return;
      }
      if (scanner) return;
      pesanKamera('Menyiapkan kamera…');
      scanner = new Html5Qrcode('reader');
      scanner.start(
        { facingMode: 'environment' },
        { fps: 12, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
        function (teks) {
          if (sibuk) return;
          const kode = String(teks || '').trim().toUpperCase();
          if (!kode) return;
          proses(kode);
        },
        function () { }
      ).then(function () {
        idle.style.display = 'none';
      }).catch(function (err) {
        const pesan = String(err && err.message ? err.message : err);
        scanner = null;
        if (/NotAllowedError|Permission/i.test(pesan)) {
          pesanKamera('Izin kamera ditolak. Aktifkan kamera lewat pengaturan browser, atau gunakan kode manual di bawah.');
        } else if (/NotFoundError|no camera/i.test(pesan)) {
          pesanKamera('Kamera tidak ditemukan. Gunakan kode manual atau scanner barcode di bawah.');
        } else {
          pesanKamera('Kamera tidak aktif. Gunakan kode manual di bawah.');
        }
      });
    }

    ambilGeo();
    setTimeout(startKamera, 60);
    inputKode.focus();

    window.addEventListener('hashchange', stopKamera, { once: true });

    return Promise.resolve();
  }
});