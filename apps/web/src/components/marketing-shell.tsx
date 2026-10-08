import Link from "next/link";

export function MarketingShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-medium tracking-tight text-primary"
          >
            <LogoMark className="h-6 w-6 text-accent" />
            Faktura
          </Link>
          <nav aria-label="Navigasi utama" className="flex items-center gap-6 text-sm">
            <Link
              href="/features"
              className="text-muted-foreground transition-colors hover:text-primary"
            >
              Fitur
            </Link>
            <Link
              href="/pricing"
              className="text-muted-foreground transition-colors hover:text-primary"
            >
              Harga
            </Link>
            <Link
              href="/auth/login"
              className="text-muted-foreground transition-colors hover:text-primary"
            >
              Masuk
            </Link>
            <Link
              href="/auth/register"
              className="rounded-[0.375rem] bg-primary px-4 py-2 font-medium text-white transition-colors hover:bg-primary/90"
            >
              Coba Gratis
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>
            &copy; {new Date().getFullYear()} Faktura. Dibuat untuk freelancer
            Indonesia.
          </p>
          <nav aria-label="Navigasi footer" className="flex gap-6">
            <Link href="/features" className="hover:text-primary">
              Fitur
            </Link>
            <Link href="/pricing" className="hover:text-primary">
              Harga
            </Link>
          </nav>
        </div>
      </footer>
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
