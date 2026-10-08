"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WorkspaceShell } from "@/components/workspace-shell";
import { api } from "@/lib/api";
import { logout } from "@/lib/auth";

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: "draft" | "sent" | "viewed" | "paid" | "overdue" | "cancelled";
  issueDate: string;
  dueDate: string;
  subtotal: number;
  taxPercent: number;
  discountAmount: number;
  total: number;
  items: Array<{ id: string; description: string; quantity: number; unitPrice: number }>;
}

interface ItemForm {
  id: number;
  description: string;
  quantity: string;
  unitPrice: string;
}

export default function EditInvoicePage() {
  const params = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [taxPercent, setTaxPercent] = useState("0");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [items, setItems] = useState<ItemForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadInvoice() {
      try {
        const response = await api.get<{ data: Invoice }>(`/api/v1/invoices/${params.id}`);
        if (!active) return;
        const data = response.data;
        setInvoice(data);
        setIssueDate(toDateInput(data.issueDate));
        setDueDate(toDateInput(data.dueDate));
        setTaxPercent(String(data.taxPercent));
        setDiscountAmount(String(data.discountAmount));
        setItems(data.items.map((item, index) => ({
          id: index + 1,
          description: item.description,
          quantity: String(item.quantity),
          unitPrice: String(item.unitPrice),
        })));
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

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
    const discount = Math.max(0, Number(discountAmount || 0));
    const taxable = Math.max(0, subtotal - discount);
    const tax = taxable * (Number(taxPercent || 0) / 100);
    return { subtotal, discount, tax, total: taxable + tax };
  }, [discountAmount, items, taxPercent]);

  function updateItem(id: number, field: keyof Omit<ItemForm, "id">, value: string) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
  }

  function addItem() {
    setItems((current) => [...current, { id: Date.now(), description: "", quantity: "1", unitPrice: "" }]);
  }

  function removeItem(id: number) {
    setItems((current) => current.length === 1 ? current : current.filter((item) => item.id !== id));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!invoice) return;
    if (invoice.status !== "draft") {
      setError("Hanya invoice draft yang dapat diubah.");
      return;
    }
    if (dueDate < issueDate) {
      setError("Tanggal jatuh tempo tidak boleh sebelum tanggal invoice.");
      return;
    }
    if (items.some((item) => !item.description.trim() || Number(item.quantity) <= 0 || Number(item.unitPrice) < 0)) {
      setError("Lengkapi semua item dengan jumlah dan harga yang valid.");
      return;
    }
    if (totals.discount > totals.subtotal) {
      setError("Diskon tidak boleh melebihi subtotal.");
      return;
    }

    setSaving(true);
    try {
      await api.patch(`/api/v1/invoices/${invoice.id}`, {
        issueDate,
        dueDate,
        taxPercent: Number(taxPercent || 0),
        discountAmount: Number(discountAmount || 0),
        items: items.map((item, index) => ({
          description: item.description.trim(),
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          sortOrder: index,
        })),
      });
      window.location.replace(`/invoices/${invoice.id}`);
    } catch (requestError) {
      if (isUnauthorized(requestError)) {
        logout();
        window.location.replace("/auth/login");
        return;
      }
      setError(requestError instanceof Error ? requestError.message : "Gagal menyimpan invoice.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <WorkspaceShell activePath="/invoices">
      <main className="mx-auto max-w-7xl px-4 py-8 text-foreground sm:px-8 lg:py-10">
        <div className="mx-auto max-w-6xl">
          {loading ? (
            <div className="space-y-6" aria-busy="true" aria-label="Memuat invoice"><div className="h-28 animate-pulse border-b border-border bg-muted/40" /><div className="h-96 animate-pulse border border-border bg-muted/40" /></div>
          ) : error || !invoice ? (
            <div className="border border-danger/30 bg-danger/5 px-5 py-4 text-sm text-danger" role="alert">{error || "Invoice tidak ditemukan."}</div>
          ) : invoice.status !== "draft" ? (
            <div className="space-y-5"><div className="border border-border bg-surface px-5 py-4 text-sm text-muted-foreground">Invoice berstatus {invoice.status} dan tidak dapat diedit.</div><Button variant="outline" asChild><Link href={`/invoices/${invoice.id}`}><ArrowLeft className="h-4 w-4" />Kembali ke detail</Link></Button></div>
          ) : (
            <>
              <header className="border-b border-border pb-7">
                <Link href={`/invoices/${invoice.id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" />Kembali ke detail invoice</Link>
                <p className="mt-5 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">Workspace / Edit invoice</p>
                <h1 className="mt-2 font-mono text-3xl font-medium text-primary">{invoice.invoiceNumber}</h1>
                <p className="mt-2 text-sm text-muted-foreground">Perubahan hanya dapat disimpan selama invoice masih draft.</p>
              </header>

              {error && <div className="mt-6 border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">{error}</div>}

              <form onSubmit={handleSubmit} className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
                <div className="space-y-6">
                  <Card>
                    <CardHeader className="border-b border-border px-5 py-4"><CardTitle className="font-serif text-xl font-medium text-primary">Tanggal invoice</CardTitle></CardHeader>
                    <CardContent className="grid gap-5 p-5 sm:grid-cols-2">
                      <div className="space-y-2"><Label htmlFor="issue-date">Tanggal invoice</Label><Input id="issue-date" type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} required /></div>
                      <div className="space-y-2"><Label htmlFor="due-date">Jatuh tempo</Label><Input id="due-date" type="date" min={issueDate} value={dueDate} onChange={(event) => setDueDate(event.target.value)} required /></div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between border-b border-border px-5 py-4"><div><CardTitle className="font-serif text-xl font-medium text-primary">Item tagihan</CardTitle><p className="mt-1 text-sm text-muted-foreground">Perbarui layanan atau produk pada invoice.</p></div><Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="h-3.5 w-3.5" />Tambah item</Button></CardHeader>
                    <CardContent className="space-y-4 p-5">
                      {items.map((item, index) => <div key={item.id} className="grid gap-3 border-b border-border pb-4 last:border-b-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_6rem_9rem_2.25rem] sm:items-end"><div className="space-y-2"><Label htmlFor={`description-${item.id}`}>Deskripsi {index + 1}</Label><Input id={`description-${item.id}`} value={item.description} onChange={(event) => updateItem(item.id, "description", event.target.value)} maxLength={500} required /></div><div className="space-y-2"><Label htmlFor={`quantity-${item.id}`}>Qty</Label><Input id={`quantity-${item.id}`} type="number" min="0.01" step="0.01" value={item.quantity} onChange={(event) => updateItem(item.id, "quantity", event.target.value)} required /></div><div className="space-y-2"><Label htmlFor={`price-${item.id}`}>Harga satuan</Label><Input id={`price-${item.id}`} type="number" min="0" step="1" value={item.unitPrice} onChange={(event) => updateItem(item.id, "unitPrice", event.target.value)} required /></div><Button type="button" variant="ghost" size="icon" aria-label={`Hapus item ${index + 1}`} title="Hapus item" onClick={() => removeItem(item.id)} disabled={items.length === 1}><Trash2 className="h-4 w-4" /></Button></div>)}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="border-b border-border px-5 py-4"><CardTitle className="font-serif text-xl font-medium text-primary">Penyesuaian</CardTitle></CardHeader>
                    <CardContent className="grid gap-5 p-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="tax-percent">Pajak (%)</Label><Input id="tax-percent" type="number" min="0" max="100" step="0.01" value={taxPercent} onChange={(event) => setTaxPercent(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="discount-amount">Diskon (Rp)</Label><Input id="discount-amount" type="number" min="0" step="1" value={discountAmount} onChange={(event) => setDiscountAmount(event.target.value)} /></div></CardContent>
                  </Card>
                </div>

                <aside className="lg:sticky lg:top-28 lg:self-start"><Card><CardHeader className="border-b border-border px-5 py-4"><CardTitle className="font-serif text-xl font-medium text-primary">Ringkasan</CardTitle></CardHeader><CardContent className="space-y-4 p-5"><AmountLine label="Subtotal" value={totals.subtotal} /><AmountLine label="Diskon" value={-totals.discount} negative /><AmountLine label={`Pajak ${taxPercent || 0}%`} value={totals.tax} /><div className="flex items-end justify-between gap-4 border-t border-primary pt-4"><span className="text-sm font-medium text-muted-foreground">Total</span><span className="font-serif text-2xl font-medium tabular-nums text-primary">{formatCurrency(totals.total)}</span></div><Button type="submit" className="w-full" disabled={saving}><Save className="h-4 w-4" />{saving ? "Menyimpan..." : "Simpan perubahan"}</Button></CardContent></Card></aside>
              </form>
            </>
          )}
        </div>
      </main>
    </WorkspaceShell>
  );
}

function AmountLine({ label, value, negative = false }: { label: string; value: number; negative?: boolean }) {
  return <div className="flex items-center justify-between gap-4 text-sm"><span className="text-muted-foreground">{label}</span><span className={`tabular-nums ${negative ? "text-danger" : "text-foreground"}`}>{formatCurrency(value)}</span></div>;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

function toDateInput(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function isUnauthorized(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error && (error as { status: number }).status === 401;
}