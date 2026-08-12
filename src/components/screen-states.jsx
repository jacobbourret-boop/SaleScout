import { ArrowClockwise, Binoculars, BookmarkSimple, CloudSlash } from "@phosphor-icons/react";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

export function LoadingCards({ count = 3, horizontal = false }) {
  return (
    <div className={horizontal ? "loading-rail" : "loading-list"} aria-label="Loading nearby sales" aria-live="polite">
      {Array.from({ length: count }, (_, index) => (
        <div className="loading-card" key={index}>
          <Skeleton className="h-44 w-full" />
          <div className="grid gap-3 p-4">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-6 w-4/5" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ kind = "sales", onAction }) {
  const saved = kind === "saved";
  const Icon = saved ? BookmarkSimple : Binoculars;
  return (
    <section className="empty-state">
      <span><Icon size={30} weight="duotone" /></span>
      <h2>{saved ? "Your Saturday list is wide open" : "No sales match this view"}</h2>
      <p>{saved ? "Save promising finds and SaleScout will build a simple route." : "Try a wider distance or add the sale you just spotted."}</p>
      <Button variant={saved ? "secondary" : "discovery"} onClick={onAction}>{saved ? "Explore sales" : "Add a sale"}</Button>
    </section>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <section className="error-state" role="alert">
      <span><CloudSlash size={30} weight="duotone" /></span>
      <h2>We lost the neighborhood signal</h2>
      <p>{message || "Check your connection and try again."}</p>
      <Button variant="secondary" onClick={onRetry}><ArrowClockwise size={18} />Try again</Button>
    </section>
  );
}
