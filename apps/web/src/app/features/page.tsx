import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  Printer,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";
import { MarketingShell } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Fitur",
  description:
    "Invoice otomatis, pengiriman lewat email, reminder pembayaran terjadwal, dan dashboard piutang — semua yang freelancer dan UMKM butuhkan untuk menagih klien.",
  alternates: { canonical: "/features" },
  openGraph: {
    title: "Fitur Faktura — Invoice & reminder untuk freelancer",
    description:
      "Invoice otomatis, pengiriman lewat email, reminder pembayaran terjadwal, dan dashboard piutang.",
    url: "/features",
  },
};

const featureGroups = [
  {
    title: "Buat invoice tanpa ribet",
    description:
      "Pilih klien, tambah item, atur pajak dan diskon. Nomor invoice dibuat otomatis dengan format INV-{tahun}-{urutan}, dan total dihitung server-side supaya tidak ada salah hitung.",
    icon: FileText,
    points: [
      "Item tak terbatas per invoice",
      "Pajak persen & diskon nominal",
      "Perhitungan presisi pakai Decimal, bukan float",
    ],
  },
  {
    title: "Kirim dan pantau statusnya",
    description:
      "Kirim invoice langsung ke email klien dalam satu klik. Statusnya ikut bergerak — dari draft, terkirim, dilihat klien, sampai lunas atau telat.",
    icon: Send,
    points: [
      "Klien buka invoice lewat link aman tanpa login",
      "Status otomatis berubah jadi 'dilihat'",
      "Invoice lewat jatuh tempo ditandai otomatis",
    ],
  },
  {
    title: "Reminder otomatis",
    description:
      "Tidak perlu lagi merasa tidak enak menagih. Faktura mengirim pengingat ke klien Anda di H-3, H-1, hari jatuh tempo, dan setelahnya.",
    icon: Bell,
    points: [
      "Terjadwal otomatis begitu invoice dikirim",
      "Berhenti sendiri saat invoice sudah dibayar",
      "Riwayat pengiriman tersimpan",
    ],
  },
  {
    title: "Dashboard piutang",
    description:
      "Satu layar untuk tahu kondisi tagihan Anda: total piutang aktif, berapa invoice yang telat, dan pendapatan bulan berjalan.",
    icon: LayoutDashboard,
    points: [
      "Ringkasan piutang & revenue bulan ini",
      "Filter invoice berdasarkan status",
      "Cari invoice atau klien dengan cepat",
    ],
  },
  {
    title: "Data klien tersimpan",
    description:
      "Simpan nama, email, nomor WhatsApp, dan alamat klien sekali saja. Pembuatan invoice berikutnya jadi jauh lebih cepat.",
    icon: Users,
    points: [
      "Pencarian klien instan",
      "Email klien dipakai untuk kirim invoice & reminder",
    ],
  },
  {
    title: "Cetak atau simpan sebagai PDF",
    description:
      "Butuh arsip atau mau kirim ke bagian keuangan klien? Cetak invoice langsung dari browser dan simpan sebagai PDF — rapi, tanpa aplikasi tambahan.",
    icon: Printer,
    points: [
      "Halaman cetak bersih tanpa elemen aplikasi",
      "Nomor, tanggal, dan total tetap terbaca jelas",
    ],
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Faktura",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Aplikasi invoice dan reminder pembayaran untuk freelancer dan UMKM Indonesia.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "IDR",
  },
};

export default function FeaturesPage() {
  return (
    <MarketingShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-8 sm:py-20">
        <h1 className="font-serif text-3xl font-medium leading-tight text-primary sm:text-4xl">
          Semua yang perlu untuk menagih klien
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Dari membuat invoice sampai menindaklanjuti yang telat bayar —
          dikerjakan otomatis, supaya cash flow Anda tetap terjaga.
        </p>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-4 pb-16 sm:px-8 md:grid-cols-2">
        {featureGroups.map((group) => (
          <Card key={group.title}>
            <CardContent className="p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
                <group.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="mt-4 font-serif text-xl font-medium text-primary">
                {group.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {group.description}
              </p>
              <ul className="mt-4 space-y-2">
                {group.points.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm">
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-success"
                      aria-hidden="true"
                    />
                    <span className="text-foreground">{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-8">
          <ShieldCheck
            className="mx-auto h-8 w-8 text-accent"
            aria-hidden="true"
          />
          <h2 className="mt-4 font-serif text-2xl font-medium text-primary">
            Keamanan bukan fitur tambahan
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Password di-hash dengan Argon2id. Setiap akses invoice discope ke
            akun Anda, jadi tidak ada yang bisa membuka tagihan milik orang lain
            walau menebak ID-nya. Halaman invoice klien memakai token acak yang
            tidak berurutan.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/auth/register">Buat Akun Gratis</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/pricing">Lihat Harga</Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
