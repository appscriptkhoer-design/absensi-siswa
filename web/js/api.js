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
  url: function () {
    return String(Simpan.ambil(K.URL, '') || '').replace(/\/+$/, '');
  },

  urlAwal: function () { return this.url() + '/exec'; },

  adaUrl: function () { return this.url().length > 0; },

  aturUrl: function (u) {
    Simpan.simpan(K.URL, String(u || '').trim().replace(/\/+$/, ''));
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
  },

  fotoUrl: function (proxy) {
    if (!proxy) return '';
    if (proxy.indexOf('http') === 0) return proxy;
    return this.url() + '/exec' + proxy;
  },

  kelasGalat: function (err) {
    if (!err) return 'Tidak diketahui';
    if (err.nama === 'GagalJaringan') return 'Tidak ada koneksi internet.';
    if (err.nama === 'GagalWaktu') return 'Server terlalu lama merespons. Coba lagi.';
    return err.pesan || 'Terjadi kesalahan.';
  },

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