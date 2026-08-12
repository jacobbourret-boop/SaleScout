import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

export const buttonVariants = cva(
  "inline-flex min-h-12 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-[transform,background-color,border-color,color,box-shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary px-5 text-primary-foreground shadow-[0_8px_24px_rgba(35,93,173,0.22)] hover:bg-primary-strong",
        discovery: "bg-discovery px-5 text-discovery-foreground shadow-[0_8px_24px_rgba(243,158,42,0.24)] hover:bg-discovery-strong",
        secondary: "border border-border bg-surface px-5 text-foreground shadow-xs hover:bg-muted",
        ghost: "px-4 text-foreground hover:bg-muted",
        danger: "bg-danger px-5 text-danger-foreground hover:bg-danger-strong",
        icon: "size-12 border border-border bg-surface p-0 text-foreground shadow-xs hover:bg-muted",
        quietIcon: "size-12 bg-surface/92 p-0 text-foreground shadow-md backdrop-blur-xl hover:bg-surface"
      },
      size: {
        default: "h-12",
        sm: "min-h-10 rounded-lg px-3 text-xs",
        lg: "h-14 rounded-2xl px-6 text-base",
        icon: "size-12 p-0"
      }
    },
    defaultVariants: { variant: "default", size: "default" }
  }
);

export const Button = React.forwardRef(function Button(
  { className, variant, size, asChild = false, ...props },
  ref
) {
  const Comp = asChild ? Slot : "button";
  return <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
});
