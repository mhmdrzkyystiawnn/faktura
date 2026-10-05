# Decision Log — Backend

## Aturan Pengisian File Ini (Wajib Dibaca Sebelum Menambah Entry)

> **Entry baru hanya boleh ditambahkan ke file ini SETELAH user memberi persetujuan eksplisit** (misal: "oke", "setuju", "gas", "iya pakai itu").
> AI (atau siapa pun) **dilarang** menambahkan baris ke tabel di bawah hanya karena AI mengusulkan sesuatu dan user belum menolak — diam bukan berarti setuju.
> Kalau ada keputusan yang masih didiskusikan/dipertimbangkan (belum final), taruh di bagian "Sedang Dipertimbangkan" di paling bawah, **bukan** di tabel utama.

Format tiap entry: **Keputusan** (apa yang dipilih) → **Alasan** (kenapa) → **Alternatif yang Dipertimbangkan** (apa yang gak dipilih & kenapa) → **Trade-off** (konsekuensi yang diterima).

---

## Log Keputusan (Disetujui)

> Catatan: baris di bawah ini adalah kompilasi mundur (retroactive) dari keputusan yang sudah dibahas & disetujui sepanjang percakapan sejauh ini. **Mohon direview** — kalau ada yang salah catat atau sebenarnya belum final, kasih tau supaya diperbaiki, baru setelah itu file ini dianggap valid sebagai baseline.

| # | Keputusan | Alasan | Alternatif Dipertimbangkan | Trade-off |
|---|---|---|---|---|
| 1 | Backend pakai **NestJS** (modular monolith, bukan microservices) | Struktur modular per domain (invoice, client, payment), built-in scheduling, cocok dikerjakan bertahap solo/tim kecil | Express (lebih ringan tapi kurang struktur) | Sedikit lebih banyak boilerplate di awal |
| 2 | Database **PostgreSQL** | Data invoice relasional & butuh ACID; support tipe `Decimal` presisi buat uang | — | — |
| 3 | ORM **Prisma** | Parameterized query by default (aman dari SQL injection), migration terkelola | TypeORM | — |
| 4 | Hosting database: **Neon** (Postgres 18) | Serverless Postgres, ada branching DB, gratis tanpa kartu kredit; PG18 sudah GA di Neon sejak Mei 2026 | Supabase, RDS | Perlu 2 connection string terpisah untuk Prisma (`DATABASE_URL` pooled + `DIRECT_URL` untuk migration) |
| 5 | Hosting backend: **Vercel Serverless Function** (NestJS di-wrap pakai adapter serverless) | Railway sudah limit, Render minta verifikasi kartu, Koyeb sudah tidak terima pendaftaran free tier baru (per Feb 2026) | Railway, Render, Koyeb, VPS sendiri | Tidak bisa menjalankan proses persisten (lihat #6) |
| 6 | Reminder diproses lewat **GitHub Actions scheduled workflow** yang memanggil endpoint internal (polling DB), bukan BullMQ + worker persisten | Vercel Serverless tidak mendukung proses yang terus "mendengarkan" queue seperti BullMQ worker butuh | BullMQ + Redis worker di host persisten | Tidak ada retry/backoff otomatis canggih; kegagalan kirim ditangani manual di logic endpoint |
| 7 | Redis pakai **Upstash**, dipakai khusus untuk rate limiting (bukan lagi job queue) | Gratis tanpa kartu, kompatibel environment serverless | Redis Cloud, self-hosted | — |
| 8 | File storage: **Vercel Blob / Supabase Storage** (bukan Cloudflare R2) | Cloudflare R2 sekarang mewajibkan kartu kredit untuk aktivasi meski masih dalam batas gratis | Cloudflare R2, AWS S3 | — |
| 9 | Email: **Resend** | Gratis 3.000 email/bulan tanpa kartu kredit; SendGrid sudah menghapus free tier-nya | SendGrid | Batas 100 email/hari di free tier |
| 10 | Reminder WhatsApp **dipindah ke Fase Berikutnya**, provider (resmi Meta Cloud API vs tidak resmi Fonnte/Wablas) belum dipilih | Jalur resmi mahal & butuh verifikasi bisnis; jalur tidak resmi murah tapi berisiko nomor diblokir Meta — perlu traksi user dulu sebelum ambil keputusan bisnis ini | — | MVP hanya reminder via email |
| 11 | Autentikasi MVP: email/password **+ Login with Google (OAuth)** | Login with Google mengurangi friction signup | Auth0, Clerk (dipertimbangkan tapi belum diputuskan dipakai atau tidak) | ID token Google wajib diverifikasi server-side (lihat `architecture.md` 4.1) |
| 12 | Pencegahan abuse akun ganda (satu orang bikin banyak akun Google untuk hindari limit plan free) **sengaja tidak masuk MVP** | Keputusan eksplisit user — butuh data pola pemakaian dulu sebelum bisa dirancang deteksinya dengan baik | Verifikasi nomor HP saat register, device fingerprinting | Plan free berpotensi disalahgunakan sampai fitur ini dibangun |

---

## Sedang Dipertimbangkan (Belum Disetujui — Jangan Dianggap Final)

*(Kosong saat ini — isi di sini kalau ada opsi yang masih didiskusikan dan belum ada keputusan final.)*