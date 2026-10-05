"use client";

import * as React from "react";
import { useForm, FormProvider as RHFFormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

interface FormProps {
  schema: z.ZodTypeAny;
  defaultValues?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void | Promise<void>;
  children: React.ReactNode;
}

function Form(props: FormProps) {
  const { schema, defaultValues, onSubmit, children } = props;
  const form = useForm({
    resolver: zodResolver(schema) as any,
    defaultValues: defaultValues || {},
  });

  return (
    <RHFFormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit as any)}
        className="space-y-4"
        noValidate
      >
        {children}
      </form>
    </RHFFormProvider>
  );
}

export { Form };
