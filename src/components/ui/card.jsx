import { cn } from "../../lib/utils";

export function Card({ className, ...props }) {
  return <div className={cn("rounded-2xl border border-border bg-surface text-foreground shadow-sm", className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn("p-4", className)} {...props} />;
}
