import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[0.375rem] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-white shadow hover:bg-primary/90 h-9 px-4 py-2",
        destructive:
          "bg-danger text-white shadow-sm hover:bg-danger/90 h-9 px-4 py-2",
        outline:
          "border border-border bg-surface shadow-sm hover:bg-accent/10 h-9 px-4 py-2 text-text-primary",
        secondary:
          "bg-surface shadow-sm hover:bg-accent/10 h-9 px-4 py-2 text-text-primary",
        ghost:
          "hover:bg-accent/10 h-9 px-4 py-2 text-text-primary",
        link:
          "text-primary underline-offset-4 hover:underline h-auto px-0 py-0",
      },
      size: {
        default: "h-9 px-4 py-2 text-sm",
        sm: "h-8 rounded-[0.375rem] px-3 text-xs",
        lg: "h-10 rounded-[0.375rem] px-8 text-sm",
        icon: "h-9 w-9 rounded-[0.375rem]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
