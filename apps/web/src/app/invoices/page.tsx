"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, FileText, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WorkspaceShell } from "@/components/workspace-shell";
import { api } from "@/lib/api";
import { logout } from "@/lib/auth";

type InvoiceStatus = "draft" | "sent" | "viewed" | "paid" | "overdue" | "cancelled";

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  total: number;
  currency: string;
  client: { name: string };
}

interface InvoiceListResponse {
  data: Invoice[];
  meta: {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
  };
}

const statusOptions: Array<{ value: InvoiceStatus | "all"; label: string }> = [
  { value: "all", label: "Semua status" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Terkirim" },
  { value: "viewed", label: "Dilihat" },
  { value: "paid", label: "Lunas" },
  { value: "overdue", label: "Terlambat" },
  { value: "cancelled", label: "Dibatalkan" },
];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [status, setStatus] = useState<InvoiceStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadInvoices() {
      setLoading(true);
      setError(null);
      const query = status === "all" ? "" : `&status=${status}`;

      try {
        const response = await api.get<InvoiceListResponse>(
          `/api/v1/invoices?page=1&perPage=100${query}`,
        );
        if (active) setInvoices(response.data);
      } catch (requestError) {
        if (!active) return;
        if (typeof requestError === "object" && requestError !== null && "status" in requestError) {
          if ((requestError as { status: number }).status === 401) {
            logout();
            window.location.replace("/auth/login");
            return;
          }
        }
        setError(requestError instanceof Error ? requestError.message : "Gagal memuat invoice.");
      } finally {
        if (active) setLoading(false);
      }
    }

    if (!localStorage.getItem("accessToken")) {
      window.location.replace("/auth/login");
      return () => {
        active = false;
      };
    }

    void loadInvoices();
    return () => {
      active = false;
    };
  }, [status]);

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return invoices;
    return invoices.filter((invoice) =>
      [invoice.invoiceNumber, invoice.client.name]
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [invoices, search]);

  const totals = useMemo(
    () => ({
      active: invoices.filter((invoice) => !["paid", "cancelled"].includes(invoice.status)).length,
      overdue: invoices.filter((invoice) => invoice.status === "overdue").length,
      paid: invoices.filter((invoice) => invoice.status === "paid").length,
    }),
    [invoices],
  );

  return (
    <WorkspaceShell activePath="/invoices">
      <main className="mx-auto max-w-7xl px-4 py-8 text-text-primary sm:px-8 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <header className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-text-muted">
                Workspace / Invoice
              </p>
              <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight text-primary">
                Daftar invoice
              </h1>
              <p className="mt-2 max-w-xl text-sm text-text-muted">
                Pantau tagihan, status pembayaran, dan jatuh tempo klien.
              </p>
            </div>
            <Button asChild>
              <Link href="/invoices/new">
                <Plus className="h-4 w-4" />
                Buat invoice
              </Link>
            </Button>
          </header>

          <section aria-label="Ringkasan invoice" className="mt-7 grid gap-4 sm:grid-cols-3">
            <Summary label="Invoice aktif" value={totals.active} detail="Belum lunas atau dibatalkan" />
            <Summary label="Terlambat" value={totals.overdue} detail="Perlu ditindaklanjuti" tone="danger" />
            <Summary label="Lunas" value={totals.paid} detail="Pembayaran tercatat" tone="success" />
          </section>

          <section className="mt-7" aria-labelledby="invoice-list-heading">
            <Card>
              <div className="flex flex-col gap-4 border-b border-border p-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 id="invoice-list-heading" className="font-serif text-xl font-medium text-primary">
                    Semua invoice
                  </h2>
                  <p className="mt-1 text-sm text-text-muted">
                    {filteredInvoices.length} invoice ditampilkan
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative w-full sm:w-64">
                    <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
                    <Input
                      aria-label="Cari nomor invoice atau klien"
                      placeholder="Cari invoice atau klien..."
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={status} onValueChange={(value) => setStatus(value as InvoiceStatus | "all")}>
                    <SelectTrigger aria-label="Filter status invoice" className="w-full sm:w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {error && (
                <div className="mx-5 mt-5 border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">
                  {error}
                </div>
              )}

              <CardContent className="p-0">
                {loading ? (
                  <div className="space-y-3 p-6" aria-busy="true" aria-label="Memuat invoice">
                    {[1, 2, 3, 4].map((item) => (
                      <div key={item} className="h-14 animate-pulse border-b border-border bg-muted/40" />
                    ))}
                  </div>
                ) : filteredInvoices.length === 0 ? (
                  <EmptyState hasSearch={Boolean(search || status !== "all")} />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice</TableHead>
                          <TableHead>Klien</TableHead>
                          <TableHead>Jatuh tempo</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead align="right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInvoices.map((invoice) => (
                          <TableRow key={invoice.id} hover>
                            <TableCell>
                              <Link href={`/invoices/${invoice.id}`} className="font-mono text-sm text-primary hover:text-accent hover:underline">
                                {invoice.invoiceNumber}
                              </Link>
                              <p className="mt-1 text-xs text-text-muted">
                                Dibuat {formatDate(invoice.issueDate)}
                              </p>
                            </TableCell>
                            <TableCell className="font-medium text-text-primary">{invoice.client.name}</TableCell>
                            <TableCell className="font-mono text-xs text-text-muted">
                              {formatDate(invoice.dueDate)}
                            </TableCell>
                            <TableCell><StatusBadge status={invoice.status} /></TableCell>
                            <TableCell align="right" className="font-serif text-base font-medium text-primary">
                              {formatCurrency(invoice.total, invoice.currency)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <div className="mt-6 flex items-center justify-between border-t border-border pt-5 text-xs text-text-muted">
            <span>Plan Free · {invoices.length} invoice ditampilkan</span>
            <Link href="/dashboard" className="inline-flex items-center gap-1 text-accent hover:underline">
              Kembali ke dashboard <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </main>
    </WorkspaceShell>
  );
}

function Summary({ label, value, detail, tone = "default" }: { label: string; value: number; detail: string; tone?: "default" | "danger" | "success" }) {
  const valueClass = tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : "text-primary";
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-text-muted">{label}</p>
        <p className={`mt-4 font-serif text-3xl font-medium tabular-nums ${valueClass}`}>{value}</p>
        <p className="mt-2 text-xs text-text-muted">{detail}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center" role="status">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background text-accent">
        {hasSearch ? <Search className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
      </div>
      <h3 className="mt-4 font-medium text-primary">
        {hasSearch ? "Invoice tidak ditemukan" : "Belum ada invoice"}
      </h3>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-text-muted">
        {hasSearch ? "Coba ubah kata kunci atau filter status." : "Buat invoice pertama untuk mulai mencatat piutang."}
      </p>
      {!hasSearch && (
        <Button variant="outline" className="mt-5" asChild>
          <Link href="/invoices/new"><Plus className="h-4 w-4" />Buat invoice pertama</Link>
        </Button>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const labels: Record<InvoiceStatus, string> = {
    draft: "Draft",
    sent: "Terkirim",
    viewed: "Dilihat",
    paid: "Lunas",
    overdue: "Terlambat",
    cancelled: "Dibatalkan",
  };
  const variants: Record<InvoiceStatus, string> = {
    draft: "border-border bg-muted/40 text-text-muted",
    sent: "border-accent/30 bg-accent/10 text-accent",
    viewed: "border-primary/20 bg-primary/5 text-primary",
    paid: "border-success/30 bg-success/10 text-success",
    overdue: "border-danger/30 bg-danger/10 text-danger",
    cancelled: "border-danger/20 bg-danger/5 text-danger",
  };
  return <Badge className={`rounded-full border ${variants[status]}`}>{labels[status]}</Badge>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}