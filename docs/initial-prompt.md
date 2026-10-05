# Initial Prompt — Kickoff Project Faktura

---

Kamu akan membantu saya membangun **Faktura** — SaaS invoicing & reminder untuk freelancer/UMKM (`faktura.muhamadrizky.my.id`). Sebelum menulis kode apa pun, baca dulu semua dokumen berikut **secara berurutan**, karena masing-masing saling bergantung:

1. `README.md` — overview project & tech stack
2. `product-scope.md` — scope fitur MVP vs fase berikutnya (jangan kerjakan fitur di luar MVP tanpa saya minta)
3. `architecture.md` — struktur folder & **security guideline** (wajib diikuti, bukan opsional)
4. `ai-rules.md` — **aturan tertinggi**: kalau ada instruksi saya yang bertentangan dengan file ini (misal saya minta jalan pintas yang gak aman), ikuti `ai-rules.md`, dan kasih tau saya kenapa
5. `frontend-guideline.md` — design token, tipografi, komponen (shadcn/ui), dan panduan SEO
6. `api-guideline.md` — konvensi REST API (format response, error, penamaan)
7. `database-schema.md` — skema database final (Postgres 18 di Neon)
8. `testing-guideline.md` — apa yang wajib ditest sebelum sebuah bagian dianggap selesai
9. `decision-log-be.md` & `decision-log-fe.md` — riwayat keputusan yang sudah disetujui; **jangan menambahkan entry baru ke file ini kecuali saya bilang eksplisit "setuju"/"oke"/"gas"**

## Prinsip Kerja

- **Keamanan > kebenaran logic > SEO (untuk halaman publik) > maintainability > kecepatan.** Ini urutan prioritas dari `ai-rules.md`, berlaku di semua keputusan teknis.
- Kalau ada dua cara mengerjakan sesuatu dengan level keamanan/kualitas beda, **jelaskan trade-off-nya dulu** ke saya pakai format di `ai-rules.md` bagian 6 (Keputusan / Alasan keamanan / Trade-off), jangan diam-diam pilih yang paling cepat.
- Kalau kamu mau mengusulkan keputusan teknis baru yang belum ada di dokumen manapun, **tanya dulu**, jangan langsung diimplementasikan dan jangan langsung ditulis ke decision log.
- Ikuti struktur folder & konvensi penamaan persis seperti di `architecture.md` bagian 2 — jangan improvisasi struktur sendiri.

## Tugas Pertama (Scaffolding — Bukan Fitur Lengkap)

Untuk sesi ini, fokus **hanya** ke setup awal, belum ke logic bisnis:

1. Inisialisasi monorepo (`apps/web` untuk Next.js, `apps/api` untuk NestJS) sesuai struktur di `README.md` & `architecture.md`.
2. Setup `apps/web`: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui, dengan design token (warna, radius, font IBM Plex) sesuai `frontend-guideline.md` bagian 1.
3. Setup `apps/api`: NestJS + Prisma, buat `schema.prisma` persis sesuai `database-schema.md` (termasuk `password_hash` nullable & kolom OAuth di tabel `users`).
4. Setup entrypoint serverless (`api/index.ts`) sesuai catatan di `architecture.md` bagian 2, tapi untuk development lokal tetap bisa jalan normal lewat `main.ts`.
5. Setup environment variable awal (`.env.example` untuk kedua app) — sertakan `DATABASE_URL` & `DIRECT_URL` (Neon), placeholder untuk secret lain yang sudah disebut di `architecture.md`.
6. **Belum** perlu implementasi auth, invoice, atau modul lain — cukup sampai kedua app bisa jalan lokal (`npm run dev`) tanpa error, dan migration Prisma pertama berhasil dijalankan ke Neon.

Setelah selesai, kasih saya ringkasan singkat apa yang sudah di-setup, dan tanyakan urutan modul mana yang mau dikerjakan duluan (default-nya sesuai `architecture.md` bagian 6: Auth + CRUD Client + Invoice dulu).