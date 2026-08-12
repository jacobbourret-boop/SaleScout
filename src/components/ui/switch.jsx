import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "../../lib/utils";

export function Switch({ className, ...props }) {
  return (
    <SwitchPrimitive.Root
      className={cn("inline-flex h-8 w-14 shrink-0 items-center rounded-full bg-border-strong p-1 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35 data-[state=checked]:bg-primary", className)}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-6 rounded-full bg-surface shadow-sm transition-transform data-[state=checked]:translate-x-6" />
    </SwitchPrimitive.Root>
  );
}
