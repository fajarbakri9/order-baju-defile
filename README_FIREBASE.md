# Aktivasi Sinkronisasi Realtime — Order Baju Defile

Frontend sudah terhubung ke Firebase project **`visualizermaroa`** dan mendukung Cloud Firestore realtime serta login admin Google. GitHub Pages tetap dipakai sebagai hosting publik.

## Status konfigurasi aplikasi

- Firebase Web App: **terhubung**
- Project ID: `visualizermaroa`
- GitHub Pages: `https://fajarbakri9.github.io/order-baju-defile/`
- Dokumen state: `apps/order-baju-defile`
- Collection admin: `admins`

## Yang masih perlu diaktifkan di Firebase Console

1. Buka project **visualizermaroa**.
2. Aktifkan **Cloud Firestore** bila belum aktif. Untuk lokasi database, gunakan lokasi yang paling sesuai dan jangan membuat database kedua untuk aplikasi ini.
3. Aktifkan **Authentication → Sign-in method → Google**.
4. Di **Authentication → Settings → Authorized domains**, pastikan `fajarbakri9.github.io` terdaftar.
5. Terapkan isi file `firestore.rules` sebagai **Firestore Security Rules**, lalu Publish.

## Membuat admin pertama

1. Buka `https://fajarbakri9.github.io/order-baju-defile/`.
2. Klik indikator cloud pada bagian atas dan login dengan akun Google yang akan menjadi admin.
3. Di Firebase Console buka **Authentication → Users**, lalu salin UID akun tersebut.
4. Di Firestore buat collection `admins`.
5. Buat document dengan **Document ID persis UID** akun admin.
6. Tambahkan field Boolean `active` = `true`.
7. Refresh halaman dan login kembali.

Setelah admin aktif, data lokal awal akan dikirim ke dokumen `apps/order-baju-defile`. Perubahan berikutnya akan tersimpan ke Firestore dan perangkat lain yang membuka halaman akan menerima pembaruan realtime.

## Model akses

- **Publik:** dapat membaca data realtime, tidak dapat mengedit.
- **Admin:** dapat tambah/edit/hapus data, mengubah harga, dan seluruh perubahan disinkronkan ke Firestore.
- Hak tulis ditentukan oleh keberadaan dokumen `admins/{uid}` dan Firestore Security Rules, bukan oleh API key Web App.

## Paket Firebase

Implementasi ini dirancang untuk tetap dapat digunakan pada paket **Spark/gratis** untuk skala daftar pesanan ini. Tidak ada Cloud Functions atau layanan berbayar yang diwajibkan.
