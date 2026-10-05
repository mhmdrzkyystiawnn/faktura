"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { logout } from "@/lib/auth";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DrawerContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  createdAt: string;
}

interface ClientForm {
  name: string;
  email: string;
  phone: string;
  address: string;
}

const emptyForm: ClientForm = { name: "", email: "", phone: "", address: "" };

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadClients() {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ data: Client[] }>("/api/v1/clients");
      setClients(response.data);
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!localStorage.getItem("accessToken")) {
      window.location.replace("/auth/login");
      return;
    }
    void loadClients();
  }, []);

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return clients;
    return clients.filter((client) =>
      [client.name, client.email, client.phone, client.address]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [clients, search]);

  function openCreate() {
    setEditingClient(null);
    setForm(emptyForm);
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(client: Client) {
    setEditingClient(client);
    setForm({
      name: client.name,
      email: client.email ?? "",
      phone: client.phone ?? "",
      address: client.address ?? "",
    });
    setError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name,
      email: form.email || undefined,
      phone: form.phone || undefined,
      address: form.address || undefined,
    };

    try {
      if (editingClient) {
        const response = await api.patch<{ data: Client }>(
          `/api/v1/clients/${editingClient.id}`,
          payload,
        );
        setClients((current) =>
          current.map((client) =>
            client.id === editingClient.id ? response.data : client,
          ),
        );
      } else {
        const response = await api.post<{ data: Client }>("/api/v1/clients", payload);
        setClients((current) => [response.data, ...current]);
      }
      setDialogOpen(false);
    } catch (err) {
      handleApiError(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteClient) return;
    setSaving(true);
    setError(null);
    try {
      await api.del(`/api/v1/clients/${deleteClient.id}`);
      setClients((current) => current.filter((client) => client.id !== deleteClient.id));
      setDeleteClient(null);
    } catch (err) {
      handleApiError(err);
    } finally {
      setSaving(false);
    }
  }

  function handleApiError(err: unknown) {
    if (typeof err === "object" && err !== null && "status" in err) {
      const status = (err as { status: number }).status;
      if (status === 401) {
        logout();
        window.location.replace("/auth/login");
        return;
      }
    }
    setError(err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi.");
  }

  return (
    <WorkspaceShell activePath="/clients">
      <main className="mx-auto max-w-7xl px-4 py-8 text-text-primary sm:px-8 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="mb-5 inline-flex items-center gap-2 text-sm text-text-muted hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke dashboard
            </Link>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-text-muted">
              Workspace / Klien
            </p>
            <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight text-primary">
              Daftar klien
            </h1>
            <p className="mt-2 max-w-xl text-sm text-text-muted">
              Simpan informasi klien agar pembuatan invoice dan reminder lebih cepat.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Tambah klien
          </Button>
        </header>

        <section className="mt-7" aria-labelledby="client-list-heading">
          <Card>
            <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="client-list-heading" className="font-serif text-xl font-medium text-primary">
                  Semua klien
                </h2>
                <p className="mt-1 text-sm text-text-muted">
                  {clients.length} klien tersimpan
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
                <Input
                  aria-label="Cari klien"
                  placeholder="Cari nama, email, atau telepon..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {error && (
              <div className="mx-5 mt-5 border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">
                {error}
              </div>
            )}

            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-3 p-6" aria-busy="true" aria-label="Memuat klien">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-16 animate-pulse border-b border-border bg-muted/40" />
                  ))}
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background text-accent">
                    {search ? <Search className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                  </div>
                  <h3 className="mt-4 font-medium text-primary">
                    {search ? "Klien tidak ditemukan" : "Belum ada klien"}
                  </h3>
                  <p className="mt-1 max-w-sm text-sm leading-relaxed text-text-muted">
                    {search
                      ? "Coba gunakan kata kunci lain."
                      : "Tambahkan klien pertama untuk mulai membuat invoice."}
                  </p>
                  {!search && (
                    <Button variant="outline" className="mt-5" onClick={openCreate}>
                      <Plus className="h-4 w-4" />
                      Tambah klien pertama
                    </Button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredClients.map((client) => (
                    <article key={client.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-medium text-accent">
                          {client.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate font-medium text-primary">{client.name}</h3>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                            {client.email && <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{client.email}</span>}
                            {client.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{client.phone}</span>}
                            {client.address && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{client.address}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2 sm:ml-4">
                        <Button variant="outline" size="sm" onClick={() => openEdit(client)}>
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger hover:bg-danger/10"
                          onClick={() => setDeleteClient(client)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Hapus
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DrawerContent>
          <DialogHeader>
            <DialogTitle>{editingClient ? "Edit klien" : "Tambah klien"}</DialogTitle>
            <DialogDescription>
              Informasi ini digunakan untuk invoice dan komunikasi pembayaran.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client-name">Nama klien atau perusahaan</Label>
              <Input id="client-name" required minLength={2} maxLength={255} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="client-email">Email</Label>
                <Input id="client-email" type="email" maxLength={255} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-phone">No. HP / WhatsApp</Label>
                <Input id="client-phone" maxLength={30} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-address">Alamat</Label>
              <textarea
                id="client-address"
                maxLength={5000}
                value={form.address}
                onChange={(event) => setForm({ ...form, address: event.target.value })}
                className="min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan klien"}</Button>
            </DialogFooter>
          </form>
        </DrawerContent>
      </Dialog>

      <Dialog open={deleteClient !== null} onOpenChange={(open) => !open && setDeleteClient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus klien?</DialogTitle>
            <DialogDescription>
              Data {deleteClient?.name} akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteClient(null)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? "Menghapus..." : "Hapus klien"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </main>
    </WorkspaceShell>
  );
}
