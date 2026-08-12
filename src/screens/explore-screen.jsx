import { CheckCircle, MagnifyingGlass, MapPin, X } from "@phosphor-icons/react";
import { SaleCard } from "../components/sale-card";
import { EmptyState, ErrorState, LoadingCards } from "../components/screen-states";

const types = ["all", "garage", "yard", "estate", "moving", "rummage"];

export function ExploreScreen({ model, onQuickAdd, onOpenSale }) {
  const { visibleSales, favorites, loading, error, filters, setFilters, toggleSave, retry } = model;
  return (
    <div className="screen page-screen explore-screen">
      <header className="screen-intro">
        <h1>Explore nearby</h1>
        <p>Search the finds, not a database.</p>
      </header>
      <div className="explore-controls">
        <label className="search-control">
          <span className="sr-only">Search sales</span>
          <MagnifyingGlass size={21} weight="bold" />
          <input type="search" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Tools, vinyl, furniture..." autoComplete="off" />
          {filters.search ? <button type="button" onClick={() => setFilters((current) => ({ ...current, search: "" }))} aria-label="Clear search"><X size={18} weight="bold" /></button> : null}
        </label>
        <div className="filter-scroll" aria-label="Sale type filters">
          {types.map((type) => <button key={type} type="button" className={filters.type === type ? "is-active" : ""} aria-pressed={filters.type === type} onClick={() => setFilters((current) => ({ ...current, type }))}>{type === "all" ? "All sales" : `${type[0].toUpperCase()}${type.slice(1)}`}</button>)}
        </div>
        <div className="filter-options">
          <label><MapPin size={17} weight="fill" /><span className="sr-only">Distance</span><select value={filters.radius} onChange={(event) => setFilters((current) => ({ ...current, radius: Number(event.target.value) }))}><option value="2">Within 2 mi</option><option value="5">Within 5 mi</option><option value="10">Within 10 mi</option><option value="25">Within 25 mi</option></select></label>
          <button type="button" className={filters.openOnly ? "is-active" : ""} aria-pressed={filters.openOnly} onClick={() => setFilters((current) => ({ ...current, openOnly: !current.openOnly }))}><CheckCircle size={18} weight={filters.openOnly ? "fill" : "regular"} />Open now</button>
        </div>
      </div>
      <div className="results-heading"><strong>{loading ? "Finding sales" : `${visibleSales.length} ${visibleSales.length === 1 ? "sale" : "sales"}`}</strong><span>Closest first</span></div>
      {loading ? <LoadingCards count={4} /> : error && !visibleSales.length ? <ErrorState message={error} onRetry={retry} /> : visibleSales.length ? (
        <div className="explore-grid">{visibleSales.map((sale) => <SaleCard key={sale.id} sale={sale} saved={favorites.has(sale.id)} onSelect={onOpenSale} onToggleSave={toggleSave} />)}</div>
      ) : <EmptyState onAction={onQuickAdd} />}
    </div>
  );
}
