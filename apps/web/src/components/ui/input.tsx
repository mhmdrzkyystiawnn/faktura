import * as React from "react";
import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, name, ...props }, ref) => {
    const form = useFormContext();
    const registration = form && name ? form.register(name) : undefined;

    function setRefs(element: HTMLInputElement | null) {
      if (typeof ref === "function") ref(element);
      else if (ref) ref.current = element;
      registration?.ref(element);
    }

    return (
      <input
        type={type}
        name={name}
        {...registration}
        ref={setRefs}
        className={cn(
          "flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm",
          "text-foreground placeholder:text-muted-foreground",
          "transition-[border-color,box-shadow] duration-150",
          // satu-satunya indikator fokus: border + ring brass tipis.
          // outline-none WAJIB supaya outline bawaan browser (yang warnanya
          // ditarik dari rule global `* { outline-ring/50 }` di globals.css)
          // tidak numpuk jadi dobel sama ring di bawah ini.
          "outline-none focus-visible:outline-none",
          "focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          // autofill Chrome/Edge: matikan warna kuning bawaan, samakan ke token kita
          "[&:-webkit-autofill]:[-webkit-text-fill-color:var(--foreground)]",
          "[&:-webkit-autofill]:[transition:background-color_9999s_ease-in-out_0s]",
          "[&:-webkit-autofill]:[box-shadow:0_0_0px_1000px_var(--card)_inset]",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };