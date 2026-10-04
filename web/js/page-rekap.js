Hal.daftar('#/rekap', {
  nama: 'rekap',
  render: function (wadah, query) {
    const sekolahId = (Api.sekolah() || {}).id;
    let mode = query.mode === 'bulanan' ? 'bulanan' : 'harian';
    let tanggal = query.tanggal || Ui.hariIni();
    let bulan = new Date().getMonth() + 1;
    let tahun = new Date().getFullYear();
    let kelas = '';
    let siswaFokus = null;

    const body = h('div', { id: 'rekap-body' });
    const tabHarian = h('button', { class: 'chip', type: 'button', text: 'Harian' });
    const tabBulanan = h('button', { class: 'chip', type: 'button', text: 'Bulanan' });
    const chipRow = h('div', { class: 'chip-row' }, [tabHarian, tabBulanan]);

    const inTanggal = h('input', { class: 'input', type: 'date', value: tanggal });
    const selBulan = h('select', { class: 'input' });
    const selTahun = h('select', { class: 'input' });
    const selKelas = h('select', { class: 'input' });
    for (let i = 0; i < 12; i++) {
      selBulan.appendChild(h('option', { value: String(i + 1), text: BULAN[i] }));
    }
    for (let y = tahun - 2; y <= tahun + 1; y++) {
      selTahun.appendChild(h('option', { value: String(y), text: String(y) }));
    }
    selBulan.value = String(bulan);
    selTahun.value = String(tahun);

    const kontrol = h('div', { class: 'cetak-aksi card card--tight' }, [
      chipRow,
      h('div', { class: 'field-row' }, [
        h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Tanggal' }), inTanggal]),
        h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Kelas' }), selKelas])
      ]),
      h('div', { class: 'field-row', style: 'display:none', id: 'row-bulan' }, [
        h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Bulan' }), selBulan]),
        h('div', { class: 'field' }, [h('label', { class: 'label', text: 'Tahun' }), selTahun])
      ])
    ]);

    const btnCsvHarian = h('button', { class: 'btn btn--sm', type: 'button', text: '⭳ CSV Rekap' });
    const btnCsvAbsen = h('button', { class: 'btn btn--sm', type: 'button', text: '⭳ CSV Absensi Mentah' });

    wadah.appendChild(h('h1', { text: 'Rekap Absensi' }));
    wadah.appendChild(kontrol);
    wadah.appendChild(h('div', { class: 'cetak-aksi btn-row', style: 'margin-bottom:12px' }, [btnCsvHarian, btnCsvAbsen]));
    wadah.appendChild(body);

    // Tampilan mode (tombol aktif, baris mana yang disembunyikan). Dipisah
    // dari pemanggilan data supaya render awal bisa menggambar tampilan dulu
    // lalu meminta data tanpa memuat dua kali.
    function gambarMode(m) {
      tabHarian.setAttribute('aria-pressed', m === 'harian' ? 'true' : 'false');
      tabBulanan.setAttribute('aria-pressed', m === 'bulanan' ? 'true' : 'false');
      inTanggal.parentNode.style.display = m === 'harian' ? '' : 'none';
      $('#row-bulan').style.display = m === 'bulanan' ? '' : 'none';
      btnCsvAbsen.style.display = m === 'harian' ? '' : 'none';
      btnCsvHarian.textContent = m === 'harian' ? '⭳ CSV Rekap' : '⭳ CSV Bulanan';
    }

    function setMode(m) {
      mode = m;
      gambarMode(m);
      return muat();
    }
    tabHarian.addEventListener('click', function () { setMode('harian'); });
    tabBulanan.addEventListener('click', function () { setMode('bulanan'); });

    inTanggal.addEventListener('change', function () { tanggal = inTanggal.value; muat(); });
    selKelas.addEventListener('change', function () { kelas = selKelas.value; muat(); });
    selBulan.addEventListener('change', function () { bulan = parseInt(selBulan.value, 10); muat(); });
    selTahun.addEventListener('change', function () { tahun = parseInt(selTahun.value, 10); muat(); });

    btnCsvHarian.addEventListener('click', function () {
      if (mode === 'bulanan') {
        Api.panggil('rekap.bulanan_csv', {
          sekolah_id: sekolahId,
          bulan: bulan,
          tahun: tahun,
          kelas: kelas
        }).then(function (r) { Ui.unduh(r, 'rekap-bulanan.csv'); }).catch(Ui.galat);
        return;
      }
      Api.panggil('rekap.csv', { sekolah_id: sekolahId, tanggal: tanggal, kelas: kelas })
        .then(function (r) { Ui.unduh(r, 'rekap.csv'); }).catch(Ui.galat);
    });
    btnCsvAbsen.addEventListener('click', function () {
      Api.panggil('rekap.absensi_csv', { sekolah_id: sekolahId, tanggal: tanggal, kelas: kelas })
        .then(function (r) { Ui.unduh(r, 'absensi.csv'); }).catch(Ui.galat);
    });

    function legenda() {
      const box = h('div', { class: 'legenda' });
      ['hadir', 'telat', 'izin', 'sakit', 'alpha', 'belum'].forEach(function (k) {
        box.appendChild(h('div', { class: 'legenda__item' }, [
          h('span', { class: 'legenda__kotak badge--' + k, style: 'background:var(--' + (k === 'belum' ? 'surface' : k) + ')' }),
          h('span', { text: k === 'belum' ? 'Belum' : (Ui.badge(k).textContent) })
        ]));
      });
      return box;
    }

    function muatHarian() {
      body.innerHTML = '';
      body.appendChild(Ui.muat('Menghitung…'));
      return Api.panggil('rekap.harian', { sekolah_id: sekolahId, tanggal: tanggal, kelas: kelas }, { ttl: 30000 }).then(function (res) {
        body.innerHTML = '';
        const kartu = h('div', { class: 'card' }, [
          h('h2', { text: fmtTanggalLengkap(res.tanggal) })
        ]);
        const stats = h('div', { class: 'stat-grid' });
        stats.appendChild(statCard(String(res.data.length), 'Total Siswa', 'yellow'));
        stats.appendChild(statCard(String(res.rekap.hadir || 0), 'Hadir', 'green'));
        stats.appendChild(statCard(String(res.rekap.telat || 0), 'Telat', 'orange'));
        stats.appendChild(statCard(String(res.rekap.izin || 0), 'Izin', 'blue'));
        stats.appendChild(statCard(String(res.rekap.sakit || 0), 'Sakit', 'purple'));
        stats.appendChild(statCard(String(res.rekap.alpha || 0), 'Alpha', 'red'));
        stats.appendChild(statCard(String(res.rekap.belum || 0), 'Belum Absen', ''));
        kartu.appendChild(stats);
        kartu.appendChild(h('div', { style: 'margin-top:12px' }, [legenda()]));
        body.appendChild(kartu);

        if (!res.data.length) {
          body.appendChild(h('div', { class: 'kosong', text: 'Tidak ada siswa pada filter ini.' }));
          return;
        }

        const list = h('div', { class: 'list' });
        res.data.forEach(function (r) {
          list.appendChild(h('div', { class: 'item' }, [
            Ui.avatar(r, 'sm'),
            h('div', { class: 'item__body' }, [
              h('div', { class: 'item__nama', text: r.nama }),
              h('div', { class: 'item__meta' }, [
                h('span', { text: r.kelas }),
                h('span', { class: 'mono', text: r.barcode }),
                r.jam_masuk ? h('span', { text: '⏱ ' + r.jam_masuk }) : null,
                r.jam_pulang ? h('span', { text: '🚪 ' + r.jam_pulang }) : null,
                r.keterangan ? h('span', { text: r.keterangan }) : null
              ])
            ]),
            Ui.badge(r.status)
          ]));
        });
        body.appendChild(list);
      });
    }

    function muatBulanan() {
      body.innerHTML = '';
      body.appendChild(Ui.muat('Menghitung…'));
      return Api.panggil('rekap.bulanan', { sekolah_id: sekolahId, bulan: bulan, tahun: tahun, kelas: kelas }, { ttl: 30000 }).then(function (res) {
        body.innerHTML = '';
        const kartu = h('div', { class: 'card' }, [h('h2', { text: BULAN[res.bulan - 1] + ' ' + res.tahun })]);
        const grid = h('div', { class: 'bulan-grid' });
        const awal = res.tanggal[0];
        const kosong = parseInt(String(awal).split('-')[2], 10) - 1;
        ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].forEach(function (d) {
          grid.appendChild(h('div', { class: 'bulan-grid__kepala', text: d }));
        });
        for (let i = 0; i < kosong; i++) grid.appendChild(h('div', { class: 'bulan-grid__sel', dataset: { kosong: '1' } }));
        res.tanggal.forEach(function (t) {
          const d = t.tanggal;
          const hari = new Date(d + 'T00:00:00').getDay();
          const total = t.hadir + t.telat + t.izin + t.sakit + t.alpha;
          grid.appendChild(h('div', {
            class: 'bulan-grid__sel',
            title: fmtTanggal(d) + ': ' + total + ' catatan',
            dataset: total ? { s: t.hadir > t.telat ? 'hadir' : 'telat' } : {}
          }, [h('span', { text: String(parseInt(d.split('-')[2], 10)) + (hari === 0 ? '•' : '') })]));
        });
        kartu.appendChild(h('div', { class: 'label', text: 'Kalender (tanda • = Minggu)' }));
        kartu.appendChild(grid);
        kartu.appendChild(h('div', { style: 'margin-top:12px' }, [legenda()]));
        body.appendChild(kartu);

        const totalSemua = res.siswa.reduce(function (a, s) {
          return {
            hadir: a.hadir + s.hadir, telat: a.telat + s.telat,
            izin: a.izin + s.izin, sakit: a.sakit + s.sakit, alpha: a.alpha + s.alpha
          };
        }, { hadir: 0, telat: 0, izin: 0, sakit: 0, alpha: 0 });

        const kartu2 = h('div', { class: 'card' }, [h('h2', { text: 'Total Bulan Ini' })]);
        const stats = h('div', { class: 'stat-grid' });
        stats.appendChild(statCard(String(totalSemua.hadir), 'Hadir', 'green'));
        stats.appendChild(statCard(String(totalSemua.telat), 'Telat', 'orange'));
        stats.appendChild(statCard(String(totalSemua.izin), 'Izin', 'blue'));
        stats.appendChild(statCard(String(totalSemua.sakit), 'Sakit', 'purple'));
        stats.appendChild(statCard(String(totalSemua.alpha), 'Alpha', 'red'));
        stats.appendChild(statCard(String(res.siswa.length), 'Siswa Tercatat', 'yellow'));
        kartu2.appendChild(stats);
        body.appendChild(kartu2);

        if (!res.siswa.length) {
          body.appendChild(h('div', { class: 'kosong', text: 'Belum ada data absensi bulan ini.' }));
          return;
        }

        const wrap = h('div', { class: 'table-wrap' });
        const tabel = h('table', { class: 'data' }, [
          h('thead', {}, [h('tr', {}, ['Kelas', 'Nama', 'Hadir', 'Telat', 'Izin', 'Sakit', 'Alpha'].map(function (x) {
            return h('th', { text: x });
          }))])
        ]);
        const tbody = h('tbody', {});
        res.siswa.forEach(function (s) {
          const tr = h('tr', {}, [
            h('td', { text: s.kelas }),
            h('td', { text: s.nama }),
            h('td', { text: String(s.hadir) }),
            h('td', { text: String(s.telat) }),
            h('td', { text: String(s.izin) }),
            h('td', { text: String(s.sakit) }),
            h('td', { text: String(s.alpha) })
          ]);
          tr.style.cursor = 'pointer';
          tr.addEventListener('click', function () { siswaFokus = s.nama; muat(); });
          tbody.appendChild(tr);
        });
        tabel.appendChild(tbody);
        wrap.appendChild(tabel);
        body.appendChild(h('div', { class: 'card' }, [
          h('h2', { text: 'Detail Siswa' }),
          siswaFokus ? h('button', {
            class: 'btn btn--sm btn--block', type: 'button', style: 'margin-bottom:10px',
            text: 'Tampilkan kalender ' + siswaFokus + ' ✕',
            onclick: function () { siswaFokus = null; muat(); }
          }) : null,
          wrap
        ]));
      });
    }

    function muat() {
      return mode === 'harian' ? muatHarian() : muatBulanan();
    }

    // Daftar kelas dan data recap diambil bersamaan. Kalau dipanggil
    // berurutan, halaman ini menunggu dua kali 2,4 detik sebelum isi pertama
    // tampil; sekarang cukup satu kali.
    gambarMode(mode);
    return Promise.all([
      Api.panggil('siswa.kelas', {}, { ttl: Api.TTL }),
      mode === 'harian' ? muatHarian() : muatBulanan()
    ]).then(function (hasil) {
      const res = hasil[0];
      selKelas.appendChild(h('option', { value: '', text: 'Semua kelas' }));
      (res.data || []).forEach(function (k) {
        selKelas.appendChild(h('option', { value: k.kelas, text: k.kelas + ' (' + k.jumlah + ')' }));
      });
    });
  }
});