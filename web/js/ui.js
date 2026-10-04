function $(sel, akar) { return (akar || document).querySelector(sel); }
function $$(sel, akar) { return Array.prototype.slice.call((akar || document).querySelectorAll(sel)); }

const TAG_SVG = { svg: 1, g: 1, path: 1, rect: 1, circle: 1, line: 1, polyline: 1, polygon: 1, text: 1, defs: 1, use: 1 };

function h(tag, attrs, children) {
  const el = TAG_SVG[tag]
    ? document.createElementNS('http://www.w3.org/2000/svg', tag)
    : document.createElement(tag);
  const a = attrs || {};
  Object.keys(a).forEach(function (k) {
    const v = a[k];
    if (v === null || v === undefined || v === false) return;
    if (k === 'class' && !TAG_SVG[tag]) el.className = v;
    else if (k === 'class') el.setAttribute('class', v);
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.indexOf('on') === 0 && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.keys(v).forEach(function (d) { el.dataset[d] = v[d]; });
    else if (k === 'value') el.value = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  });
  if (children !== undefined && children !== null) {
    const daftar = Array.isArray(children) ? children : [children];
    daftar.forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      el.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
    });
  }
  return el;
}

function bersihkan(html) {
  return String(html === null || html === undefined ? '' : html)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function fmtTanggal (tanggalStr) {
  const p = String(tanggalStr || '').split('-');
  if (p.length !== 3) return tanggalStr || '-';
  return p[2] + ' ' + BULAN[parseInt(p[1], 10) - 1] + ' ' + p[0];
}

function fmtJam (iso) {
  return String(iso || '').slice(11, 16) || '-';
}

function fmtTanggalLengkap (tanggalStr) {
  const d = new Date(String(tanggalStr) + 'T00:00:00');
  if (isNaN(d.getTime())) return tanggalStr;
  return HARI[d.getDay()] + ', ' + d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear();
};

const Ui = {
  // Normalkan nilai jam menjadi "HH:MM". Backend lama pernah mengirim
  // "1899-12-30 15:07:12" (waktu yang dibaca Sheets sebagai tanggal), dan
  // <input type="time"> menolak nilai seperti itu — kolomnya jadi kosong
  // padahal schoolsnya benar.
  jam: function (v) {
    const t = String(v === null || v === undefined ? '' : v).trim();
    if (!t) return '';
    const m = /(?:^|[\sT])(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(t);
    if (!m) return t;
    return (m[1].length < 2 ? '0' + m[1] : m[1]) + ':' + m[2];
  },

  toast: function (pesan, jenis, tombol) {
    const lama = document.querySelectorAll('.toast');
    lama.forEach(function (t) { t.remove(); });
    const isi = [h('span', { text: pesan })];
    if (tombol) isi.push(tombol);
    const el = h('div', { class: 'toast toast--' + (jenis || 'info'), role: 'status' }, isi);
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, jenis === 'err' ? 6000 : 3000);
  },

  muat: function (pesan) {
    const el = h('div', { class: 'muat' }, [
      h('div', { class: 'muat__spin' }),
      h('div', { class: 'teks-kecil', text: pesan || 'Memuat…' })
    ]);
    return el;
  },

  // Kerangka bayangan: tampil seketika selagi server menjawab, supaya
  // halaman tidak terlihat kosong selama menunggu.
  rangka: function (baris) {
    const isi = [];
    for (let i = 0; i < (baris || 4); i++) {
      isi.push(h('div', { class: 'rangka__baris' }, [
        h('div', { class: 'rangka__avatar' }),
        h('div', { class: 'rangka__teks' }, [
          h('div', { class: 'rangka__garis', style: 'width:58%' }),
          h('div', { class: 'rangka__garis', style: 'width:34%' })
        ])
      ]));
    }
    return h('div', { class: 'rangka', 'aria-hidden': 'true' }, isi);
  },

  // Kotak pesan kesalahan yang menyertakan tombol mencoba lagi. Tanpa
  // tombolnya, lambat dan gagal terasa sama saja: buntu.
  pesanGalat: function (pesan, lagi) {
    const isi = [h('div', { class: 'teks-kecil', text: pesan })];
    if (typeof lagi === 'function') {
      isi.push(h('button', {
        class: 'btn btn--sm', type: 'button', text: 'Coba lagi',
        onclick: function () { lagi(); }
      }));
    }
    return h('div', { class: 'card card--warn galat-ulang' }, isi);
  },

  modal: function (opsi) {
    const o = opsi || {};
    const konten = h('div', { class: 'modal' });
    const tutup = function () { backdrop.remove(); document.body.style.overflow = ''; };
    const aksi = h('div', { class: 'btn-row', style: 'margin-top:16px' });

    (o.aksi || []).forEach(function (a) {
      const b = h('button', {
        class: 'btn ' + (a.class || ''),
        type: 'button',
        onclick: function () {
          if (!a.jalankan) { tutup(); return; }
          a.jalankan(tutup, konten);
        }
      }, a.label);
      aksi.appendChild(b);
    });
    if (!o.aksi) {
      aksi.appendChild(h('button', { class: 'btn btn--block', type: 'button', onclick: tutup, text: 'Tutup' }));
    }

    konten.appendChild(h('h2', { class: 'card__title' }, [
      h('span', { text: o.judul || '' }),
      h('button', { class: 'btn btn--sm btn--icon', type: 'button', 'aria-label': 'Tutup', onclick: tutup, text: '✕' })
    ]));
    const isi = o.isi;
    if (typeof isi === 'string') konten.appendChild(h('div', { html: isi }));
    else if (isi) konten.appendChild(isi);
    if (o.catatan) konten.appendChild(h('div', { class: 'hint', style: 'margin-top:10px', text: o.catatan }));
    konten.appendChild(aksi);

    const backdrop = h('div', {
      class: 'modal-backdrop',
      onclick: function (e) { if (e.target === backdrop) tutup(); }
    }, konten);

    document.body.appendChild(backdrop);
    document.body.style.overflow = 'hidden';
    return { tutup: tutup, elemen: konten };
  },

  konfirmasi: function (pesan, judul, labelYa) {
    return new Promise(function (res) {
      Ui.modal({
        judul: judul || 'Konfirmasi',
        isi: h('p', { text: pesan }),
        aksi: [
          { label: 'Batal', class: '', jalankan: function (tutup) { tutup(); res(false); } },
          { label: labelYa || 'Ya, Lanjutkan', class: 'btn--red', jalankan: function (tutup) { tutup(); res(true); } }
        ]
      });
    });
  },

  galat: function (err) {
    const pesan = Api.kelasGalat(err);
    if (err && err.kode === 'AUTH') {
      Ui.modal({
        judul: 'Sesi Berakhir',
        isi: h('p', { text: pesan }),
        aksi: [{ label: 'Masuk Lagi', class: 'btn--primary', jalankan: function () { location.hash = '#/masuk'; } }]
      });
      return;
    }
    Ui.toast(pesan, 'err');
  },

  // Satu IntersectionObserver dipakai bersama untuk semua avatar, bukan satu
  // observer per gambar. Foto baru dimuat kalau elemennya sudah dekat dengan
  // layar; sisanya menunggu sampai digulir atau halaman dicetak.
  _fotoIO: null,

  fotoNanti: function (el, mulai) {
    if (typeof IntersectionObserver === 'undefined') { mulai(); return; }
    if (!Ui._fotoIO) {
      Ui._fotoIO = new IntersectionObserver(function (entri) {
        entri.forEach(function (e) {
          if (!e.isIntersecting) return;
          Ui._fotoIO.unobserve(e.target);
          const f = e.target.__mulaiFoto;
          if (f) { e.target.__mulaiFoto = null; f(); }
        });
      }, { rootMargin: '300px 0px' });
    }
    el.__mulaiFoto = mulai;
    Ui._fotoIO.observe(el);
  },

  avatar: function (data, ukuran) {
    const cls = 'avatar' + (ukuran === 'sm' ? ' avatar--sm' : ukuran === 'lg' ? ' avatar--lg' : '');
    const box = h('div', { class: cls, text: data && data.pravatar ? data.pravatar : '?' });
    // Proxy bertoken selalu dicoba lebih dulu: URL thumbnail Drive sering
    // ditolak saat di-hotlink dari origin PWA, sedangkan proxy kita sendiri.
    const proxy = data && data.foto_proxy ? data.foto_proxy : '';
    const publik = data && data.foto ? data.foto : '';
    if (!proxy && !publik) return box;

    const img = h('img', { alt: '', loading: 'lazy' });
    box.textContent = '';
    box.appendChild(img);
    const tanda = function (err) {
      box.textContent = '';
      box.appendChild(h('span', {
        class: 'avatar__galat',
        title: (err && err.message) || 'Foto tidak bisa dimuat',
        text: '!'
      }));
    };
    Ui.fotoNanti(img, function () {
      Api.pasangFoto(img, proxy, (data && data.foto_uc) || publik, tanda)['catch'](function () { });
    });
    return box;
  },

  // ── Foto saat cetak kartu ───────────────────────────────────────────────
  // Aturan: foto tidak boleh menghambat pencetakan. Barcode dan QR digambar
  // dari data, jadi kartu yang fotonya kosong tetap berguna. Tiga fungsi ini
  // sengaja dipisah supaya bisa diuji tanpa membuka dialog print.

  // Hanya "sudah tampil atau belum" yang penting. Bedakan dengan <img> yang
  // gagal total tidak perlu: dua-duanya dicetak sama saja, tanpa foto.
  fotoSiap: function (img) {
    return !!(img && img.complete && img.naturalWidth > 0);
  },

  // Tunggu sampai semua foto selesai, atau sampai batas waktu tercapai.
  // Keduanya bukan kegagalan: pemanggil tetap mencetak apa adanya.
  tungguFotoCetak: function (area, batasMs) {
    const gambar = $$('.kartu__foto img', area);
    return new Promise(function (res) {
      if (!gambar.length) { res({ total: 0, siap: 0 }); return; }
      const batas = Date.now() + (batasMs || 0);
      const tick = function () {
        const siap = gambar.filter(Ui.fotoSiap).length;
        if (siap === gambar.length || Date.now() >= batas) {
          res({ total: gambar.length, siap: siap });
          return;
        }
        setTimeout(tick, 120);
      };
      tick();
    });
  },

  // Foto yang belum siap disembunyikan, bukan dihapus, sehingga cetak kedua
  // masih bisa memakainya begitu fotonya tiba. Kembalikan banyak yang
  // disembunyikan supaya pemanggil bisa mengabarinya tanpa menebak.
  sembunyikanFotoBelumSiap: function (area) {
    let disembunyikan = 0;
    $$('.kartu__foto img', area).forEach(function (img) {
      if (Ui.fotoSiap(img)) return;
      img.classList.add('cetak-sembunyi');
      disembunyikan += 1;
    });
    return disembunyikan;
  },

  pulihkanFotoCetak: function (area) {
    $$('.kartu__foto img', area).forEach(function (img) {
      img.classList.remove('cetak-sembunyi');
    });
  },

  badge: function (status) {
    const peta = {
      hadir: 'Hadir', telat: 'Telat', izin: 'Izin', sakit: 'Sakit',
      alpha: 'Alpha', belum: 'Belum', masuk: 'Masuk', pulang: 'Pulang',
      pending: 'Menunggu', active: 'Aktif', rejected: 'Ditolak',
      sent: 'Terkirim', gagal: 'Gagal', lewati: 'Dilewati',
      superadmin: 'Super Admin', admin: 'Admin', guru: 'Guru'
    };
    return h('span', { class: 'badge badge--' + status, text: peta[status] || status });
  },

  hariIni: function () {
    const d = new Date();
    const b = d.getMonth() + 1;
    const t = d.getDate();
    return d.getFullYear() + '-' + (b < 10 ? '0' + b : b) + '-' + (t < 10 ? '0' + t : t);
  },

  kirimEnter: function (el, fn) {
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); fn(); }
    });
  },

  // Jalankan fn() langsung dan kembalikan promise-nya.
  // Versi lama mengembalikan thunk yang harus dipanggil manual; 9 dari 11 call
  // site lupa memanggilnya sehingga tombol diam-diam tidak melakukan apa pun.
  tombolMuat: function (el, fn) {
    const labelAsli = el.textContent;
    el.disabled = true;
    el.textContent = 'Memproses…';
    return Promise.resolve()
      .then(fn)
      .catch(function (err) {
        Ui.galat(err);
      })
      .then(function (r) {
        el.disabled = false;
        el.textContent = labelAsli;
        return r;
      });
  },

  unduh: function (hasil, namaCadangan) {
    Api.unduhCsv(hasil.filename || namaCadangan || 'unduh.csv', hasil.csv || '');
    Ui.toast('Berkas CSV diunduh.', 'ok');
  },

  tema: function () {
    const t = Simpan.ambil(K.TEMA, 'auto');
    document.documentElement.dataset.tema = t === 'auto'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'gelap' : 'terang')
      : t;
  },

  gantiTema: function () {
    const sekarang = document.documentElement.dataset.tema;
    const baru = sekarang === 'gelap' ? 'terang' : 'gelap';
    document.documentElement.dataset.tema = baru;
    Simpan.simpan(K.TEMA, baru);
  }
};