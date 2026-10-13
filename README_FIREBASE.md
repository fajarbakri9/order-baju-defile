# Aktivasi Sinkronisasi Realtime — Order Baju Defile

Frontend terhubung ke Firebase project **`visualizermaroa`** dan menggunakan Cloud Firestore realtime. GitHub Pages tetap menjadi hosting publik.

## Status konfigurasi aplikasi

- Firebase Web App: **terhubung**
- Project ID: `visualizermaroa`
- GitHub Pages: `https://fajarbakri9.github.io/order-baju-defile/`
- Dokumen state bersama: `apps/order-baju-defile`
- Login admin: **PIN 4 digit**

## Firebase Authentication

Aktifkan **Authentication → Sign-in method → Email/Password**. Google Sign-In tidak diperlukan untuk aplikasi ini.

Aplikasi memakai satu akun teknis Firebase Auth di balik tampilan PIN. Pengguna cukup memasukkan PIN **1234**. Pada login pertama, aplikasi akan membuat akun teknis tersebut bila belum ada. Setelah itu sesi admin akan tetap tersimpan di perangkat hingga logout.

## Firestore Rules

Terapkan isi file `firestore.rules` pada tab **Firestore → Rules** lalu klik **Publish**. Publik dapat membaca state realtime, sedangkan penulisan hanya diizinkan untuk akun teknis admin aplikasi.

## Mengapa perangkat lain sebelumnya masih menampilkan data lama

Status `Realtime` sebelumnya hanya berarti listener Firestore sudah tersambung. Jika dokumen `apps/order-baju-defile` belum pernah dibuat, perangkat lain tetap menggunakan data lokal bawaan masing-masing.

Sekarang status dibedakan:

- `Cloud belum berisi data` → koneksi Firebase aktif tetapi belum ada state bersama.
- `Realtime` → dokumen cloud sudah ada dan sedang didengarkan.
- `Admin • Sinkron` → admin aktif dan perubahan otomatis ditulis ke Firestore.

Saat PIN admin pertama kali berhasil digunakan dan dokumen cloud belum ada, aplikasi otomatis mengirim data lokal saat itu sebagai data awal bersama. Setelah dokumen terbentuk, semua perangkat online akan menerima perubahan melalui listener realtime.

## Catatan keamanan

PIN 4 digit pada aplikasi web publik adalah **pengaman praktis**, bukan mekanisme keamanan tingkat tinggi. Untuk data yang lebih sensitif sebaiknya gunakan login pengguna individual atau backend server. Untuk daftar pesanan internal sederhana, mekanisme ini dipilih agar operasional tetap mudah.

## Paket Firebase

Implementasi ini tetap dirancang untuk paket **Spark/gratis** dan tidak memerlukan Cloud Functions.
