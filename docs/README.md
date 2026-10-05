# Faktura — SaaS Invoice & Reminder untuk Freelancer/UMKM

Aplikasi invoicing untuk freelancer dan UMKM: buat invoice profesional, kirim otomatis, dan dapat reminder otomatis untuk klien yang belum bayar.

**Domain:** `faktura.muhamadrizky.my.id`

## Masalah yang Diselesaikan

Freelancer/UMKM kecil biasanya nagih invoice manual via WhatsApp/Excel dan sering lupa follow-up klien yang telat bayar. Aplikasi ini mengotomatiskan pembuatan invoice, pengiriman, dan reminder pembayaran — supaya cash flow lebih terjaga tanpa kerja manual.

## Dokumentasi Terkait

Sebelum berkontribusi/mengembangkan, baca dokumen berikut sesuai kebutuhan:

| Dokumen | Isi |
|---|---|
| [`architecture.md`](./architecture.md) | Arsitektur backend, struktur folder, dan security guideline (auth, rate limiting, DDoS, dll) |
| [`ai-rules.md`](./ai-rules.md) | Aturan wajib untuk AI coding assistant — prioritas keamanan & SEO di atas efisiensi |
| [`frontend-guideline.md`](./frontend-guideline.md) | Design token, tipografi, komponen (shadcn/ui), dan panduan SEO |
| [`api-guideline.md`](./api-guideline.md) | Konvensi REST API: format response, error, pagination, versioning |
| [`database-schema.md`](./database-schema.md) | ERD dan detail skema database |
| [`product-scope.md`](./product-scope.md) | Scope fitur MVP, fase berikutnya, dan yang di luar scope |
| [`testing-guideline.md`](./testing-guideline.md) | Strategi testing: unit, integration, e2e, dan yang wajib ditest |
| [`decision-log-be.md`](./decision-log-be.md) | Riwayat keputusan teknis backend yang sudah disetujui |
| [`decision-log-fe.md`](./decision-log-fe.md) | Riwayat keputusan teknis & visual frontend yang sudah disetujui |
| [`initial-prompt.md`](./initial-prompt.md) | Prompt siap-pakai untuk memulai sesi coding pertama dengan AI assistant |

## Tech Stack

**Frontend**
- Next.js (App Router) + TypeScript + Tailwind CSS
- shadcn/ui (komponen) + TanStack Table (logic tabel) + TanStack Query
- react-hook-form + zod (validasi form)

**Backend**
- Node.js + NestJS + TypeScript (di-deploy sebagai Vercel Serverless Function, bukan server persisten)
- **Neon** (PostgreSQL 18) + Prisma ORM
- **Upstash Redis** — dipakai untuk rate limiting saja (bukan lagi queue)
- **GitHub Actions scheduled workflow** — pengganti BullMQ worker untuk trigger reminder (lihat `architecture.md` 1.1)

**Integrasi Pihak Ketiga**
- Midtrans / Xendit — payment gateway
- Resend — email (SendGrid sudah tidak punya free tier)
- Fonnte / Wablas / WhatsApp Business API — reminder via WA
- Vercel Blob / Supabase Storage — file storage (Cloudflare R2 sekarang wajib kartu kredit untuk aktivasi, jadi tidak dipakai)

**Infrastruktur — dipilih semua yang free tier-nya tidak wajib kartu kredit**
- Vercel — hosting frontend **dan** backend (satu platform, gratis, tanpa kartu)
- Cloudflare — DNS, proxy, WAF, DDoS protection (khusus DNS/WAF, bukan R2)
- GitHub Actions — scheduler untuk reminder (gratis, tanpa kartu)

## Struktur Folder (Ringkas)

```
.
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # NestJS backend
├── architecture.md
├── ai-rules.md
├── frontend-guideline.md
├── api-guideline.md
├── database-schema.md
└── README.md
```

Detail struktur modul backend ada di `architecture.md` bagian 2.

## Catatan Domain (Subdomain `.my.id`)

Karena app ini jalan di subdomain (`faktura.muhamadrizky.my.id`), bukan domain apex sendiri, ada beberapa penyesuaian dari guideline di dokumen lain:

- **Cookie & CORS** (lihat `architecture.md` 4.1 & 4.6): refresh token cookie di-scope ke subdomain ini saja (`Domain=faktura.muhamadrizky.my.id`, bukan `.muhamadrizky.my.id`) supaya tidak bocor ke subdomain lain di bawah domain pribadi yang sama. CORS origin whitelist juga exact-match ke subdomain ini.
- **SEO** (lihat `frontend-guideline.md` 3.1): karena marketing page (landing/pricing) dan app (dashboard) sama-sama di satu subdomain ini (tidak ada domain terpisah), pemisahan indexable vs `noindex` dilakukan **per-path**, bukan per-domain — misal `/`, `/pricing`, `/blog/*` indexable, sedangkan `/dashboard/*`, `/invoices/*` (area login) tetap `noindex, nofollow`.
- **Email deliverability**: pastikan record SPF/DKIM/DMARC untuk pengiriman email (invoice, reminder) dikonfigurasi di level subdomain ini kalau provider domain `.my.id` mengizinkan — kalau tidak bisa, pertimbangkan domain terpisah khusus untuk sending email (praktik umum, misal `mail.faktura.muhamadrizky.my.id`) supaya reputasi pengiriman tidak tercampur dengan aktivitas lain di domain induk.

## Setup Lokal

### Prasyarat
- Node.js LTS terbaru
- PostgreSQL (lokal via Docker, atau langsung pakai branch dev dari Neon)
- Redis **opsional** untuk lokal — bisa langsung pakai Upstash (gratis) tanpa perlu Redis lokal, karena dipakai cuma untuk rate limiting

### Langkah

```bash
# 1. Clone & install dependency
git clone <repo-url>
cd <repo>
npm install

# 2. Siapkan environment variable
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# isi value sesuai kebutuhan (lihat komentar di masing-masing .env.example)

# 3. Jalankan migrasi database
cd apps/api
npx prisma migrate dev

# 4. Jalankan backend & frontend (dari root, dua terminal terpisah)
npm run dev --workspace=apps/api
npm run dev --workspace=apps/web
```

Backend default jalan di `http://localhost:3001`, frontend di `http://localhost:3000`.

## Status Project

Tahap pengembangan awal (MVP). Lihat `database-schema.md` dan `api-guideline.md` untuk detail teknis yang sudah didefinisikan.

## Lisensi

Belum ditentukan.