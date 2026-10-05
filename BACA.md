# ASI (Absensi Siswa)

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
| Kartu | Cetak A4 satu sisi, QR Code + CODE128, foto, tanda tangan |
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

### Kalau aplikasi terasa lambat

Sumber lambat yang sudah diukur per Juli 2026:

| Penyebab | Solusi yang sudah dipasang |
| --- | --- |
| Satu panggilan API selalu 2,4–3,4 detik (biaya platform Apps Script + redirect) | Cache respons di memori 45 detik untuk semua aksi baca; berpindah halaman tidak mengambil ulang data yang sama |
| Halaman rekap memakai dua panggilan berurutan | Sekarang `Promise.all`, jadi satu kali tunggu |
| 40 siswa berarti 40 permintaan foto sekaligus | Antrean foto (maksimal 6 jalan bersamaan) + `IntersectionObserver` (foto hanya diambil saat barisnya terlihat) |
| Daftar siswa memuat semua baris sekaligus | `siswa.daftar` dipaginasi 30 baris, tombol "Muat lagi" (butuh backend build 20) |
| Halaman rekap/siswa kosong selama menunggu | Kerangka bayangan (`Ui.rangka`) tampil seketika |
| Kesalahan tidak ada jalan keluar | `Ui.pesanGalat` menyertakan tombol "Coba lagi" |
| Service worker menunggu GitHub Pages dulu | Navigasi jadi cache-first, pembaruan jalan di belakang; ada toast "Muat ulang" kalau versi baru sampai |
| Lambat tidak terukur | Halaman **Akun → Kondisi Server** menampilkan build backend, rata-rata & terakhir durasi, jumlah panggilan, hit cache, foto, dan antrean |

Kalau rata-rata di halaman Akun melonjak, salin angka itu — itu hasil
pengukuran di perangkat sendiri, bukan perkiraan.

Batas yang tidak bisa diatasi dari sisi aplikasi: 2,4 detik itu adalah harga
dasar satu permintaan ke Apps Script. Untuk melompatinya, backend harus pindah
ke hosting lain (Cloudflare Worker, VPS) — bukan dengan menulis kode lebih
cantik.

### Kartu & cetak PDF

Tombol cetak menunggu seluruh `<img>` selesai diunduh (maksimal 8 detik per
gambar) sebelum memanggil `window.print()`. Browser tidak menunggu gambar saat
dialog cetak dibuka, jadi tanpa itu foto siswa bisa hilang dari PDF. Foto yang
gagal dimuat tidak membatalkan cetak; hanya muncul toast berisi jumlahnya.

Dua jebakan CSS yang pernah membuat hasil cetak kosong:

- `body > * { display: none }` juga menyembunyikan `<main id="shell">`, dan
  `display:none` pada induk menghapus seluruh turunannya — halaman cetak jadi
  kosong meski `#hal-kartu` sudah `display:block`. Aturannya harus
  `body > *:not(#shell)`.
- `.app` ada di `#shell` itu sendiri, jadi `#hal-kartu .app` tidak pernah cocok.

Foto dimuat dengan `Api.fotoBlob()`: proxy bertoken lebih dulu
(`?action=foto&id=..&t=..`), lalu `drive.google.com/uc?export=view&id=..`
sebagai cadangan. Rantainya ada karena dua hal yang saling meniadakan:

- `<img src=".../exec?action=foto">` diam-diam gagal kalau backend membalas
  JSON error, dan hasilnya kotak kosong tanpa penjelasan.
- `fetch()` dengan `credentials: 'include'` bisa ditolak CORS, padahal
  `<img>` biasa saja tetap bisa memuat URL yang sama.

Jadi `Api.fotoSrc()` lebih dulu memakai `fetch` dan memeriksa `Content-Type`:
kalau memang gambar, hasilnya dijadikan object URL (bis dipakai ulang untuk
 cetak tanpa request ulang). Kalau ternyata JSON, pesan errornya — mis.
`AUTH: Sesi tidak ditemukan` — langsung ditampilkan sebagai tanda merah di
kotak avatar. Kalau `fetch` sendiri gagal karena CORS atau jaringan, URL
proxy dikembalikan apa adanya dan `Api.pasangFoto()` membiarkannya dicoba
sebagai gambar biasa; kalau `<img>`-nya gagal, barulah URL Drive dicoba, dan
terakhir ditandai merah.

Karena foto dimuat asinkron, `tungguGambar()` dalam `page-kartu.js` tidak
lagi menganggap `<img>` yang belum punya `src` sebagai "gagal". Ia polls
status tiap gambar sampai `load` atau `error` benar-benar terjadi, maksimal
8 detik. Tanpa ini, `window.print()` bisa terpanggil sebelum foto sempat
dimuat dan PDF keluar dengan kotak kosong. Thumbnail Drive sering ditolak saat di-hotlink dari origin PWA
sehingga muncul kotak kosong; proxy selalu milik aplikasi sendiri. Backend
menyertakan `foto_proxy` untuk semua siswa, bukan hanya saat `foto_publik` mati.

### Backend-nya belum ter-update

PWA dan backend Apps Script punya mekanisme deploy yang berbeda. PWA ikut
ter-update otomatis setiap kali ada push ke `main` (GitHub Pages), tapi
backend di URL `/exec` **tidak pernah berubah sendiri**. Kalau kamu buat
deployment baru lewat `clasp deploy`, itu membuat URL baru — URL lama tetap
menunjuk ke versi lama.

Akibatnya kamu bisa merasa sudah update aplikasi, padahal backend-nya
masih versi lama. Gejalanya tidak pernah disertai error: foto siswa tidak tampil,
pengaturan sekolah tidak tersimpan, tombol terasa mati.

Cara cek versi yang benar-benar hidup, tanpa login:

```
bash test/api-live.sh
```

Lihat `app.info`. Field `build` memberi tahu nomor build backend yang sedang
dipakai. Kalau `build` tidak ada sama sekali, berarti backend masih versi lama.
Aplikasi juga menampilkan pita kuning **"Server belum diperbarui"** di bawah
layar kalau `build` lebih kecil dari `Api.BUILD_MIN` di `web/js/api.js`, jadi
ketidakcocokan versi tidak lagi diam-diam.

Naikkan `APP.BUILD` di `gas/Config.gs` setiap kali kamu deploy backend, dan
sesuaikan `Api.BUILD_MIN` di `web/js/api.js` dengan nilai yang sama. Kalau
`BUILD_MIN` lebih besar dari build yang sedang hidup, pita peringatan akan
selalu muncul aunque kodenya sebenarnya sudah benar.

### Foto gagal dimuat: tanda merah di kotak avatar

Tanda merah `!` di dalam kotak avatar atau kotak foto kartu berarti backend
menolak permintaan foto. Arahkan kursor ke tandanya untuk melihat pesan
aslinya:

| Pesan | Artinya | Solusi |
| --- | --- | --- |
| `AUTH: Sesi tidak ditemukan` | sesi sudah habis | masuk lagi |
| `FORBIDDEN: ...` | foto siswa sekolah lain | bukan bug |
| `MEDIA: Foto tidak ditemukan` | `file_id_foto` di sheet tidak cocok dengan isi folder Drive | cek ulang ID-nya |
| `text/html` | backend membalas halaman error, bukan gambar | backend versi lama, update deployment |

`MEDIA: Foto tidak ditemukan` paling sering terjadi karena `file_id_foto`
diisi manual dengan ID yang salah, atau	ID file itu sudah dihapus. ID yang
benar bisa dilihat dari URL folder Drive: `drive.google.com/drive/folders/...`
— bukan dari `uc?export=view&id=`. Untuk memastikan, buka
`https://drive.google.com/uc?export=view&id=<file_id_foto>` di browser; kalau
fotonya muncul, berarti Drive punya file-nya.

### Foto tersimpan tapi tetap kosong

Simpan siswa sukses, toast hijau muncul, tapi fotonya tidak pernah muncul.
Penyebabnya hampir selalu **kolom `file_id_foto` tidak ada di sheet `SISWA`**.
Db dulu memetakan baris ke objek berdasarkan *posisi* kolom, jadi pada sheet
yang dibuat dari versi kode lama:

- `file_id_foto` tidak ada di header → nilainya tidak pernah ditulis, dan
  `Db.gabung_` membuang key yang tidak dikenal tanpa memberi tahu.
- Kolom setelah titik yang hilang ikut bergeser, jadi `kode_ortu` /
  `telegram_chat_id` bisa tertukar dengan kolom tetangganya.

Sekarang Db memetakan berdasarkan **nama** kolom, dan `Db.headerAktif_()`
menambahkan kolom yang kurang di ujung sheet secara otomatis saat pertama kali
dipakai — jadi spreadsheet lama tidak perlu dimanualkan dan data lama tidak
bergeser. Kalau muncul error `CONFIG: Kolom "..." tidak ada di sheet`, itu
bug kode yang harus diperbaiki di `Schema`, bukan masalah spreadsheet.

Untuk memeriksa sendiri:

```
siswa perbarui → buka sheet SISWA → kolom file_id_foto terisi?
```

### PR tertunda: foto yang lambat dan tanda merah

Status: **ditunda**, diketahui, belum dikerjakan. Bukan salah pada kode foto —
masalahnya adalah arsitektur.

#### Yang sudah diukur (Juli 2026, dari Termux ke deployment live)

| Yang diukur | Waktu |
| --- | --- |
| `app.info` (backend tidak melakukan apa-apa) | 2,0 – 2,9 detik |
| `sekolah.list` (baca 1 sheet) | 2,2 – 3,4 detik |

Artinya biaya terkecil satu panggilan API adalah ~2,4 detik dan itu **tidak
bisa dihapus**: biaya platform Apps Script ditambah redirect wajib (POST → 302 →
GET). Membaca sheet hanya menambah ~0,5 detik.

#### Dua sebab tanda merah

1. **Beban permintaan**: halaman siswa memanggil `Ui.avatar()` untuk tiap
   baris, dan tombol "Pilih semua" di halaman kartu membuat kartu untuk semua
   siswa. Dengan 40 siswa itu 40 permintaan foto sekaligus, masing-masing dua
   round-trip plus tiga baca sheet dan Drive. Server Apps Script tidak sanggup
   melayani semuanya, sebagian lewat batas waktu (itulah "Server terlalu lama
   merespons"), sebagian lagi jadi tanda merah.
2. **Cache**: tiap permintaan foto membaca sheet `SESI`, `USERS`, dan `SISWA`
   dari nol. `CacheService` tidak pernah dipakai untuk foto.

#### Yang sudah dibereskan (terdaftar 2026-07-04)

- Antrean foto membatasi 6 permintaan berjalan sekaligus
  (`Api.ANTREAN_FOTO`), sisanya menunggu giliran.
- `IntersectionObserver` bersama: foto baru diambil kalau barisnya masih dekat
  dengan layar, bukan semuanya langsung.
- `siswa.daftar` bisa dipaginasi 30 baris per halaman.
- Foto punya batas waktu 30 detik dan satu percobaan ulang.

#### Dua pilihan untuk dikerjakan nanti

| Opsi | Cara kerja | Keuntungan | Trade-off |
| --- | --- | --- | --- |
| **Link publik Drive** (sudah diizinkan) | `Media.sisipFoto_()` menyalakan berbagi `anyone-with-link`; frontend memakai `https://drive.google.com/uc?export=view&id=...` langsung, tanpa lewat Apps Script | ~200 ms per foto, tanpa server sama sekali | Perlu *backfill* untuk foto yang sudah ada; link bisa dibagikan siapa pun yang punya URL |
| **Endpoint batch** | satu permintaan mengembalikan beberapa foto sekaligus | 40 foto dalam 1 permintaan | Perlu endpoint baru + cache Drive di backend; kuota Apps Script harus diawasi |

Ukuran thumbnail (480 px, kualitas 0,7) perlu ditambahkan di kedua opsi —
saat ini foto dikirim apa adanya pada 900 px.

### Jam sekolah tampil "1899-12-30 07:00:00"

Gejalanya: di sheet jamnya benar (`07:00`), tapi di aplikasi tampil
`1899-12-30 07:00:00`. Kolom jam di halaman Pengaturan juga kosong padahal
sebenarnya ada isinya.

Penyebabnya: Google Sheets tidak punya tipe "jam" — `07:00` disimpan sebagai
pecahan hari, dan `getValues()` mengirimkannya sebagai objek `Date` beracuan
epoch `1899-12-30`. `Db.teks_()` dulu memformat setiap `Date` sebagai tanggal
penuh, jadi jam ikut jadi tanggal.

Akibatnya lebih serius daripada tampilan: `Util.jamKeMenit_()` gagal membaca
`1899-12-30 07:00:00`, sehingga batas telat dan jam buka/tutup absensi ikut
salah diam-diam.

Perbaikannya sudah ada di `Db.teks_()` (tahun di bawah 1900 diformat sebagai
`HH:mm:ss`) dan `Util.jamKeMenit_()` (menerima `HH:mm`, `HH:mm:ss`, dan
bentuk lama `1899-12-30 HH:mm:ss`). Tidak perlu mengubah data di sheet.

Kalau masih muncul, berarti deployment backend belum di-update — build yang
perlu ada di `app.info` adalah **20** atau lebih tinggi. Cek di
**Akun → Kondisi Server → Versi backend**.

### Kartu tercetak tanpa foto / cetak lambat

Kartu **tidak pernah ditahan oleh foto**. Barcode dan QR digambar dari data,
jadi walau semua foto gagal dimuat, kartu tetap tercetak dan barcode-nya tetap
bisa dipindai.

Yang terjadi di layar:

- Tombol **🖨 Cetak / Simpan PDF** hanya menunggu foto maksimal **2,5 detik**,
  lalu mencetak apa adanya. Foto yang sudah siap ikut tercetak.
- Foto yang belum siap disembunyikan (bukan dihapus) memakai kelas
  `.cetak-sembunyi`, dan tanda `!` disembunyikan hanya untuk pencetakan lewat
  `@media print` di `web/css/app.css`. Foto itu tetap ada di DOM, jadi
  **mencetak kedua** bisa memakainya begitu fotonya tiba.
- Notifikasi tidak merah — hanya info: _"N foto belum siap, kartu dicetak
  tanpa foto. Cetak lagi nanti untuk lengkapi."_

Kalau memang mau menunggu semua foto (kelas kecil atau jaringan bagus),
centang **"Tunggu semua foto (lambat)"** — batasnya 60 detik, bukan 2,5 detik.
Kalau timeout juga, kartu tetap tercetak.

Memilih kelas yang berbeda membangun ulang kartu, jadi foto dimuat ulang.

### Kartu tidak tampil, cuma "Terjadi kesalahan."

Gejalanya: daftar siswa kosong dan yang muncul cuma pesan galat satu baris.
Itu bukan masalah backend — `siswa.kartu` normalnya tidak pernah gagal
sepenuhnya tanpa jejak.

Penyebabnya satu data siswa yang tidak bisa jadi teks (mis. `nama` berisi
objek atau `null` yang dipaksa jadi string). Satu siswa seperti itu membuat
seluruh halaman gagal dibangun, jadi **semua** kartu hilang.

Sekarang sudah dibatasi:

- Setiap kartu dan setiap baris daftar dibangun di dalam try/catch, jadi satu
  siswa rusak tidak lagi menghapus kartu siswa lain.
- Siswa yang gagal tampil ditandai "Satu siswa gagal ditampilkan" +
  `console.error` berisi nama/id dan error aslinya.
- `Api.kelasGalat` tidak lagi jatuh ke teks "Terjadi kesalahan." polos.
  Sekarang `err.message`, `err.kode`, atau `err.nama` ikut ditampilkan, jadi
  penyebabnya kelihatan.
- Kalau pemuatan data gagal, daftar siswa yang sudah ada tidak dihapus lagi;
  pesan error ditambahkan di bawahnya, lengkap dengan tombol **Coba lagi**.

Kalau masih muncul, buka **konsol browser** (Chrome Android: menu ⋮ →
"Inspect" / "Periksa") dan cari baris merah. Baris baru `Kartu gagal dibuat
untuk siswa #<id>` atau `Baris siswa gagal dibuat`. Kirimkan isi baris itu —
itu menunjukkan data siswa mana yang bermasalah.

### Kalau kartu keluar dengan kotak foto kosong

Itu normal kalau foto belum selesai: yang tampil cuma nama, NIS, dan barcode.
 Supaya foto ikut tercetak:

1._centang **"Tunggu semua foto (lambat)"**, lalu cetak ulang.
2. Tunggu sampai kartu di layar tampil dengan foto (tanda `!` hilang).
3. Cetak ulang.

Kalau tetap kosong setelah itu, foto memang gagal diambil dari backend — bukan
masalah pencetakan. Cek **Akun → Kondisi Server**: `proxy.foto` dan `proxy.foto.blob`
kalau ada datanya, berarti masalahnya di sisi browser (cache lama, atau `Api.fotoSrc`
gagal). Muat ulang paksa PWA dulu.

Kode yang relevan:

- `Ui.tungguFotoCetak` / `Ui.sembunyikanFotoBelumSiap` / `Ui.pulihkanFotoCetak`
  di `web/js/ui.js` — logika pencetakan, sengaja dipisah agar bisa diuji tanpa
  membuka dialog print.
- `web/js/page-kartu.js` — batas 2,5 detik vs 60 detik dan pemanggilan `window.print()`.

### Pita kuning "Server belum diperbarui"

Pita itu muncul di **atas** layar, sebelum topbar, dan hanya mendorong
konten ke bawah — tidak menutupi navigation bawah maupun tombol
apa pun. Teksnya ringkas; tekan **Detail** untuk melihat langkah perbaikannya.

Pita ini muncul kalau `app.info` melaporkan build yang lebih lama dari
`Api.BUILD_MIN` di `web/js/api.js`. Sementara itu build di `gas/Config.gs`
(`APP.BUILD`) harus diubah **bersamaan** dengan `BUILD_MIN`, kalau tidak
semua pengguna melihat pita ini tanpa alasan.

Kalau pita muncul padahal backend sudah di-update, muat ulang paksa
(tarik-ke-bawah atau tutup lalu buka browser) — service worker masih
menyimpan JavaScript lama.

### Tombol yang "tidak terjadi apa-apa"

`Ui.tombolMuat(el, fn)` menjalankan `fn()` **langsung** dan mengembalikan
promise-nya. Versi lama mengembalikan thunk yang harus dipanggil manual, dan
9 dari 11 call site melewatkannya — tombol Simpan pengaturan sekolah, setujui
guru, ganti role, tes Telegram, kirim ulang notifikasi, dan ganti sekolah aktif
semuanya diam-diam tidak melakukan apa pun. Kalau sebuah tombol tiba-tiba tidak
bereaksi, periksa dulu apakah `fn`-nya benar-benar dipanggil.

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

Untuk menguatkan webhook, set Script Property `TELEGRAM_WEBHOOK_SECRET`.

### WhatsApp (opsional, belum aktif)

`Notif.girimWhatsApp_` sudah tersedia sebagai adapter, tetapi tidak dipakai sampai
token Meta Cloud API dan template pesan disetujui. Isi `wa_aktif`, `wa_phone_id`,
`wa_token`, `wa_template` di sheet `SEKOLAH` setelah Meta menyetujui.

## 6. Alur kerja harian

1. **Data awal** — impor siswa lewat **Siswa → Impor CSV** (unduh template
   lebih dulu). Pastikan kolom `nama` dan `kelas` terisi; barcode dan kode orang
   tua dibuat otomatis bila kosong.
2. **Cetak kartu** — **Kartu Siswa** → pilih kelas → centang siswa → **Cetak**.
   Satu kartu satu sisi: foto, identitas, QR, barcode, dan kolom tanda tangan
   semuanya di satu kartu 63×88 mm.
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
| `curl` ke `/exec` membalas HTML "Halaman Tidak Ditemukan" | `/exec` membalas 302 ke URL `script.googleusercontent.com/macros/echo` yang hanya berlaku sekali **dan terikat cookie**. Jangan `curl -L`; POST sekali untuk menangkap redirect, lalu GET dengan cookie jar yang sama. `test/api-live.sh` sudah mengurus keduanya. Browser tidak terpengaruh karena cookie dikirim otomatis |
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

### Cara memastikan PWA sudah versi terbaru

Menu **Akun Saya → Tampilan** menulis versi aset apa adanya, misalnya
`1.0.0 · absensi-v4`. Angka itu dibaca langsung dari Cache Storage, jadi
pasti sama dengan file yang sedang dipakai perangkat — bukan angka yang
ditulis manual di dalam kode dan bisa basi.

Kalau versinya masih yang lama:

1. Buka **Akun Saya**, tekan **🔄 Periksa Pembaruan**.
2. Tekan **Muat ulang** bila muncul notifikasi versi baru.
3.Tombol **🗑 Hapus Cache** masih ada sebagai jalan terakhir, setelah itu
   aplikasi harus dimuat ulang.

