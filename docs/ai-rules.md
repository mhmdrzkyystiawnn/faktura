# AI Rules — Prioritas: Aman, Bukan Efisien

Dokumen ini adalah instruksi yang harus diikuti oleh AI assistant (Claude Code, Copilot, atau AI coding tool lain) saat membantu mengerjakan project ini. Tujuannya: mencegah AI mengambil jalan pintas yang secara teknis "berhasil" tapi membuka celah keamanan.

---

## 0. Prinsip Utama

> **Ketika ada pilihan antara solusi yang lebih cepat/simpel vs solusi yang lebih aman, AI WAJIB memilih yang lebih aman — walaupun lebih panjang, lebih banyak baris kode, atau butuh dependency tambahan.**

Urutan prioritas saat ada trade-off:
1. **Keamanan** (data user, auth, integritas transaksi)
2. **Kebenaran** (logic bisnis, terutama perhitungan uang)
3. **Maintainability** (kode gampang dibaca & diubah)
4. **Kecepatan development / efisiensi baris kode** — paling terakhir

AI tidak boleh mengoptimalkan urutan ini secara terbalik walau user tidak secara eksplisit meminta "yang aman".

---

## 1. Larangan Keras (Tidak Boleh Dilakukan Tanpa Persetujuan Eksplisit)

AI **dilarang**, meskipun ini akan mempercepat penyelesaian task:

- Menonaktifkan validasi input, auth guard, CORS, CSRF, atau rate limiting "untuk sementara supaya gampang testing".
- Menyimpan password, API key, token, atau secret lain dalam bentuk plaintext di kode, log, atau komentar.
- Menulis raw SQL query dengan string concatenation dari input user.
- Menggunakan `eval()`, `new Function()`, atau `child_process.exec()` dengan input yang berasal dari user tanpa sanitasi ketat.
- Membuat endpoint baru tanpa DTO validation, tanpa auth guard, atau tanpa rate limiting — walau endpoint itu "cuma internal" atau "cuma buat testing".
- Menghapus/mengurangi log audit demi mengurangi noise, tanpa menyediakan gantinya.
- Mengembalikan pesan error yang mengekspos stack trace, query database, atau struktur internal ke response API publik.
- Menyimpan data kartu pembayaran mentah di database sendiri.
- Melakukan generalisasi permission (misal: kasih role admin ke semua user "biar gampang dulu") walau untuk keperluan development.
- Meng-hardcode bypass auth (misal `if (email === "admin@test.com") return true`) walau untuk debugging, kecuali di file yang jelas-jelas tidak pernah ikut build production dan diberi komentar peringatan.

Kalau ada requirement dari user yang **secara tidak sengaja** mengarah ke salah satu larangan di atas, AI **wajib memberi peringatan eksplisit** dan menawarkan alternatif yang aman — bukan diam-diam menuruti, dan bukan diam-diam mengganti tanpa bilang.

---

## 2. Cara AI Mengambil Keputusan Saat Ambigu

Saat instruksi user tidak detail (misal "buatkan endpoint upload file" tanpa spesifikasi keamanan), AI **wajib** menganggap requirement keamanan berikut berlaku secara default, tanpa perlu diminta ulang:

- Validasi tipe & ukuran input.
- Autentikasi & otorisasi (kecuali eksplisit dinyatakan endpoint publik).
- Rate limiting.
- Logging untuk aktivitas sensitif.
- Sanitasi output yang dirender ke client.

AI tidak boleh berasumsi "user pasti sudah tahu dan akan nambahin sendiri nanti" — keamanan bukan fitur tambahan yang ditempel belakangan, tapi bagian dari implementasi awal.

Kalau ada dua pendekatan valid dengan level keamanan berbeda, AI **wajib menjelaskan trade-off-nya** ke user sebelum memilih, bukan langsung memilih yang paling sedikit kode.

---

## 3. Kewajiban Saat Menulis Kode Baru

- Setiap endpoint baru otomatis disertai: DTO validation, guard auth (atau alasan eksplisit kenapa publik), dan rate limit sesuai kategori (lihat `architecture.md` bagian rate limiting).
- Setiap kode yang berhubungan dengan uang (invoice, payment, saldo) wajib pakai tipe data presisi (`Decimal`), bukan `float`/`number` biasa.
- Setiap integrasi pihak ketiga (payment gateway, WA API) wajib verifikasi signature/webhook sebelum diproses.
- Setiap query database yang menyentuh data milik user tertentu wajib disertai filter kepemilikan (`where: { userId }`), bukan hanya filter by ID — mencegah IDOR.
- Setiap fitur upload file wajib validasi berdasarkan isi file, bukan nama/ekstensi saja.

---

## 4. Kewajiban Saat Review / Refactor Kode Lama

- Saat diminta "rapikan" atau "refactor" kode, AI **tidak boleh** menghapus lapisan keamanan yang sudah ada (validasi, guard, rate limit) demi kode yang lebih pendek/simpel.
- Kalau menemukan celah keamanan saat membaca kode yang tidak diminta untuk diperbaiki, AI wajib melaporkannya ke user secara eksplisit, bukan diam-diam dibiarkan atau diam-diam diperbaiki tanpa pemberitahuan (perubahan security-relevant harus terlihat, bisa direview).

---

## 5. Larangan Terhadap "Optimisasi yang Mengorbankan Keamanan"

Contoh pola yang **harus dihindari** walau tergoda karena "lebih efisien":

| Godaan Efisiensi | Kenapa Ditolak | Yang Harus Dilakukan |
|---|---|---|
| Skip validasi karena "toh divalidasi juga di frontend" | Validasi frontend bisa dilewati langsung via API | Validasi tetap wajib di backend |
| Simpan JWT di localStorage biar gampang diakses JS | Rawan XSS | Pakai HttpOnly cookie |
| Matikan CORS whitelist jadi `*` biar gak error saat development | Production ikut kebawa kalau lupa diubah | Set origin spesifik dari awal, beda config per environment |
| Cache hasil query yang termasuk data sensitif tanpa scoping per-user | Bisa bocor data antar user | Cache key wajib termasuk identitas user/tenant |
| Gabungkan banyak permission jadi satu role besar biar simpel | Melanggar least privilege | Pisah role granular sesuai kebutuhan |

---

## 6. Format Komunikasi AI ke User

Saat AI membuat keputusan teknis yang menyangkut keamanan, AI wajib menyampaikan dengan format singkat:

```
Keputusan: <apa yang dipilih>
Alasan keamanan: <kenapa ini yang dipilih dibanding alternatif yang lebih "cepat">
Trade-off: <konsekuensi, misal butuh dependency tambahan/lebih banyak kode>
```

Ini supaya user selalu tahu kapan AI memilih jalan yang lebih "berat" demi keamanan, dan bisa mengoreksi kalau memang trade-off-nya dianggap tidak perlu untuk konteks tertentu (misal internal tool yang benar-benar tidak exposed ke publik).

---

## 7. Fokus SEO (Khusus Halaman Publik)

Selain keamanan, AI **wajib** memperlakukan SEO sebagai requirement di halaman publik (landing, pricing, blog/help center) — bukan sesuatu yang ditambahkan belakangan setelah UI "jadi". Ini tidak menggeser prioritas keamanan (tetap nomor satu), tapi berlaku sebagai requirement tambahan yang setara dengan aksesibilitas.

**AI wajib, tanpa diminta ulang, setiap kali membuat/mengubah halaman publik:**
- Mengisi `generateMetadata` (title unik & deskriptif, meta description) — tidak boleh membiarkan default/duplikat antar halaman.
- Menjaga satu `<h1>` per halaman dengan hierarki heading (`h1→h2→h3`) yang berurutan, dan memakai elemen semantik (`<nav>`, `<main>`, `<article>`) — bukan `<div>` semua.
- Menambahkan `alt` text deskriptif di setiap `<img>`/`next/image`, dan memakai `next/image` (bukan `<img>` biasa) untuk optimasi otomatis.
- Mendaftarkan halaman baru ke `sitemap.ts`.
- Menjaga agar halaman publik yang render konten inti tidak murni client-side rendered — pilih SSR/SSG/ISR supaya konten ada di HTML pertama kali (penting untuk crawler & Core Web Vitals).

**AI wajib, secara default tanpa diminta, memberi `noindex, nofollow`** pada halaman apa pun yang berada di balik login atau berisi data personal/transaksi milik user (dashboard, detail invoice, invoice publik yang dibuka klien via link). AI **dilarang** membuat halaman jenis ini indexable "biar keliatan di Google", meskipun user tidak secara eksplisit meminta noindex — data invoice adalah data personal, bukan konten marketing.

**AI dilarang** mengorbankan SEO demi kecepatan development di halaman publik, seperti: melewatkan metadata karena "isi belakangan", memakai gambar tanpa `alt` demi cepat selesai, atau membuat landing page murni client-rendered tanpa alasan teknis yang jelas.

Kalau ada trade-off antara SEO dan hal lain (misal interaktivitas yang butuh client-side rendering penuh), AI wajib menjelaskan trade-off-nya ke user memakai format komunikasi di bagian 6, bukan diam-diam memilih salah satu.

---

## 8. Governance Decision Log

Project ini punya `decision-log-fe.md` dan `decision-log-be.md`. Aturan wajib buat AI:

- **Dilarang** menambahkan baris baru ke tabel "Log Keputusan (Disetujui)" hanya karena AI mengusulkan sesuatu dan user tidak menolak. Diam bukan persetujuan.
- Entry baru **hanya** ditambahkan setelah user memberi persetujuan eksplisit dalam percakapan (kata-kata seperti "oke", "setuju", "gas", "iya pakai itu", atau jawaban langsung dari pertanyaan pilihan yang diajukan AI).
- Kalau AI baru saja mengusulkan sesuatu dan belum ada konfirmasi, taruh di bagian "Sedang Dipertimbangkan" di file yang sama, **bukan** di tabel utama — atau jangan ditulis sama sekali kalau belum cukup konkret.
- Setiap entry wajib punya empat bagian: Keputusan, Alasan, Alternatif yang Dipertimbangkan, dan Trade-off — bukan cuma nama keputusan tanpa konteks, supaya log ini berguna buat orang lain (atau AI sesi lain) yang baca belakangan.
- Kalau keputusan lama ternyata dibatalkan/diganti di percakapan berikutnya, baris lama **tidak dihapus** — tambahkan baris baru dengan catatan "(menggantikan #<nomor>)" supaya riwayat keputusan tetap terlihat, bukan hilang.

---

## 9. Pengingat Terakhir

AI **bukan** dinilai dari seberapa sedikit baris kode atau seberapa cepat task selesai. AI dinilai dari **apakah hasil kerjanya aman dipakai untuk menyimpan data keuangan dan data pribadi orang lain**. Kalau ragu antara dua pilihan, pilih yang lebih defensif, lalu jelaskan kenapa.