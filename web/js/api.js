const Simpan = {
  ambil: function (k, bawaan) {
    try {
      const v = localStorage.getItem(k);
      return v === null ? bawaan : v;
    } catch (e) { return bawaan; }
  },
  simpan: function (k, v) {
    try {
      if (v === null || v === undefined) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch (e) { }
  },
  hapus: function (k) {
    try { localStorage.removeItem(k); } catch (e) { }
  }
};

const K = {
  URL: 'abs_gas_url',
  TOKEN: 'abs_token',
  EXPIRES: 'abs_expires',
  USER: 'abs_user',
  SEKOLAH: 'abs_sekolah',
  TEMA: 'abs_tema',
  SW_DISARANKAN: 'abs_sw_baru'
};

const Api = {
  // Basis URL deployment TANPA /exec. Apps Script menaruh endpoint di
  // <basis>/exec, jadi /exec tidak boleh ikut tersimpan. Kalau user menyalin
  // URL lengkap dari editor (yang berakhiran /exec), bagian itu dibuang di
  // sini supaya tidak muncul /exec/exec.
 normalisasiUrl: function (v) {
    return String(v === null || v === undefined ? '' : v)
      .trim()
      .replace(/\/+$/, '')
      .replace(/\/exec$/i, '')
      .replace(/\/+$/, '');
  },

  url: function () {
    return this.normalisasiUrl(Simpan.ambil(K.URL, ''));
  },

  urlAwal: function () { return this.url() + '/exec'; },

  adaUrl: function () { return this.url().length > 0; },

  aturUrl: function (u) {
    Simpan.simpan(K.URL, this.normalisasiUrl(u));
  },

  token: function () { return Simpan.ambil(K.TOKEN, '') || ''; },

  adaToken: function () { return !!this.token(); },

  user: function () {
    const s = Simpan.ambil(K.USER, '');
    if (!s) return null;
    try { return JSON.parse(s); } catch (e) { return null; }
  },

  sekolah: function () {
    const s = Simpan.ambil(K.SEKOLAH, '');
    if (!s) return null;
    try { return JSON.parse(s); } catch (e) { return null; }
  },

  setSekolah: function (s) {
    Simpan.simpan(K.SEKOLAH, JSON.stringify(s || {}));
  },

  simpanSesi: function (hasil) {
    Simpan.simpan(K.TOKEN, hasil.token);
    Simpan.simpan(K.EXPIRES, hasil.expires_pada || '');
    Simpan.simpan(K.USER, JSON.stringify(hasil.user || {}));
    if (hasil.sekolah) Simpan.simpan(K.SEKOLAH, JSON.stringify(hasil.sekolah));
  },

  bersihkanSesi: function () {
    Simpan.hapus(K.TOKEN);
    Simpan.hapus(K.EXPIRES);
    Simpan.hapus(K.USER);
    Simpan.hapus(K.SEKOLAH);
    Api._blob = {};
    Api._cache = {};
    Api._build = null;
    Api._cekBuild = null;
  },

  fotoUrl: function (proxy) {
    if (!proxy) return '';
    if (proxy.indexOf('http') === 0) return proxy;
    return this.urlAwal() + proxy;
  },

  kelasGalat: function (err) {
    if (!err) return 'Tidak diketahui';
    if (err.nama === 'GagalJaringan') return 'Tidak ada koneksi internet.';
    if (err.nama === 'GagalWaktu') return 'Server terlalu lama merespons. Coba lagi.';
    return err.pesan || 'Terjadi kesalahan.';
  },

  // Build minimum backend yang dibutuhkan. Backend versi lama masih hidup di
  // URL /exec kalau deployment tidak pernah di-update, dan gejalanya diam-diam
  // (foto tidak muncul, pengaturan tidak tersimpan). app.info melaporkan build
  // sehingga versinya bisa dicek tanpa login.
  BUILD_MIN: 20,
  _build: null,

  cekBuild: function () {
    if (Api._cekBuild) return Api._cekBuild;
    Api._cekBuild = Api.panggil('app.info', {}, { timeout: 15000, ttl: 300000 }).then(function (r) {
      const info = r && r.data ? r.data : r;
      Api._build = info && typeof info.build === 'number' ? info.build : 0;
      Api._diag.build = Api._build;
      return Api._build;
    }).catch(function () { Api._build = 0; Api._diag.build = 0; return 0; });
    return Api._cekBuild;
  },

  buildRendah: function () {
    return Api._build !== null && Api._build < Api.BUILD_MIN;
  },

  // ---------------------------------------------------------------
  // Antrean foto.
  //
  // Setiap foto adalah satu permintaan penuh ke Apps Script, dan satu
  // permintaan selalu dua round-trip (POST lalu GET ke URL redirect). Kalau 40
  // foto dimuat bersamaan, 80 permintaan bertabrakan dan semuanya melambat
  // sampai sebagian lewat batas waktu. Antrean ini membatasi jumlah yang
  // berjalan bersamaan; sisanya menunggu giliran.
  // ---------------------------------------------------------------
  ANTREAN_FOTO: 6,
  _antrean: [],
  _antreanJalan: 0,

  _antrkJalankan: function () {
    while (Api._antreanJalan < Api.ANTREAN_FOTO && Api._antrean.length) {
      const item = Api._antrean.shift();
      Api._antreanJalan++;
      item.jalan().then(item.selesai, item.gagal);
    }
  },

  antreFoto: function (kerja) {
    return new Promise(function (res, rej) {
      Api._antrean.push({
        jalan: kerja,
        selesai: function (nilai) { Api._antreanJalan--; Api._antrkJalankan(); res(nilai); },
        gagal: function (err) { Api._antreanJalan--; Api._antrkJalankan(); rej(err); }
      });
      Api._antrkJalankan();
    });
  },

  // ---------------------------------------------------------------
  // Cache respons di memori.
  //
  // Satu panggilan API tidak pernah bisa lebih cepat dari ~2,4 detik karena
  // biaya platform Apps Script dan redirect wajibnya. Yang bisa dihemat adalah
  // jumlah panggilan: berpindah-pindah halaman tidak perlu mengambil data
  // yang sama berulang kali.
  //
  // Hanya aksi baca yang boleh di-cache. Aksi lain (tulis, absen, hapus)
  // selalu mengosongkan cache, jadi data yang tampil tidak pernah basi.
  // ---------------------------------------------------------------
  TTL: 45000,
  TIMEOUT: 45000,

  BACA_AKSI: [
    'app.info', 'sekolah.list', 'sekolah.ambil',
    'siswa.daftar', 'siswa.kelas', 'siswa.kartu', 'siswa.cek',
    'rekap.dashboard', 'rekap.harian', 'rekap.bulanan', 'rekap.siswa',
    'notif.riwayat', 'absen.saya'
  ],

  _cache: {},
  _diag: { panggilan: 0, cachePukul: 0, foto: 0, lambat: 0, rerata: 0, terakhir: 0, build: null },

  _kunci_: function (action, payload) {
    return action + '|' + JSON.stringify(payload || {});
  },

  kosongkanCache_: function () { Api._cache = {}; },

  diag: function () { return Api._diag; },

  // ---------------------------------------------------------------
  // Rangkaian sumber foto untuk satu siswa.
  //
  // <img src=".../exec?action=foto"> diam-diam gagal kalau backend membalas
  // JSON error, dan fetch() bisa gagal karena CORS padahal <img> biasa saja
  // bisa memuat URL itu. Jadi keduanya dicoba:
  //
  //   1. fetch + periksa Content-Type -> object URL (error backend jadi
  //      terlihat, hasilnya bisa dipakai ulang untuk cetak)
  //   2. kalau fetch gagal karena CORS/jaringan, URL proxy dikembalikan
  //      apa adanya dan browser yang memuatnya sebagai gambar
  //
  // Pemanggil memasang pengaman img.onerror untuk mencoba URL Drive, lalu
  // menampilkan tanda merah kalau semuanya gagal.
  fotoSrc: function (proxy, cadangan) {
    const url = Api.fotoUrl(proxy);
    if (!url) return Promise.reject(new Error('Tanpa foto'));
    if (Api._blob[url]) return Api._blob[url];
    const ambil = function () {
      return Api.panggilDenganBatas(url, 30000).then(function (res) {
        const tipe = (res.headers.get('Content-Type') || '').split(';')[0].trim();
        if (tipe.indexOf('image/') === 0) {
          return res.blob().then(function (b) { return URL.createObjectURL(b); });
        }
        return res.text().then(function (teks) {
          let pesan = 'Foto ditolak backend (' + (tipe || 'tanpa tipe') + ')';
          try {
            const j = JSON.parse(teks);
            if (j && j.error) pesan = (j.error.kode || 'ERROR') + ': ' + (j.error.pesan || '');
          } catch (e) { }
          const err = new Error(pesan);
          err.dariBackend = true;
          throw err;
        });
      })
        .catch(function (err) {
          if (err && err.dariBackend) throw err;
          // Gagal karena timeout atau jaringan: coba sekali lagi sebelum
          // menyerah, karena server Apps Script memang sering lambat.
          return Api.panggilDenganBatas(url, 30000).then(function (res2) {
            const tipe2 = (res2.headers.get('Content-Type') || '').split(';')[0].trim();
            if (tipe2.indexOf('image/') === 0) {
              return res2.blob().then(function (b) { return URL.createObjectURL(b); });
            }
            return url;
          }).catch(function () { return url; });
        });
    };
    const usaha = Api.antreFoto(ambil).then(function (src) {
      if (src !== url) Api._blob[url] = Promise.resolve(src);
      Api._diag.foto++;
      return src;
    }, function (err) {
      Api._diag.foto++;
      throw err;
    });
    Api._blob[url] = usaha;
    return usaha;
  },

  // fetch dengan batas waktu sendiri. Timeout bawaan fetch tidak ada, jadi
  // permintaan yang menggantung akan menggantung selamanya.
  panggilDenganBatas: function (url, ms) {
    if (typeof AbortController === 'undefined') return fetch(url, { credentials: 'include', cache: 'no-store' });
    const ctrl = new AbortController();
    const timer = setTimeout(function () { ctrl.abort(); }, ms);
    return fetch(url, { credentials: 'include', cache: 'no-store', signal: ctrl.signal })
      .then(function (r) { clearTimeout(timer); return r; })
      .catch(function (e) { clearTimeout(timer); throw e; });
  },

  // Pasang <img> dengan rangkaian cadangan: proxy -> Drive -> tanda merah.
  pasangFoto: function (img, proxy, cadangan, gagal) {
    const cobaCadangan = function () {
      if (cadangan && img.src !== cadangan) {
        img.onerror = function () { img.onerror = null; if (gagal) gagal(); };
        img.src = cadangan;
        return;
      }
      img.onerror = null;
      if (gagal) gagal();
    };
    img.onerror = function () { img.onerror = null; cobaCadangan(); };
    return Api.fotoSrc(proxy, cadangan).then(function (src) {
      img.src = src;
      return src;
    }).catch(function (err) {
      img.onerror = null;
      if (err && err.dariBackend && cadangan) {
        img.onerror = function () { img.onerror = null; if (gagal) gagal(); };
        img.src = cadangan;
        return cadangan;
      }
      if (gagal) gagal(err);
      throw err;
    });
  },

  bersihkanBlob_: function () { Api._blob = {}; },

  panggil: function (action, payload, opsi) {
    const o = opsi || {};
    if (!Api.adaUrl()) {
      return Promise.reject({ nama: 'GagalJaringan', pesan: 'URL API belum diatur. Buka Pengaturan aplikasi.' });
    }
    const bolehCache = o.ttl && Api.BACA_AKSI.indexOf(action) >= 0;
    const kunci = Api._kunci_(action, payload);
    if (bolehCache && Api._cache[kunci] && Api._cache[kunci].sampai > Date.now()) {
      Api._diag.cachePukul++;
      return Promise.resolve(Api._cache[kunci].data);
    }
    const controller = new AbortController();
    const ms = o.timeout || Api.TIMEOUT;
    const timer = setTimeout(function () { controller.abort(); }, ms);
    const mulai = Date.now();

    const body = JSON.stringify({
      action: action,
      token: Api.token(),
      payload: payload || {}
    });

    return fetch(Api.urlAwal(), {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: body,
      signal: controller.signal,
      cache: 'no-store'
    }).then(function (res) {
      return res.text();
    }).then(function (teks) {
      clearTimeout(timer);
      let data;
      try {
        data = JSON.parse(teks);
      } catch (e) {
        throw { nama: 'GagalJawab', pesan: 'Jawaban server tidak valid.', mentah: teks };
      }
      if (data && data.ok) {
        const dt = Date.now() - mulai;
        Api._diag.panggilan++;
        Api._diag.terakhir = dt;
        Api._diag.rerata = Api._diag.rerata
          ? Math.round((Api._diag.rerata * 0.7) + (dt * 0.3))
          : dt;
        if (dt > 5000) Api._diag.lambat++;
        if (bolehCache) Api._cache[kunci] = { data: data, sampai: Date.now() + (o.ttl || Api.TTL) };
        // Aksi yang bukan murni baca berarti ada data yang berubah, jadi
        // cache tidak boleh dipakai lagi.
        if (Api.BACA_AKSI.indexOf(action) < 0) Api.kosongkanCache_();
        return data;
      }
      const err = (data && data.error) || { kode: 'UNKNOWN', pesan: 'Permintaan gagal.' };
      if (err.kode === 'AUTH') {
        Api.bersihkanSesi();
      }
      const e = new Error(err.pesan);
      e.nama = err.kode;
      e.kode = err.kode;
      throw e;
    }).catch(function (err) {
      clearTimeout(timer);
      if (err && err.nama) throw err;
      if (err && err.name === 'AbortError') throw { nama: 'GagalWaktu', pesan: 'Server terlalu lama merespons.' };
      if (err instanceof TypeError) throw { nama: 'GagalJaringan', pesan: 'Tidak ada koneksi ke server.' };
      throw { nama: 'GagalJaringan', pesan: Api.kelasGalat(err) };
    });
  },

  // Panggil dengan satu kali percobaan ulang otomatis. Berguna untuk aksi
  // yang sering gagal karena server sedang lambat, bukan karena input salah.
  panggilUlang: function (action, payload, opsi) {
    const coba = function (sisa) {
      return Api.panggil(action, payload, opsi).catch(function (err) {
        if (!sisa) throw err;
        if (err && (err.nama === 'GagalWaktu' || err.nama === 'GagalJaringan')) {
          return new Promise(function (r) { setTimeout(r, 1200); }).then(coba.bind(null, false));
        }
        throw err;
      });
    };
    return coba(true);
  },

  gambar: function (action, payload) {
    return Api.panggil(action, payload, { timeout: 60000 });
  },

  unduhCsv: function (namaFile, isi) {
    const blob = new Blob([isi], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = namaFile;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }
};