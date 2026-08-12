import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold leading-none",
  {
    variants: {
      variant: {
        default: "bg-primary-soft text-primary-strong",
        discovery: "bg-discovery-soft text-discovery-ink",
        success: "bg-success-soft text-success-strong",
        warning: "bg-warning-soft text-warning-strong",
        danger: "bg-danger-soft text-danger-strong",
        neutral: "bg-muted text-muted-foreground"
      }
    },
    defaultVariants: { variant: "neutral" }
  }
);

export function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
