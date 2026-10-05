"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, FileText, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WorkspaceShell } from "@/components/workspace-shell";
import { api } from "@/lib/api";
import { logout } from "@/lib/auth";

type InvoiceStatus = "draft" | "sent" | "viewed" | "paid" | "overdue" | "cancelled";

interface SummaryData {
  totalReceivable: number;
  overdueCount: number;
  monthlyRevenue: number;
  usage: { used: number; limit: number };
  recentInvoices: Array<{
    id: string;
    invoiceNumber: string;
    status: InvoiceStatus;
    dueDate: string;
    total: number;
    currency: string;
    client: { name: string };
  }>;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!localStorage.getItem("accessToken")) {
      window.location.replace("/auth/login");
      return () => { active = false; };
    }

    async function loadSummary() {
      try {
        const res = await api.get<{ data: SummaryData }>("/api/v1/invoices/summary");
        if (active) setSummary(res.data);
      } catch (err) {
        if (!active) return;
        if (typeof err === "object" && err !== null && "status" in err && (err as { status: number }).status === 401) {
          logout();
          window.location.replace("/auth/login");
          return;
        }
        setError("Gagal memuat ringkasan.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSummary();
    return () => { active = false; };
  }, []);

  const planUsed = summary?.usage?.used ?? 0;
  const planLimit = summary?.usage?.limit ?? 5;

  return (
    <WorkspaceShell activePath="/dashboard">
      <main className="mx-auto max-w-7xl px-4 py-8 text-text-primary sm:px-8 lg:py-10">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-sm text-text-muted">Selamat datang kembali,</p>
            <h1 className="font-serif text-3xl font-medium tracking-tight text-primary sm:text-4xl">
              Dashboard
            </h1>
            <p className="mt-2 max-w-xl text-sm text-text-muted">
              Pantau invoice dan arus kas bisnis Anda dari satu tempat.
            </p>
          </div>
          <Button asChild>
            <Link href="/invoices/new">
              <Plus className="h-4 w-4" />
              Buat invoice
            </Link>
          </Button>
        </div>

        {error && (
          <div className="mt-6 border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">
            {error}
          </div>
        )}

        <section aria-labelledby="summary-heading" className="mt-8">
          <h2 id="summary-heading" className="sr-only">Ringkasan keuangan</h2>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}><CardContent className="h-32 animate-pulse bg-muted/40 p-5" /></Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <SummaryCard
                label="Total piutang aktif"
                value={formatCurrency(summary?.totalReceivable ?? 0)}
                detail={(summary?.totalReceivable ?? 0) > 0 ? "Invoice belum lunas" : "Belum ada piutang aktif"}
              />
              <SummaryCard
                label="Invoice overdue"
                value={String(summary?.overdueCount ?? 0)}
                detail={(summary?.overdueCount ?? 0) > 0 ? "Perlu ditindaklanjuti" : "Tidak ada invoice terlambat"}
                tone={(summary?.overdueCount ?? 0) > 0 ? "danger" : "default"}
              />
              <SummaryCard
                label="Revenue bulan ini"
                value={formatCurrency(summary?.monthlyRevenue ?? 0)}
                detail={(summary?.monthlyRevenue ?? 0) > 0 ? "Pembayaran tercatat" : "Belum ada pembayaran"}
                tone={(summary?.monthlyRevenue ?? 0) > 0 ? "success" : "default"}
              />
            </div>
          )}
        </section>

        <section className="mt-8" aria-labelledby="invoice-heading">
          <Card>
            <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="invoice-heading" className="font-serif text-xl font-medium text-primary">Invoice terbaru</h2>
                <p className="mt-1 text-sm text-text-muted">Lima invoice terakhir dari workspace Anda.</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/invoices">Lihat semua</Link>
              </Button>
            </div>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-3 p-6" aria-busy="true" aria-label="Memuat invoice">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 animate-pulse border-b border-border bg-muted/40" />
                  ))}
                </div>
              ) : !summary?.recentInvoices?.length ? (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background text-accent">
                    <FileText className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-medium text-primary">Belum ada invoice</h3>
                  <p className="mt-1 max-w-sm text-sm leading-relaxed text-text-muted">
                    Buat invoice pertama Anda untuk mulai mencatat piutang dan mengelola pembayaran klien.
                  </p>
                  <Button variant="outline" className="mt-5" asChild>
                    <Link href="/invoices/new">
                      Buat invoice pertama
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-text-muted">Invoice</th>
                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-text-muted">Klien</th>
                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-text-muted">Jatuh tempo</th>
                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-text-muted">Status</th>
                        <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-[0.12em] text-text-muted">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.recentInvoices.map((inv) => (
                        <tr key={inv.id} className="border-b border-border last:border-b-0 hover:bg-muted/20">
                          <td className="px-5 py-3">
                            <Link href={`/invoices/${inv.id}`} className="font-mono text-sm text-primary hover:text-accent hover:underline">
                              {inv.invoiceNumber}
                            </Link>
                          </td>
                          <td className="px-5 py-3 text-sm text-text-primary">{inv.client.name}</td>
                          <td className="px-5 py-3 font-mono text-xs text-text-muted">{formatDate(inv.dueDate)}</td>
                          <td className="px-5 py-3"><StatusBadge status={inv.status} /></td>
                          <td className="px-5 py-3 text-right font-serif text-base font-medium text-primary">
                            {formatCurrency(inv.total, inv.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <div className="mt-6 flex items-center justify-between border-t border-border pt-5 text-xs text-text-muted">
          <span>Plan Free &middot; {planUsed} dari {planLimit} invoice bulan ini</span>
          <Link href="/invoices" className="text-accent hover:underline">Lihat semua invoice</Link>
        </div>
      </main>
    </WorkspaceShell>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "danger" | "success";
}) {
  const valueClass = tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : "text-primary";
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-text-muted">{label}</p>
          <Badge variant="outline">Bulan ini</Badge>
        </div>
        <p className={`mt-5 font-serif text-3xl font-medium tabular-nums ${valueClass}`}>{value}</p>
        <p className="mt-2 text-xs text-text-muted">{detail}</p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const labels: Record<InvoiceStatus, string> = { draft: "Draft", sent: "Terkirim", viewed: "Dilihat", paid: "Lunas", overdue: "Terlambat", cancelled: "Dibatalkan" };
  const variants: Record<InvoiceStatus, string> = { draft: "border-border bg-muted/40 text-text-muted", sent: "border-accent/30 bg-accent/10 text-accent", viewed: "border-primary/20 bg-primary/5 text-primary", paid: "border-success/30 bg-success/10 text-success", overdue: "border-danger/30 bg-danger/10 text-danger", cancelled: "border-danger/20 bg-danger/5 text-danger" };
  return <Badge className={`rounded-full border ${variants[status]}`}>{labels[status]}</Badge>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

function formatCurrency(value: number, currency = "IDR") {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}
