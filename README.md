# Absensi Siswa — PWA

Aplikasi absensi siswa PAUD/SD. Antarmuka PWA statis di folder [`web/`](web/),
dipasang ke Home Screen Android dan berjalan di atas backend Google Apps Script.

## Isi repo ini

Hanya PWA. Folder `web/` adalah satu-satunya yang dipublikasikan sebagai
GitHub Pages.

| Path | Keterangan |
| --- | --- |
| `web/index.html` | Shell aplikasi |
| `web/js/` | Modul halaman (`api`, `ui`, `app`, `page-*`) |
| `web/css/` | Tema Neo-Brutalism + dark mode |
| `web/icons/` | Ikon PWA (SVG + PNG) |
| `web/sw.js` | Service worker, cache statis saja |
| `web/manifest.webmanifest` | Manifest PWA |
| [`BACA.md`](BACA.md) | Panduan lengkap: deploy backend, konfigurasi, alur harian |

Kode backend (`gas/*.gs`) sengaja tidak ada di repo ini dan di-`gitignore`.
Backend di-*deploy* terpisah ke Google Apps Script.

## Menjalankan PWA

```bash
cd web && python3 -m http.server 8080
```

Membuka lewat `http://localhost:8080` bisa dipakai untuk mencoba antarmuka,
tapi **kamera dan GPS tidak akan aktif** — keduanya hanya bisa dipakai di
origin HTTPS.

## Menyunting

Pages memakai GitHub Actions: setiap push ke `main` mem-*deploy* ulang folder
`web/`.

**Naikkan `VERSI` di `web/sw.js` setiap rilis.** Kalau tidak, perangkat yang
sudah memakai aplikasi akan tetap dilayani dari cache service worker yang lama.

## Lisensi

MIT.
