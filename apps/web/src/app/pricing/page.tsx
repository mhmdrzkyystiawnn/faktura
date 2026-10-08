import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { MarketingShell } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { pricing } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Harga",
  description:
    "Mulai gratis dengan 5 invoice per bulan. Upgrade ke Pro saat bisnis Anda butuh invoice tanpa batas. Tanpa biaya tersembunyi.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Harga Faktura — Gratis untuk memulai",
    description:
      "Mulai gratis dengan 5 invoice per bulan. Upgrade ke Pro saat bisnis Anda butuh invoice tanpa batas.",
    url: "/pricing",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Faktura",
  description:
    "Aplikasi invoice dan reminder pembayaran untuk freelancer dan UMKM Indonesia.",
  offers: [
    {
      "@type": "Offer",
      name: "Free",
      price: "0",
      priceCurrency: "IDR",
    },
  ],
};

export default function PricingPage() {
  return (
    <MarketingShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-8 sm:py-20">
        <h1 className="font-serif text-3xl font-medium leading-tight text-primary sm:text-4xl">
          Harga sederhana, tanpa kejutan
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Mulai gratis hari ini. Naik ke Pro hanya kalau Anda memang butuh
          menagih lebih banyak setiap bulan.
        </p>
      </section>

      <section className="mx-auto grid max-w-4xl gap-6 px-4 pb-20 sm:px-8 md:grid-cols-2">
        <PlanCard plan={pricing.free} />
        <PlanCard plan={pricing.pro} highlighted />
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
          <h2 className="font-serif text-2xl font-medium text-primary">
            Pertanyaan umum
          </h2>
          <dl className="mt-8 space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q}>
                <dt className="font-medium text-primary">{faq.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {faq.a}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </MarketingShell>
  );
}

function PlanCard({
  plan,
  highlighted = false,
}: {
  plan: (typeof pricing)["free"] | (typeof pricing)["pro"];
  highlighted?: boolean;
}) {
  return (
    <Card className={highlighted ? "border-border-strong" : undefined}>
      <CardHeader className="border-b border-border px-6 py-5">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {plan.name}
        </p>
        <p className="mt-3 font-serif text-3xl font-medium text-primary">
          {plan.priceLabel}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{plan.tagline}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 p-6">
        <ul className="space-y-3">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-sm">
              <Check
                className="mt-0.5 h-4 w-4 shrink-0 text-success"
                aria-hidden="true"
              />
              <span className="text-foreground">{feature}</span>
            </li>
          ))}
        </ul>
        <Button
          asChild
          variant={highlighted ? "default" : "outline"}
          className="w-full"
        >
          <Link href={plan.cta.href}>{plan.cta.label}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

const faqs = [
  {
    q: "Apakah plan Free benar-benar gratis?",
    a: "Ya. Anda bisa membuat sampai 5 invoice per bulan tanpa biaya, tanpa kartu kredit, dan tanpa batas waktu.",
  },
  {
    q: "Bagaimana kalau saya butuh lebih dari 5 invoice sebulan?",
    a: "Itu tujuan plan Pro. Detail dan harga Pro sedang kami siapkan — daftar dulu, kami kabari begitu tersedia.",
  },
  {
    q: "Apakah data invoice saya aman?",
    a: "Password disimpan dalam bentuk hash Argon2id, akses invoice selalu discope ke akun Anda, dan halaman invoice klien memakai token acak yang tidak bisa ditebak.",
  },
];
