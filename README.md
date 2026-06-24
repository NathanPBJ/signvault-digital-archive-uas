# Sistem Pengarsipan Dokumen Akademik Berbasis Digital Signature

Project untuk mata kuliah **Keamanan Data dan Jaringan**. Aplikasi ini mengarsipkan dokumen akademik/legal, membuat hash SHA-256, menandatangani hash memakai RSA-PSS digital signature, lalu menyediakan verifikasi untuk mendeteksi pemalsuan atau manipulasi file.

## Fitur

- Upload dan arsip dokumen akademik/legal.
- Hash dokumen dengan SHA-256.
- Digital signature menggunakan RSA-PSS + SHA-256.
- Penyimpanan metadata dan signature di SQLite.
- Verifikasi dokumen: valid, tidak cocok, atau signature gagal.
- Audit log verifikasi terakhir.
- React frontend dengan dashboard, form signing, daftar arsip, dan panel detail.

## Struktur

```text
backend/
  app.py              Python API server
  requirements.txt    Dependency backend
frontend/
  src/                React source
  package.json        Dependency frontend
```

## Cara Menjalankan

### 1. Backend

```powershell
cd backend
python -m pip install -r requirements.txt
python app.py
```

Backend berjalan di:

```text
http://127.0.0.1:8000
```

Pada pertama kali jalan, server otomatis membuat:

- `backend/keys/private_key.pem`
- `backend/keys/public_key.pem`
- `backend/data/archive.db`
- `backend/uploads/`

### 2. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Jika PowerShell memblokir `npm`, pakai:

```powershell
npm.cmd install
npm.cmd run dev
```

Frontend berjalan di:

```text
http://127.0.0.1:5173
```

Catatan: `npm run dev` pada project ini dibuat sebagai mode demo stabil. Command tersebut akan build React dulu, lalu menjalankan preview server.

```powershell
npm.cmd run build
npm.cmd run preview -- --port 5173
```

Jika ingin menjalankan Vite dev server asli:

```powershell
npm.cmd run vite-dev
```

## Alur Digital Signature

```text
Dokumen diupload
      |
      v
SHA-256 menghasilkan hash dokumen
      |
      v
Hash ditandatangani dengan RSA private key
      |
      v
Dokumen, metadata, hash, dan signature disimpan
      |
      v
Saat verifikasi, file dihitung ulang hash-nya
      |
      v
Public key memverifikasi signature terhadap hash baru
```

Jika isi dokumen berubah satu karakter saja, hash berubah dan verifikasi menjadi gagal.

## Catatan Keamanan

- Private key disimpan lokal di `backend/keys/private_key.pem`.
- Public key dapat dilihat melalui API `/api/public-key`.
- Signature menggunakan RSA-PSS, bukan enkripsi file.
- File tidak dianggap valid hanya karena nama sama; validasi memakai hash dan signature.
