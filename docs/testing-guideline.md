# Testing Guideline

Strategi testing untuk memastikan logic bisnis (terutama yang berhubungan dengan uang) tidak salah, dan celah keamanan dari `architecture.md`/`ai-rules.md` benar-benar diterapkan, bukan cuma didokumentasikan.

---

## 1. Prinsip Utama

> **Kode yang berhubungan dengan uang atau keamanan tidak boleh merge tanpa test.**
  Kode UI murni (styling, copy) boleh lebih longgar.

Sama seperti prinsip di `ai-rules.md`: kalau ada trade-off antara "cepat selesai" vs "ada test yang memadai" untuk kode kritikal (perhitungan invoice, auth, payment), **test yang menang**.

## 2. Piramida Testing & Tools

| Level | Tools | Porsi | Fokus |
|---|---|---|---|
| Unit test | Jest (backend & frontend) | Paling banyak | Logic murni: kalkulasi total invoice, validasi DTO, util functions |
| Integration test | Jest + Supertest (backend), Testing Library (frontend) | Menengah | Endpoint API end-to-end dengan DB test, komponen React dengan interaksi user |
| E2E test | Playwright | Paling sedikit, tapi mencakup alur kritikal | Alur penuh: register → buat invoice → kirim → bayar → status update |

## 3. Yang **Wajib** Ditest (Tidak Bisa Ditawar)

### 3.1 Kalkulasi Uang
- Perhitungan `subtotal`, `tax`, `discount`, `total` di invoice — termasuk edge case: diskon lebih besar dari subtotal, pajak 0%, quantity desimal.
- Validasi bahwa total pembayaran (`payments`) tidak bisa melebihi total invoice.
- Pembulatan nominal (Decimal, bukan float) — test khusus untuk memastikan tidak ada floating point error (contoh: `0.1 + 0.2` masalah klasik).

### 3.2 Auth & Otorisasi
- Login dengan credential salah → ditolak dengan pesan generik (bukan bocorin "email tidak ditemukan" vs "password salah" — mencegah user enumeration).
- Refresh token rotation: token lama tidak bisa dipakai lagi setelah refresh.
- **IDOR test**: user A mencoba akses/edit invoice milik user B via ID langsung → harus `403`/`404`, bukan berhasil.
- Rate limit login benar-benar men-trigger setelah percobaan gagal berulang (lihat `architecture.md` 4.4).

### 3.3 Payment Webhook
- Signature/HMAC verification: webhook dengan signature invalid **ditolak**.
- Idempotency: webhook yang sama dikirim dua kali (simulasi retry gateway) tidak mencatat pembayaran dobel.

### 3.4 Reminder Scheduling
- Reminder di-generate dengan `scheduled_at` yang benar sesuai `due_date` (H-3, H-1, H, H+lewat).
- Job tidak mengirim reminder dua kali untuk `scheduled_at` yang sama (cek `sent_at`).

## 4. Yang Disarankan (Tidak Blocking Merge, Tapi Sebaiknya Ada)

- Komponen form (validasi react-hook-form + zod) — test bahwa error message muncul sesuai input invalid.
- Snapshot test untuk generate PDF invoice (bandingkan struktur, bukan visual pixel-perfect).
- Test aksesibilitas dasar (contoh: `axe-core`) untuk halaman form utama.

## 5. Testing untuk SEO (Terhubung ke `frontend-guideline.md`)

- Lighthouse CI dijalankan otomatis di pipeline untuk halaman publik (landing, pricing) — gagal build kalau skor Performance/SEO turun di bawah ambang batas yang disepakati.
- Test otomatis bahwa halaman behind-login (dashboard, invoice detail) benar-benar mengembalikan header `X-Robots-Tag: noindex` atau meta `noindex` — supaya tidak ada regresi yang bikin data personal ke-index tanpa sengaja.

## 6. CI Requirement

Sesuai `architecture.md` bagian 5 — setiap PR wajib lolos sebelum merge:
1. Lint & type-check
2. Unit test (coverage minimum untuk module `invoices`, `payments`, `auth` — angka spesifik ditentukan tim, tapi tidak boleh `0%`)
3. Integration test endpoint kritikal (auth, invoice, webhook)
4. Dependency audit (`npm audit` / Snyk)

E2E test (Playwright) dijalankan di pipeline staging sebelum deploy ke production, tidak wajib di setiap PR kecuali menyentuh alur kritikal (checkout/payment flow).

## 7. Data Testing

- Gunakan database terpisah untuk testing (bukan development database), di-reset/seed ulang tiap run.
- **Tidak pernah** menggunakan data production (termasuk data client/invoice asli) untuk testing, walau sudah "dianonimkan sebagian" — gunakan data dummy yang dibuat oleh factory/seeder.
- Kredensial payment gateway untuk testing memakai **sandbox/test mode** resmi dari Midtrans/Xendit, tidak pernah kredensial production.
