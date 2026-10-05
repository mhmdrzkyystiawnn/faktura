"use client";

import Link from "next/link";
import { IBM_Plex_Serif } from "next/font/google";

const serif = IBM_Plex_Serif({
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
});

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Header ringkas — cuma tampil di mobile, karena panel kiri di-hide */}
      <header className="flex md:hidden items-center gap-2 px-6 py-5 bg-primary text-primary-foreground">
        <LogoMark className="w-6 h-6 text-accent" />
        <span className="font-medium tracking-tight">Faktura</span>
      </header>

      {/* Panel kiri — brand & visual, disembunyikan di mobile */}
      <aside className="hidden md:flex md:w-[45%] lg:w-[40%] flex-col justify-between bg-primary text-primary-foreground p-8 lg:p-12 relative overflow-hidden">
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none"
          aria-hidden="true"
        >
          <defs>
            <pattern id="ledger" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <line x1="0" y1="40" x2="100%" y2="40" stroke="currentColor" strokeWidth="1" />
              <line x1="0" y1="20" x2="100%" y2="20" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#ledger)" />
        </svg>

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 text-xl font-medium tracking-tight">
            <LogoMark className="w-8 h-8 text-accent" />
            <span>Faktura</span>
          </Link>
        </div>

        <div className="relative z-10 space-y-5 max-w-sm">
          <h1 className={`${serif.className} text-3xl lg:text-4xl font-medium leading-tight`}>
            Invoice profesional, cash flow terjaga
          </h1>
          <div className="w-10 h-px bg-accent" aria-hidden="true" />
          <p className="text-primary-foreground/70 text-base leading-relaxed">
            Faktura bantu freelancer & UMKM buat invoice yang rapi, kirim otomatis, dan dapat
            reminder untuk klien yang telat bayar.
          </p>
        </div>

        <div className="relative z-10 text-sm text-primary-foreground/40">
          © {new Date().getFullYear()} Faktura. Dibuat untuk freelancer Indonesia.
        </div>
      </aside>

      {/* Panel kanan — form */}
      <main className="flex-1 flex flex-col justify-center bg-background px-6 py-12 md:px-12 lg:px-20">
        <div className="w-full max-w-md mx-auto">{children}</div>
      </main>
    </div>
  );
}

function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="24" height="24" rx="3" />
      <line x1="9" y1="10" x2="23" y2="10" />
      <line x1="9" y1="16" x2="23" y2="16" />
      <line x1="9" y1="22" x2="16" y2="22" />
    </svg>
  );
}