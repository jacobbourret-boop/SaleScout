import { useState } from "react";
import { CaretUp, CheckCircle, List, MapPin } from "@phosphor-icons/react";
import { MapExperience } from "../components/map-experience";
import { SaleCard } from "../components/sale-card";
import { cn } from "../lib/utils";

export function MapScreen({ model, onOpenSale, onPreviewSale }) {
  const { visibleSales, favorites, filters, setFilters, config, center, selectedId, selectedSale, selectSale, toggleSave, setCenter, locate } = model;
  const [sheetLevel, setSheetLevel] = useState("peek");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const previewSales = selectedSale ? [selectedSale] : visibleSales.slice(0, 3);
  const cycleSheet = () => setSheetLevel((value) => value === "peek" ? "half" : value === "half" ? "full" : "peek");
  return (
    <div className="screen map-screen">
      <MapExperience sales={visibleSales} center={center} radius={filters.radius} config={config} selectedId={selectedId} onSelect={onPreviewSale} onCenterChange={setCenter} onLocate={() => locate({ silent: false }).catch(() => {})} onOpenFilters={() => setFiltersOpen((value) => !value)} />
      {filtersOpen ? (
        <div className="map-filter-panel">
          <strong>Map filters</strong>
          <label><MapPin size={17} /><span>Distance</span><select value={filters.radius} onChange={(event) => setFilters((current) => ({ ...current, radius: Number(event.target.value) }))}><option value="2">2 miles</option><option value="5">5 miles</option><option value="10">10 miles</option><option value="25">25 miles</option></select></label>
          <button type="button" className={filters.openOnly ? "is-active" : ""} aria-pressed={filters.openOnly} onClick={() => setFilters((current) => ({ ...current, openOnly: !current.openOnly }))}><CheckCircle size={18} weight={filters.openOnly ? "fill" : "regular"} />Open now</button>
        </div>
      ) : null}
      <section className={cn("map-results-sheet", `is-${sheetLevel}`)} aria-label="Sales in this map view">
        <button type="button" className="map-sheet-handle" onClick={cycleSheet} aria-label={`Expand map results from ${sheetLevel} view`}><span /><CaretUp size={17} weight="bold" /></button>
        <div className="map-results-heading"><div><span><List size={18} weight="bold" />Nearby</span><strong>{visibleSales.length} in this area</strong></div>{selectedSale ? <button type="button" onClick={() => selectSale("")}>Clear selection</button> : null}</div>
        <div className="map-result-list">{previewSales.map((sale) => <SaleCard key={sale.id} sale={{ ...sale, distance: sale.distance ?? visibleSales.find((item) => item.id === sale.id)?.distance }} saved={favorites.has(sale.id)} onSelect={onOpenSale} onToggleSave={toggleSave} variant="row" />)}</div>
      </section>
    </div>
  );
}
