import { Binoculars } from "@phosphor-icons/react";
import { cn } from "../lib/utils";

export function Brand({ compact = false, className }) {
  return (
    <div className={cn("brand-lockup flex items-center gap-3", className)} aria-label="SaleScout">
      <span className="brand-mark grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_8px_22px_rgba(35,93,173,0.22)]">
        <Binoculars size={24} weight="fill" />
      </span>
      {!compact ? (
        <span className="brand-copy grid leading-none">
          <strong className="text-lg font-black tracking-[-0.04em]">SaleScout</strong>
          <span className="brand-subtitle mt-1 text-xs font-semibold text-muted-foreground">Find the good stuff</span>
        </span>
      ) : null}
    </div>
  );
}
