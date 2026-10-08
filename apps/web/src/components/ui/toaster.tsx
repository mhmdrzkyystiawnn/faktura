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
            "group border-border bg-surface text-foreground shadow-lg rounded-[0.75rem] border",
          title: "font-medium text-foreground",
          description: "text-sm text-muted-foreground",
          actionButton:
            "border-border bg-surface text-foreground hover:bg-accent/10 rounded-[0.375rem] h-8 px-3 text-xs",
          cancelButton:
            "border-border bg-surface text-muted-foreground hover:bg-accent/10 rounded-[0.375rem] h-8 px-3 text-xs",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
