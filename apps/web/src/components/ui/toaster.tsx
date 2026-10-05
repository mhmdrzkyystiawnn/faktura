"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group border-border bg-surface text-text-primary shadow-lg rounded-[0.75rem] border",
          title: "font-medium text-text-primary",
          description: "text-sm text-text-muted",
          actionButton:
            "border-border bg-surface text-text-primary hover:bg-accent/10 rounded-[0.375rem] h-8 px-3 text-xs",
          cancelButton:
            "border-border bg-surface text-text-muted hover:bg-accent/10 rounded-[0.375rem] h-8 px-3 text-xs",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
