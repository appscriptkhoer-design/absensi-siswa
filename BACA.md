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
| `SPREADSHEET_ID` | `1jH7LOz6...` | Wajib bila proyek tidak *bound* ke spreadsheet |
| `OWNER_EMAIL` | `guru@sekolah.sch.id` | **Wajib.** Email admin yang akan dibuatkan akun |
| `TELEGRAM_TOKEN` | `123456:AAF...` | Dari @BotFather, opsional |
| `TELEGRAM_WEBHOOK_SECRET` | `rahasia-panjang` | Opsional, untuk verifikasi webhook |

Isi `OWNER_EMAIL` dan `SPREADSHEET_ID` lebih dulu, karena `pasangAdmin()`
membaca keduanya dari Script Properties.

### 3.3b Hubungkan spreadsheet yang sudah ada

Bila spreadsheet sudah dibuat lebih dulu dan proyek Apps Script **tidak**
terikat padanya (dibuat lewat <https://script.google.com>, bukan lewat
*Extensions → Apps Script*), cukup isi Script Property `SPREADSHEET_ID` dengan
ID spreadsheet tersebut.

Alternatifnya, jalankan `setSpreadsheetId('ID_SPREADSHEET')` dari editor. Fungsi
ini memverifikasi bahwa spreadsheet bisa dibuka oleh akun ini, lalu
menyimpannya sebagai Script Property `SPREADSHEET_ID`. Kalau proyek sudah
*bound*, langkah ini tidak perlu — `setupSpreadsheet()` otomatis memakai
spreadsheet yang terikat.

### 3.4 Inisialisasi (satu kali jalan)

Di editor Apps Script, pilih fungsi **`pasangAdmin`** → **Run** sekali. Ikuti
izinkan yang muncul. Fungsi ini menampilkan dialog dan melakukan semuanya:

1. membuat spreadsheet, sheet, format header, folder foto, dan `API_SALT`
2. membuat akun `superadmin` dari `OWNER_EMAIL`
3. membuat sekolah pertama beserta titik geofence

Isi dialog yang muncul:

| Dialog | Isi |
| --- | --- |
| Password admin | Kosongkan untuk dibuatkan otomatis (`Adm-xxxxxxxxxx`) |
| Nama sekolah pertama | Contoh: `SDN Contoh 01` |
| Kode sekolah | 3-6 huruf/angka tanpa spasi, dipakai untuk kode absen |
| Latitude / Longitude | Titik pusat sekolah, contoh `-6.200000` / `106.816666` |
| Radius geofence | Dalam meter, minimal 20 |

Buka menu **Executions** untuk melihat `Logger.log` berisi username, password,
`SPREADSHEET_ID`, `SPREADSHEET_URL`, dan id sekolah. **Salin password dari
sana**, karena tidak ditampilkan lagi di mana pun.

Fungsi ini aman dijalankan berulang: sheet yang sudah ada tidak dihapus,
akun admin yang sudah ada hanya diperbarui passwordnya, dan sekolah pertama
tidak dibuat dua kali.

Fungsi terpisah `setupSpreadsheet()`, `seedOwner()`, dan
`buatSekolahPertama()` tetap tersedia bila perlu menjalankan tiap tahap
secara manual.

> **Penting:** login pertama harus memakai akun yang emailnya tercatat sebagai
> `superadmin` (dari `OWNER_EMAIL`). Akun lain yang mendaftar mandiri otomatis
> menjadi `guru` berstatus `pending` dan harus disetujui admin sekolah dari
> halaman **Administrasi → Pengguna**.

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

Menu **Atur** di navbar bawah (atau **Akun → Pengaturan**). Tab *Koneksi
Server* menyimpan URL Web App; isinya boleh berupa URL lengkap yang berakhiran
`/exec`, bagian `/exec` dilepas otomatis sehingga alamatnya tidak menjadi
`/exec/exec`. Kartu *Data Sekolah* hanya muncul bila sudah masuk sebagai admin
sekolah atau super admin, karena backend menolak perubahan school setting dari
role lain.

Yang bisa diubah:

- Jam masuk, batas telat (menit), jam pulang.
- Latitude, longitude, dan radius absen (meter). Ambil koordinat dari Google Maps
  dengan klik lokasi sekolah → salin angka *Latitude* / *Longitude*.
- **Foto siswa publik**: biarkan mati agar foto hanya diakses lewat URL
  bertoken yang berlaku 30 hari. Saat mati, kolom `foto` kosong dan PWA memakai
  `foto_proxy` (`/exec?action=foto&id=<fileId>&t=<token>`) yang dilayani
  `doGet`. Response-nya dikirim sebagai `Byte[]` mentah dengan
  `Content-Type` asli, jadi jangan diubah menjadi teks.

Menu **Administrasi → Sekolah** (tab *Sekolah*, sudah terbuka juga untuk role
admin) menampilkan form yang sama dan ditautkan dari halaman Pengaturan.

Cara kerja radius GPS:

- Radius hanya diperiksa bila koordinat sekolah **dan** koordinat HP sama-sama
  tersedia. Absen yang mengirim lokasi di luar radius ditolak dengan pesan
  "Anda berada … m dari …" dan tidak tercatat sama sekali.
- Bila HP tidak berhasil mengambil GPS (izin ditolak atau sinyal lemah),
  absensi tetap dicatat tanpa koordinat dan kolom `jarak_m` kosong. Ini
  disengaja agar absen tidak hilang total; Radius 0 berarti geofence dimatikan.
- Absen manual oleh admin/guru tidak pernah tunduk pada radius, karena operator
  sudah berada di depan siswa.

### Kartu & cetak PDF

Tombol cetak menunggu seluruh `<img>` selesai diunduh (maksimal 8 detik per
gambar) sebelum memanggil `window.print()`. Browser tidak menunggu gambar saat
dialog cetak dibuka, jadi tanpa itu foto siswa bisa hilang dari PDF. Foto yang
gagal dimuat tidak membatalkan cetak; hanya muncul toast berisi jumlahnya.

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
| `Password lama salah` | Password admin awal dibuat oleh `pasangAdmin()`; jalankan `pasangAdmin` lagi (kosongkan dialog password) atau ganti lewat sheet `USERS` dengan baris baru |
| `OWNER_EMAIL belum diisi` | Buka *Project Settings → Script Properties*, tambahkan `OWNER_EMAIL` dengan email admin Anda, lalu jalankan `pasangAdmin` |
| `Specified permissions are not sufficient to call Session.getEffectiveUser` | Jangan rely pada email akun. Isi Script Property `OWNER_EMAIL`; kode sudah tidak memakai `Session.getEffectiveUser()` sehingga tidak butuh scope `userinfo.email` |
| `deleteSheet is not a function` saat setup | Sudah diperbaiki di versi terbaru. Jalankan *Deploy → Manage deployments →* pensil → *Version: New version* agar deployment memakai kode baru |
| `The parameters (number[],String,Utilities.Charset) don't match` | `computeHmacSha256Signature` mengembalikan `Byte[]`, harus di-encode ulang tiap iterasi. Sudah diperbaiki; cukup *Version: New version* |
| Login ditolak padahal password benar | Password di-hash dengan `API_SALT`. Kalau `API_SALT` berubah, semua hash lama tidak valid — jangan dihapus Script Property `API_SALT` setelah setup |
| Semua siswa `belum` di rekap | Absensi dicatat pada tanggal berbeda; pastikan zona waktu proyek = Asia/Jakarta |
| Halaman kosong setelah update | `clasp push` selesai tetapi deployment belum "New version", atau cache service worker — buka **Akun → Hapus Cache** |
| Kamera tidak bisa dibuka | Aplikasi harus berada di origin HTTPS; `file://` dan HTTP tidak diizinkan browser |
| GPS "jauh dari lokasi sekolah" | Koordinat sekolah terbalik (latitude di kolom longitude) atau radius terlalu kecil |

### Uji otomatis lokal

```bash
bash test/checkall.sh        # sintaks gas/*.gs + web/js/*.js + JSON + 2 simulator
node test/gas-sim.js         # simulator backend saja
node test/web-sim.js         # simulator frontend saja
```

`test/web-sim.js` menjalankan `api.js`, `ui.js`, `app.js`, dan `page-setelan.js`
di atas DOM tiruan (tanpa browser, tanpa jaringan) untuk mengunci regresi
navbar: `render()` dan `gambarUlang()` harus menyisipkan tepat satu node
`.navbawah`, memindahkannya bukan menggandakan, dan route `#/pengaturan`
harus selalu punya navbar meski belum ada URL API.

`test/gas-sim.js` menyalin seluruh `gas/*.gs` ke sandbox Node (Spreadsheet,
Lock, Properties, Utilities, dan Drive direplika), lalu menjalankan 130
pemeriksaan:
bootstrap spreadsheet, seed owner, persetujuan guru, lockout, isolasi antar
sekolah, regresi patch baris, absensi + geofence, rekap harian/bulanan, CSV
harian & bulanan, dashboard, logout, migrasi sheet SISWA lama, penghapusan
sheet bawaan, `pasangAdmin` end-to-end, dan penanganan `Byte[]` pada HMAM serta
base64. Semua harus keluar `OK`. Tidak ada jaringan, tidak ada Sheet
sungguhan.

> Stub simulator sengaja dibuat sedekat mungkin dengan API asli, termasuk
> `computeHmacSha256Signature` yang mengembalikan `Byte[]` bertanda dan
> hanya menerima dua overload `(String, String)` dan
> `(String, String, Charset)`. Stub yang terlalu longgar pernah menyembunyikan
> bug produksi. Contoh terbaru: `ContentService.createTextOutput()` melempar
> `TypeError` bila diberi Blob — itulah yang membuat bug foto yang dulu
> mengirim `[object Object]` langsung gagal di simulator, bukan lolos ke
> produksi.

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
