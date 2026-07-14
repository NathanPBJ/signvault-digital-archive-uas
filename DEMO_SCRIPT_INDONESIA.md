# Script Demo Website SignVault

Durasi target: **15-18 menit**  
Bahasa: **Indonesia**  
Topik: **Sistem Pengarsipan Dokumen Akademik/Legal Berbasis Digital Signature**  
Mata kuliah: **Keamanan Data dan Jaringan**

## Persiapan Sebelum Demo

Jalankan backend:

```powershell
cd "C:\Users\adien\Documents\KEDAJAR UAS\backend"
& "C:\Users\adien\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" app.py
```

Jalankan frontend:

```powershell
cd "C:\Users\adien\Documents\KEDAJAR UAS\frontend"
npm.cmd run dev
```

Buka website:

```text
http://127.0.0.1:5173
```

Siapkan 2 file demo:

1. `dokumen-asli.txt`

```text
SURAT KETERANGAN AKTIF KULIAH
Nama: Andi Pratama
NIM: 22123456
Status: Aktif
Semester: 6
```

2. `dokumen-palsu.txt`

```text
SURAT KETERANGAN AKTIF KULIAH
Nama: Andi Pratama
NIM: 22123456
Status: Lulus
Semester: 6
```

Perbedaannya hanya pada bagian `Status`, supaya saat verifikasi terlihat jelas bahwa perubahan kecil saja bisa membuat signature gagal.

---

## 0:00 - 1:00 | Pembukaan

Selamat pagi/siang, Bapak/Ibu dosen dan teman-teman.  
Pada kesempatan ini saya akan mendemonstrasikan project untuk mata kuliah **Keamanan Data dan Jaringan**, yaitu:

**Sistem Pengarsipan Dokumen Akademik atau Legal Berbasis Digital Signature.**

Nama aplikasinya adalah **SignVault**.

Tujuan utama aplikasi ini adalah membantu proses pengarsipan dokumen agar dokumen tidak mudah dipalsukan atau dimanipulasi. Sistem ini tidak hanya menyimpan file, tetapi juga membuat **hash SHA-256** dan **digital signature RSA-PSS** untuk membuktikan keaslian dokumen.

Jadi, jika isi dokumen berubah sedikit saja, sistem bisa mendeteksi bahwa dokumen tersebut sudah tidak sama dengan dokumen asli yang pernah ditandatangani.

---

## 1:00 - 2:30 | Latar Belakang Masalah

Sebelum masuk ke demo, saya jelaskan dulu masalah yang ingin diselesaikan.

Dalam lingkungan akademik maupun legal, banyak dokumen penting yang sering digunakan, misalnya:

- Surat keterangan aktif kuliah
- Transkrip nilai
- Sertifikat
- Surat perjanjian
- Kontrak
- Surat resmi institusi

Masalahnya, dokumen digital seperti PDF, DOCX, gambar, atau file teks bisa dengan mudah disalin dan diedit. Seseorang bisa saja mengubah status mahasiswa, nilai, tanggal, nama, atau isi kontrak.

Kalau sistem hanya menyimpan file biasa, maka akan sulit memastikan apakah file tersebut masih asli atau sudah dimanipulasi.

Karena itu, project ini menggunakan konsep keamanan data:

- **Integrity**, untuk memastikan isi dokumen tidak berubah.
- **Authentication**, untuk memastikan dokumen ditandatangani oleh pihak yang benar.
- **Non-repudiation**, agar pihak penandatangan tidak mudah menyangkal bahwa dokumen tersebut pernah ditandatangani.

---

## 2:30 - 4:00 | Konsep Digital Signature

Pada sistem ini, digital signature tidak berarti tanda tangan gambar seperti paraf atau tanda tangan scan.

Digital signature di sini adalah proses kriptografi.

Alurnya seperti ini:

Pertama, dokumen yang diupload akan dihitung nilai hash-nya menggunakan **SHA-256**. Hash ini adalah sidik jari digital dari dokumen. Jika isi file berubah satu karakter saja, maka hash-nya akan berubah total.

Kedua, hash tersebut ditandatangani menggunakan **private key RSA**. Hasilnya adalah digital signature.

Ketiga, saat dokumen ingin diverifikasi, sistem menghitung ulang hash dari file yang diupload, lalu memeriksa signature menggunakan **public key**.

Jika hash cocok dan signature valid, berarti dokumen masih asli.  
Jika hash berbeda atau signature tidak valid, berarti dokumen sudah berubah atau bukan dokumen yang sama.

---

## 4:00 - 5:00 | Arsitektur Sistem

Sekarang saya jelaskan arsitektur aplikasinya.

Aplikasi ini terdiri dari dua bagian:

Pertama, **backend Python**. Backend bertugas untuk:

- Menerima upload dokumen
- Membuat hash SHA-256
- Membuat digital signature RSA-PSS
- Menyimpan metadata dokumen ke SQLite
- Menyimpan file arsip
- Melakukan proses verifikasi

Kedua, **frontend React**. Frontend bertugas sebagai tampilan website agar user bisa:

- Mengisi data dokumen
- Upload file
- Melihat daftar arsip
- Memverifikasi file
- Melihat hasil valid atau manipulasi

Database yang digunakan adalah **SQLite**, karena cukup ringan untuk project demo dan cocok untuk sistem arsip sederhana.

---

## 5:00 - 6:30 | Tampilan Awal Website

Sekarang saya buka websitenya di browser.

**Aksi demo:** buka `http://127.0.0.1:5173`.

Di halaman awal, kita bisa melihat tampilan SignVault. Desainnya dibuat sederhana dan dominan putih, karena sistem ini ditujukan untuk dokumen resmi, jadi tampilannya dibuat lebih bersih dan formal.

Di bagian atas terdapat navigasi utama. Ada tiga bagian penting:

1. **Arsip**, untuk melihat dokumen yang sudah tersimpan.
2. **Tanda Tangan**, untuk upload dan menandatangani dokumen baru.
3. **Verifikasi**, untuk mengecek apakah dokumen masih asli atau sudah berubah.

Di tampilan ini juga ada informasi fingerprint public key. Fingerprint ini berguna sebagai identitas kunci publik yang digunakan untuk memverifikasi signature.

Kalau fingerprint tampil, artinya frontend berhasil terhubung ke backend.

---

## 6:30 - 9:00 | Demo Menandatangani Dokumen

Sekarang saya akan mendemonstrasikan proses menandatangani dokumen.

**Aksi demo:** klik menu **Tanda Tangan**.

Di halaman ini ada dua tahap utama.

Tahap pertama adalah mengisi metadata dokumen. Metadata ini bukan bagian dari digital signature utama, tetapi penting untuk arsip dan pencarian dokumen.

Saya isi contoh:

- Judul: `Surat Keterangan Aktif Kuliah`
- Kategori: `Akademik`
- Pemilik Dokumen: `Program Studi Sistem Informasi`
- Penandatangan: `Admin Akademik`
- Klasifikasi: `Internal`

**Aksi demo:** isi form sesuai data di atas.

Tahap kedua adalah upload file dokumen.

Saya akan upload file `dokumen-asli.txt`. Isi file ini menyatakan bahwa mahasiswa masih aktif.

**Aksi demo:** upload `dokumen-asli.txt`.

Setelah itu saya klik tombol untuk menandatangani dan mengarsipkan dokumen.

**Aksi demo:** klik tombol **Tandatangani** atau tombol sejenis di UI.

Pada proses ini, backend melakukan beberapa langkah:

1. Membaca byte file dokumen.
2. Menghasilkan hash SHA-256.
3. Menandatangani hash menggunakan private key RSA.
4. Menyimpan file dan metadata ke database.
5. Mengembalikan hasil ke frontend.

Kalau berhasil, sistem akan menampilkan notifikasi bahwa dokumen sudah ditandatangani dan diarsipkan.

Poin pentingnya adalah dokumen ini sekarang sudah punya bukti keaslian berupa hash dan digital signature.

---

## 9:00 - 10:30 | Melihat Arsip Dokumen

Sekarang saya masuk ke menu **Arsip**.

**Aksi demo:** klik menu **Arsip**.

Di sini terlihat dokumen yang baru saja saya upload. Arsip ini menampilkan informasi seperti:

- Judul dokumen
- Nama file
- Kategori
- Status verifikasi
- Potongan hash SHA-256

Jika saya klik dokumennya, bagian detail akan menampilkan informasi lebih lengkap, seperti:

- Pemilik dokumen
- Penandatangan
- Waktu tanda tangan
- Algoritma signature
- Hash SHA-256 lengkap
- Fingerprint public key
- Riwayat audit

Bagian hash SHA-256 sangat penting. Hash ini berfungsi sebagai identitas unik dari isi file.

Jadi, meskipun nama file sama, sistem tidak hanya percaya pada nama file. Sistem tetap memeriksa isi file berdasarkan hash dan signature.

---

## 10:30 - 12:30 | Demo Verifikasi Dokumen Asli

Sekarang saya akan membuktikan bahwa dokumen asli bisa diverifikasi dengan benar.

**Aksi demo:** klik menu **Verifikasi**.

Di halaman verifikasi, langkahnya adalah:

1. Pilih dokumen arsip yang akan menjadi pembanding.
2. Upload file yang ingin diverifikasi.
3. Jalankan verifikasi.

Saya pilih dokumen `Surat Keterangan Aktif Kuliah` yang tadi sudah diarsipkan.

**Aksi demo:** pilih dokumen dari dropdown.

Kemudian saya upload file yang sama, yaitu `dokumen-asli.txt`.

**Aksi demo:** upload `dokumen-asli.txt`.

Lalu saya klik tombol verifikasi.

**Aksi demo:** klik tombol verifikasi.

Hasilnya seharusnya adalah **VALID**.

Artinya:

- Hash file yang diupload sama dengan hash yang tersimpan di arsip.
- Digital signature berhasil diverifikasi menggunakan public key.
- Dokumen belum mengalami perubahan sejak ditandatangani.

Ini menunjukkan bahwa sistem bisa membuktikan dokumen masih autentik.

---

## 12:30 - 14:30 | Demo Verifikasi Dokumen yang Dimanipulasi

Sekarang saya akan mencoba skenario pemalsuan.

Saya punya file kedua bernama `dokumen-palsu.txt`. Secara tampilan isinya hampir sama, tetapi ada satu bagian yang diubah:

Pada dokumen asli:

```text
Status: Aktif
```

Pada dokumen palsu:

```text
Status: Lulus
```

Perubahannya terlihat kecil, tapi secara kriptografi perubahan ini sangat besar karena hash SHA-256 akan berubah total.

Sekarang saya tetap memilih arsip yang sama, yaitu dokumen asli yang tadi sudah ditandatangani. Tapi file yang saya upload untuk diverifikasi adalah `dokumen-palsu.txt`.

**Aksi demo:** upload `dokumen-palsu.txt`, lalu klik verifikasi.

Hasilnya seharusnya menjadi **TAMPERED** atau terindikasi dimanipulasi.

Artinya:

- Hash file baru tidak sama dengan hash dokumen asli.
- Signature tidak cocok dengan isi file yang baru.
- Sistem berhasil mendeteksi bahwa dokumen tidak lagi valid.

Ini adalah inti dari project ini. Sistem tidak perlu membaca isi dokumen seperti manusia. Cukup dengan hash dan digital signature, sistem bisa tahu bahwa file tersebut sudah berubah.

---

## 14:30 - 15:30 | Penjelasan Keamanan

Dari demo tadi, ada beberapa konsep keamanan yang diterapkan.

Pertama, **SHA-256** digunakan untuk integrity checking. Hash membuat sistem bisa mendeteksi perubahan data.

Kedua, **RSA-PSS digital signature** digunakan untuk membuktikan bahwa hash dokumen benar-benar ditandatangani oleh private key sistem.

Ketiga, **public key fingerprint** digunakan sebagai identitas kunci publik, sehingga user bisa memastikan kunci yang digunakan adalah kunci yang sama.

Keempat, sistem menyimpan riwayat audit untuk membantu pelacakan aktivitas, misalnya kapan dokumen ditandatangani dan kapan diverifikasi.

Dengan kombinasi ini, sistem dapat membantu mencegah pemalsuan dan manipulasi dokumen akademik maupun legal.

---

## 15:30 - 16:30 | Kelebihan dan Batasan Sistem

Kelebihan sistem ini:

- Mudah digunakan melalui website.
- Bisa mendeteksi perubahan dokumen.
- Menggunakan konsep kriptografi nyata, bukan simulasi.
- Cocok untuk dokumen akademik dan legal.
- Memisahkan private key dan public key.

Namun sistem ini juga punya batasan:

- Private key masih disimpan secara lokal di server.
- Belum ada login multi-user.
- Belum ada role seperti admin, dosen, atau verifikator.
- Belum ada QR code verifikasi publik.
- Belum ada deployment online.

Untuk pengembangan berikutnya, sistem bisa ditambah:

- Login dan role-based access control.
- QR code pada dokumen.
- Export sertifikat verifikasi.
- Penyimpanan cloud.
- Integrasi tanda tangan per pengguna.
- Hash-chain untuk audit log agar riwayat arsip tidak bisa dimanipulasi.

---

## 16:30 - 17:30 | Penutup

Sebagai kesimpulan, project SignVault ini menunjukkan bagaimana digital signature bisa digunakan untuk melindungi dokumen digital.

Dengan menggunakan SHA-256 dan RSA-PSS, sistem bisa memastikan bahwa:

- Dokumen yang disimpan memiliki identitas kriptografis.
- Dokumen yang sudah berubah bisa terdeteksi.
- Public key dapat digunakan untuk memverifikasi signature.
- Sistem arsip tidak hanya menyimpan file, tetapi juga menjaga integritas dokumen.

Jadi, aplikasi ini sesuai dengan topik Keamanan Data dan Jaringan, terutama pada bagian integritas data, autentikasi, dan pencegahan manipulasi dokumen.

Sekian demo dari saya. Terima kasih.

---

## Catatan Jika Ada Error Saat Demo

### Jika muncul "Backend tidak terhubung" atau "Failed to fetch"

Artinya backend Python belum jalan. Jalankan:

```powershell
cd "C:\Users\adien\Documents\KEDAJAR UAS\backend"
& "C:\Users\adien\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" app.py
```

Lalu buka:

```text
http://127.0.0.1:8000/api/health
```

Jika muncul JSON, backend sudah hidup.

### Jika frontend blank atau tidak berubah

Restart frontend:

```powershell
cd "C:\Users\adien\Documents\KEDAJAR UAS\frontend"
npm.cmd run dev
```

Lalu refresh browser dengan:

```text
Ctrl + Shift + R
```

### Jika hasil verifikasi tetap VALID saat file palsu

Pastikan file palsu benar-benar berbeda dari file asli. Ubah minimal satu kata, lalu simpan ulang file tersebut.

