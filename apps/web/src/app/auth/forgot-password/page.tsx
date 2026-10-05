"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form } from "@/components/ui/form";
import { FormMessage } from "@/components/ui/form-message";
import { AuthLayout } from "@/components/auth-layout";
import { api } from "@/lib/api";

const forgotSchema = z.object({
  email: z.string().email("Email tidak valid"),
});

const codeSchema = z.object({
  code: z.string().min(4, "Kode verifikasi wajib diisi"),
});

type ForgotForm = z.infer<typeof forgotSchema>;
type CodeForm = z.infer<typeof codeSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onEmailSubmit(data: ForgotForm) {
    setServerError(null);
    setLoading(true);
    try {
      await api.post("/api/v1/auth/forgot-password", data);
      setEmail(data.email);
      setStep("code");
    } catch (err: any) {
      setServerError(err.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  async function onCodeSubmit(data: CodeForm) {
    router.push(
      `/auth/reset-password?email=${encodeURIComponent(email)}&code=${encodeURIComponent(data.code)}`
    );
  }

  return (
    <AuthLayout>
      <div className="space-y-7">
        <div className="space-y-1.5">
          <h1 className="font-serif font-medium text-2xl text-foreground">Reset password</h1>
          <p className="text-sm text-muted-foreground">
            {step === "email"
              ? "Masukkan email Anda untuk menerima kode verifikasi"
              : "Masukkan kode verifikasi yang telah dikirim ke email Anda"}
          </p>
        </div>

        {step === "email" ? (
          <Form schema={forgotSchema} onSubmit={onEmailSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@contoh.com"
                  name="email"
                  autoComplete="email"
                />
              </div>
              {serverError && (
                <p className="text-sm text-danger" role="alert">
                  {serverError}
                </p>
              )}
              <FormMessage />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Mengirim..." : "Kirim kode verifikasi"}
              </Button>
            </div>
          </Form>
        ) : (
          <Form schema={codeSchema} onSubmit={onCodeSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Kode verifikasi</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Masukkan kode"
                  name="code"
                  autoComplete="one-time-code"
                />
              </div>
              {serverError && (
                <p className="text-sm text-danger" role="alert">
                  {serverError}
                </p>
              )}
              <FormMessage />
              <Button type="submit" className="w-full">
                Lanjutkan
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setStep("email")}
              >
                Ganti email
              </Button>
            </div>
          </Form>
        )}

        <p className="text-sm text-muted-foreground text-center">
          <Link href="/auth/login" className="text-accent hover:underline">
            Kembali ke login
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
