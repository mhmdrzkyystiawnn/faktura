"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

const schema = z.object({
  code: z.string().regex(/^\d{6}$/, "Masukkan 6 digit kode verifikasi"),
});

function VerifyEmailForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);

  async function onSubmit(data: { code: string }) {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post<{ accessToken: string }>("/api/v1/auth/verify-email", {
        email,
        code: data.code,
      });
      localStorage.setItem("accessToken", response.accessToken);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kode verifikasi tidak valid.");
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    if (!email) return;
    setLoading(true);
    setError(null);
    try {
      await api.post("/api/v1/auth/resend-verification", { email });
      setResent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim ulang kode.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="space-y-7">
        <div className="space-y-1.5">
          <h1 className="font-serif text-2xl font-medium text-foreground">Verifikasi email</h1>
          <p className="text-sm text-muted-foreground">
            Masukkan kode 6 digit yang dikirim ke <strong>{email || "email Anda"}</strong>.
          </p>
        </div>
        <Form schema={schema} onSubmit={onSubmit}>
          <Input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            aria-label="Kode verifikasi email"
            className="text-center font-mono text-xl tracking-[0.35em]"
          />
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading || !email}>
            {loading ? "Memverifikasi..." : "Verifikasi email"}
          </Button>
        </Form>
        <p className="text-center text-sm text-muted-foreground">
          Kode berlaku selama 15 menit.{" "}
          <button type="button" onClick={resendCode} disabled={loading} className="text-accent hover:underline disabled:opacity-50">
            {resent ? "Kode terkirim" : "Kirim ulang"}
          </button>{" "}
          ·{" "}
          <button type="button" onClick={() => router.push("/auth/register")} className="text-accent hover:underline">
            Daftar ulang
          </button>
        </p>
      </div>
    </AuthLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<AuthLayout><p className="text-sm text-muted-foreground">Memuat...</p></AuthLayout>}>
      <VerifyEmailForm />
    </Suspense>
  );
}
