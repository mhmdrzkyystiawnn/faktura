# Decision Log — Frontend

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
| 1 | Frontend pakai **Next.js (App Router) + TypeScript + Tailwind CSS** | Butuh SEO untuk landing/pricing sekaligus dashboard app interaktif dalam satu framework | — | — |
| 2 | Komponen UI pakai **shadcn/ui** | Source code komponen dimiliki sendiri (bukan dependency tertutup) sehingga warna/radius/font bisa di-adjust penuh; aksesibilitas sudah dari Radix UI | MUI, Chakra UI | Perlu setup theming manual (CSS variable, extend Tailwind config) |
| 3 | Tabel pakai **shadcn Table (markup/style) + TanStack Table (logic headless)** | Butuh sorting/filter/pagination untuk daftar invoice tanpa membangun logic dari nol | Table bawaan shadcn saja | — |
| 4 | Konsep visual: **"Ledger & Ink"** — navy + brass, terinspirasi dokumen resmi/ledger, bukan template biru + rounded-xl generik | Permintaan eksplisit user: trustworthy & profesional tapi tidak boleh terasa template | Biru terang standar + rounded-xl (ditolak user) | — |
| 5 | Tipografi: **IBM Plex Sans/Serif/Mono** (satu superfamily) | Distinctive dibanding Inter/Roboto; dukungan tabular numerals penting untuk kolom angka di tabel invoice | Inter, Public Sans | — |
| 6 | Skala radius berjenjang: 12px (card), 6–8px (button/input), pill (badge), 0px internal tabel | Menghindari kesan "rounded-xl semua elemen" yang jadi ciri khas template SaaS generik | Radius seragam satu nilai | — |
| 7 | Nama brand: **Faktura** | Terdengar internasional (istilah invoice di beberapa bahasa Eropa) tapi tetap nyambung ke istilah "faktur/faktur pajak" lokal; risiko konflik brand rendah karena kata umum, bukan brand eksklusif pihak lain | Inkline (ditolak — konflik dengan project open-source Vue UI library `inkline.io`), Lunas, Tagia, Notabene | — |
| 8 | Domain: **`faktura.muhamadrizky.my.id`** (subdomain dari domain pribadi) | User sudah punya domain `.my.id` sendiri | Domain baru terpisah | Aturan `noindex` untuk SEO jadi per-path, bukan per-domain (lihat `frontend-guideline.md` 3.1); cookie/CORS di-scope ketat ke subdomain ini saja |

---

## Sedang Dipertimbangkan (Belum Disetujui — Jangan Dianggap Final)

*(Kosong saat ini — isi di sini kalau ada opsi yang masih didiskusikan dan belum ada keputusan final.)*