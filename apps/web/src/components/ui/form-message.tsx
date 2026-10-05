import * as React from "react";
import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";

export function FormMessage({ className }: { className?: string }) {
  const context = useFormContext() as any;
  const errors = context?.errors || {};
  const keys = Object.keys(errors);
  if (keys.length === 0) return null;

  const firstError = errors[keys[0]];
  const message = firstError?.message || "Terjadi kesalahan";

  return (
    <p role="alert" className={cn("text-sm text-danger", className)}>
      {message}
    </p>
  );
}
