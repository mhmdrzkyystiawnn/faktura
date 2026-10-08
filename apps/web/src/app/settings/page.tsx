"use client";

import { FormEvent, useEffect, useState } from "react";
import { KeyRound, UserRound } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { logout } from "@/lib/auth";

interface Profile {
  id: string;
  name: string;
  email: string;
  plan: string;
  oauthProvider: string | null;
  hasPassword: boolean;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const response = await api.get<{ data: Profile }>("/api/v1/users/profile");
        if (!active) return;
        setProfile(response.data);
        setName(response.data.name);
      } catch (requestError) {
        if (!active) return;
        if (isUnauthorized(requestError)) {
          logout();
          window.location.replace("/auth/login");
          return;
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Gagal memuat profil.",
        );
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

    void loadProfile();
    return () => {
      active = false;
    };
  }, []);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProfile(true);
    setProfileNotice(null);
    setError(null);

    try {
      const response = await api.patch<{ data: Profile }>(
        "/api/v1/users/profile",
        { name },
      );
      setProfile((current) =>
        current ? { ...current, name: response.data.name } : current,
      );
      setProfileNotice("Profil berhasil diperbarui.");
    } catch (requestError) {
      if (isUnauthorized(requestError)) {
        logout();
        window.location.replace("/auth/login");
        return;
      }
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Gagal menyimpan profil.",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordNotice(null);
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("Konfirmasi password tidak cocok.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Password baru minimal 8 karakter.");
      return;
    }

    setSavingPassword(true);
    try {
      await api.post("/api/v1/users/change-password", {
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordNotice("Password berhasil diubah.");
    } catch (requestError) {
      if (isUnauthorized(requestError)) {
        logout();
        window.location.replace("/auth/login");
        return;
      }
      setPasswordError(
        requestError instanceof Error
          ? requestError.message
          : "Gagal mengubah password.",
      );
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <WorkspaceShell activePath="/settings">
      <main className="mx-auto max-w-7xl px-4 py-8 text-foreground sm:px-8 lg:py-10">
        <div className="mx-auto max-w-3xl">
          <header className="border-b border-border pb-7">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Workspace / Pengaturan
            </p>
            <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight text-primary">
              Pengaturan akun
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Kelola profil dan keamanan akun Anda.
            </p>
          </header>

          {error && (
            <div
              className="mt-6 border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
              role="alert"
            >
              {error}
            </div>
          )}

          <section className="mt-7 space-y-6">
            <Card>
              <CardHeader className="border-b border-border px-5 py-4">
                <CardTitle className="flex items-center gap-2 font-serif text-xl font-medium text-primary">
                  <UserRound className="h-5 w-5 text-accent" aria-hidden="true" />
                  Profil
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                {loading ? (
                  <div
                    className="space-y-3"
                    aria-busy="true"
                    aria-label="Memuat profil"
                  >
                    <div className="h-9 animate-pulse rounded-md bg-muted/40" />
                    <div className="h-9 animate-pulse rounded-md bg-muted/40" />
                  </div>
                ) : (
                  <form onSubmit={handleProfileSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="profile-name">Nama</Label>
                      <Input
                        id="profile-name"
                        value={name}
                        minLength={2}
                        maxLength={255}
                        required
                        onChange={(event) => setName(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile-email">Email</Label>
                      <Input
                        id="profile-email"
                        value={profile?.email ?? ""}
                        disabled
                        readOnly
                      />
                      <p className="text-xs text-muted-foreground">
                        Email tidak dapat diubah.
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Button type="submit" disabled={savingProfile}>
                        {savingProfile ? "Menyimpan..." : "Simpan profil"}
                      </Button>
                      {profileNotice && (
                        <p className="text-sm text-success" role="status">
                          {profileNotice}
                        </p>
                      )}
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b border-border px-5 py-4">
                <CardTitle className="flex items-center gap-2 font-serif text-xl font-medium text-primary">
                  <KeyRound className="h-5 w-5 text-accent" aria-hidden="true" />
                  Password
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                {!loading && profile && !profile.hasPassword ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Akun ini terdaftar lewat Google, jadi tidak punya password.
                    Gunakan tombol &ldquo;Lanjutkan dengan Google&rdquo; untuk
                    masuk.
                  </p>
                ) : (
                  <form onSubmit={handlePasswordSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Password saat ini</Label>
                      <Input
                        id="current-password"
                        type="password"
                        autoComplete="current-password"
                        value={currentPassword}
                        required
                        onChange={(event) =>
                          setCurrentPassword(event.target.value)
                        }
                      />
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="new-password">Password baru</Label>
                        <Input
                          id="new-password"
                          type="password"
                          autoComplete="new-password"
                          minLength={8}
                          value={newPassword}
                          required
                          onChange={(event) => setNewPassword(event.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">
                          Ulangi password baru
                        </Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          autoComplete="new-password"
                          minLength={8}
                          value={confirmPassword}
                          required
                          onChange={(event) =>
                            setConfirmPassword(event.target.value)
                          }
                        />
                      </div>
                    </div>

                    {passwordError && (
                      <p className="text-sm text-danger" role="alert">
                        {passwordError}
                      </p>
                    )}

                    <div className="flex items-center gap-4">
                      <Button type="submit" disabled={savingPassword}>
                        {savingPassword ? "Menyimpan..." : "Ubah password"}
                      </Button>
                      {passwordNotice && (
                        <p className="text-sm text-success" role="status">
                          {passwordNotice}
                        </p>
                      )}
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </WorkspaceShell>
  );
}

function isUnauthorized(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status: number }).status === 401
  );
}
