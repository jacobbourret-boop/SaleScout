import { useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, Minus, Plus, SlidersHorizontal } from "@phosphor-icons/react";
import { Button } from "./ui/button";
import { cn, roundCoord } from "../lib/utils";

export function MapExperience({ sales, center, radius, config, selectedId, onSelect, onCenterChange, onLocate, onOpenFilters }) {
  const [zoom, setZoom] = useState(1);
  const [providerFailed, setProviderFailed] = useState(false);
  const [providerReady, setProviderReady] = useState(false);
  const providerNode = useRef(null);
  const initializingRef = useRef(false);
  const googleMap = useRef(null);
  const googleMarkers = useRef([]);
  const googleUserMarker = useRef(null);
  const appleMap = useRef(null);
  const appleAnnotations = useRef([]);
  const centerChangeRef = useRef(onCenterChange);
  centerChangeRef.current = onCenterChange;

  const configuredProvider = useMemo(() => {
    if (providerFailed) return "local";
    if (config?.maps?.provider === "google" && config.maps.googleMapsApiKey) return "google";
    if (config?.maps?.provider === "apple" && config.maps.appleMapKitToken) return "apple";
    return "local";
  }, [config, providerFailed]);

  useEffect(() => {
    if (configuredProvider === "local" || providerReady || initializingRef.current || !providerNode.current) return;
    let active = true;
    const initialization = {};
    initializingRef.current = initialization;
    const initialize = async () => {
      try {
        if (configuredProvider === "google") {
          await loadExternalScript(`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(config.maps.googleMapsApiKey)}&v=weekly`);
          if (!active || !window.google?.maps) return;
          googleMap.current = new window.google.maps.Map(providerNode.current, {
            center,
            zoom: googleZoom(radius, zoom),
            clickableIcons: false,
            fullscreenControl: false,
            mapTypeControl: false,
            streetViewControl: false,
            zoomControl: false,
            mapId: config.maps.googleMapId || undefined
          });
          googleMap.current.addListener("dragend", () => {
            const next = googleMap.current?.getCenter();
            if (next) centerChangeRef.current({ lat: next.lat(), lng: next.lng() });
          });
        } else {
          await loadExternalScript("https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js");
          if (!active || !window.mapkit) return;
          window.mapkit.init({ authorizationCallback: (done) => done(config.maps.appleMapKitToken) });
          appleMap.current = new window.mapkit.Map(providerNode.current);
          appleMap.current.addEventListener("region-change-end", () => {
            const next = appleMap.current?.center;
            if (next) centerChangeRef.current({ lat: next.latitude, lng: next.longitude });
          });
        }
        if (active) setProviderReady(true);
      } catch {
        if (active) setProviderFailed(true);
      } finally {
        if (initializingRef.current === initialization) initializingRef.current = null;
      }
    };
    initialize();
    return () => {
      active = false;
      if (initializingRef.current === initialization) initializingRef.current = null;
    };
  }, [config, configuredProvider, providerReady]);

  useEffect(() => {
    if (!providerReady) return;
    if (configuredProvider === "google" && googleMap.current && window.google) {
      const google = window.google;
      googleMap.current.setCenter(center);
      googleMap.current.setZoom(googleZoom(radius, zoom));
      googleMarkers.current.forEach((marker) => marker.setMap(null));
      googleMarkers.current = [];
      googleUserMarker.current?.setMap(null);
      googleUserMarker.current = new google.maps.Marker({
        position: center,
        map: googleMap.current,
        title: "Your location",
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#235dad", fillOpacity: 1, strokeColor: "#f8fbff", strokeWeight: 4 }
      });
      sales.forEach((sale) => {
        const selected = sale.id === selectedId;
        const marker = new google.maps.Marker({
          position: sale.location,
          map: googleMap.current,
          title: sale.title,
          label: { text: String(sale.type || "S").slice(0, 1).toUpperCase(), color: "#10233f", fontWeight: "800" },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: selected ? 17 : 14,
            fillColor: sale.status === "questionable" ? "#f3a62f" : "#f4b33f",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: selected ? 5 : 4
          }
        });
        marker.addListener("click", () => onSelect(sale.id));
        googleMarkers.current.push(marker);
      });
      return;
    }
    if (configuredProvider === "apple" && appleMap.current && window.mapkit) {
      const mapkit = window.mapkit;
      const span = Math.max(0.01, (radius / zoom) / 69);
      appleMap.current.region = new mapkit.CoordinateRegion(new mapkit.Coordinate(center.lat, center.lng), new mapkit.CoordinateSpan(span * 2, span * 2));
      appleAnnotations.current.forEach((annotation) => appleMap.current.removeAnnotation(annotation));
      const user = new mapkit.MarkerAnnotation(new mapkit.Coordinate(center.lat, center.lng), { title: "Your location", color: "#235dad", glyphText: "You" });
      appleMap.current.addAnnotation(user);
      appleAnnotations.current = [user];
      sales.forEach((sale) => {
        const marker = new mapkit.MarkerAnnotation(new mapkit.Coordinate(sale.location.lat, sale.location.lng), {
          title: sale.title,
          subtitle: sale.address,
          color: sale.status === "questionable" ? "#f3a62f" : "#235dad",
          glyphText: String(sale.type || "S").slice(0, 1).toUpperCase()
        });
        marker.addEventListener("select", () => onSelect(sale.id));
        appleMap.current.addAnnotation(marker);
        appleAnnotations.current.push(marker);
      });
    }
  }, [center, configuredProvider, onSelect, providerReady, radius, sales, selectedId, zoom]);

  useEffect(() => () => {
    googleMarkers.current.forEach((marker) => marker.setMap(null));
    googleUserMarker.current?.setMap(null);
    if (appleMap.current) appleAnnotations.current.forEach((annotation) => appleMap.current.removeAnnotation(annotation));
  }, []);

  const localClusters = useMemo(() => clusterSales(sales, center, Math.max(0.6, radius / zoom)), [center, radius, sales, zoom]);
  const providerLabel = configuredProvider === "google" ? (providerReady ? "Google Maps" : "Loading Google Maps") : configuredProvider === "apple" ? (providerReady ? "Apple MapKit" : "Loading Apple MapKit") : "SaleScout local map";

  return (
    <section className="map-experience" aria-label="Sale map">
      <div ref={providerNode} className={cn("provider-map", configuredProvider !== "local" && "is-active")} aria-label={providerLabel} />
      <div className={cn("local-map", configuredProvider !== "local" && "is-hidden")} role="group" aria-label="Local map showing nearby sales">
        <div className="map-park" />
        <div className="map-river" />
        {["one", "two", "three", "four", "five", "six"].map((road) => <span className={`map-road road-${road}`} key={road} />)}
        {localClusters.map((cluster) => {
          const only = cluster.sales[0];
          const selected = cluster.sales.some((sale) => sale.id === selectedId);
          return (
            <button
              key={cluster.sales.map((sale) => sale.id).join(":")}
              type="button"
              className={cn("map-marker", cluster.sales.length > 1 && "is-cluster", selected && "is-selected", only?.status === "questionable" && "is-questionable")}
              style={{ left: `${cluster.x}%`, top: `${cluster.y}%` }}
              onClick={() => cluster.sales.length > 1 ? setZoom((value) => Math.min(2.2, roundCoord(value + 0.4))) : onSelect(only.id)}
              aria-label={cluster.sales.length > 1 ? `${cluster.sales.length} nearby sales. Zoom in.` : `${only.title}, ${only.distance?.toFixed?.(1) || "nearby"} miles`}
            >
              <span>{cluster.sales.length > 1 ? cluster.sales.length : String(only.type || "S").slice(0, 1).toUpperCase()}</span>
            </button>
          );
        })}
        <span className="user-location-marker" style={{ left: "50%", top: "50%" }} aria-label="Your location" />
      </div>

      <div className="map-top-controls">
        <span className="map-provider-label">{providerLabel}</span>
        <Button variant="quietIcon" size="icon" onClick={onOpenFilters} aria-label="Map filters"><SlidersHorizontal size={20} weight="bold" /></Button>
      </div>
      <div className="map-zoom-controls">
        <Button variant="quietIcon" size="icon" onClick={() => setZoom((value) => Math.min(2.2, roundCoord(value + 0.2)))} aria-label="Zoom in"><Plus size={20} weight="bold" /></Button>
        <Button variant="quietIcon" size="icon" onClick={() => setZoom((value) => Math.max(0.6, roundCoord(value - 0.2)))} aria-label="Zoom out"><Minus size={20} weight="bold" /></Button>
      </div>
      <Button variant="quietIcon" size="icon" className="map-locate-button" onClick={onLocate} aria-label="Use my current location"><Crosshair size={21} weight="bold" /></Button>
      {!sales.length ? <div className="map-empty-message">No sales match this map view</div> : null}
    </section>
  );
}

function clusterSales(sales, center, halfRangeMiles) {
  const points = sales.map((sale) => ({ sale, ...latLngToMapPoint(sale.location, center, halfRangeMiles) })).filter((point) => point.x != null);
  const clusters = [];
  points.forEach((point) => {
    const match = clusters.find((cluster) => Math.hypot(cluster.x - point.x, cluster.y - point.y) < 7);
    if (match) {
      match.sales.push(point.sale);
      match.x = match.sales.reduce((sum, sale) => sum + latLngToMapPoint(sale.location, center, halfRangeMiles).x, 0) / match.sales.length;
      match.y = match.sales.reduce((sum, sale) => sum + latLngToMapPoint(sale.location, center, halfRangeMiles).y, 0) / match.sales.length;
    } else clusters.push({ x: point.x, y: point.y, sales: [point.sale] });
  });
  return clusters;
}

function latLngToMapPoint(location, center, halfRangeMiles) {
  const latMiles = (center.lat - location.lat) * 69;
  const lngMiles = (location.lng - center.lng) * 69 * Math.cos((center.lat * Math.PI) / 180);
  const x = 50 + (lngMiles / halfRangeMiles) * 45;
  const y = 50 + (latMiles / halfRangeMiles) * 45;
  if (x < 2 || x > 98 || y < 2 || y > 98) return {};
  return { x: roundCoord(x), y: roundCoord(y) };
}

function googleZoom(radius, zoom) {
  return Math.round(14 - Math.log2(Math.max(1, radius / zoom)));
}

function loadExternalScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${CSS.escape(src)}"]`);
    if (existing) {
      const sdkReady = src.includes("maps.googleapis.com") ? Boolean(window.google?.maps) : src.includes("apple-mapkit.com") ? Boolean(window.mapkit) : false;
      if (existing.dataset.loaded === "true" || sdkReady) resolve();
      else {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
      }
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = reject;
    document.head.append(script);
  });
}
