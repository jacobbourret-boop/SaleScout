import { distanceBetween } from "./utils";

export function getVisibleSales(sales, center, filters) {
  const now = Date.now();
  const query = filters.search.trim().toLowerCase();
  return sales
    .filter((sale) => {
      const endsAt = Date.parse(sale.endsAt || "");
      if (!Number.isNaN(endsAt) && endsAt <= now) return false;
      if (sale.status === "closed") return !filters.openOnly;
      return true;
    })
    .map((sale) => ({ ...sale, distance: distanceBetween(center, sale.location) }))
    .filter((sale) => {
      if (filters.type !== "all" && sale.type !== filters.type) return false;
      if (sale.distance > filters.radius) return false;
      if (!query) return true;
      return [
        sale.title,
        sale.type,
        sale.description,
        sale.address,
        sale.hours,
        ...(sale.categories || []),
        ...(sale.highlights || []),
        ...(sale.comments || []).map((comment) => comment.body)
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    })
    .sort((a, b) => a.distance - b.distance || Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export function buildRoute(sales, center, favorites) {
  const candidates = sales.filter((sale) => favorites.size === 0 || favorites.has(sale.id));
  const route = [];
  const remaining = [...candidates];
  let cursor = center;
  while (remaining.length && route.length < 8) {
    remaining.sort((a, b) => distanceBetween(cursor, a.location) - distanceBetween(cursor, b.location));
    const next = remaining.shift();
    route.push({ ...next, routeDistance: distanceBetween(cursor, next.location) });
    cursor = next.location;
  }
  return route;
}

export function saleConfidence(sale) {
  const reports = sale.reports || [];
  const confirmations = reports.filter((report) => report.type === "confirm-open");
  const confirmationCount = Number.isFinite(Number(sale.confirmations)) ? Number(sale.confirmations) : confirmations.length;
  const latestConfirmation = confirmations.reduce((latest, report) => Math.max(latest, Date.parse(report.createdAt || 0) || 0), 0);
  const confirmationAgeHours = latestConfirmation ? Math.max(0, (Date.now() - latestConfirmation) / 3_600_000) : Number.POSITIVE_INFINITY;
  if (sale.status === "closed") return { label: "Reported closed", tone: "danger" };
  if (sale.status === "questionable") return { label: "Needs a scout", tone: "warning" };
  if (confirmationCount >= 2 && confirmationAgeHours < 3) return { label: "High confidence", tone: "success" };
  if (confirmationCount >= 1 && confirmationAgeHours < 5) return { label: "Recently confirmed", tone: "success" };
  return { label: "Likely open", tone: "neutral" };
}

export function recentCommunityActivity(sales) {
  return sales
    .flatMap((sale) =>
      (sale.reports || []).map((report) => ({
        ...report,
        saleId: sale.id,
        saleTitle: sale.title
      }))
    )
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
