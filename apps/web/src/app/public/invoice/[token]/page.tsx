import type { Metadata } from "next";
import { notFound } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface PublicInvoice {
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  taxPercent: number;
  discountAmount: number;
  total: number;
  currency: string;
  client: { name: string };
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
}

async function getInvoice(token: string): Promise<PublicInvoice | null> {
  try {
    const response = await fetch(`${API_URL}/api/v1/public/invoices/${token}`, {
      cache: "no-store",
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { data: PublicInvoice };
    return body.data;
  } catch {
    return null;
  }
}

export const metadata: Metadata = {
  title: "Invoice",
  robots: { index: false, follow: false },
};

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invoice = await getInvoice(token);

  if (!invoice) {
    notFound();
  }

  const statusLabel: Record<string, string> = {
    draft: "Draft",
    sent: "Terkirim",
    viewed: "Dilihat",
    paid: "Lunas",
    overdue: "Terlambat",
    cancelled: "Dibatalkan",
  };

  const statusStyle: Record<string, string> = {
    draft: "border-border bg-muted/40 text-muted-foreground",
    sent: "border-accent/30 bg-accent/10 text-accent",
    viewed: "border-primary/20 bg-primary/5 text-primary",
    paid: "border-success/30 bg-success/10 text-success",
    overdue: "border-danger/30 bg-danger/10 text-danger",
    cancelled: "border-danger/20 bg-danger/5 text-danger",
  };

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <article className="mx-auto max-w-3xl">
        <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Faktura
            </p>
            <h1 className="mt-2 font-mono text-2xl font-medium text-primary sm:text-3xl">
              {invoice.invoiceNumber}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Untuk {invoice.client.name}
            </p>
          </div>
          <span
            className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-medium ${
              statusStyle[invoice.status] ?? statusStyle.draft
            }`}
          >
            {statusLabel[invoice.status] ?? invoice.status}
          </span>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="border border-border bg-surface p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              Tanggal invoice
            </p>
            <p className="mt-2 font-mono text-sm text-foreground">
              {formatDate(invoice.issueDate)}
            </p>
          </div>
          <div className="border border-border bg-surface p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              Jatuh tempo
            </p>
            <p className="mt-2 font-mono text-sm text-foreground">
              {formatDate(invoice.dueDate)}
            </p>
          </div>
        </section>

        <section className="mt-6 border border-border bg-surface">
          <table className="w-full">
            <caption className="sr-only">Rincian tagihan invoice</caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Deskripsi
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Qty
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Harga
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3 text-sm text-foreground">
                    {item.description}
                  </td>
                  <td className="px-4 py-3 text-right text-sm tabular-nums text-muted-foreground">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-3 text-right text-sm tabular-nums text-muted-foreground">
                    {formatCurrency(item.unitPrice, invoice.currency)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium tabular-nums text-primary">
                    {formatCurrency(item.subtotal, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="ml-auto max-w-sm space-y-3 border-t-2 border-primary p-4">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums text-foreground">
                {formatCurrency(invoice.subtotal, invoice.currency)}
              </span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Diskon</span>
                <span className="tabular-nums text-danger">
                  -{formatCurrency(invoice.discountAmount, invoice.currency)}
                </span>
              </div>
            )}
            {invoice.taxPercent > 0 && (
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">
                  Pajak ({invoice.taxPercent}%)
                </span>
                <span className="tabular-nums text-foreground">
                  {formatCurrency(taxAmount(invoice), invoice.currency)}
                </span>
              </div>
            )}
            <div className="flex items-end justify-between gap-4 border-t border-border pt-3">
              <span className="text-sm font-medium text-muted-foreground">Total</span>
              <span className="font-serif text-2xl font-medium tabular-nums text-primary">
                {formatCurrency(invoice.total, invoice.currency)}
              </span>
            </div>
          </div>
        </section>

        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
          Mohon melakukan pembayaran sebelum tanggal jatuh tempo. Jika ada
          pertanyaan mengenai invoice ini, silakan hubungi pengirim invoice.
        </p>

        <footer className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          Invoice ini dibuat dan dikirim melalui Faktura.
        </footer>
      </article>
    </main>
  );
}

function taxAmount(invoice: PublicInvoice): number {
  return invoice.total - invoice.subtotal + invoice.discountAmount;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}
