# Absensi Siswa — PAUD & SD

Aplikasi absensi berbasis **Google Apps Script + PWA**. Data di Google Sheets, foto di
Google Drive, API hosted di Apps Script, antarmuka berupa PWA statis (bisa dipasang di
HP Android).

```
absensi-siswa/
├── .clasp.json              # konfigurasi push/pull (rootDir = gas)
├── BACA.md                  # dokumen ini
├── gas/                     # 13 file backend (.gs) + appsscript.json
├── test/                    # checkall.sh + gas-sim.js — uji backend tanpa GAS
└── web/                     # PWA statis (index.html + css + js + icons)
```

## 1. Yang sudah ada

| Area | Isi |
| --- | --- |
| Autentikasi | Daftar mandiri, login, persetujuan admin, peran `superadmin` / `admin` / `guru`, kunci 15 menit setelah 5× gagal, ganti password |
| Sesi | Token acak 32 byte, hash SHA-256 di sheet `SESI`, berlaku 30 hari, diperpanjang setiap 7 hari |
| Multi-sekolah | Sheet `SEKOLAH` + `sekolah_id` di semua tabel data, superadmin dapat berganti sekolah |
| Absensi | Scan QR/barcode, absen manual, tipe `masuk` / `pulang`, status `hadir` / `telat` / `izin` / `sakit` / `alpha`, cutoff jam, radius GPS |
| Siswa | CRUD, impor CSV, ekspor CSV, template CSV, barcode `CODE128`, kode ortu 6 karakter, foto Drive, aktif/nonaktif |
| Kartu | Cetak A4 satu sisi atau dua sisi, QR Code + CODE128, foto, tanda tangan |
| Rekap | Harian per siswa, bulanan (kalender + tabel + peta hari per siswa), CSV rekap harian, CSV bulanan bermatrix 1–31, CSV absensi mentah |
| Notifikasi | Telegram Bot (aktif), WhatsApp Cloud API (adapter, nonaktif), log riwayat + kirim ulang |
| Antarmuka | Neo-Brutalism, dark mode, bahasa Indonesia, Android-first, PWA + service worker |

## 2. Prasyarat

- Akun Google dengan Hak Akses Apps Script dan Drive.
- Node.js hanya bila ingin memakai `clasp` (opsional — bisa juga menyalin file manual).
- Bot Telegram (opsional, untuk notifikasi orang tua).

## 3. Deploy backend Apps Script

### 3.1 Buat proyek

1. Buka <https://script.google.com> → **New project**.
2. Ganti nama proyek, misalnya `Absensi Siswa API`.
3. **Project Settings** → aktifkan *Show "appsscript.json" manifest file in editor*.

### 3.2 Unggah backend

**Cara A — pakai `clasp` (disarankan)**

```bash
cd ~/absensi-siswa
clasp login
```

Salin **Script ID** dari *Project Settings → Script ID*, lalu edit `.clasp.json`:

```json
{ "scriptId": "1a2B3c4D5e6F7g8H9i0J", "rootDir": "gas" }
```

Lalu:

```bash
clasp push          # kirim gas/*.gs + appsscript.json
```

Karena `.clasp.json` memakai `"rootDir": "gas"`, manifest **wajib** diletakkan
di `gas/appsscript.json` — bukan di root proyek. Kalau manifest tertinggal di
root, `clasp push` akan gagal dengan pesan manifest tidak ditemukan.

**Cara B — manual**

1. Di Editor Apps Script, *Project Settings* → aktifkan *Show "appsscript.json"
   manifest file in editor*.
2. Salin seluruh isi `gas/*.gs` ke editor dengan nama berkas sama
   (mis. `Api.gs`).
3. Salin isi `gas/appsscript.json` ke manifest editor agar timezone
   `Asia/Jakarta` dan OAuth scope ikut benar.

### 3.3 Set Script Properties

*Project Settings → Script Properties*:

| Kunci | Contoh | Keterangan |
| --- | --- | --- |
| `API_SALT` | (biarkan kosong) | Diisi otomatis oleh `setupSpreadsheet()` |
| `OWNER_EMAIL` | `guru@sekolah.sch.id` | Wajib jika email akun tidak terbaca |
| `TELEGRAM_TOKEN` | `123456:AAF...` | Dari @BotFather, opsional |
| `TELEGRAM_WEBHOOK_SECRET` | `rahasia-panjang` | Opsional, untuk verifikasi webhook |

### 3.3b Hubungkan spreadsheet yang sudah ada

Bila spreadsheet sudah dibuat lebih dulu dan proyek Apps Script **tidak**
terikat padanya (dibuat lewat <https://script.google.com>, bukan lewat
*Extensions → Apps Script*), jalankan fungsi ini sekali dari editor:

```js
setSpreadsheetId('1jH7LOz6ql3xEWPtkjE3YyIA6bu2IFEbvHJydNB5ZrKQ');
```

Fungsi ini memverifikasi bahwa spreadsheet bisa dibuka oleh akun ini, lalu
menyimpannya sebagai Script Property `SPREADSHEET_ID`. Kalau proyek sudah
*bound*, fungsi ini tidak perlu dijalankan — `setupSpreadsheet()` otomatis
memakai spreadsheet yang terikat.

### 3.4 Inisialisasi

Di editor Apps Script, pilih fungsi `setupSpreadsheet` → **Run** sekali. Ikuti
izinkan yang muncul. Fungsi ini membuat spreadsheet, sheet, format header,
folder foto, dan `API_SALT`.

Kemudian jalankan `seedOwner` (opsional bila ingin login pertama tanpa daftar
mandiri) dan/atau `buatSekolahPertama`:

```js
seedOwner('PasswordOwnerYangKuat123');
buatSekolahPertama('SDN Contoh 01', 'SCH01', -6.2, 106.816666, 150, 'gurucontoh', 'PasswordOwnerYangKuat123');
```

Buka menu **Executions** untuk melihat `Logger.log` berisi username, password,
`SPREADSHEET_ID`, dan `SPREADSHEET_URL`.

> **Penting:** login pertama harus memakai akun yang emailnya tercatat sebagai
> `superadmin` (dari `OWNER_EMAIL` atau email pemilik proyek). Akun lain yang
> mendaftar mandiri otomatis menjadi `guru` berstatus `pending` dan harus
> disetujui admin sekolah dari halaman **Administrasi → Pengguna**.

### 3.5 Deploy sebagai Web App

**Deploy → New deployment → Web app**

| Opsi | Nilai |
| --- | --- |
| Description | `absensi v1` |
| Execute as | **Me** |
| Who has access | **Anyone** |

Salin URL yang berakhiran `/exec`.

> Akses **Anyone** + *Execute as Me* wajib agar permintaan `POST` dari origin
> PWA tidak terkena CORS. Client memakai `Content-Type: text/plain;charset=utf-8`
> sehingga tidak mengirim preflight OPTIONS.

Setiap kali `gas/*.gs` diubah, buat versi deployment baru (**Deploy → Manage
deployments → Edit → Version: New version**) karena `clasp push` saja tidak
memperbarui deployment.

## 4. Hosting PWA

Folder `web/` harus disajikan lewat **HTTPS**. Pilihan gratis:

- **Netlify Drop** — <https://app.netlify.com/drop>, serahkan isi `web/`.
- **GitHub Pages** — pushes `web/` ke branch, aktifkan Pages.
- **Cloudflare Pages** — langsung dari repo.

Buka URL hasilnya, lalu:

1. Buka **Pengaturan** (ikon ⚙ saat URL API masih kosong).
2. Tempel URL `/exec` Apps Script → **Simpan & Uji**.
3. Masuk memakai akun `superadmin`.
4. Chrome Android: menu ⋮ → **Add to Home screen** / **Install app**.

## 5. Konfigurasi sekolah

Menu **Administrasi → Sekolah**:

- Jam masuk, batas telat (menit), jam pulang.
- Latitude, longitude, dan radius absen (meter). Ambil koordinat dari Google Maps
  dengan klik lokasi sekolah → salin angka *Latitude* / *Longitude*.
- **Foto siswa publik**: biarkan mati agar foto hanya diakses lewat URL
  bertoken yang berlaku 30 hari.

Cara kerja radius GPS:

- Radius hanya diperiksa bila koordinat sekolah **dan** koordinat HP sama-sama
  tersedia. Absen yang mengirim lokasi di luar radius ditolak dengan pesan
  "Anda berada … m dari …" dan tidak tercatat sama sekali.
- Bila HP tidak berhasil mengambil GPS (izin ditolak atau sinyal lemah),
  absensi tetap dicatat tanpa koordinat dan kolom `jarak_m` kosong. Ini
  disengaja agar absen tidak hilang total; Radius 0 berarti geofence dimatikan.
- Absen manual oleh admin/guru tidak pernah tunduk pada radius, karena operator
  sudah berada di depan siswa.

### Telegram (opsional)

1. Buat bot lewat [@BotFather](https://t.me/BotFather), salin token.
2. Simpan sebagai Script Property `TELEGRAM_TOKEN`, atau jalankan
   `aturTelegramToken('123456:AAF...')`.
3. Daftarkan webhook:

```js
setTelegramWebhook('https://script.google.com/macros/s/DEPLOYMENT_ID/exec');
```

4. Orang tua mengirim `/start KODEORTU` ke bot. `Notif.webhook_` dipanggil
   dari `doPost` (payload `update_id`), memverifikasi kode, lalu mengisi
   `telegram_chat_id` siswa secara otomatis.
5. Uji dari **Administrasi → Notifikasi → Kirim Pesan Tes**.

Untuk，加强对 webhook, set Script Property `TELEGRAM_WEBHOOK_SECRET`.

### WhatsApp (opsional, belum aktif)

`Notif.girimWhatsApp_` sudah tersedia sebagai adapter, tetapi tidak dipakai sampai
token Meta Cloud API dan template pesan disetujui. Isi `wa_aktif`, `wa_phone_id`,
`wa_token`, `wa_template` di sheet `SEKOLAH` setelah Meta menyetujui.

## 6. Alur kerja harian

1. **Data awal** — impor siswa lewat **Siswa → Impor CSV** (unduh template
   lebih dulu). Pastikan kolom `nama` dan `kelas` terisi; barcode dan kode orang
   tua dibuat otomatis bila kosong.
2. **Cetak kartu** — **Kartu Siswa** → pilih kelas → centang siswa → **Cetak**.
   Cetak dua sisi bila printer mendukung; sisi belakang berisi QR.
3. **Absen** — **Scan** → izinkan kamera & lokasi → pindai kartu. Status otomatis
   `hadir` atau `telat` bila melewati batas telat. Absen pulang memakai tombol
   tipe pada halaman scan.
4. **Koreksi** — untuk izin/sakit/alpha gunakan **Absen Manual**, bukan edit
   catatan lama, supaya log tetap konsisten.
5. **Rekap** — harian untuk daftar absen, bulanan untuk kalender dan tabel
   per siswa. Unduh CSV untuk keperluan administrasi.

## 7. Pemecahan Masalah

| Gejala | Penyebab & solusi |
| --- | --- |
| `URL API belum diatur` | Buka **Pengaturan**, tempel URL `/exec` |
| `Terjadi kesalahan di server` (kode `SERVER`) | Buka **Executions** di Apps Script untuk melihat stack trace |
| `Akses Ditolak` | Rute `#/admin` hanya untuk `superadmin` dan `admin` |
| `Password lama salah` | Password admin awal dibuat oleh `seedOwner()`; ganti lewat sheet `USERS` dengan baris baru, atau jalankan `seedOwner` lagi |
| Semua siswa `belum` di rekap | Absensi dicatat pada tanggal berbeda; pastikan zona waktu proyek = Asia/Jakarta |
| Halaman kosong setelah update | `clasp push` selesai tetapi deployment belum "New version", atau cache service worker — buka **Akun → Hapus Cache** |
| Kamera tidak bisa dibuka | Aplikasi harus berada di origin HTTPS; `file://` dan HTTP tidak diizinkan browser |
| GPS "jauh dari lokasi sekolah" | Koordinat sekolah terbalik (latitude di kolom longitude) atau radius terlalu kecil |

### Uji otomatis lokal

```bash
bash test/checkall.sh     # sintaks gas/*.gs + web/js/*.js + JSON + simulator
node test/gas-sim.js      # atau simulator saja
```

Script ini menyalin seluruh `gas/*.gs` ke sandbox Node (Spreadsheet, Lock,
Properties, dan Utilities direplika), lalu menjalankan 82 pemeriksaan: bootstrap
spreadsheet, seed owner, persetujuan guru, lockout, isolasi antar sekolah,
regresi patch baris, absensi + geofence, rekap harian/bulanan, CSV harian &
bulanan, dashboard, logout, dan migrasi sheet SISWA lama. Semua harus keluar
`OK`. Tidak ada jaringan, tidak ada Sheet sungguhan.

Jalankan ulang `setupSpreadsheet()` aman pada spreadsheet lama: bila sheet
`SISWA` belum punya kolom `sekolah_id`, kolom itu disisipkan di posisi kedua dan
diisi dengan id sekolah pertama.

## 8. Perintah pengembangan

```bash
# Periksa sintaks backend + frontend, JSON, lalu jalankan simulator
bash test/checkall.sh

# Sinkronkan backend ke Apps Script
clasp push

# Lokal uji frontend tanpa backend
cd ~/absensi-siswa/web && python3 -m http.server 8080
```

## 9. Batasan yang perlu diketahui

- Google Sheets dibatasi 10 juta sel per file; cukup untuk sekolah kecil-menengah.
- `Db` memakai cache in-memory per eksekusi; setelah data berubah dari luar
  (mis. diedit manual di Sheets), muat ulang aplikasi.
- Foto disimpan penuh di Drive dan dikirim sebagai base64; batas unggah
  `MAX_UPLOAD_BA64` = ±4,5 MB per foto.
- Menggambar banyak kartu sekaligus bisa berat di HP kelas Entry; cetak per kelas bila perlu.
- Bebas dipakai dan dimodifikasi untuk kebutuhan sekolah masing-masing.
