import { ArrowUpRight, Car, MapPin } from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { SaleCard } from "../components/sale-card";
import { EmptyState, LoadingCards } from "../components/screen-states";
import { formatDistance } from "../lib/utils";

export function SavedScreen({ model, onOpenSale }) {
  const { savedSales, favorites, route, loading, toggleSave, openRoute, setView } = model;
  const savedRoute = route.filter((sale) => favorites.has(sale.id));
  return (
    <div className="screen page-screen saved-screen">
      <header className="screen-intro">
        <h1>Saved for Saturday</h1>
        <p>Your best finds, ready for a simple route.</p>
      </header>
      {favorites.size && savedRoute.length ? (
        <section className="route-hero">
          <div><span className="route-icon"><Car size={25} weight="duotone" /></span><div><small>Smart route</small><h2>{savedRoute.length} {savedRoute.length === 1 ? "stop" : "stops"}, closest first</h2><p>Starts from your current map location.</p></div></div>
          <Button variant="discovery" onClick={openRoute}>Open route<ArrowUpRight size={18} weight="bold" /></Button>
          <div className="route-preview">{savedRoute.slice(0, 4).map((sale, index) => <button key={sale.id} type="button" onClick={() => onOpenSale(sale.id)}><span>{index + 1}</span><div><strong>{sale.title}</strong><small><MapPin size={13} weight="fill" />{formatDistance(sale.routeDistance)} from last stop</small></div></button>)}</div>
        </section>
      ) : null}
      {loading ? <LoadingCards /> : savedSales.length ? <div className="saved-list">{savedSales.map((sale) => <SaleCard key={sale.id} sale={sale} saved onSelect={onOpenSale} onToggleSave={toggleSave} variant="row" />)}</div> : <EmptyState kind="saved" onAction={() => setView("explore")} />}
    </div>
  );
}
