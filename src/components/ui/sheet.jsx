import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "@phosphor-icons/react";
import { cn } from "../../lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export function SheetContent({ className, children, side = "bottom", showClose = true, ...props }) {
  const placement =
    side === "right"
      ? "right-0 top-0 h-full w-[min(34rem,100vw)] border-l sheet-right"
      : "bottom-0 left-0 max-h-[94dvh] w-full rounded-t-3xl border-t sheet-bottom";
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay fixed inset-0 z-40 bg-overlay/58 backdrop-blur-sm" />
      <DialogPrimitive.Content className={cn("fixed z-50 overflow-auto bg-surface shadow-2xl focus:outline-none", placement, className)} {...props}>
        {side === "bottom" ? <div aria-hidden="true" className="mx-auto mt-2 h-1.5 w-11 rounded-full bg-border-strong" /> : null}
        {children}
        {showClose ? (
          <DialogPrimitive.Close className="sheet-close absolute right-4 top-4 grid size-12 place-items-center rounded-xl bg-surface/92 text-foreground shadow-md backdrop-blur-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35 active:scale-95" aria-label="Close">
            <X size={20} weight="bold" />
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export const SheetHeader = ({ className, ...props }) => <div className={cn("grid gap-2", className)} {...props} />;
export const SheetTitle = React.forwardRef(function SheetTitle({ className, ...props }, ref) {
  return <DialogPrimitive.Title ref={ref} className={cn("text-2xl font-extrabold tracking-[-0.03em]", className)} {...props} />;
});
export const SheetDescription = React.forwardRef(function SheetDescription({ className, ...props }, ref) {
  return <DialogPrimitive.Description ref={ref} className={cn("text-sm leading-6 text-muted-foreground", className)} {...props} />;
});
