"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bell,
  ChevronDown,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { logout } from "@/lib/auth";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Invoice", href: "/invoices", icon: FileText },
  { label: "Klien", href: "/clients", icon: Users },
];

export function WorkspaceShell({
  activePath,
  children,
}: {
  activePath: string;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState("Pemilik akun");

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      window.location.replace("/auth/login");
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1])) as {
        name?: string;
        email?: string;
      };
      setUserName(payload.name || payload.email?.split("@")[0] || "Pemilik akun");
    } catch {
      // The API remains the source of truth for auth.
    }
  }, []);

  function handleLogout() {
    logout();
    window.location.replace("/auth/login");
  }

  return (
    <div className="min-h-screen bg-background text-text-primary">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Tutup navigasi"
          className="fixed inset-0 z-30 bg-primary/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-primary-foreground/10 bg-primary text-primary-foreground transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-primary-foreground/10 px-6">
          <Link href="/" className="flex items-center gap-2 text-xl font-medium tracking-tight">
            <LogoMark className="h-7 w-7 text-accent" />
            Faktura
          </Link>
          <button
            type="button"
            aria-label="Tutup navigasi"
            className="rounded-md p-1 text-primary-foreground/70 hover:bg-primary-foreground/10 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav aria-label="Navigasi utama" className="flex-1 space-y-1 px-3 py-6">
          <p className="px-3 pb-3 text-[0.65rem] font-medium uppercase tracking-[0.16em] text-primary-foreground/45">
            Workspace
          </p>
          {navigation.map(({ label, href, icon: Icon }) => {
            const active = activePath === href;
            return (
              <Link
                key={label}
                href={href}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-accent text-primary"
                    : "text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}

          <p className="px-3 pb-3 pt-8 text-[0.65rem] font-medium uppercase tracking-[0.16em] text-primary-foreground/45">
            Pengaturan
          </p>
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-primary-foreground/70 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <Settings className="h-4 w-4" />
            Pengaturan
          </Link>
        </nav>

        <div className="border-t border-primary-foreground/10 p-4">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <Avatar alt={userName} size="sm" className="bg-accent/20 text-accent" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{userName}</p>
              <p className="text-xs text-primary-foreground/50">Plan Free</p>
            </div>
            <button
              type="button"
              aria-label="Keluar dari akun"
              className="rounded-md p-1.5 text-primary-foreground/55 hover:bg-primary-foreground/10 hover:text-primary-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur sm:px-8">
          <button
            type="button"
            aria-label="Buka navigasi"
            className="rounded-md p-2 text-text-muted hover:bg-accent/10 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="hidden font-mono text-xs uppercase tracking-[0.14em] text-text-muted lg:block">
            Workspace / {activePath === "/clients" ? "Klien" : activePath === "/invoices" ? "Invoice" : "Dashboard"}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              aria-label="Notifikasi"
              className="relative rounded-md p-2 text-text-muted hover:bg-accent/10 hover:text-primary"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
            </button>
            <div className="ml-1 hidden h-6 w-px bg-border sm:block" />
            <span className="hidden text-sm text-text-muted sm:block">{userName}</span>
            <ChevronDown className="hidden h-4 w-4 text-text-muted sm:block" />
          </div>
        </header>
        {children}
      </div>
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
