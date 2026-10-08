"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Receipt, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WorkspaceShell } from "@/components/workspace-shell";
import { api } from "@/lib/api";
import { logout } from "@/lib/auth";

interface Client {
  id: string;
  name: string;
}

interface InvoiceItemForm {
  id: number;
  description: string;
  quantity: string;
  unitPrice: string;
}

const today = new Date().toISOString().slice(0, 10);

export default function NewInvoicePage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState(today);
  const [taxPercent, setTaxPercent] = useState("0");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [items, setItems] = useState<InvoiceItemForm[]>([createItem(1)]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadClients() {
      try {
        const response = await api.get<{ data: Client[] }>("/api/v1/clients");
        if (active) setClients(response.data);
      } catch (requestError) {
        if (!active) return;
        handleRequestError(requestError, setError);
      } finally {
        if (active) setLoadingClients(false);
      }
    }

    if (!localStorage.getItem("accessToken")) {
      window.location.replace("/auth/login");
      return () => {
        active = false;
      };
    }

    void loadClients();
    return () => {
      active = false;
    };
  }, []);

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
      0,
    );
    const discount = Math.max(0, Number(discountAmount || 0));
    const taxable = Math.max(0, subtotal - discount);
    const tax = taxable * (Number(taxPercent || 0) / 100);
    return { subtotal, discount, tax, total: taxable + tax };
  }, [discountAmount, items, taxPercent]);

  function updateItem(id: number, field: keyof Omit<InvoiceItemForm, "id">, value: string) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }

  function addItem() {
    setItems((current) => [...current, createItem(current.length + 1)]);
  }

  function removeItem(id: number) {
    setItems((current) => current.length === 1 ? current : current.filter((item) => item.id !== id));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!clientId) {
      setError("Pilih klien terlebih dahulu.");
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
      await api.post("/api/v1/invoices", {
        clientId,
        issueDate,
        dueDate,
        taxPercent: Number(taxPercent || 0),
        discountAmount: Number(discountAmount || 0),
        currency: "IDR",
        items: items.map((item, index) => ({
          description: item.description.trim(),
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          sortOrder: index,
        })),
      });
      window.location.replace("/invoices");
    } catch (requestError) {
      handleRequestError(requestError, setError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <WorkspaceShell activePath="/invoices">
      <main className="mx-auto max-w-7xl px-4 py-8 text-foreground sm:px-8 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <header className="border-b border-border pb-7">
            <Link href="/invoices" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
              <ArrowLeft className="h-4 w-4" />
              Kembali ke invoice
            </Link>
            <p className="mt-5 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Workspace / Invoice baru
            </p>
            <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight text-primary">
              Buat invoice
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Masukkan detail tagihan. Total invoice dihitung ulang dan divalidasi oleh server.
            </p>
          </header>

          {error && (
            <div className="mt-6 border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
            <div className="space-y-6">
              <Card>
                <CardHeader className="border-b border-border px-5 py-4">
                  <CardTitle className="font-serif text-xl font-medium text-primary">Informasi invoice</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-5 p-5 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="invoice-client">Klien</Label>
                    {loadingClients ? (
                      <div className="h-9 animate-pulse rounded-md border border-border bg-muted/40" />
                    ) : clients.length === 0 ? (
                      <p className="border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                        Belum ada klien. <Link href="/clients" className="text-accent hover:underline">Tambah klien</Link>
                      </p>
                    ) : (
                      <Select value={clientId} onValueChange={setClientId}>
                        <SelectTrigger id="invoice-client" aria-label="Pilih klien">
                          <SelectValue placeholder="Pilih klien" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="issue-date">Tanggal invoice</Label>
                    <Input id="issue-date" type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="due-date">Jatuh tempo</Label>
                    <Input id="due-date" type="date" value={dueDate} min={issueDate} onChange={(event) => setDueDate(event.target.value)} required />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between border-b border-border px-5 py-4">
                  <div>
                    <CardTitle className="font-serif text-xl font-medium text-primary">Item tagihan</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">Tambahkan layanan atau produk yang ditagihkan.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-3.5 w-3.5" />
                    Tambah item
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4 p-5">
                  {items.map((item, index) => (
                    <div key={item.id} className="grid gap-3 border-b border-border pb-4 last:border-b-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_6rem_9rem_2.25rem] sm:items-end">
                      <div className="space-y-2">
                        <Label htmlFor={`description-${item.id}`}>Deskripsi {index + 1}</Label>
                        <Input id={`description-${item.id}`} value={item.description} onChange={(event) => updateItem(item.id, "description", event.target.value)} placeholder="Contoh: Pembuatan website" maxLength={500} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`quantity-${item.id}`}>Qty</Label>
                        <Input id={`quantity-${item.id}`} type="number" min="0.01" step="0.01" value={item.quantity} onChange={(event) => updateItem(item.id, "quantity", event.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`price-${item.id}`}>Harga satuan</Label>
                        <Input id={`price-${item.id}`} type="number" min="0" step="1" value={item.unitPrice} onChange={(event) => updateItem(item.id, "unitPrice", event.target.value)} required />
                      </div>
                      <Button type="button" variant="ghost" size="icon" aria-label={`Hapus item ${index + 1}`} title="Hapus item" onClick={() => removeItem(item.id)} disabled={items.length === 1}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="border-b border-border px-5 py-4">
                  <CardTitle className="font-serif text-xl font-medium text-primary">Penyesuaian</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-5 p-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="tax-percent">Pajak (%)</Label>
                    <Input id="tax-percent" type="number" min="0" max="100" step="0.01" value={taxPercent} onChange={(event) => setTaxPercent(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discount-amount">Diskon (Rp)</Label>
                    <Input id="discount-amount" type="number" min="0" step="1" value={discountAmount} onChange={(event) => setDiscountAmount(event.target.value)} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <aside className="lg:sticky lg:top-28 lg:self-start">
              <Card>
                <CardHeader className="border-b border-border px-5 py-4">
                  <CardTitle className="flex items-center gap-2 font-serif text-xl font-medium text-primary">
                    <Receipt className="h-5 w-5 text-accent" />
                    Ringkasan
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-5">
                  <SummaryLine label="Subtotal" value={totals.subtotal} />
                  <SummaryLine label="Diskon" value={-totals.discount} />
                  <SummaryLine label={`Pajak ${taxPercent || 0}%`} value={totals.tax} />
                  <div className="border-t border-primary pt-4">
                    <div className="flex items-end justify-between gap-4">
                      <span className="text-sm font-medium text-muted-foreground">Total</span>
                      <span className="font-serif text-2xl font-medium tabular-nums text-primary">{formatCurrency(totals.total)}</span>
                    </div>
                  </div>
                  <Button type="submit" className="mt-2 w-full" disabled={saving || loadingClients || clients.length === 0}>
                    {saving ? "Menyimpan..." : "Simpan sebagai draft"}
                  </Button>
                  <p className="text-center text-xs leading-relaxed text-muted-foreground">
                    Invoice akan disimpan sebagai draft dan dapat diperbarui sebelum dikirim.
                  </p>
                </CardContent>
              </Card>
            </aside>
          </form>
        </div>
      </main>
    </WorkspaceShell>
  );
}

function createItem(id: number): InvoiceItemForm {
  return { id, description: "", quantity: "1", unitPrice: "" };
}

function SummaryLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${value < 0 ? "text-danger" : "text-foreground"}`}>{formatCurrency(value)}</span>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

function handleRequestError(error: unknown, setError: (message: string) => void) {
  if (typeof error === "object" && error !== null && "status" in error && (error as { status: number }).status === 401) {
    logout();
    window.location.replace("/auth/login");
    return;
  }
  setError(error instanceof Error ? error.message : "Terjadi kesalahan. Coba lagi.");
}