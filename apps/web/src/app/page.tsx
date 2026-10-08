import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="flex flex-col min-h-screen">
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center">
        <Badge variant="secondary" className="mb-4">
          Untuk Freelancer & UMKM
        </Badge>
        <h1 className="font-serif font-medium text-4xl sm:text-5xl text-primary max-w-2xl leading-tight">
          Invoice profesional,
          <br />
          <span className="text-accent">cash flow terjaga.</span>
        </h1>
        <p className="mt-6 text-muted-foreground text-lg max-w-xl">
          Faktura bantu freelancer & UMKM buat invoice yang rapi, kirim
          otomatis, dan dapat reminder untuk klien yang telat bayar — tanpa
          kerja manual.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" asChild>
            <Link href="/pricing">Mulai Gratis</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/features">Lihat Fitur</Link>
          </Button>
        </div>
      </section>

      <section className="py-16 px-4 bg-surface border-y border-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif font-medium text-2xl text-primary text-center mb-12">
            Semua yang perlu buat invoice dan tagih klien
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="h-full">
                <CardContent className="p-6">
                  <h3 className="font-medium text-primary text-lg mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 text-center">
        <Card className="max-w-xl mx-auto border-border-strong">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Siap mulai?</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6">
              Daftar gratis dan buat invoice pertama dalam beberapa menit.
            </p>
            <Button size="lg" asChild>
              <Link href="/auth/register">Buat Akun Gratis</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <footer className="py-8 px-4 border-t border-border text-sm text-muted-foreground text-center">
        <p>
          &copy; {new Date().getFullYear()} Faktura. Dibuat untuk freelancer
          Indonesia.
        </p>
      </footer>
    </main>
  );
}

const features = [
  {
    title: "Invoice Otomatis",
    desc: "Nomor invoice auto-generated (INV-{tahun}-{urutan}). Pilih klien, tambah item, set pajak & diskon, cetak PDF.",
  },
  {
    title: "Kirim Lewat Email",
    desc: "Kirim invoice langsung ke email klien dalam satu klik. Status ikut update saat klien membuka.",
  },
  {
    title: "Reminder Otomatis",
    desc: "H-3, H-1, hari jatuh tempo, dan setelah lewat — reminder otomatis dikirim biar tidak ada invoice yang terelupakan.",
  },
  {
    title: "Dashboard Ringkas",
    desc: "Total piutang aktif, invoice yang masuk overdue, dan revenue bulan berjalan — satu layar, langsung tahu kondisi keuangan.",
  },
  {
    title: "Login dengan Google",
    desc: "Signup cepat pakai akun Google. Atau daftar pakai email & password sesuai preferensi.",
  },
  {
    title: "Gratis untuk 5 Invoice/bulan",
    desc: "Plan Free cukup buat freelancer yang baru mulai. Upgrade ke Pro kalau butuh lebih banyak.",
  },
];
