import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "@phosphor-icons/react";
import { cn } from "../../lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({ className, children, showClose = true, ...props }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay fixed inset-0 z-40 bg-overlay/62 backdrop-blur-sm" />
      <DialogPrimitive.Content
        className={cn(
          "dialog-content fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-3xl border border-border bg-surface shadow-2xl focus:outline-none",
          className
        )}
        {...props}
      >
        {children}
        {showClose ? (
          <DialogPrimitive.Close className="absolute right-4 top-4 grid size-12 place-items-center rounded-xl bg-surface/90 text-foreground shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35 active:scale-95" aria-label="Close">
            <X size={20} weight="bold" />
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export const DialogHeader = ({ className, ...props }) => <div className={cn("grid gap-2", className)} {...props} />;
export const DialogTitle = React.forwardRef(function DialogTitle({ className, ...props }, ref) {
  return <DialogPrimitive.Title ref={ref} className={cn("text-2xl font-extrabold tracking-[-0.03em]", className)} {...props} />;
});
export const DialogDescription = React.forwardRef(function DialogDescription({ className, ...props }, ref) {
  return <DialogPrimitive.Description ref={ref} className={cn("text-sm leading-6 text-muted-foreground", className)} {...props} />;
});
