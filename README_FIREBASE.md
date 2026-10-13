# Aktivasi Sinkronisasi Realtime — Order Baju Defile

Frontend sudah mendukung Firebase Firestore realtime dan login admin Google. GitHub Pages tetap dipakai sebagai hosting publik.

## Yang perlu dibuat di Firebase Console

1. Buat project Firebase baru menggunakan paket **Spark (gratis)**.
2. Tambahkan **Web App**.
3. Aktifkan **Cloud Firestore**.
4. Aktifkan **Authentication → Sign-in method → Google**.
5. Tambahkan domain `fajarbakri9.github.io` ke **Authentication → Settings → Authorized domains** bila belum otomatis tersedia.
6. Salin konfigurasi Web App ke `firebase-config.js`.
7. Terapkan isi `firestore.rules` sebagai Firestore Security Rules.

## Membuat admin pertama

1. Buka halaman publik dan klik indikator status cloud untuk login Google sekali.
2. Di Firebase Console buka **Authentication → Users** dan salin UID akun yang akan menjadi admin.
3. Di Firestore buat collection `admins` dan document dengan ID persis UID tersebut.
4. Isi minimal field `active: true`.

Setelah itu refresh halaman dan login kembali. Tombol edit/tambah/harga hanya tersedia bagi akun admin.

## Data cloud

State aplikasi disimpan pada dokumen `apps/order-baju-defile`. Publik dapat membaca data realtime. Hanya UID yang mempunyai dokumen `admins/{uid}` yang dapat menulis.

## Catatan biaya

Arsitektur ini tidak memerlukan upgrade Blaze untuk skala kecil seperti daftar pesanan ini. Tetap pantau kuota Spark pada Firebase Console.
