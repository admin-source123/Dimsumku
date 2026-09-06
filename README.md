# DimsumKu Full-Stack

Aplikasi dashboard Cash Flow & HPP dengan login Admin dan database SQLite.

## Menjalankan
1. Install Node.js versi LTS.
2. Buka terminal pada folder ini.
3. Jalankan `npm install`.
4. Jalankan `npm start`.
5. Buka `http://localhost:3000`.

## Login demo
- Username: `admin`
- Password: `admin123`

## Catatan
- Database otomatis dibuat sebagai `dimsumku.db`.
- Data transaksi, produksi, dan produk tersimpan di database, bukan localStorage.
- Untuk penggunaan online/produksi, ubah `SESSION_SECRET` dan password admin, gunakan HTTPS, serta tempatkan aplikasi di server yang aman.
