"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form } from "@/components/ui/form";
import { FormMessage } from "@/components/ui/form-message";
import { AuthLayout } from "@/components/auth-layout";
import { api } from "@/lib/api";

const resetSchema = z
  .object({
    password: z.string().min(8, "Password minimal 8 karakter"),
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Password tidak cocok",
    path: ["confirmPassword"],
  });

type ResetForm = z.infer<typeof resetSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    const codeParam = searchParams.get("code");
    if (emailParam) setEmail(emailParam);
    if (codeParam) setCode(codeParam);
  }, [searchParams]);

  async function onSubmit(data: ResetForm) {
    setServerError(null);
    setLoading(true);
    try {
      await api.post("/api/v1/auth/reset-password", {
        email,
        code,
        password: data.password,
      });
      setSuccess(true);
      setTimeout(() => router.push("/auth/login"), 2000);
    } catch (err: any) {
      setServerError(err.message || "Terjadi kesalahan. Coba lagi sebentar lagi.");
    } finally {
      setLoading(false);
    }
  }

  if (!email || !code) {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="font-serif font-medium text-2xl text-foreground">Link tidak valid</h1>
            <p className="text-sm text-muted-foreground">
              Link reset password tidak valid atau sudah kedaluwarsa.
            </p>
          </div>
          <Link href="/auth/forgot-password" className="text-accent hover:underline text-sm">
            Minta kode baru
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="space-y-7">
        <div className="space-y-1.5">
          <h1 className="font-serif font-medium text-2xl text-foreground">Buat password baru</h1>
          <p className="text-sm text-muted-foreground">Masukkan password baru untuk akun Anda</p>
        </div>

        {success ? (
          <div className="space-y-2">
            <p className="text-success font-medium">Password berhasil direset!</p>
            <p className="text-sm text-muted-foreground">Mengalihkan ke halaman login...</p>
          </div>
        ) : (
          <Form schema={resetSchema} onSubmit={onSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password baru</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimal 8 karakter"
                  name="password"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Konfirmasi password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  name="confirmPassword"
                  autoComplete="new-password"
                />
              </div>
              {serverError && (
                <p className="text-sm text-danger" role="alert">
                  {serverError}
                </p>
              )}
              <FormMessage />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Memproses..." : "Reset password"}
              </Button>
            </div>
          </Form>
        )}
      </div>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
