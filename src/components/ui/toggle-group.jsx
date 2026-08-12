import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { cn } from "../../lib/utils";

export function ToggleGroup({ className, ...props }) {
  return <ToggleGroupPrimitive.Root className={cn("grid grid-cols-2 gap-2", className)} {...props} />;
}

export function ToggleGroupItem({ className, ...props }) {
  return (
    <ToggleGroupPrimitive.Item
      className={cn("flex min-h-14 items-center justify-start gap-2 rounded-xl border border-border bg-surface px-3 text-left text-sm font-bold text-foreground transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35 active:scale-[0.98] data-[state=on]:border-primary data-[state=on]:bg-primary-soft data-[state=on]:text-primary-strong", className)}
      {...props}
    />
  );
}
