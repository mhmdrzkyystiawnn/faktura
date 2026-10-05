# API Guideline

Konvensi ini wajib diikuti untuk semua endpoint, supaya API konsisten walau dikerjakan bertahap oleh orang/AI yang berbeda-beda. Untuk aturan keamanan endpoint (auth, rate limit, validasi), lihat `architecture.md` bagian 4 — dokumen ini fokus ke **bentuk/format** API-nya.

---

## 1. Versioning & Base URL

- Semua endpoint diawali `/api/v1/...`
- Breaking change (ubah struktur response, hapus field) wajib naik versi (`/api/v2/...`), bukan mengubah `v1` yang sudah dipakai client lain.
- Field baru yang sifatnya menambah (non-breaking) boleh ditambahkan ke versi yang sama.

## 2. Penamaan Resource

- Gunakan **kata benda jamak**: `/invoices`, `/clients`, `/payments` — bukan `/invoice`, `/getInvoice`.
- Nested resource untuk relasi jelas: `/invoices/:id/items`, `/invoices/:id/reminders`.
- Gunakan `kebab-case` untuk path multi-kata: `/invoice-templates`, bukan `/invoiceTemplates`.
- Query param untuk filter/sort/search, bukan bagian dari path: `/invoices?status=overdue&sort=-due_date`.

## 3. HTTP Method & Status Code

| Method | Kegunaan | Status Sukses |
|---|---|---|
| `GET` | Ambil data (list/detail) | `200` |
| `POST` | Buat resource baru | `201` |
| `PATCH` | Update sebagian field | `200` |
| `PUT` | Replace seluruh resource (jarang dipakai) | `200` |
| `DELETE` | Hapus resource | `204` (no content) |

**Status error yang dipakai:**
| Kode | Kapan Dipakai |
|---|---|
| `400` | Input tidak valid (gagal validasi DTO) |
| `401` | Belum login / token invalid |
| `403` | Sudah login tapi tidak punya akses ke resource ini |
| `404` | Resource tidak ditemukan |
| `409` | Konflik (contoh: nomor invoice duplikat) |
| `422` | Input valid secara format tapi melanggar business rule (contoh: due_date lebih awal dari tanggal invoice) |
| `429` | Kena rate limit |
| `500` | Error internal server (tidak boleh bocorkan detail ke response) |

## 4. Format Response

### 4.1 Sukses (single resource)

```json
{
  "data": {
    "id": "inv_01HZ...",
    "invoiceNumber": "INV-2026-014",
    "status": "paid",
    "total": 2450000,
    "dueDate": "2026-09-20"
  }
}
```

### 4.2 Sukses (list + pagination)

```json
{
  "data": [
    { "id": "inv_01HZ...", "invoiceNumber": "INV-2026-014" }
  ],
  "meta": {
    "page": 1,
    "perPage": 20,
    "totalItems": 143,
    "totalPages": 8
  }
}
```

- Pagination pakai `page` & `perPage` sebagai query param (`?page=2&perPage=20`).
- Default `perPage` = 20, maksimal `100` (mencegah query berat/abuse).

### 4.3 Error

```json
{
  "error": {
    "code": "INVOICE_DUE_DATE_INVALID",
    "message": "Tanggal jatuh tempo tidak boleh sebelum tanggal invoice dibuat.",
    "details": [
      { "field": "dueDate", "issue": "must be after issueDate" }
    ]
  }
}
```

- `code` machine-readable (UPPER_SNAKE_CASE), dipakai frontend untuk logic (contoh: tampilkan pesan khusus).
- `message` human-readable dalam Bahasa Indonesia, aman ditampilkan langsung ke user.
- `details` opsional, khusus untuk error validasi per-field.
- **Tidak pernah** menyertakan stack trace, query SQL, atau path file di response — sesuai `architecture.md` bagian 4.9.

## 5. Penamaan Field

- `camelCase` untuk semua field JSON (`dueDate`, bukan `due_date`), konsisten dengan konvensi TypeScript di frontend.
- Nominal uang selalu dalam satuan **rupiah utuh sebagai integer** (bukan float, bukan dalam sen) — contoh `2450000`, bukan `2450000.00` atau `24500.00` (dalam ribuan). Konversi tampilan (format ribuan, mata uang) dilakukan di frontend.
- Tanggal & waktu selalu format ISO 8601 (`2026-09-20` untuk tanggal, `2026-09-20T14:30:00Z` untuk timestamp), dan disimpan/dikirim dalam UTC — konversi timezone dilakukan di frontend.

## 6. Autentikasi

- Header: `Authorization: Bearer <access_token>`.
- Access token berumur pendek (lihat `architecture.md` 4.1); saat expired, frontend memanggil endpoint refresh (`POST /api/v1/auth/refresh`) yang membaca refresh token dari HttpOnly cookie — bukan dikirim manual oleh client di body.

## 7. Idempotency (Khusus Webhook & Aksi Sensitif)

- Endpoint yang menerima webhook (payment gateway) atau aksi yang berisiko dobel-eksekusi (contoh: retry kirim invoice) wajib menerima/menghasilkan **idempotency key**, supaya request yang sama yang dikirim ulang tidak diproses dua kali.
- Konvensi: client mengirim header `Idempotency-Key: <uuid>` untuk endpoint yang butuh ini; server menyimpan hasil request pertama dan mengembalikan hasil yang sama untuk key yang sama dalam jendela waktu tertentu (misal 24 jam).

## 8. Rate Limit Header

Setiap response (berhasil maupun kena limit) menyertakan header standar supaya frontend bisa menyesuaikan:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1758000000
```

## 9. Contoh Endpoint Inti

| Endpoint | Method | Keterangan |
|---|---|---|
| `/api/v1/auth/register` | POST | Registrasi user baru; email/password menerima status belum terverifikasi |
| `/api/v1/auth/verify-email` | POST | Verifikasi kode email dan menerbitkan token |
| `/api/v1/auth/resend-verification` | POST | Kirim ulang kode verifikasi secara aman |
| `/api/v1/auth/login` | POST | Login; email/password wajib sudah terverifikasi |
| `/api/v1/auth/refresh` | POST | Refresh access token |
| `/api/v1/clients` | GET, POST | List/buat client |
| `/api/v1/clients/:id` | GET, PATCH, DELETE | Detail/update/hapus client |
| `/api/v1/invoices` | GET, POST | List/buat invoice |
| `/api/v1/invoices/:id` | GET, PATCH, DELETE | Detail/update/hapus invoice |
| `/api/v1/invoices/:id/send` | POST | Kirim invoice ke client (email/WA) |
| `/api/v1/invoices/:id/payments` | POST | Catat pembayaran manual |
| `/api/v1/webhooks/midtrans` | POST | Callback payment gateway (verifikasi signature, idempotent) |
| `/api/v1/public/invoices/:token` | GET | Halaman invoice yang dilihat client tanpa login (lihat catatan `noindex` di `frontend-guideline.md`) |
