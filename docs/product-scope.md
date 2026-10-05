# Product Scope

Dokumen ini mengunci scope fitur supaya development tidak melebar ke mana-mana ("scope creep"). Kalau ada ide fitur baru muncul saat development, cek dulu ke sini — kalau belum ada, masuk ke `Backlog` (bagian 4), bukan langsung dikerjakan.

---

## 1. Target Pengguna

- Freelancer individu (desainer, penulis, konsultan, developer lepas)
- Pemilik UMKM kecil yang menagih ke klien/pelanggan secara berkala (bukan retail harian)

**Bukan target saat ini:** perusahaan menengah-besar dengan tim finance, kebutuhan multi-currency kompleks, atau integrasi akuntansi enterprise (Xero, QuickBooks) — ini di luar scope MVP.

## 2. Masalah Inti yang Diselesaikan

1. Invoice dibuat manual (Word/Excel/Canva) → tidak profesional, rawan salah hitung.
2. Follow-up ke klien yang telat bayar dilakukan manual → sering lupa atau terasa tidak enak untuk ditagih.
3. Tidak ada visibilitas: berapa total piutang, siapa yang sering telat bayar.

## 3. MVP — Wajib Ada di Rilis Pertama

Fitur ini **harus** selesai sebelum rilis; tidak ada negosiasi scope di luar prioritas teknis (urutan pengerjaan lihat `architecture.md` bagian 6).

### 3.1 Autentikasi
- Register, login, logout dengan email/password
- **Login with Google (OAuth)** sebagai alternatif — mengurangi friction saat signup
- Reset password via email (khusus akun yang daftar pakai email/password)

### 3.2 Manajemen Client
- CRUD client (nama, email, no HP/WA, alamat)

### 3.3 Invoice
- Buat invoice: pilih client, tambah item (deskripsi, qty, harga), pajak/diskon opsional, tanggal jatuh tempo
- Nomor invoice otomatis (`INV-{tahun}-{urutan}`)
- Generate & preview PDF invoice
- Kirim invoice ke client via email
- Status invoice: `draft` → `sent` → `viewed` → `paid` / `overdue`
- Catat pembayaran manual (user tandai invoice sebagai lunas + jumlah yang diterima)

### 3.4 Reminder Otomatis
- Reminder terjadwal: H-3, H-1, hari-H jatuh tempo, dan setelah lewat jatuh tempo
- Kirim via **email saja** (Resend) untuk MVP — reminder WA dipindah ke Fase Berikutnya (lihat bagian 4), karena butuh keputusan bisnis dulu (jalur resmi vs tidak resmi, lihat catatan di bagian 4)

### 3.5 Dashboard
- Ringkasan: total piutang aktif, jumlah invoice overdue, revenue bulan berjalan
- Daftar invoice dengan filter status & search client

### 3.6 Batasan Plan Free
- Maksimal 5 invoice aktif per bulan (batasan monetisasi freemium)

## 4. Fase Berikutnya (Setelah MVP Rilis & Ada Feedback User)

Fitur ini **tidak** dikerjakan sebelum MVP selesai, walau tergoda karena "sekalian aja":

- Payment gateway terintegrasi (Midtrans/Xendit) — klien bayar langsung via link
- Recurring invoice (klien retainer bulanan)
- Custom branding invoice (logo, warna)
- Export laporan keuangan (Excel/PDF)
- Reminder via WhatsApp — pilih jalur resmi (Meta Cloud API: tanpa risiko banned, tapi perlu verifikasi bisnis & bayar per pesan) atau tidak resmi (Fonnte/Wablas: murah & cepat setup, tapi ada risiko nomor diblokir Meta karena melanggar ToS) setelah traksi user lebih jelas
- Multi-user per akun (tim kecil dengan role staff)
- **Pencegahan abuse akun ganda di plan free** — supaya satu orang tidak bisa bikin banyak akun Google cuma buat menghindari batas 5 invoice/bulan. Opsi yang bisa dievaluasi nanti: verifikasi nomor HP saat register, device/browser fingerprinting, atau deteksi pola (banyak akun baru dari IP yang sama dalam waktu singkat)

## 5. Eksplisit Di Luar Scope (Tidak Direncanakan)

- Multi-currency
- Integrasi akuntansi pihak ketiga (Xero, QuickBooks, Jurnal.id)
- Aplikasi mobile native (cukup web responsive dulu)
- Fitur payroll / penggajian karyawan

## 6. Kriteria "Selesai" untuk MVP

MVP dianggap siap rilis kalau:
- [ ] Semua fitur di bagian 3 berfungsi end-to-end
- [ ] Sudah lolos checklist keamanan di `architecture.md`
- [ ] Sudah lolos checklist testing di `testing-guideline.md`
- [ ] Landing page publik sudah sesuai checklist SEO di `frontend-guideline.md`
