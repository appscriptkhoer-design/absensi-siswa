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
  TEMA: 'abs_tema'
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
  BUILD_MIN: 18,
  _build: null,

  cekBuild: function () {
    if (Api._cekBuild) return Api._cekBuild;
    Api._cekBuild = Api.panggil('app.info', {}, { timeout: 8000 }).then(function (r) {
      const info = r && r.data ? r.data : r;
      Api._build = info && typeof info.build === 'number' ? info.build : 0;
      return Api._build;
    }).catch(function () { Api._build = 0; return 0; });
    return Api._cekBuild;
  },

  buildRendah: function () {
    return Api._build !== null && Api._build < Api.BUILD_MIN;
  },

  _blob: {},

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
      return fetch(url, { credentials: 'include', cache: 'no-store' })
        .then(function (res) {
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
          return url;
        });
    };
    const usaha = ambil().then(function (src) {
      if (src !== url) Api._blob[url] = Promise.resolve(src);
      return src;
    });
    Api._blob[url] = usaha;
    return usaha;
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
    const controller = new AbortController();
    const ms = o.timeout || 25000;
    const timer = setTimeout(function () { controller.abort(); }, ms);

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
      if (data && data.ok) return data;
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