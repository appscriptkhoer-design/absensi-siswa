Hal.daftar('#/', {
  nama: 'beranda',
  render: function (wadah) {
    const u = Api.user();
    const s = Api.sekolah();
    wadah.appendChild(h('div', { class: 'card card--accent' }, [
      h('h1', { text: 'Halo, ' + (u ? u.nama : '') + '!' }),
      h('p', { text: fmtTanggalLengkap(Ui.hariIni()) }),
      h('div', { class: 'btn-row' }, [
        h('span', { class: 'badge', text: s ? s.nama : 'Tanpa sekolah' }),
        h('span', { class: 'badge', text: u ? u.role : '-' }),
        h('span', { class: 'badge', text: 'Jam ' + new Date().toTimeString().slice(0, 5) })
      ])
    ]));

    const peta = [
      { rute: '#/scan', ikon: '📷', nama: 'Scan Absen', desc: 'Pindai kartu siswa di gerbang', tag: 'Masuk & Pulang', bg: 'card--accent' },
      { rute: '#/siswa', ikon: '🎒', nama: 'Data Siswa', desc: 'Tambah, ubah, impor siswa', tag: 'Kelola', bg: 'card--tight' },
      { rute: '#/kartu', ikon: '🪪', nama: 'Cetak Kartu', desc: 'QR + barcode + foto', tag: 'Download PDF', bg: 'card--tight' },
      { rute: '#/rekap', ikon: '📊', nama: 'Rekap Absensi', desc: 'Harian & bulanan per kelas', tag: 'Laporan', bg: 'card--tight' }
    ];

    const grid = h('div', { class: 'tile-grid' });
    peta.forEach(function (t) {
      grid.appendChild(h('a', { class: 'tile', href: t.rute }, [
        h('span', { class: 'tile__ikon', text: t.ikon }),
        h('span', { class: 'tile__nama', text: t.nama }),
        h('span', { class: 'tile__desc', text: t.desc }),
        h('span', { class: 'tile__tag', text: t.tag })
      ]));
    });
    wadah.appendChild(h('h2', { text: 'Menu Utama' }));
    wadah.appendChild(grid);

    const kartu = h('div', { class: 'card', style: 'margin-top:16px' }, [Ui.muat('Memuat ringkasan…')]);
    wadah.appendChild(kartu);

    return Api.panggil('rekap.dashboard', {}).then(function (d) {
      kartu.innerHTML = '';
      kartu.appendChild(h('div', { class: 'card__title' }, [
        h('h2', { text: 'Ringkasan Hari Ini' }),
        h('a', { class: 'btn btn--sm', href: '#/rekap', text: 'Detail' })
      ]));

      const stats = h('div', { class: 'stat-grid' });
      stats.appendChild(statCard(String(d.total_siswa), 'Total Siswa', 'yellow'));
      stats.appendChild(statCard(String(d.sudah_masuk), 'Sudah Masuk', 'green'));
      stats.appendChild(statCard(String(d.sudah_pulang), 'Sudah Pulang', 'blue'));
      stats.appendChild(statCard(String(d.telat), 'Terlambat', 'orange'));
      stats.appendChild(statCard(String(d.belum_masuk), 'Belum Masuk', 'red'));
      stats.appendChild(statCard(String(d.izin + d.sakit + d.alpha), 'Izin/Sakit/Alpha', 'purple'));
      kartu.appendChild(stats);

      const waktu = {};
      if (s && s.jam_masuk) waktu['Jam masuk'] = s.jam_masuk + ' (batas telat ' + s.batas_telat_mnt + ' mnt)';
      if (s && s.jam_pulang) waktu['Jam pulang'] = s.jam_pulang;
      if (s && s.radius_m) waktu['Radius lokasi'] = s.radius_m + ' meter';
      if (Object.keys(waktu).length) {
        kartu.appendChild(h('div', { class: 'divider' }));
        Object.keys(waktu).forEach(function (k) {
          kartu.appendChild(h('div', { class: 'kv' }, [h('span', { class: 'kv__k', text: k }), h('span', { class: 'kv__v', text: waktu[k] })]));
        });
      }

      const peringatan = [];
      if (d.pending_user > 0) peringatan.push(d.pending_user + ' pengguna menunggu persetujuan.');
      if (d.notif_gagal > 0) peringatan.push(d.notif_gagal + ' notifikasi gagal terkirim.');
      if (peringatan.length) {
        kartu.appendChild(h('div', { class: 'divider' }));
        kartu.appendChild(h('div', { class: 'card card--warn card--tight' }, [
          h('div', { class: 'pesan-sistem__teks', text: '⚠️ ' + peringatan.join(' ') }),
          h('a', { class: 'btn btn--sm btn--block', href: '#/admin', text: 'Buka Admin', style: 'margin-top:8px' })
        ]));
      }

      Simpan.simpan(K.SEKOLAH, JSON.stringify(d.sekolah || s || {}));
    }).catch(function (err) {
      kartu.innerHTML = '';
      kartu.appendChild(h('p', { text: Api.kelasGalat(err) }));
    });
  }
});

function statCard(nilai, label, warna) {
  return h('div', { class: 'stat stat--' + (warna || 'yellow') }, [
    h('div', { class: 'stat__nilai', text: nilai }),
    h('div', { class: 'stat__label', text: label })
  ]);
}