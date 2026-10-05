"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Pencil, Send, Trash2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  subtotal: number;
  taxPercent: number;
  discountAmount: number;
  total: number;
  currency: string;
  client: { name: string; email: string | null; phone: string | null };
  items: Array<{ id: string; description: string; quantity: number; unitPrice: number; subtotal: number }>;
}

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadInvoice() {
      try {
        const response = await api.get<{ data: Invoice }>(`/api/v1/invoices/${params.id}`);
        if (active) setInvoice(response.data);
      } catch (requestError) {
        if (!active) return;
        if (isUnauthorized(requestError)) {
          logout();
          window.location.replace("/auth/login");
          return;
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

    void loadInvoice();
    return () => {
      active = false;
    };
  }, [params.id]);

  async function handleDelete() {
    if (!invoice) return;
    setDeleting(true);
    setError(null);
    try {
      await api.del(`/api/v1/invoices/${invoice.id}`);
      router.replace("/invoices");
    } catch (requestError) {
      if (isUnauthorized(requestError)) {
        logout();
        window.location.replace("/auth/login");
        return;
      }
      setError(requestError instanceof Error ? requestError.message : "Gagal menghapus invoice.");
      setDeleting(false);
    }
  }

  async function handleSend() {
    if (!invoice) return;
    setSending(true);
    setError(null);
    try {
      const res = await api.patch<{ data: Invoice }>(`/api/v1/invoices/${invoice.id}/send`);
      setInvoice(res.data);
    } catch (requestError) {
      if (isUnauthorized(requestError)) {
        logout();
        window.location.replace("/auth/login");
        return;
      }
      setError(requestError instanceof Error ? requestError.message : "Gagal mengubah status invoice.");
    } finally {
      setSending(false);
    }
  }

  async function handleCancel() {
    if (!invoice) return;
    setCancelling(true);
    setError(null);
    try {
      const res = await api.patch<{ data: Invoice }>(`/api/v1/invoices/${invoice.id}/cancel`);
      setInvoice(res.data);
      setCancelOpen(false);
    } catch (requestError) {
      if (isUnauthorized(requestError)) {
        logout();
        window.location.replace("/auth/login");
        return;
      }
      setError(requestError instanceof Error ? requestError.message : "Gagal membatalkan invoice.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <WorkspaceShell activePath="/invoices">
      <main className="mx-auto max-w-7xl px-4 py-8 text-text-primary sm:px-8 lg:py-10">
        <div className="mx-auto max-w-5xl">
          {loading ? (
            <DetailSkeleton />
          ) : error || !invoice ? (
            <div className="border border-danger/30 bg-danger/5 px-5 py-4 text-sm text-danger" role="alert">
              {error || "Invoice tidak ditemukan."}
            </div>
          ) : (
            <>
              <header className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <Link href="/invoices" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-primary">
                    <ArrowLeft className="h-4 w-4" />
                    Kembali ke invoice
                  </Link>
                  <p className="mt-5 font-mono text-xs uppercase tracking-[0.14em] text-text-muted">
                    Workspace / Detail invoice
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <h1 className="font-mono text-2xl font-medium text-primary sm:text-3xl">{invoice.invoiceNumber}</h1>
                    <StatusBadge status={invoice.status} />
                  </div>
                  <p className="mt-2 text-sm text-text-muted">Untuk {invoice.client.name}</p>
                </div>
                {invoice.status === "draft" ? (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" asChild>
                      <Link href={`/invoices/${invoice.id}/edit`}><Pencil className="h-4 w-4" />Edit</Link>
                    </Button>
                    <Button variant="ghost" className="text-danger hover:bg-danger/10" onClick={() => setDeleteOpen(true)}>
                      <Trash2 className="h-4 w-4" />Hapus
                    </Button>
                    <Button onClick={handleSend} disabled={sending}>
                      <Send className="h-4 w-4" />{sending ? "Memproses..." : "Tandai Terkirim"}
                    </Button>
                  </div>
                ) : invoice.status === "cancelled" || invoice.status === "paid" ? null : (
                  <Button variant="ghost" className="text-danger hover:bg-danger/10" onClick={() => setCancelOpen(true)}>
                    <XCircle className="h-4 w-4" />Batalkan invoice
                  </Button>
                )}
              </header>

              {error && <div className="mt-6 border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">{error}</div>}

              <section className="mt-7 grid gap-4 sm:grid-cols-3" aria-label="Informasi invoice">
                <InfoCard label="Klien" value={invoice.client.name} detail={invoice.client.email || invoice.client.phone || "Kontak belum diisi"} />
                <InfoCard label="Tanggal invoice" value={formatDate(invoice.issueDate)} detail="Tanggal penerbitan" icon={<CalendarDays className="h-4 w-4" />} />
                <InfoCard label="Jatuh tempo" value={formatDate(invoice.dueDate)} detail="Batas pembayaran" icon={<CalendarDays className="h-4 w-4" />} />
              </section>

              <Card className="mt-6">
                <CardHeader className="border-b border-border px-5 py-4">
                  <CardTitle className="font-serif text-xl font-medium text-primary">Rincian tagihan</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Deskripsi</TableHead>
                          <TableHead align="right">Qty</TableHead>
                          <TableHead align="right">Harga satuan</TableHead>
                          <TableHead align="right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoice.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.description}</TableCell>
                            <TableCell align="right">{item.quantity}</TableCell>
                            <TableCell align="right">{formatCurrency(item.unitPrice, invoice.currency)}</TableCell>
                            <TableCell align="right" className="font-medium text-primary">{formatCurrency(item.subtotal, invoice.currency)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="ml-auto max-w-sm space-y-3 border-t border-primary p-5">
                    <AmountLine label="Subtotal" value={invoice.subtotal} currency={invoice.currency} />
                    <AmountLine label={`Pajak (${invoice.taxPercent}%)`} value={invoice.total - invoice.subtotal + invoice.discountAmount} currency={invoice.currency} />
                    <AmountLine label="Diskon" value={-invoice.discountAmount} currency={invoice.currency} negative />
                    <div className="flex items-end justify-between gap-4 border-t border-border pt-3">
                      <span className="text-sm font-medium text-text-muted">Total</span>
                      <span className="font-serif text-2xl font-medium tabular-nums text-primary">{formatCurrency(invoice.total, invoice.currency)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus invoice?</DialogTitle>
            <DialogDescription>Invoice {invoice?.invoiceNumber} akan dihapus dan tidak dapat dipulihkan.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Menghapus..." : "Hapus invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={(open) => !cancelling && setCancelOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batalkan invoice?</DialogTitle>
            <DialogDescription>
              Invoice {invoice?.invoiceNumber} akan ditandai sebagai dibatalkan. Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={cancelling}>Kembali</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? "Membatalkan..." : "Ya, batalkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WorkspaceShell>
  );
}

function DetailSkeleton() {
  return <div className="space-y-6" aria-busy="true" aria-label="Memuat detail invoice"><div className="h-28 animate-pulse border-b border-border bg-muted/40" /><div className="h-32 animate-pulse border border-border bg-muted/40" /><div className="h-64 animate-pulse border border-border bg-muted/40" /></div>;
}

function InfoCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon?: React.ReactNode }) {
  return <Card><CardContent className="p-5"><p className="text-xs uppercase tracking-[0.12em] text-text-muted">{label}</p><p className="mt-3 flex items-center gap-2 font-medium text-primary">{icon}{value}</p><p className="mt-1 text-xs text-text-muted">{detail}</p></CardContent></Card>;
}

function AmountLine({ label, value, currency, negative = false }: { label: string; value: number; currency: string; negative?: boolean }) {
  return <div className="flex items-center justify-between gap-4 text-sm"><span className="text-text-muted">{label}</span><span className={`tabular-nums ${negative ? "text-danger" : "text-text-primary"}`}>{formatCurrency(value, currency)}</span></div>;
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const labels: Record<InvoiceStatus, string> = { draft: "Draft", sent: "Terkirim", viewed: "Dilihat", paid: "Lunas", overdue: "Terlambat", cancelled: "Dibatalkan" };
  const styles: Record<InvoiceStatus, string> = { draft: "border-border bg-muted/40 text-text-muted", sent: "border-accent/30 bg-accent/10 text-accent", viewed: "border-primary/20 bg-primary/5 text-primary", paid: "border-success/30 bg-success/10 text-success", overdue: "border-danger/30 bg-danger/10 text-danger", cancelled: "border-danger/20 bg-danger/5 text-danger" };
  return <Badge className={`rounded-full border ${styles[status]}`}>{labels[status]}</Badge>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

function isUnauthorized(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error && (error as { status: number }).status === 401;
}