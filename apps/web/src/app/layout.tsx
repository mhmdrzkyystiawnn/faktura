import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Serif, IBM_Plex_Mono } from "next/font/google";
import { Toaster } from "@/components/sonner";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const ibmPlexSerif = IBM_Plex_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Faktura — Invoice & Reminder untuk Freelancer/UMKM",
    template: "%s | Faktura",
  },
  description:
    "Faktura: buat invoice profesional, kirim otomatis, dan dapat reminder pembayaran untuk klien yang telat bayar. Gratis untuk freelancer dan UMKM.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    siteName: "Faktura",
    title: "Faktura — Invoice & Reminder untuk Freelancer/UMKM",
    description:
      "Buat invoice profesional, kirim otomatis, dan dapat reminder pembayaran untuk klien yang telat bayar.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Faktura — Invoice & Reminder untuk Freelancer/UMKM",
    description:
      "Buat invoice profesional, kirim otomatis, dan dapat reminder pembayaran untuk klien yang telat bayar.",
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${ibmPlexSans.variable} ${ibmPlexSerif.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
