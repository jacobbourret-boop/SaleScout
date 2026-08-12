import { ArrowUpRight, CheckCircle, Compass, FunnelSimple, MapPin, UsersThree } from "@phosphor-icons/react";
import { recentCommunityActivity } from "../lib/sales";
import { relativeTime, titleCase } from "../lib/utils";
import { SaleCard } from "../components/sale-card";
import { SectionHeader } from "../components/section-header";
import { EmptyState, ErrorState, LoadingCards } from "../components/screen-states";

const signalCopy = {
  "confirm-open": "confirmed this sale is still open",
  closed: "reported this sale closed",
  busy: "said this sale is busy",
  "great-deals": "spotted great deals here",
  "worth-visiting": "said this one is worth visiting",
  "lots-of-furniture": "found lots of furniture",
  "kid-friendly": "marked this sale kid friendly",
  "cash-only": "reported cash only"
};

export function HomeScreen({ model, onQuickAdd, onOpenSale }) {
  const { visibleSales, favorites, profile, loading, error, filters, setFilters, setView, toggleSave, retry } = model;
  const activity = recentCommunityActivity(visibleSales).slice(0, 4);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = profile.displayName?.trim().split(/\s+/)[0];

  return (
    <div className="screen page-screen home-screen">
      <section className="home-hero">
        <div className="home-hero-copy">
          <span className="day-label">{new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date())}</span>
          <h1>{greeting}{firstName ? `, ${firstName}` : ""}.</h1>
          <p>{visibleSales.length ? `${visibleSales.length} promising ${visibleSales.length === 1 ? "sale" : "sales"} close enough to explore.` : "Your next great find could be one block away."}</p>
        </div>
        <button className="area-button" type="button" onClick={() => setView("map")}><MapPin size={18} weight="fill" /><span><small>Looking near</small><strong>Your current area</strong></span><ArrowUpRight size={17} weight="bold" /></button>
      </section>

      <div className="quick-filters" aria-label="Quick filters">
        <button type="button" className={filters.openOnly ? "is-active" : ""} aria-pressed={filters.openOnly} onClick={() => setFilters((current) => ({ ...current, openOnly: !current.openOnly }))}><CheckCircle size={18} weight={filters.openOnly ? "fill" : "regular"} />Open now</button>
        <button type="button" className={filters.type === "estate" ? "is-active" : ""} aria-pressed={filters.type === "estate"} onClick={() => { setFilters((current) => ({ ...current, type: current.type === "estate" ? "all" : "estate" })); setView("explore"); }}><Compass size={18} />Estate sales</button>
        <button type="button" className={filters.radius === 2 ? "is-active" : ""} aria-pressed={filters.radius === 2} onClick={() => setFilters((current) => ({ ...current, radius: current.radius === 2 ? 5 : 2 }))}><MapPin size={18} />Under 2 miles</button>
        <button type="button" onClick={() => setView("explore")}><FunnelSimple size={18} />All filters</button>
      </div>

      {loading ? <LoadingCards horizontal /> : error && !visibleSales.length ? <ErrorState message={error} onRetry={retry} /> : visibleSales.length ? (
        <>
          <section className="home-section">
            <SectionHeader title="Trending nearby" subtitle="Fresh confirmations and promising photos." actionLabel="See all" onAction={() => setView("explore")} />
            <div className="sale-rail">
              {visibleSales.slice(0, 5).map((sale, index) => <SaleCard key={sale.id} sale={sale} saved={favorites.has(sale.id)} onSelect={onOpenSale} onToggleSave={toggleSave} variant="feature" priority={index === 0} />)}
            </div>
          </section>

          <section className="home-section home-discovery-grid">
            <div className="featured-find">
              <SectionHeader title="Worth a closer look" subtitle="The most recently updated sale near you." />
              <SaleCard sale={visibleSales[0]} saved={favorites.has(visibleSales[0].id)} onSelect={onOpenSale} onToggleSave={toggleSave} variant="standard" />
            </div>
            <div className="community-pulse">
              <SectionHeader title="Community pulse" subtitle="Live updates from people already there." />
              {activity.length ? <div className="activity-list">{activity.map((item, index) => (
                <button key={`${item.id || item.createdAt}-${index}`} type="button" onClick={() => onOpenSale(item.saleId)}>
                  <span className="activity-avatar">{String(item.profileName || "S").slice(0, 1).toUpperCase()}</span>
                  <span><strong>{item.profileName || "A local scout"}</strong><span>{signalCopy[item.type] || titleCase(item.type)}</span><small>{item.saleTitle} · {relativeTime(item.createdAt)}</small></span>
                  <ArrowUpRight size={17} />
                </button>
              ))}</div> : <div className="quiet-empty"><UsersThree size={24} weight="duotone" /><p>Community updates will appear as scouts check in.</p></div>}
            </div>
          </section>
        </>
      ) : <EmptyState onAction={onQuickAdd} />}
    </div>
  );
}
