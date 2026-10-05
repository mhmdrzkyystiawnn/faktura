# Architecture & Security Guideline
## SaaS Invoice & Reminder untuk Freelancer/UMKM

Dokumen ini adalah single source of truth untuk struktur sistem dan aturan keamanan backend. Tujuannya: semua developer (manusia maupun AI assistant) mengikuti pola yang sama supaya tidak "tabrakan" — baik dari sisi struktur folder, penamaan, alur data, maupun keputusan keamanan.

---

## 1. High-Level Architecture

```
┌─────────────┐      ┌──────────────────┐      ┌──────────────────────┐
│   Next.js    │─────▶│    Cloudflare     │─────▶│  NestJS (deployed as  │
│  (Frontend)  │      │ (DNS, WAF, DDoS)  │      │  Vercel Serverless    │
└─────────────┘      └──────────────────┘      │  Function)            │
                                                  └──────────┬────────────┘
                                                             │
                                                             ├──▶ Neon Postgres 18 (data utama, via pooled connection)
                                                             ├──▶ Upstash Redis (rate limiting saja — opsional)
                                                             ├──▶ Vercel Blob / Supabase Storage (file: logo, PDF)
                                                             ├──▶ Resend (email) / Fonnte-Wablas (WA)
                                                             └──▶ Payment Gateway (Midtrans/Xendit) via webhook

┌───────────────────────┐
│  GitHub Actions        │  (scheduled workflow, tiap 15–30 menit)
│  cron: process-reminders │──▶ memanggil endpoint internal NestJS di atas
└───────────────────────┘
```

**Prinsip utama:**
- Backend adalah **modular monolith** dulu (bukan microservices) — lebih gampang di-secure, di-monitor, dan di-deploy untuk tim kecil/solo. Pisah ke microservices nanti kalau memang ada kebutuhan scale spesifik.
- Semua request publik **wajib** lewat reverse proxy/CDN (Cloudflare) sebelum sampai ke server aplikasi — ini lapisan pertama pertahanan DDoS.
- Backend NestJS **tidak** di-deploy sebagai server yang nyala terus (persistent process), melainkan sebagai **Vercel Serverless Function** (lewat adapter `serverless-http`/`@vendia/serverless-express`) — dipilih supaya seluruh stack (frontend + backend) bisa hosting 100% gratis tanpa kartu kredit. Konsekuensinya: **tidak ada proses worker/queue yang nyala terus** (lihat 1.1).
- Reminder tidak lagi pakai BullMQ + worker persisten, melainkan **cron eksternal (GitHub Actions)** yang memanggil endpoint internal secara berkala untuk memproses reminder yang jatuh tempo — lihat bagian 1.1 untuk detail & trade-off.

### 1.1 Kenapa Bukan BullMQ + Worker Persisten

```
Keputusan: Reminder diproses lewat polling database terjadwal (cron), bukan queue/worker persisten
Alasan keamanan & biaya: Hosting persisten (Railway/Render/Koyeb) di titik ini semua butuh kartu 
  kredit atau limit habis. Vercel Serverless (tanpa kartu) tidak mendukung proses yang terus 
  "mendengarkan" queue seperti BullMQ worker butuh.
Cara kerja: GitHub Actions scheduled workflow (gratis, tanpa kartu, interval bisa 15-30 menit) 
  memanggil endpoint terproteksi (mis. POST /api/v1/internal/process-reminders) dengan header 
  secret. Endpoint ini query tabel reminders yang scheduled_at <= now() dan sent_at masih kosong, 
  kirim, lalu update status — lihat database-schema.md bagian reminders.
Trade-off: Lebih sederhana & 100% gratis, tapi tidak ada retry/backoff otomatis canggih seperti 
  BullMQ — kegagalan kirim harus ditangani manual di logic endpoint (masuk failure_reason, 
  dicoba lagi di run berikutnya).
```

**Aturan keamanan endpoint internal ini** (lihat juga 4.12):
- Endpoint ini **bukan endpoint publik** — wajib divalidasi lewat shared secret di header (`X-Internal-Cron-Secret`), bukan cuma mengandalkan URL yang "tersembunyi".
- Tetap kena rate limiting (lihat 4.4) untuk jaga-jaga kalau secret bocor.
- Idempotent dalam satu window eksekusi: kalau GitHub Actions retry karena timeout, reminder yang `sent_at`-nya sudah terisi tidak dikirim ulang.

Kalau nanti traffic/kebutuhan reminder makin kompleks (retry canggih, prioritas job, dll), migrasi ke worker persisten (Railway berbayar atau VPS sendiri) + BullMQ tetap jadi opsi upgrade yang gampang karena struktur module `reminders` tidak berubah — cuma trigger-nya yang beda.

---

## 2. Folder Structure Backend (NestJS)

Struktur per-module (bukan per-layer global) supaya tidak tabrakan saat banyak orang/AI mengerjakan modul berbeda secara paralel.

```
src/
├── common/                 # shared: guards, interceptors, decorators, pipes, filters
│   ├── guards/              # termasuk internal-cron.guard.ts (validasi secret header)
│   ├── interceptors/
│   ├── decorators/
│   ├── filters/
│   └── constants/
├── config/                 # konfigurasi env, validasi env (joi/zod)
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   ├── strategies/      # jwt.strategy.ts, refresh.strategy.ts
│   │   └── dto/
│   ├── users/
│   ├── clients/
│   ├── invoices/
│   │   ├── invoices.controller.ts
│   │   ├── invoices.service.ts
│   │   ├── invoices.module.ts
│   │   ├── dto/
│   │   └── entities/
│   ├── payments/
│   ├── reminders/
│   │   ├── reminders.service.ts
│   │   ├── reminders.module.ts
│   │   └── internal-reminders.controller.ts  # endpoint dipanggil GitHub Actions cron
│   └── webhooks/            # endpoint khusus terima callback dari payment gateway
├── database/
│   ├── prisma/
│   │   └── schema.prisma
│   └── migrations/
├── main.ts                  # entrypoint lokal (nest start)
└── app.module.ts

api/
└── index.ts                 # entrypoint Vercel Serverless — wrap NestJS app pakai serverless-http

.github/
└── workflows/
    └── process-reminders.yml  # scheduled workflow, panggil endpoint internal tiap 15-30 menit
```

**Aturan supaya tidak tabrakan:**
- Satu module = satu domain bisnis. Jangan taruh logic invoice di dalam module clients, dst.
- DTO wajib ada di setiap module untuk validasi input (lihat bagian security).
- Tidak boleh ada service yang langsung query Prisma di luar service-nya sendiri — akses lintas module hanya lewat method service yang di-export, bukan lewat akses langsung ke repository/model.
- Naming konsisten: `*.controller.ts`, `*.service.ts`, `*.module.ts`, `*.dto.ts`, `*.entity.ts`.
- `api/index.ts` **hanya** boleh berisi kode wiring serverless (bootstrap NestJS + adapter) — logic bisnis tetap di `src/modules/*`, supaya kalau nanti pindah dari Vercel ke hosting persisten, cukup ganti entrypoint tanpa nyentuh logic.

---

## 3. Environment Separation

- **3 environment wajib:** `development`, `staging`, `production` — dengan database, secret, dan API key yang **benar-benar terpisah** (bukan cuma beda `.env` value tapi beda resource sungguhan).
- Production tidak boleh punya akses ke data dummy/testing, dan sebaliknya credential production tidak boleh pernah ada di local/dev.
- Validasi environment variable saat aplikasi start (fail-fast) — kalau ada env wajib yang kosong/salah format, aplikasi **tidak boleh jalan sama sekali**, bukan jalan dengan default value yang tidak aman.

---

## 4. Security Guideline (Backend)

Prinsip dasar: **secure by default**, bukan "aman kalau sempat". Semua endpoint baru dianggap butuh proteksi penuh kecuali dibuktikan sebaliknya (bukan sebaliknya).

### 4.1 Autentikasi & Otorisasi
- Password di-hash dengan **Argon2id** (lebih disarankan dari bcrypt untuk aplikasi baru), never simpan plaintext atau reversible encryption untuk password.
- Gunakan **JWT access token berumur pendek** (misal 15 menit) + **refresh token** yang disimpan sebagai HttpOnly, Secure, SameSite=Strict cookie — jangan simpan token di localStorage (rawan XSS).
- Refresh token **rotasi setiap dipakai** (refresh token rotation) dan disimpan hash-nya di DB supaya bisa di-revoke (misal saat logout atau device hilang).
- Semua endpoint yang mengubah data (`POST`, `PUT`, `PATCH`, `DELETE`) wajib melalui guard otorisasi — cek bukan cuma "sudah login" tapi juga "apakah data ini miliknya" (object-level authorization / IDOR prevention). Contoh: user A tidak boleh bisa akses invoice user B walau ID-nya ditebak.
- Terapkan **Role-Based Access Control (RBAC)** sejak awal walau saat ini cuma ada 1 role, supaya gampang extend nanti (admin, staff, owner).
- **Login with Google (OAuth):** verifikasi ID token Google **selalu di server** (pakai library resmi Google, misal `google-auth-library`), cek `aud` (audience) cocok dengan Client ID aplikasi dan `iss` (issuer) memang dari Google — **jangan pernah** percaya data user (email, nama) yang dikirim langsung dari client tanpa verifikasi ulang di server. Setelah verifikasi berhasil, aplikasi menerbitkan access/refresh token miliknya sendiri (lihat aturan JWT di atas) — token dari Google **tidak** dipakai sebagai session token aplikasi.
- Kalau email dari akun Google ternyata sama dengan email yang sudah terdaftar manual (password), proses **linking akun** wajib eksplisit (misal minta konfirmasi password lama dulu) — jangan otomatis digabung begitu saja, supaya orang lain tidak bisa mengambil alih akun cukup dengan tahu email korban dan bikin akun Google dengan email yang sama.

### 4.2 Input Validation & Sanitization
- Semua input wajib divalidasi lewat DTO + `class-validator`/`zod` di level controller — **tidak ada request yang masuk ke service tanpa lolos validasi**.
- Validasi tipe data ketat: nominal uang pakai `Decimal`/`numeric` (bukan float), tanggal divalidasi format & range-nya (jangan terima due_date di masa lalu untuk invoice baru, misalnya).
- Whitelist field yang diterima (`whitelist: true` + `forbidNonWhitelisted: true` di ValidationPipe) — field asing di body request langsung ditolak, bukan diabaikan diam-diam.
- Sanitasi semua input yang nantinya dirender di HTML (misal nama client yang muncul di invoice PDF) untuk cegah injeksi ke template.

### 4.3 SQL Injection & Database
- Gunakan Prisma (parameterized query by default) — **dilarang** menulis raw SQL string yang mengandung concatenation dari input user. Kalau terpaksa raw query, wajib pakai parameter binding (`$queryRaw` dengan tagged template, bukan string interpolation).
- Database user aplikasi memakai **least privilege** — tidak boleh pakai role superuser/owner DB untuk koneksi aplikasi sehari-hari.
- Backup database terenkripsi, disimpan terpisah dari server utama, dan di-test restore-nya secara berkala.

### 4.4 Rate Limiting
- Rate limiting diterapkan di **dua lapis**:
  1. **Edge/proxy level** (Cloudflare/Nginx) — proteksi kasar terhadap traffic flood sebelum masuk ke aplikasi.
  2. **Application level** (`@nestjs/throttler` + **Upstash Redis** sebagai storage — dipilih karena kompatibel dengan environment serverless/Vercel, konsisten walau multi-instance) — proteksi granular per endpoint.
- Endpoint sensitif (login, register, forgot-password, kirim OTP, generate invoice publik) mendapat limit **lebih ketat** daripada endpoint umum. Contoh acuan:
  - Login: maks 5 percobaan / 15 menit / kombinasi IP+email, lalu progressive delay atau captcha.
  - Forgot password / OTP: maks 3 request / jam per akun.
  - Endpoint publik (misal halaman invoice yang dibuka klien tanpa login): rate limit per IP untuk cegah scraping/brute force nomor invoice.
- Response rate-limit **tidak boleh membocorkan detail internal** (cukup 429 + retry-after, jangan expose sisa kuota detail per user ke pihak yang tidak berkepentingan).

### 4.5 DDoS Mitigation
- Wajib pakai layanan proxy/CDN dengan proteksi DDoS bawaan (Cloudflare minimal di plan yang mendukung "Under Attack Mode").
- Aktifkan **WAF (Web Application Firewall)** rules dasar (blok pattern SQLi/XSS umum, blok bot dikenal jahat).
- Batasi ukuran body request (`bodyParser` limit, misal 1–5MB tergantung kebutuhan upload) supaya tidak ada request raksasa yang menghabiskan resource.
- Timeout request di level aplikasi dan proxy (misal 30 detik) — koneksi yang menggantung lama harus otomatis diputus.
- Autoscaling backend dibatasi **hard cap** (jangan sampai serangan traffic bikin billing cloud membengkak tak terkendali) — kombinasikan dengan rate limiting, bukan cuma mengandalkan scaling.

### 4.6 HTTP Security Headers & Transport
- Gunakan `helmet` di NestJS untuk header standar (`X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, dll).
- **HTTPS wajib** di semua environment kecuali local dev, redirect otomatis dari HTTP ke HTTPS, HSTS diaktifkan.
- CORS **whitelist domain spesifik** (domain frontend resmi saja), jangan pernah `origin: '*'` untuk endpoint yang butuh credential/cookie.
- CSRF protection untuk endpoint berbasis cookie session (kalau ada bagian yang pakai cookie, bukan cuma Bearer token).

### 4.7 Secrets Management
- Tidak ada credential (API key, DB password, JWT secret) yang di-hardcode di source code atau ikut ter-commit ke git — gunakan `.env` (untuk local) dan secret manager (Vault, AWS Secrets Manager, atau minimal environment variable terenkripsi di platform hosting) untuk production.
- Rotasi secret (JWT signing key, API key pihak ketiga) punya jadwal berkala, dan proses rotasi tidak boleh butuh downtime penuh.
- `.env.example` disediakan di repo (tanpa value asli) supaya jelas variable apa saja yang dibutuhkan.

### 4.8 Payment & Data Sensitif
- **Tidak pernah** menyimpan data kartu pembayaran mentah di database sendiri — selalu delegasikan ke payment gateway (Midtrans/Xendit) dan simpan hanya token/reference ID mereka.
- Webhook dari payment gateway wajib diverifikasi **signature/HMAC**-nya sebelum diproses — jangan percaya body webhook begitu saja.
- Proses webhook harus **idempotent** (kalau gateway kirim event yang sama dua kali karena retry, sistem tidak boleh mencatat pembayaran dobel).
- Data pribadi klien (email, no HP, alamat) diperlakukan sebagai data sensitif: akses dibatasi by-role, dan kalau suatu saat ada fitur export, log siapa yang export dan kapan.

### 4.9 Logging, Monitoring & Error Handling
- Log semua event yang relevan untuk security (login gagal, perubahan password, akses ditolak/403, rate-limit ter-trigger) — simpan terpisah dari log aplikasi biasa (audit log).
- **Jangan pernah** kirim stack trace atau detail error internal ke response API yang dilihat client — cukup pesan generik + kode error, detail lengkap hanya masuk ke log server.
- Setup alert otomatis untuk pola mencurigakan (banyak 401/403 dari satu IP, lonjakan traffic tidak wajar, banyak transaksi gagal berturut-turut).
- Monitoring uptime & performance (misal Sentry untuk error tracking, plus metrics dasar seperti response time dan error rate).

### 4.10 Dependency & Supply Chain Security
- Jalankan audit dependency secara berkala (`npm audit`, atau tools seperti Snyk/Dependabot) sebagai bagian dari CI, bukan manual sesekali.
- Pin versi dependency (lockfile wajib di-commit), review changelog sebelum update mayor terutama untuk library yang berhubungan dengan auth/crypto.
- Hindari menambah dependency baru untuk fungsi kecil yang bisa ditulis sendiri dengan aman — makin sedikit dependency, makin kecil attack surface.

### 4.11 File Upload (logo, lampiran, dll)
- Validasi tipe file berdasarkan **konten asli file** (magic bytes), bukan cuma ekstensi/nama file.
- Batasi ukuran file dan jumlah upload per user per waktu tertentu.
- File yang diupload disimpan di storage terpisah (**Vercel Blob** atau **Supabase Storage** — dipilih karena free tier tidak mewajibkan kartu kredit, beda dari Cloudflare R2 yang sekarang mewajibkan kartu untuk aktivasi) dengan nama file yang di-generate ulang (bukan nama asli dari user) untuk cegah path traversal, dan diberi permission read-only publik hanya untuk file yang memang perlu publik.

### 4.12 Endpoint Internal (Dipanggil GitHub Actions Cron)
- Endpoint seperti `POST /api/v1/internal/process-reminders` **tidak boleh** memakai auth guard user biasa (JWT), karena yang memanggil bukan user login, melainkan sistem eksternal (GitHub Actions).
- Wajib pakai guard terpisah yang memvalidasi **shared secret** dikirim lewat header (mis. `X-Internal-Cron-Secret`), dibandingkan secara constant-time (`crypto.timingSafeEqual`) untuk cegah timing attack, bukan `===` biasa.
- Secret ini disimpan sebagai **GitHub Actions secret** (bukan di kode) dan sebagai environment variable di Vercel — rotasi berkala sama seperti secret lain (lihat 4.7).
- Endpoint ini **tidak boleh terdaftar** di dokumentasi API publik/Swagger yang di-expose ke luar, dan idealnya di-prefix jelas (`/internal/...`) supaya gampang di-exclude dari rate limit publik biasa dan dikasih rate limit sendiri yang lebih longgar (karena pemanggilnya cuma satu sistem terpercaya, bukan banyak user).
- Karena GitHub Actions runner punya IP dinamis (bukan IP tetap), **jangan** mengandalkan IP whitelist sebagai satu-satunya proteksi — shared secret di atas adalah lapisan utama.

---

## 5. CI/CD & Deployment Guideline (Ringkas)

- Setiap PR wajib lolos: lint, type-check, unit test, dan dependency audit sebelum bisa merge.
- Deploy otomatis lewat **Vercel** setiap push ke branch yang sesuai (preview deployment untuk PR, production untuk branch `main`) — tidak ada deploy manual dari local.
- Environment variable production (`DATABASE_URL`, `DIRECT_URL`, secret JWT, `X-Internal-Cron-Secret`, dll) diatur lewat dashboard Vercel, terpisah dari `staging`/`preview` environment.
- **GitHub Actions workflow** (`.github/workflows/process-reminders.yml`) berjalan independen dari pipeline CI/CD di atas — jadwalnya pakai `on: schedule` (cron expression), bukan trigger dari push/PR.
- Rollback plan harus jelas — Vercel menyimpan riwayat deployment, jadi revert ke deployment sebelumnya bisa lewat dashboard/CLI tanpa perlu debug di production dulu.

---

## 6. Frontend Guideline

*(Akan didiskusikan terpisah — belum termasuk dalam dokumen ini.)*
