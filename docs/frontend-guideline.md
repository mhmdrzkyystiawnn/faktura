# Frontend Guideline
## SaaS Invoice & Reminder untuk Freelancer/UMKM

Dokumen ini melengkapi `architecture.md` (backend & security) dan `ai-rules.md` (aturan AI assistant). Fokusnya: identitas visual, sistem komponen, dan SEO — supaya semua orang (atau AI) yang mengerjakan frontend menghasilkan tampilan yang konsisten, bukan improvisasi sendiri-sendiri.

Konsep visual: **"Ledger & Ink"** — nuansa dokumen resmi/buku besar (navy + brass), bukan template SaaS generik (biru terang + rounded-xl + shadow tebal).

---

## 1. Design Tokens

### 1.1 Warna

**Light mode**
| Token | Hex | Dipakai untuk |
|---|---|---|
| `background` | `#F2F4F7` | Latar halaman |
| `surface` | `#FFFFFF` | Card, panel |
| `primary` (ink navy) | `#132A4C` | Judul, sidebar, elemen struktural |
| `accent` (brass) | `#A47C48` | CTA utama, highlight |
| `text-primary` | `#1C2530` | Teks utama |
| `text-muted` | `#5B6572` | Teks sekunder, label |
| `border` | `#D8DEE7` | Hairline antar elemen |
| `border-strong` | `#B9C2CE` | Pemisah header tabel, divider penting |

**Dark mode**
| Token | Hex | Dipakai untuk |
|---|---|---|
| `background` | `#0D1B2E` | Latar halaman |
| `surface` | `#142238` | Card, panel |
| `primary` | `#E8ECF1` | Judul, teks struktural (invert dari navy) |
| `accent` (brass) | `#C9A461` | CTA utama, highlight |
| `text-primary` | `#E8ECF1` | Teks utama |
| `text-muted` | `#8D98A8` | Teks sekunder |
| `border` | `#24344C` | Hairline |

**Status semantik (sama di kedua mode, dengan bg tint disesuaikan)**
| Status | Warna | Hex |
|---|---|---|
| Lunas | Hijau tua kalem | `#3F7A5D` |
| Jatuh tempo dekat | Oranye-amber | `#C97B2E` |
| Telat | Merah bata | `#B5453A` |

> Warna status ini fixed, tidak boleh dipakai untuk keperluan lain (misal dekorasi), supaya asosiasi user terhadap warna ini konsisten.

### 1.2 Tipografi

Satu superfamily, tiga potongan — **IBM Plex** (open source):

| Font | Peran |
|---|---|
| IBM Plex Serif (medium 500) | Judul besar, nominal total invoice |
| IBM Plex Sans (regular 400 / medium 500) | Semua UI: body, label, tombol, navigasi |
| IBM Plex Mono (regular/medium) | Nomor invoice, tanggal, kode referensi |

**Aturan wajib:**
- Semua angka (nominal uang, tanggal, quantity) memakai `font-variant-numeric: tabular-nums` supaya rata secara digit di dalam tabel.
- Maksimal 2 ketebalan font per konteks (400 & 500) — jangan pakai bold 700 kecuali untuk H1 landing page.
- Line-length body text idealnya < 80 karakter untuk keterbacaan.
- Load font via `next/font/google` (bukan `<link>` runtime) supaya di-self-host otomatis oleh Next.js — lebih cepat & tidak bocor data ke Google Fonts saat runtime.

### 1.3 Radius (border-radius)

Radius berjenjang sesuai hierarki, bukan satu angka untuk semua elemen:

| Elemen | Radius |
|---|---|
| Card / container besar | 12px |
| Button, input, select | 6–8px |
| Badge status | full round (pill) |
| Tabel | 0px di internal (baris/sel), radius hanya di 4 sudut luar container tabel |

### 1.4 Elevasi

Hindari drop-shadow tebal ala kartu SaaS pada umumnya. Elevasi dibuat dengan **hairline border** (1px, warna `border`), bukan `box-shadow: 0 4px 12px rgba(0,0,0,.1)`. Ini yang bikin kesan "kertas berlapis", bukan "kartu app generik".

---

## 2. Component Library — shadcn/ui + Tailwind

Tidak perlu membangun komponen dari nol. Gunakan **shadcn/ui** karena source code komponen di-copy langsung ke project (bukan dependency tertutup), sehingga warna/radius/font bisa di-adjust penuh sesuai token di atas.

### 2.1 Setup theming

- Definisikan semua token warna di atas sebagai **CSS variable** di `globals.css` (light di `:root`, dark di `.dark` atau `[data-theme="dark"]`).
- Extend `tailwind.config.ts` — shadcn default hanya punya `primary`, `secondary`, `destructive`, `accent`, `muted`. Tambahkan token baru: `success`, `warning`, `danger` (untuk status invoice), masing-masing mapping ke variable warna status di atas.
- Ganti `--radius` di `globals.css` ke nilai yang lebih tegas (misal `0.375rem`, bukan default `0.5rem`) — otomatis merambat ke semua komponen turunan.
- Set `font-sans`, `font-serif`, `font-mono` di `tailwind.config.ts` ke IBM Plex Sans/Serif/Mono.

### 2.2 Komponen yang di-add dari awal

`button`, `table`, `badge`, `card`, `input`, `select`, `dialog`, `form` (terintegrasi react-hook-form + zod), `sonner` (toast notifikasi), `dropdown-menu`, `tooltip`.

### 2.3 Pola Table

shadcn `Table` hanya menyediakan markup/styling — tidak ada logic sorting/filter/pagination bawaan. Kombinasikan dengan:
- **TanStack Table** (headless) untuk logic: sorting kolom, filter status, pagination, search client — styling tetap dikontrol penuh lewat shadcn Table markup, jadi tidak perlu bikin logic sorting sendiri dari nol.

**Aturan visual tabel invoice:**
- Kolom teks rata kiri, kolom angka rata kanan dengan tabular numerals.
- Header kolom: font medium, warna `text-muted`, border-bottom `border-strong`.
- Antar baris: hairline `border` tipis, **tanpa** garis vertikal antar kolom.
- Baris total/subtotal dipisah visual dari daftar item: border-top lebih tebal warna `primary`, font lebih besar & serif untuk baris grand total.
- Status ditampilkan sebagai badge pill dengan warna semantik tetap (lihat 1.1).

---

## 3. Fokus SEO

SEO **wajib** diperlakukan sebagai requirement, bukan tambahan di akhir — khususnya karena akuisisi user awal produk ini kemungkinan besar datang dari pencarian organik ("cara bikin invoice otomatis", "aplikasi tagihan freelancer", dll).

### 3.1 Pembagian area: publik vs aplikasi

Ini pembagian paling penting supaya tidak salah kaprah:

| Area | Contoh halaman | Perlakuan SEO |
|---|---|---|
| **Publik (marketing)** | Landing page, pricing, blog/help center, halaman fitur | Full SEO: indexable, metadata lengkap, SSR/SSG |
| **Aplikasi (behind login)** | Dashboard, invoice detail milik user, settings | **`noindex, nofollow`** — data privat tidak boleh muncul di hasil pencarian |
| **Invoice publik (dilihat klien tanpa login)** | Halaman invoice yang dibuka via link oleh klien | `noindex` juga — ini data transaksi personal, jangan sampai ke-crawl walau linknya publik |

### 3.2 Technical SEO (halaman publik)

- Gunakan **Next.js Metadata API** (`generateMetadata`) di setiap halaman publik — title unik & deskriptif per halaman, meta description 150–160 karakter, jangan duplikat antar halaman.
- **Open Graph & Twitter Card** lengkap (title, description, image) di setiap halaman publik yang berpotensi dibagikan.
- **Structured data (JSON-LD)**: `Organization` di seluruh situs, `SoftwareApplication`/`Product` di halaman pricing, `FAQPage` kalau ada bagian FAQ, `Article` untuk halaman blog.
- **Sitemap.xml & robots.txt** digenerate otomatis (Next.js mendukung `sitemap.ts` & `robots.ts`) dan ter-update otomatis saat ada halaman blog/help baru.
- **Canonical URL** eksplisit di setiap halaman publik untuk cegah duplicate content (terutama kalau ada parameter query seperti `?utm_source=`).
- Semua halaman publik pakai **semantic HTML** (satu `<h1>` per halaman, hierarki heading berurutan `h1→h2→h3`, `<nav>`, `<main>`, `<article>` sesuai konteks) — bukan cuma `<div>` semua.
- Gambar wajib punya `alt` text deskriptif, pakai `next/image` untuk lazy-loading & optimasi otomatis.

### 3.3 Performance (Core Web Vitals)

Skor Core Web Vitals mempengaruhi ranking, jadi bukan cuma soal "kelihatan cepat":
- **LCP** (< 2.5s): hero image/text di landing page di-load prioritas (`priority` prop di `next/image` untuk gambar hero), hindari lazy-load elemen above-the-fold.
- **CLS** (< 0.1): selalu set dimensi eksplisit untuk gambar & elemen yang di-load async (skeleton loader dengan tinggi tetap, bukan konten yang "meloncat" saat font/gambar selesai load).
- **INP**: hindari JavaScript blocking di halaman publik; halaman marketing sebaiknya **statis (SSG)** atau **ISR**, bukan client-side rendered penuh, supaya konten inti langsung ada di HTML pertama kali (baik untuk crawler maupun kecepatan).
- Font (IBM Plex) di-load via `next/font` dengan `display: swap` supaya tidak memblokir render teks.

### 3.4 Konten

- Halaman blog/help center harus berisi jawaban nyata atas pertanyaan yang orang cari (contoh: "cara membuat invoice profesional", "template invoice freelancer"), bukan sekadar keyword stuffing.
- Internal linking antar halaman blog/fitur/pricing supaya crawler dan user gampang navigasi.
- URL slug bersih dan deskriptif (`/blog/cara-membuat-invoice-profesional`, bukan `/blog/post?id=123`).

---

## 4. Checklist Sebelum Merilis Halaman Publik Baru

- [ ] Title & meta description unik sudah diisi
- [ ] Open Graph image tersedia
- [ ] Satu `<h1>` saja, hierarki heading benar
- [ ] Semua gambar punya `alt` text
- [ ] Sudah masuk `sitemap.ts`
- [ ] Cek Lighthouse/Core Web Vitals sebelum deploy
- [ ] Halaman behind-login (dashboard, invoice detail) sudah dipastikan `noindex`
