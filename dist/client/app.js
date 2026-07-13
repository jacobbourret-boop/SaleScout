const STORAGE_KEYS = {
  offlineSales: "salescout.offline-sales.v2",
  favorites: "salescout.favorites.v1",
  settings: "salescout.settings.v1",
  deviceId: "salescout.device-id.v1",
  profile: "salescout.profile.v1",
  demoDefaults: "salescout.hosted-demo-defaults.v1"
};

const DEFAULT_CENTER = {
  lat: 41.8781,
  lng: -87.6298,
  label: "Chicago demo area"
};

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);
const HOSTED_DEMO_MODE = isHostedDemoMode();
const API_ROOT = HOSTED_DEMO_MODE ? "" : (window.location.protocol === "file:" ? "http://127.0.0.1:5173" : "");
const REFRESH_INTERVAL_MS = 20000;
const REPORT_PICKER_RANGE = 0.055;
const PHOTO_MAX_EDGE = 900;
const PHOTO_QUALITY = 0.72;
const REPORT_TYPES = [
  "still_open",
  "closed",
  "worth_the_stop",
  "picked_over",
  "mostly_tools",
  "mostly_furniture",
  "mostly_baby_items",
  "mostly_electronics",
  "mostly_collectibles",
  "easy_parking",
  "cash_only",
  "accepts_venmo"
];

function isHostedDemoMode() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("api") === "1" || params.get("demo") === "0") return false;
  if (params.has("demo") || params.has("hosted-demo")) return true;
  if (window.location.protocol === "file:") return true;
  return !LOCAL_HOSTNAMES.has(window.location.hostname);
}

const state = {
  sales: [],
  favorites: new Set(),
  selectedSaleId: null,
  view: "map",
  routeMode: "saved",
  typeFilter: "all",
  openOnly: true,
  favoritesOnly: false,
  radiusMiles: 10,
  query: "",
  center: Object.assign({}, DEFAULT_CENTER),
  reportLocation: { lat: DEFAULT_CENTER.lat, lng: DEFAULT_CENTER.lng, source: "map center" },
  reportPhotoUrl: "",
  deviceId: "",
  profile: null,
  zoom: 1,
  syncMode: "loading",
  lastSyncedAt: null
};

const elements = {};
let toastTimer = null;
let refreshTimer = null;

document.addEventListener("DOMContentLoaded", async function () {
  cacheElements();
  hydrateDeviceState();
  bindEvents();
  setDefaultReportTimes();
  render();
  await loadSales({ silent: false });
  if (!HOSTED_DEMO_MODE) {
    refreshTimer = window.setInterval(function () {
      loadSales({ silent: true });
    }, REFRESH_INTERVAL_MS);
  }
});

window.addEventListener("beforeunload", function () {
  if (refreshTimer) window.clearInterval(refreshTimer);
});

function cacheElements() {
  elements.locationSummary = document.querySelector("#locationSummary");
  elements.activeCount = document.querySelector("#activeCount");
  elements.searchInput = document.querySelector("#searchInput");
  elements.openReportButton = document.querySelector("#openReportButton");
  elements.profileButton = document.querySelector("#profileButton");
  elements.locateButton = document.querySelector("#locateButton");
  elements.openOnlyToggle = document.querySelector("#openOnlyToggle");
  elements.favoritesOnlyToggle = document.querySelector("#favoritesOnlyToggle");
  elements.radiusSelect = document.querySelector("#radiusSelect");
  elements.saleList = document.querySelector("#saleList");
  elements.mapCenterLabel = document.querySelector("#mapCenterLabel");
  elements.lastUpdatedLabel = document.querySelector("#lastUpdatedLabel");
  elements.zoomOutButton = document.querySelector("#zoomOutButton");
  elements.zoomInButton = document.querySelector("#zoomInButton");
  elements.mapCanvas = document.querySelector("#mapCanvas");
  elements.pinLayer = document.querySelector("#pinLayer");
  elements.mapEmptyState = document.querySelector("#mapEmptyState");
  elements.emptyDetail = document.querySelector("#emptyDetail");
  elements.saleDetail = document.querySelector("#saleDetail");
  elements.listPanel = document.querySelector(".list-panel");
  elements.reportDialog = document.querySelector("#reportDialog");
  elements.reportForm = document.querySelector("#reportForm");
  elements.closeReportButton = document.querySelector("#closeReportButton");
  elements.cancelReportButton = document.querySelector("#cancelReportButton");
  elements.useMapCenterButton = document.querySelector("#useMapCenterButton");
  elements.useCurrentLocationButton = document.querySelector("#useCurrentLocationButton");
  elements.reportLocationHint = document.querySelector("#reportLocationHint");
  elements.saleType = document.querySelector("#saleType");
  elements.salePhoto = document.querySelector("#salePhoto");
  elements.photoPreview = document.querySelector("#photoPreview");
  elements.photoPreviewImage = document.querySelector("#photoPreviewImage");
  elements.clearPhotoButton = document.querySelector("#clearPhotoButton");
  elements.saleTitle = document.querySelector("#saleTitle");
  elements.saleAddress = document.querySelector("#saleAddress");
  elements.startsAt = document.querySelector("#startsAt");
  elements.endsAt = document.querySelector("#endsAt");
  elements.saleDescription = document.querySelector("#saleDescription");
  elements.saleComment = document.querySelector("#saleComment");
  elements.reportMapPicker = document.querySelector("#reportMapPicker");
  elements.reportPinPreview = document.querySelector("#reportPinPreview");
  elements.reportCoordinateLabel = document.querySelector("#reportCoordinateLabel");
  elements.profileDialog = document.querySelector("#profileDialog");
  elements.profileForm = document.querySelector("#profileForm");
  elements.closeProfileButton = document.querySelector("#closeProfileButton");
  elements.signOutButton = document.querySelector("#signOutButton");
  elements.profileUsername = document.querySelector("#profileUsername");
  elements.profileDisplayName = document.querySelector("#profileDisplayName");
  elements.defaultRadiusSelect = document.querySelector("#defaultRadiusSelect");
  elements.defaultOpenOnlySelect = document.querySelector("#defaultOpenOnlySelect");
  elements.toast = document.querySelector("#toast");
}

function hydrateDeviceState() {
  const savedFavorites = readJson(STORAGE_KEYS.favorites);
  const savedSettings = readJson(STORAGE_KEYS.settings);

  state.favorites = new Set(Array.isArray(savedFavorites) ? savedFavorites : []);
  state.sales = readOfflineSales();
  state.deviceId = localStorage.getItem(STORAGE_KEYS.deviceId) || makeId();
  localStorage.setItem(STORAGE_KEYS.deviceId, state.deviceId);
  state.profile = normalizeProfile(readJson(STORAGE_KEYS.profile));

  if (HOSTED_DEMO_MODE && !localStorage.getItem(STORAGE_KEYS.demoDefaults)) {
    if (state.favorites.size === 0) state.favorites = new Set(["seed-1", "seed-3"]);
    localStorage.setItem(STORAGE_KEYS.demoDefaults, "1");
  }

  if (savedSettings && savedSettings.center && savedSettings.center.lat && savedSettings.center.lng) {
    state.center = savedSettings.center;
    state.reportLocation = { lat: state.center.lat, lng: state.center.lng, source: "map center" };
  }
  if (savedSettings && Object.prototype.hasOwnProperty.call(savedSettings, "radiusMiles")) {
    state.radiusMiles = savedSettings.radiusMiles === null ? null : Number(savedSettings.radiusMiles);
  }
  if (savedSettings && typeof savedSettings.openOnly === "boolean") {
    state.openOnly = savedSettings.openOnly;
  }
  elements.radiusSelect.value = state.radiusMiles === null ? "all" : String(state.radiusMiles);
  elements.openOnlyToggle.checked = state.openOnly;

  persistFavorites();
}

function bindEvents() {
  elements.searchInput.addEventListener("input", function (event) {
    state.query = event.target.value.trim().toLowerCase();
    render();
  });

  document.querySelectorAll("[data-view]").forEach(function (button) {
    button.addEventListener("click", function () {
      setView(button.dataset.view);
    });
  });

  document.querySelectorAll("[data-type-filter]").forEach(function (button) {
    button.addEventListener("click", function () {
      state.typeFilter = button.dataset.typeFilter;
      document.querySelectorAll("[data-type-filter]").forEach(function (item) {
        item.classList.toggle("active", item === button);
      });
      render();
    });
  });

  elements.openOnlyToggle.addEventListener("change", function (event) {
    state.openOnly = event.target.checked;
    persistSettings();
    render();
  });

  elements.favoritesOnlyToggle.addEventListener("change", function (event) {
    state.favoritesOnly = event.target.checked;
    render();
  });

  elements.radiusSelect.addEventListener("change", function (event) {
    state.radiusMiles = event.target.value === "all" ? null : Number(event.target.value);
    persistSettings();
    render();
  });

  elements.locateButton.addEventListener("click", function () { requestLocation(true); });
  elements.zoomInButton.addEventListener("click", function () {
    state.zoom = Math.min(2.3, state.zoom + 0.25);
    renderMap();
  });
  elements.zoomOutButton.addEventListener("click", function () {
    state.zoom = Math.max(0.65, state.zoom - 0.25);
    renderMap();
  });

  elements.openReportButton.addEventListener("click", openReportDialog);
  elements.profileButton.addEventListener("click", openProfileDialog);
  elements.closeProfileButton.addEventListener("click", closeProfileDialog);
  elements.signOutButton.addEventListener("click", signOutProfile);
  elements.profileForm.addEventListener("submit", function (event) {
    event.preventDefault();
    saveProfile();
  });
  elements.closeReportButton.addEventListener("click", closeReportDialog);
  elements.cancelReportButton.addEventListener("click", closeReportDialog);
  elements.useMapCenterButton.addEventListener("click", function () {
    state.reportLocation = { lat: state.center.lat, lng: state.center.lng, source: "map center" };
    updateReportLocationHint();
    showToast("Report pin set to the map center.");
  });
  elements.useCurrentLocationButton.addEventListener("click", function () { requestLocation(true, true); });
  elements.salePhoto.addEventListener("change", handlePhotoSelection);
  elements.clearPhotoButton.addEventListener("click", clearPhotoSelection);

  elements.reportMapPicker.addEventListener("click", setReportLocationFromPicker);
  elements.reportMapPicker.addEventListener("keydown", nudgeReportLocation);

  elements.reportForm.addEventListener("submit", function (event) {
    event.preventDefault();
    submitReport();
  });
}

async function loadSales(options) {
  const silent = options && options.silent;
  if (HOSTED_DEMO_MODE) {
    state.sales = readOfflineSales();
    state.syncMode = "demo";
    state.lastSyncedAt = new Date().toISOString();
    render();
    return;
  }

  try {
    const data = await apiRequest("/api/sales", { method: "GET" });
    state.sales = Array.isArray(data.sales) ? data.sales.map(normalizeClientSale) : [];
    state.syncMode = "online";
    state.lastSyncedAt = data.updatedAt || new Date().toISOString();
    if (state.selectedSaleId && !state.sales.some(function (sale) { return sale.id === state.selectedSaleId; })) {
      state.selectedSaleId = null;
    }
    render();
  } catch (error) {
    if (state.sales.length === 0) state.sales = readOfflineSales();
    state.syncMode = "offline";
    state.lastSyncedAt = null;
    render();
    if (!silent) showToast("Using browser-only demo data. Reports save on this device.");
  }
}

async function apiRequest(path, options) {
  if (HOSTED_DEMO_MODE) throw new Error("Hosted demo mode has no API.");
  const requestOptions = Object.assign({ headers: { "Content-Type": "application/json" } }, options || {});
  const response = await fetch(API_ROOT + path, requestOptions);
  let data = {};
  try { data = await response.json(); } catch (error) { data = {}; }
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

function render() {
  const visibleSales = getFilteredSales();
  const routeSales = getRouteSales();
  const mapSales = state.view === "profile" ? getFilteredSales({ ignoreView: true }) : (state.view === "route" ? routeSales : visibleSales);
  const activeSales = mapSales.filter(function (sale) { return isOpenNow(sale); });
  const selectedSale = state.sales.find(function (sale) { return sale.id === state.selectedSaleId; }) || null;

  elements.locationSummary.textContent = state.center.label || "Current map area";
  elements.activeCount.textContent = getPanelCountLabel(activeSales.length, routeSales.length);
  elements.mapCenterLabel.textContent = (state.center.label || "Map center") + " - " + formatCoordinate(state.center.lat) + ", " + formatCoordinate(state.center.lng) + " | " + formatRadiusLabel();
  elements.lastUpdatedLabel.textContent = getSyncLabel();
  elements.mapEmptyState.hidden = mapSales.length > 0;
  elements.profileButton.innerHTML = "<svg aria-hidden=\"true\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"8\" r=\"4\"></circle><path d=\"M4 21c1.8-4 5-6 8-6s6.2 2 8 6\"></path></svg>" + escapeHtml(getProfileLabel());
  elements.favoritesOnlyToggle.checked = state.view === "saved" ? true : state.favoritesOnly;
  document.querySelectorAll("[data-view]").forEach(function (button) {
    button.classList.toggle("active", button.dataset.view === state.view);
  });

  renderList(visibleSales);
  renderMap(mapSales);
  renderDetail(selectedSale);
}

function renderList(sales) {
  if (!sales) sales = getFilteredSales();

  if (state.view === "profile") {
    renderProfilePanel();
    return;
  }

  if (state.view === "route") {
    renderRoutePanel();
    return;
  }

  if (state.syncMode === "loading" && sales.length === 0) {
    elements.saleList.innerHTML = "<div class=\"sale-card\"><h3>Loading active sales</h3><p class=\"sale-meta\">Checking the shared SaleScout board.</p></div>";
    return;
  }

  if (sales.length === 0) {
    const emptyCopy = state.view === "saved" ? "Save nearby sales to build your weekend list." : "Change filters or report a nearby sale.";
    elements.saleList.innerHTML = "<div class=\"sale-card\"><h3>No sales match</h3><p class=\"sale-meta\">" + emptyCopy + "</p></div>";
    return;
  }

  elements.saleList.innerHTML = sales.map(function (sale) {
    const status = getSaleStatus(sale);
    const favorite = state.favorites.has(sale.id);
    return "<button class=\"sale-card " + (sale.id === state.selectedSaleId ? "active" : "") + "\" type=\"button\" data-sale-id=\"" + escapeHtml(sale.id) + "\">" +
      "<div class=\"sale-card-header\"><span class=\"status-badge " + status.className + "\">" + status.label + "</span>" +
      (favorite ? "<span class=\"status-badge favorite\">Saved</span>" : "") + "</div>" +
      "<h3>" + escapeHtml(sale.title) + "</h3>" +
      "<div class=\"sale-meta\"><span>" + capitalize(sale.type) + "</span><span>" + formatDistance(distanceMiles(state.center, sale)) + "</span><span>" + formatSaleHours(sale) + "</span></div>" +
      "</button>";
  }).join("");

  elements.saleList.querySelectorAll("[data-sale-id]").forEach(function (button) {
    button.addEventListener("click", function () { selectSale(button.dataset.saleId); });
  });
}

function renderProfilePanel() {
  const profile = state.profile;
  const savedCount = Array.from(state.favorites).length;
  const contributionCount = getContributionCount();
  const defaultRadius = state.radiusMiles === null ? "Any distance" : "Within " + state.radiusMiles + " mi";
  const name = profile ? profile.displayName : "Guest scout";
  const username = profile ? "@" + profile.username : "Sign in to name your reports.";

  elements.saleList.innerHTML =
    "<section class=\"profile-panel\">" +
      "<div class=\"profile-card\"><div><h3>" + escapeHtml(name) + "</h3><p class=\"freshness\">" + escapeHtml(username) + "</p></div>" +
      "<div class=\"profile-stats\"><div class=\"profile-stat\"><strong>" + savedCount + "</strong><span>saved</span></div><div class=\"profile-stat\"><strong>" + contributionCount + "</strong><span>updates</span></div></div>" +
      "<div class=\"profile-actions\"><button class=\"primary-action\" type=\"button\" data-profile-action=\"edit\">" + (profile ? "Edit profile" : "Sign in") + "</button>" + (profile ? "<button class=\"secondary-action\" type=\"button\" data-profile-action=\"sign-out\">Sign out</button>" : "") + "</div></div>" +
      "<div class=\"profile-card\"><h3>Settings</h3><p class=\"freshness\">Default distance: " + escapeHtml(defaultRadius) + "</p><p class=\"freshness\">Default list: " + (state.openOnly ? "Open now" : "All active listings") + "</p><button class=\"secondary-action\" type=\"button\" data-profile-action=\"edit\">Change settings</button></div>" +
      "<div class=\"profile-card\"><h3>Saved listings</h3><p class=\"freshness\">Weekend shortlist</p><div class=\"profile-actions\"><button class=\"secondary-action\" type=\"button\" data-profile-action=\"saved\">Open saved</button><button class=\"secondary-action\" type=\"button\" data-profile-action=\"route\">Plan route</button></div></div>" +
    "</section>";

  elements.saleList.querySelectorAll("[data-profile-action]").forEach(function (button) {
    button.addEventListener("click", function () {
      const action = button.dataset.profileAction;
      if (action === "edit") openProfileDialog();
      if (action === "sign-out") signOutProfile();
      if (action === "saved") setView("saved");
      if (action === "route") setView("route");
    });
  });
}

function renderRoutePanel() {
  const routeSales = getRouteSales();
  const savedCount = getRouteBaseSales("saved").length;
  const nearbyCount = getRouteBaseSales("nearby").length;
  const totalMiles = calculateRouteMiles(routeSales);
  const directionsUrl = buildRouteDirectionsUrl(routeSales);

  if (routeSales.length === 0) {
    elements.saleList.innerHTML =
      "<section class=\"route-panel\">" +
        "<div class=\"route-summary\"><h3>Plan My Saturday</h3><p class=\"freshness\">No route stops match the current filters.</p>" +
        "<div class=\"route-controls\"><button class=\"secondary-action " + (state.routeMode === "saved" ? "active" : "") + "\" type=\"button\" data-route-mode=\"saved\">Saved (" + savedCount + ")</button><button class=\"secondary-action " + (state.routeMode === "nearby" ? "active" : "") + "\" type=\"button\" data-route-mode=\"nearby\">Nearby (" + nearbyCount + ")</button></div></div>" +
      "</section>";
    bindRouteControls();
    return;
  }

  elements.saleList.innerHTML =
    "<section class=\"route-panel\">" +
      "<div class=\"route-summary\"><h3>Plan My Saturday</h3><p class=\"freshness\">" + routeSales.length + " stops - " + formatDistance(totalMiles) + " estimated route</p>" +
      "<div class=\"route-controls\"><button class=\"secondary-action " + (state.routeMode === "saved" ? "active" : "") + "\" type=\"button\" data-route-mode=\"saved\">Saved (" + savedCount + ")</button><button class=\"secondary-action " + (state.routeMode === "nearby" ? "active" : "") + "\" type=\"button\" data-route-mode=\"nearby\">Nearby (" + nearbyCount + ")</button></div>" +
      "<a class=\"primary-action\" href=\"" + directionsUrl + "\" target=\"_blank\" rel=\"noreferrer\"><svg aria-hidden=\"true\" viewBox=\"0 0 24 24\"><path d=\"M12 21s7-4.6 7-11a7 7 0 1 0-14 0c0 6.4 7 11 7 11Z\"></path><circle cx=\"12\" cy=\"10\" r=\"2.5\"></circle></svg>Open route</a></div>" +
      "<div class=\"route-stops\">" + routeSales.map(function (sale, index) {
        const status = getSaleStatus(sale);
        return "<button class=\"route-stop\" type=\"button\" data-sale-id=\"" + escapeHtml(sale.id) + "\"><span class=\"route-number\">" + (index + 1) + "</span><span><span class=\"status-badge " + status.className + "\">" + status.label + "</span><h3>" + escapeHtml(sale.title) + "</h3><span class=\"sale-meta\"><span>" + escapeHtml(getDisplayAddress(sale)) + "</span><span>" + formatDistance(distanceMiles(index === 0 ? state.center : routeSales[index - 1], sale)) + "</span></span></span></button>";
      }).join("") + "</div>" +
    "</section>";

  bindRouteControls();
  elements.saleList.querySelectorAll("[data-sale-id]").forEach(function (button) {
    button.addEventListener("click", function () { selectSale(button.dataset.saleId); });
  });
}

function bindRouteControls() {
  elements.saleList.querySelectorAll("[data-route-mode]").forEach(function (button) {
    button.addEventListener("click", function () {
      state.routeMode = button.dataset.routeMode === "nearby" ? "nearby" : "saved";
      render();
    });
  });
}

function setView(view) {
  state.view = ["map", "saved", "route", "profile"].indexOf(view) === -1 ? "map" : view;
  render();
}

function getPanelCountLabel(openCount, routeCount) {
  if (state.view === "saved") return state.favorites.size + " saved";
  if (state.view === "route") return routeCount + " stops";
  if (state.view === "profile") return state.profile ? "Signed in" : "Guest profile";
  return openCount + " open now";
}

function getProfileLabel() {
  if (!state.profile) return "Sign in";
  return state.profile.displayName.length > 18 ? state.profile.displayName.slice(0, 17) + "..." : state.profile.displayName;
}

function getContributionCount() {
  const reporterId = getReporterId();
  return state.sales.reduce(function (count, sale) {
    const ownReports = Array.isArray(sale.reports) ? sale.reports.filter(function (report) {
      return report.deviceId === reporterId || report.deviceId === state.deviceId || (state.profile && report.deviceId === state.profile.id);
    }).length : 0;
    return count + ownReports;
  }, 0);
}

function getRouteSales() {
  const mode = state.routeMode === "nearby" ? "nearby" : "saved";
  let candidates = getRouteBaseSales(mode);
  if (mode === "saved" && candidates.length === 0) candidates = getRouteBaseSales("nearby");
  return orderRouteSales(candidates).slice(0, 8);
}

function getRouteBaseSales(mode) {
  const baseSales = getFilteredSales({ ignoreView: true }).filter(function (sale) {
    return isOpenNow(sale);
  });
  if (mode === "saved") {
    return baseSales.filter(function (sale) { return state.favorites.has(sale.id); });
  }
  return baseSales.slice(0, 10);
}

function orderRouteSales(sales) {
  const remaining = sales.slice();
  const ordered = [];
  let origin = state.center;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = distanceMiles(origin, remaining[0]);
    for (let index = 1; index < remaining.length; index++) {
      const distance = distanceMiles(origin, remaining[index]);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    }
    const next = remaining.splice(nearestIndex, 1)[0];
    ordered.push(next);
    origin = next;
  }

  return ordered;
}

function calculateRouteMiles(sales) {
  if (sales.length === 0) return 0;
  let total = 0;
  let origin = state.center;
  sales.forEach(function (sale) {
    total += distanceMiles(origin, sale);
    origin = sale;
  });
  return total;
}

function buildRouteDirectionsUrl(sales) {
  const origin = state.center.lat + "," + state.center.lng;
  const destinationSale = sales[sales.length - 1] || state.center;
  const destination = destinationSale.lat + "," + destinationSale.lng;
  const waypoints = sales.slice(0, -1).map(function (sale) { return sale.lat + "," + sale.lng; }).join("|");
  let url = "https://www.google.com/maps/dir/?api=1&origin=" + encodeURIComponent(origin) + "&destination=" + encodeURIComponent(destination) + "&travelmode=driving";
  if (waypoints) url += "&waypoints=" + encodeURIComponent(waypoints);
  return url;
}

function openProfileDialog() {
  elements.profileUsername.value = state.profile ? state.profile.username : "";
  elements.profileDisplayName.value = state.profile ? state.profile.displayName : "";
  elements.defaultRadiusSelect.value = state.radiusMiles === null ? "all" : String(state.radiusMiles);
  elements.defaultOpenOnlySelect.value = state.openOnly ? "open" : "all";
  elements.signOutButton.hidden = !state.profile;
  elements.profileDialog.showModal();
  window.setTimeout(function () { elements.profileUsername.focus(); }, 50);
}

function closeProfileDialog() {
  if (elements.profileDialog.open) elements.profileDialog.close();
}

function saveProfile() {
  const username = normalizeUsername(elements.profileUsername.value);
  const displayName = cleanDisplayName(elements.profileDisplayName.value) || username || "SaleScout User";
  const now = new Date().toISOString();
  state.profile = {
    id: state.profile ? state.profile.id : makeId(),
    username: username || slugify(displayName),
    displayName: displayName,
    createdAt: state.profile ? state.profile.createdAt : now,
    updatedAt: now
  };
  state.radiusMiles = elements.defaultRadiusSelect.value === "all" ? null : Number(elements.defaultRadiusSelect.value);
  state.openOnly = elements.defaultOpenOnlySelect.value === "open";
  elements.radiusSelect.value = state.radiusMiles === null ? "all" : String(state.radiusMiles);
  elements.openOnlyToggle.checked = state.openOnly;
  persistProfile();
  persistSettings();
  closeProfileDialog();
  showToast("Profile saved.");
  render();
}

function signOutProfile() {
  state.profile = null;
  localStorage.removeItem(STORAGE_KEYS.profile);
  closeProfileDialog();
  showToast("Signed out on this device.");
  render();
}

function normalizeProfile(value) {
  if (!value || typeof value !== "object") return null;
  const username = normalizeUsername(value.username);
  const displayName = cleanDisplayName(value.displayName);
  if (!username && !displayName) return null;
  return {
    id: String(value.id || makeId()),
    username: username || slugify(displayName),
    displayName: displayName || username || "SaleScout User",
    createdAt: value.createdAt || new Date().toISOString(),
    updatedAt: value.updatedAt || value.createdAt || new Date().toISOString()
  };
}

function persistProfile() {
  if (state.profile) writeJson(STORAGE_KEYS.profile, state.profile);
}

function getReporterId() {
  return state.profile ? state.profile.id : state.deviceId;
}

function renderMap(sales) {
  if (!sales) sales = getFilteredSales();
  elements.pinLayer.innerHTML = "";

  sales.forEach(function (sale) {
    const point = projectSale(sale);
    if (point.x < -6 || point.x > 106 || point.y < -6 || point.y > 106) return;

    const status = getSaleStatus(sale);
    const pin = document.createElement("button");
    pin.type = "button";
    pin.className = "sale-pin " + status.className + (state.favorites.has(sale.id) ? " favorite" : "") + (sale.id === state.selectedSaleId ? " active" : "");
    pin.dataset.label = sale.type.slice(0, 1).toUpperCase();
    pin.dataset.saleId = sale.id;
    pin.style.left = point.x + "%";
    pin.style.top = point.y + "%";
    pin.setAttribute("aria-label", sale.title + ", " + status.label);
    pin.title = sale.title;
    pin.addEventListener("click", function () { selectSale(sale.id); });
    elements.pinLayer.appendChild(pin);
  });
}

function renderDetail(sale) {
  if (!sale) {
    elements.emptyDetail.hidden = false;
    elements.saleDetail.hidden = true;
    return;
  }

  const status = getSaleStatus(sale);
  const favorite = state.favorites.has(sale.id);
  const mapsUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(sale.lat + "," + sale.lng);
  const comments = getSaleComments(sale);

  elements.emptyDetail.hidden = true;
  elements.saleDetail.hidden = false;
  elements.saleDetail.innerHTML =
    renderSalePhoto(sale) +
    "<div class=\"sale-title-row\"><span class=\"status-badge " + status.className + "\">" + status.label + "</span><span class=\"status-badge " + (favorite ? "favorite" : "") + "\">" + (favorite ? "Saved" : capitalize(sale.type)) + "</span></div>" +
    "<div><h2>" + escapeHtml(sale.title) + "</h2><p class=\"detail-address\">" + escapeHtml(getDisplayAddress(sale)) + "</p></div>" +
    "<p class=\"detail-description\">" + escapeHtml(sale.description || "No highlights added yet.") + "</p>" +
    renderCategoryChips(sale.categories) +
    "<div class=\"sale-meta\"><span>" + formatSaleHours(sale) + "</span><span>" + formatDistance(distanceMiles(state.center, sale)) + "</span><span>" + formatRelativeTime(sale.createdAt) + " report</span><span>" + escapeHtml(getCreatedByLabel(sale)) + "</span></div>" +
    "<div class=\"detail-confirmations\"><div class=\"confirmation-box\"><strong>" + sale.openConfirmations + "</strong><span>still open</span></div><div class=\"confirmation-box\"><strong>" + sale.closedReports + "</strong><span>closed reports</span></div></div>" +
    "<p class=\"freshness\">Last confirmation: " + (sale.lastConfirmedAt ? formatRelativeTime(sale.lastConfirmedAt) : "none yet") + "</p>" +
    "<div class=\"detail-actions\"><button class=\"primary-action\" type=\"button\" data-action=\"confirm-open\"><svg aria-hidden=\"true\" viewBox=\"0 0 24 24\"><path d=\"m20 6-11 11-5-5\"></path></svg>Still open</button><button class=\"secondary-action\" type=\"button\" data-action=\"toggle-favorite\"><svg aria-hidden=\"true\" viewBox=\"0 0 24 24\"><path d=\"m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2 7.5 14 3 9.6l6.2-.9Z\"></path></svg>" + (favorite ? "Saved" : "Save") + "</button></div>" +
    "<div class=\"detail-actions\"><button class=\"secondary-action\" type=\"button\" data-action=\"report-closed\"><svg aria-hidden=\"true\" viewBox=\"0 0 24 24\"><path d=\"M18 6 6 18\"></path><path d=\"m6 6 12 12\"></path></svg>Looks closed</button><a class=\"secondary-action\" href=\"" + mapsUrl + "\" target=\"_blank\" rel=\"noreferrer\"><svg aria-hidden=\"true\" viewBox=\"0 0 24 24\"><path d=\"M12 21s7-4.6 7-11a7 7 0 1 0-14 0c0 6.4 7 11 7 11Z\"></path><circle cx=\"12\" cy=\"10\" r=\"2.5\"></circle></svg>Directions</a></div>" +
    "<section class=\"report-panel\"><h3>Check in</h3><form class=\"sale-report-form\" data-report-form><select class=\"sale-report-type\" aria-label=\"Report type\">" + renderReportOptions() + "</select><textarea class=\"sale-report-comment\" maxlength=\"180\" placeholder=\"Add a quick note for other shoppers\"></textarea><button class=\"primary-action\" type=\"submit\">Share update</button></form></section>" +
    "<section class=\"comments-panel\"><h3>Recent notes</h3>" + renderComments(comments) + "</section>";

  elements.saleDetail.querySelectorAll("[data-action]").forEach(function (button) {
    button.addEventListener("click", function () { handleDetailAction(button.dataset.action, sale.id); });
  });

  const reportForm = elements.saleDetail.querySelector("[data-report-form]");
  if (reportForm) {
    reportForm.addEventListener("submit", function (event) {
      event.preventDefault();
      handleSaleReportSubmit(sale.id);
    });
  }
}

function renderSalePhoto(sale) {
  if (sale.photoUrl) {
    return "<img class=\"sale-photo\" src=\"" + escapeHtml(getPhotoSrc(sale.photoUrl)) + "\" alt=\"Photo from this sale report\">";
  }
  return "<div class=\"sale-photo-placeholder\">No photo yet</div>";
}

function getPhotoSrc(photoUrl) {
  if (String(photoUrl || "").startsWith("/uploads/")) return API_ROOT + photoUrl;
  return photoUrl;
}

function renderCategoryChips(categories) {
  const clean = Array.isArray(categories) ? categories.filter(Boolean) : [];
  if (clean.length === 0) return "";
  return "<div class=\"category-chips\">" + clean.map(function (category) {
    return "<span class=\"category-chip\">" + escapeHtml(formatCategory(category)) + "</span>";
  }).join("") + "</div>";
}

function renderReportOptions() {
  return REPORT_TYPES.map(function (type) {
    return "<option value=\"" + escapeHtml(type) + "\">" + escapeHtml(formatReportType(type)) + "</option>";
  }).join("");
}

function renderComments(comments) {
  if (!comments.length) return "<p class=\"freshness\">No notes yet.</p>";
  return "<div class=\"comment-list\">" + comments.slice(0, 6).map(function (comment) {
    return "<article class=\"comment-item\"><p>" + escapeHtml(comment.text) + "</p><div class=\"comment-meta\">" + escapeHtml(formatReportType(comment.reportType || "note")) + " - " + escapeHtml(comment.profileName || "Scout") + " - " + formatRelativeTime(comment.createdAt) + "</div></article>";
  }).join("") + "</div>";
}

function getSaleComments(sale) {
  const comments = Array.isArray(sale.comments) ? sale.comments : [];
  return comments
    .filter(function (comment) { return comment && comment.text; })
    .slice()
    .sort(function (a, b) { return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); });
}

function getCreatedByLabel(sale) {
  return sale.createdByName ? "Reported by " + sale.createdByName : "Crowdsourced report";
}

function selectSale(id) {
  state.selectedSaleId = id;
  const sale = state.sales.find(function (item) { return item.id === id; });
  if (sale) {
    state.center = { lat: sale.lat, lng: sale.lng, label: "Selected sale area" };
    persistSettings();
  }
  render();
}

async function handleDetailAction(action, saleId) {
  if (action === "toggle-favorite") {
    toggleFavorite(saleId);
    return;
  }

  const sale = state.sales.find(function (item) { return item.id === saleId; });
  if (!sale) return;

  if (HOSTED_DEMO_MODE) {
    updateConfirmationOffline(sale, action);
    persistOfflineSales();
    state.syncMode = "demo";
    showToast(action === "confirm-open" ? "Demo update saved in this browser." : "Demo closure report saved in this browser.");
    render();
    return;
  }

  try {
    const data = await apiRequest("/api/sales/" + encodeURIComponent(saleId) + "/" + action, {
      method: "POST",
      body: JSON.stringify(buildReportPayload(action === "confirm-open" ? "still_open" : "closed", ""))
    });
    replaceSale(data.sale);
    showToast(action === "confirm-open" ? "Thanks. This sale was marked still open." : "Thanks. This sale was marked possibly closed.");
    state.syncMode = "online";
    state.lastSyncedAt = new Date().toISOString();
    render();
  } catch (error) {
    updateConfirmationOffline(sale, action);
    persistOfflineSales();
    state.syncMode = "offline";
    showToast("Saved locally in this browser.");
    render();
  }
}

async function handleSaleReportSubmit(saleId) {
  const sale = state.sales.find(function (item) { return item.id === saleId; });
  const form = elements.saleDetail.querySelector("[data-report-form]");
  if (!sale || !form) return;

  const reportType = form.querySelector(".sale-report-type").value;
  const comment = form.querySelector(".sale-report-comment").value.trim();

  if (HOSTED_DEMO_MODE) {
    applyReportOffline(sale, buildReportPayload(reportType, comment));
    persistOfflineSales();
    state.syncMode = "demo";
    showToast("Demo update saved in this browser.");
    render();
    return;
  }

  try {
    const data = await apiRequest("/api/sales/" + encodeURIComponent(saleId) + "/report", {
      method: "POST",
      body: JSON.stringify(buildReportPayload(reportType, comment))
    });
    replaceSale(data.sale);
    state.syncMode = "online";
    state.lastSyncedAt = new Date().toISOString();
    showToast("Update shared with nearby shoppers.");
    render();
  } catch (error) {
    applyReportOffline(sale, buildReportPayload(reportType, comment));
    persistOfflineSales();
    state.syncMode = "offline";
    showToast("Update saved locally in this browser.");
    render();
  }
}

function buildReportPayload(reportType, comment) {
  return {
    reportType: REPORT_TYPES.indexOf(reportType) === -1 ? "still_open" : reportType,
    comment: String(comment || "").trim().slice(0, 180),
    deviceId: getReporterId(),
    profileName: state.profile ? state.profile.displayName : "",
    lat: state.center.lat,
    lng: state.center.lng
  };
}

function getSelectedCategories() {
  return Array.from(document.querySelectorAll("input[name='saleCategory']:checked")).map(function (input) {
    return input.value;
  });
}

function toggleFavorite(saleId) {
  if (state.favorites.has(saleId)) {
    state.favorites.delete(saleId);
    showToast("Removed from favorites.");
  } else {
    state.favorites.add(saleId);
    showToast("Saved to favorites.");
  }
  persistFavorites();
  render();
}

function openReportDialog() {
  setDefaultReportTimes();
  state.reportLocation = { lat: state.center.lat, lng: state.center.lng, source: "map center" };
  clearPhotoSelection();
  updateReportLocationHint();
  elements.reportDialog.showModal();
  window.setTimeout(function () { elements.salePhoto.focus(); }, 50);
}

function closeReportDialog() {
  elements.reportDialog.close();
  elements.reportForm.reset();
  clearPhotoSelection();
}

async function handlePhotoSelection() {
  const file = elements.salePhoto.files && elements.salePhoto.files[0];
  if (!file) {
    clearPhotoSelection();
    return;
  }

  if (!file.type || file.type.indexOf("image/") !== 0) {
    clearPhotoSelection();
    showToast("Choose an image file.");
    return;
  }

  try {
    state.reportPhotoUrl = await resizePhotoFile(file);
    elements.photoPreviewImage.src = state.reportPhotoUrl;
    elements.photoPreview.hidden = false;
  } catch (error) {
    clearPhotoSelection();
    showToast("That photo could not be added.");
  }
}

function clearPhotoSelection() {
  state.reportPhotoUrl = "";
  if (elements.salePhoto) elements.salePhoto.value = "";
  if (elements.photoPreviewImage) elements.photoPreviewImage.removeAttribute("src");
  if (elements.photoPreview) elements.photoPreview.hidden = true;
}

function resizePhotoFile(file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = function () {
      const image = new Image();
      image.onerror = reject;
      image.onload = function () {
        const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", PHOTO_QUALITY));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function submitReport() {
  if (!elements.reportForm.reportValidity()) return;

  const startsAt = new Date(elements.startsAt.value);
  const endsAt = new Date(elements.endsAt.value);
  if (endsAt <= startsAt) {
    showToast("End time must be after the start time.");
    return;
  }

  const saleInput = {
    type: elements.saleType.value,
    title: elements.saleTitle.value.trim(),
    address: elements.saleAddress.value.trim(),
    description: elements.saleDescription.value.trim(),
    categories: getSelectedCategories(),
    comment: elements.saleComment.value.trim(),
    photoUrl: state.reportPhotoUrl,
    deviceId: getReporterId(),
    profileName: state.profile ? state.profile.displayName : "",
    lat: state.reportLocation.lat,
    lng: state.reportLocation.lng,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString()
  };

  if (HOSTED_DEMO_MODE) {
    const demoSale = buildOfflineSale(saleInput);
    state.sales = [demoSale].concat(state.sales);
    state.selectedSaleId = demoSale.id;
    state.center = { lat: demoSale.lat, lng: demoSale.lng, label: "New sale area" };
    state.syncMode = "demo";
    persistSettings();
    persistOfflineSales();
    closeReportDialog();
    showToast("Demo sale saved in this browser.");
    render();
    return;
  }

  try {
    const data = await apiRequest("/api/sales", { method: "POST", body: JSON.stringify(saleInput) });
    const createdSale = normalizeClientSale(data.sale);
    state.sales = [createdSale].concat(state.sales.filter(function (sale) { return sale.id !== createdSale.id; }));
    state.selectedSaleId = createdSale.id;
    state.center = { lat: createdSale.lat, lng: createdSale.lng, label: "New sale area" };
    state.syncMode = "online";
    state.lastSyncedAt = new Date().toISOString();
    persistSettings();
    closeReportDialog();
    showToast("Sale added to the shared map.");
    render();
  } catch (error) {
    const offlineSale = buildOfflineSale(saleInput);
    state.sales = [offlineSale].concat(state.sales);
    state.selectedSaleId = offlineSale.id;
    state.center = { lat: offlineSale.lat, lng: offlineSale.lng, label: "New sale area" };
    state.syncMode = "offline";
    persistSettings();
    persistOfflineSales();
    closeReportDialog();
    showToast("Sale saved locally in this browser.");
    render();
  }
}

function requestLocation(showFeedback, useForReport) {
  if (!navigator.geolocation) {
    if (showFeedback) showToast("Location is not available in this browser.");
    return;
  }

  navigator.geolocation.getCurrentPosition(function (position) {
    const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
    state.center = { lat: coords.lat, lng: coords.lng, label: "Your area" };
    if (useForReport) {
      state.reportLocation = { lat: coords.lat, lng: coords.lng, source: "your location" };
      updateReportLocationHint();
    }
    persistSettings();
    if (showFeedback) showToast(useForReport ? "Report pin set to your location." : "Map centered on your area.");
    render();
  }, function () {
    if (showFeedback) showToast("Location permission was not granted.");
  }, { enableHighAccuracy: false, maximumAge: 120000, timeout: 6000 });
}

function getFilteredSales(options) {
  const now = Date.now();
  const ignoreView = options && options.ignoreView;
  return state.sales
    .filter(function (sale) { return isDiscoverableSale(sale, now); })
    .filter(function (sale) { return !state.openOnly || isOpenNow(sale, now); })
    .filter(function (sale) { return state.typeFilter === "all" || sale.type === state.typeFilter; })
    .filter(function (sale) { return !(state.favoritesOnly || (!ignoreView && state.view === "saved")) || state.favorites.has(sale.id); })
    .filter(function (sale) { return state.radiusMiles === null || distanceMiles(state.center, sale) <= state.radiusMiles; })
    .filter(function (sale) {
      if (!state.query) return true;
      const haystack = (sale.title + " " + sale.address + " " + sale.description + " " + sale.type + " " + (sale.categories || []).join(" ") + " " + getSaleComments(sale).map(function (comment) { return comment.text; }).join(" ")).toLowerCase();
      return haystack.indexOf(state.query) !== -1;
    })
    .sort(function (a, b) {
      const statusSort = Number(isOpenNow(b, now)) - Number(isOpenNow(a, now));
      if (statusSort !== 0) return statusSort;
      return distanceMiles(state.center, a) - distanceMiles(state.center, b);
    });
}

function isOpenNow(sale, now) {
  if (!now) now = Date.now();
  return isDiscoverableSale(sale, now) && new Date(sale.startsAt).getTime() <= now && new Date(sale.endsAt).getTime() >= now;
}

function getSaleStatus(sale) {
  if (sale.status === "closed") return { label: "Closed", className: "closed" };
  if (isExpiredSale(sale)) return { label: "Expired", className: "closed" };
  const minutesLeft = Math.round((new Date(sale.endsAt).getTime() - Date.now()) / 60000);
  if (minutesLeft <= 60) return { label: "Closing soon", className: "closing" };
  if (!isOpenNow(sale)) return { label: "Upcoming", className: "closing" };
  return { label: "Open now", className: "open" };
}

function projectSale(sale) {
  const range = 0.09 / state.zoom;
  const x = 50 + ((sale.lng - state.center.lng) / range) * 50;
  const y = 50 - ((sale.lat - state.center.lat) / range) * 50;
  return { x: x, y: y };
}

function replaceSale(nextSale) {
  state.sales = state.sales.map(function (sale) {
    return sale.id === nextSale.id ? normalizeClientSale(nextSale) : sale;
  });
}

function updateConfirmationOffline(sale, action) {
  applyReportOffline(sale, buildReportPayload(action === "confirm-open" ? "still_open" : "closed", ""));
}

function applyReportOffline(sale, reportInput) {
  const report = {
    id: makeId(),
    type: REPORT_TYPES.indexOf(reportInput.reportType) === -1 ? "still_open" : reportInput.reportType,
    comment: String(reportInput.comment || "").slice(0, 180),
    deviceId: getReporterId(),
    profileName: state.profile ? state.profile.displayName : "",
    lat: reportInput.lat,
    lng: reportInput.lng,
    createdAt: new Date().toISOString()
  };

  sale.reports = Array.isArray(sale.reports) ? sale.reports : [];
  sale.comments = Array.isArray(sale.comments) ? sale.comments : [];
  sale.closedReporterIds = Array.isArray(sale.closedReporterIds) ? sale.closedReporterIds : [];
  sale.reports.unshift(report);

  if (report.comment) {
    sale.comments.unshift({
      id: makeId(),
      text: report.comment,
      reportType: report.type,
      profileName: report.profileName || "",
      createdAt: report.createdAt
    });
  }

  if (report.type === "still_open") {
    sale.lastConfirmedAt = report.createdAt;
    sale.openConfirmations = Number(sale.openConfirmations || 0) + 1;
    sale.status = "open";
  }

  if (report.type === "closed") {
    const reporterId = getReporterId();
    if (sale.closedReporterIds.indexOf(reporterId) === -1) sale.closedReporterIds.push(reporterId);
    sale.closedReports = sale.closedReporterIds.length;
    if (sale.closedReports >= 2) sale.status = "closed";
  }
}

function buildOfflineSale(input) {
  const now = new Date();
  const metadata = generateSaleMetadataFromPhoto(input.photoUrl);
  const title = input.title || metadata.title;
  const description = input.description || metadata.description;
  const categories = input.categories && input.categories.length ? input.categories : metadata.categories;
  const comment = String(input.comment || "").slice(0, 180);
  const initialReport = {
    id: makeId(),
    type: "still_open",
    comment: comment,
    deviceId: getReporterId(),
    profileName: state.profile ? state.profile.displayName : "",
    lat: input.lat,
    lng: input.lng,
    createdAt: now.toISOString()
  };
  const comments = comment ? [{ id: makeId(), text: comment, reportType: "still_open", profileName: initialReport.profileName || "", createdAt: initialReport.createdAt }] : [];

  return {
    id: makeId(),
    type: input.type,
    title: title,
    address: approximateAddress(input.address, input.lat, input.lng),
    approximateAddress: approximateAddress(input.address, input.lat, input.lng),
    description: description,
    createdBy: getReporterId(),
    createdByName: state.profile ? state.profile.displayName : "Local scout",
    categories: categories,
    comments: comments,
    reports: [initialReport],
    photoUrl: input.photoUrl || "",
    lat: input.lat,
    lng: input.lng,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    createdAt: now.toISOString(),
    lastConfirmedAt: now.toISOString(),
    expiresAt: addHours(now, 48).toISOString(),
    openConfirmations: 1,
    closedReports: 0,
    closedReporterIds: [],
    status: "open"
  };
}

function readOfflineSales() {
  const savedSales = readJson(STORAGE_KEYS.offlineSales);
  const now = Date.now();
  const hasUsefulSavedSales = Array.isArray(savedSales) && savedSales.length > 0 && (
    savedSales.some(function (sale) { return !String(sale.id).startsWith("seed-"); }) ||
    savedSales.some(function (sale) { return new Date(sale.endsAt).getTime() > now; })
  );
  return hasUsefulSavedSales ? savedSales.map(normalizeClientSale) : createSeedSales();
}

function normalizeClientSale(sale) {
  const normalized = Object.assign({}, sale);
  normalized.title = normalized.title || "Garage Sale Nearby";
  normalized.description = normalized.description || "Crowdsourced garage sale reported by a SaleScout user.";
  normalized.approximateAddress = approximateAddress(normalized.approximateAddress || normalized.address, Number(normalized.lat || DEFAULT_CENTER.lat), Number(normalized.lng || DEFAULT_CENTER.lng));
  normalized.address = normalized.approximateAddress;
  normalized.createdBy = normalized.createdBy || "";
  normalized.createdByName = normalized.createdByName || "";
  normalized.categories = cleanCategories(normalized.categories && normalized.categories.length ? normalized.categories : inferCategories(normalized.description));
  normalized.comments = Array.isArray(normalized.comments) ? normalized.comments.map(function (comment) {
    return Object.assign({ profileName: "" }, comment);
  }) : [];
  normalized.reports = Array.isArray(normalized.reports) ? normalized.reports.map(function (report) {
    return Object.assign({ profileName: "" }, report);
  }) : [];
  normalized.closedReporterIds = Array.isArray(normalized.closedReporterIds) ? normalized.closedReporterIds : [];
  normalized.photoUrl = normalized.photoUrl || "";
  normalized.openConfirmations = Number(normalized.openConfirmations || 0);
  normalized.closedReports = Math.max(Number(normalized.closedReports || 0), normalized.closedReporterIds.length);
  normalized.expiresAt = normalized.expiresAt || addHours(new Date(normalized.createdAt || Date.now()), 48).toISOString();
  if (isExpiredSale(normalized)) normalized.status = "expired";
  return normalized;
}

function isDiscoverableSale(sale, now) {
  return sale.status !== "closed" && !isExpiredSale(sale, now);
}

function isExpiredSale(sale, now) {
  if (!now) now = Date.now();
  if (sale.status === "expired") return true;
  const endsAt = new Date(sale.endsAt).getTime();
  const expiresAt = new Date(sale.expiresAt || 0).getTime();
  const lastVerifiedAt = new Date(sale.lastConfirmedAt || sale.createdAt || 0).getTime();
  if (Number.isFinite(endsAt) && endsAt < now) return true;
  if (Number.isFinite(expiresAt) && expiresAt > 0 && expiresAt < now) return true;
  if (Number.isFinite(lastVerifiedAt) && now - lastVerifiedAt > 24 * 60 * 60 * 1000) return true;
  return false;
}

function createSeedSales() {
  const now = new Date();
  const seed = [
    { type: "garage", title: "Maple block garage sale", address: "1200 block of Maple Ave", description: "Tools, bikes, camping gear, and kitchen boxes.", latOffset: 0.016, lngOffset: -0.021, openOffsetHours: -1.5, closeOffsetHours: 4.25, openConfirmations: 8, closedReports: 0 },
    { type: "yard", title: "Sunny yard sale", address: "Oak Street at 8th", description: "Kids clothes, books, small furniture, garden pots.", latOffset: -0.012, lngOffset: 0.017, openOffsetHours: -0.5, closeOffsetHours: 2.75, openConfirmations: 5, closedReports: 1 },
    { type: "estate", title: "Estate sale on Pine", address: "443 Pine Terrace", description: "Vintage glassware, records, side tables, framed art.", latOffset: 0.026, lngOffset: 0.023, openOffsetHours: -2, closeOffsetHours: 5, openConfirmations: 12, closedReports: 0 },
    { type: "moving", title: "Moving sale near the park", address: "Cedar Lane and Parkview", description: "Shelving, office chairs, rugs, storage bins.", latOffset: -0.024, lngOffset: -0.026, openOffsetHours: -3, closeOffsetHours: 0.8, openConfirmations: 3, closedReports: 0 },
    { type: "garage", title: "Two-family garage cleanout", address: "19th Street cul-de-sac", description: "Sports gear, baby items, electronics, board games.", latOffset: 0.006, lngOffset: 0.039, openOffsetHours: 1, closeOffsetHours: 7, openConfirmations: 0, closedReports: 0 }
  ];

  return seed.map(function (sale, index) {
    return {
      id: "seed-" + (index + 1),
      type: sale.type,
      title: sale.title,
      address: sale.address,
      approximateAddress: approximateAddress(sale.address, DEFAULT_CENTER.lat + sale.latOffset, DEFAULT_CENTER.lng + sale.lngOffset),
      description: sale.description,
      createdBy: "seed",
      createdByName: "SaleScout demo",
      categories: inferCategories(sale.description),
      comments: [],
      reports: [],
      photoUrl: "",
      lat: DEFAULT_CENTER.lat + sale.latOffset,
      lng: DEFAULT_CENTER.lng + sale.lngOffset,
      startsAt: addHours(now, sale.openOffsetHours).toISOString(),
      endsAt: addHours(now, sale.closeOffsetHours).toISOString(),
      createdAt: addHours(now, sale.openOffsetHours - 0.75).toISOString(),
      lastConfirmedAt: sale.openConfirmations > 0 ? addHours(now, -0.2 - index * 0.12).toISOString() : null,
      expiresAt: addHours(now, 48).toISOString(),
      openConfirmations: sale.openConfirmations,
      closedReports: sale.closedReports,
      closedReporterIds: [],
      status: "open"
    };
  });
}

function setDefaultReportTimes() {
  const now = new Date();
  const start = new Date(now.getTime() - 15 * 60000);
  const end = new Date(now.getTime() + 4 * 60 * 60000);
  elements.startsAt.value = toDateTimeLocal(start);
  elements.endsAt.value = toDateTimeLocal(end);
}

function updateReportLocationHint() {
  const label = formatCoordinate(state.reportLocation.lat) + ", " + formatCoordinate(state.reportLocation.lng);
  elements.reportLocationHint.textContent = "Pin set from " + state.reportLocation.source + ": " + label;
  elements.reportCoordinateLabel.textContent = label;
  updateReportPinPreview();
}

function setReportLocationFromPicker(event) {
  const rect = elements.reportMapPicker.getBoundingClientRect();
  const xPercent = clamp(((event.clientX - rect.left) / rect.width) * 100, 3, 97);
  const yPercent = clamp(((event.clientY - rect.top) / rect.height) * 100, 5, 95);
  state.reportLocation = locationFromPickerPoint(xPercent, yPercent, "sale pin");
  updateReportLocationHint();
}

function nudgeReportLocation(event) {
  const keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
  if (keys.indexOf(event.key) === -1) return;
  event.preventDefault();
  const step = event.shiftKey ? 0.004 : 0.001;
  const next = {
    lat: state.reportLocation.lat,
    lng: state.reportLocation.lng,
    source: "sale pin"
  };
  if (event.key === "ArrowUp") next.lat += step;
  if (event.key === "ArrowDown") next.lat -= step;
  if (event.key === "ArrowLeft") next.lng -= step;
  if (event.key === "ArrowRight") next.lng += step;
  state.reportLocation = next;
  updateReportLocationHint();
}

function updateReportPinPreview() {
  if (!elements.reportPinPreview) return;
  const point = pickerPointFromLocation(state.reportLocation);
  elements.reportPinPreview.style.left = clamp(point.x, 3, 97) + "%";
  elements.reportPinPreview.style.top = clamp(point.y, 5, 95) + "%";
}

function locationFromPickerPoint(xPercent, yPercent, source) {
  return {
    lat: state.center.lat - ((yPercent - 50) / 50) * REPORT_PICKER_RANGE,
    lng: state.center.lng + ((xPercent - 50) / 50) * REPORT_PICKER_RANGE,
    source: source
  };
}

function pickerPointFromLocation(location) {
  return {
    x: 50 + ((location.lng - state.center.lng) / REPORT_PICKER_RANGE) * 50,
    y: 50 - ((location.lat - state.center.lat) / REPORT_PICKER_RANGE) * 50
  };
}

function getSyncLabel() {
  if (state.syncMode === "demo") return "Hosted demo - saved in this browser";
  if (state.syncMode === "loading") return "Syncing shared sales";
  if (state.syncMode === "offline") return "Browser-only demo mode";
  return "Shared sync " + (state.lastSyncedAt ? formatRelativeTime(state.lastSyncedAt) : "just now");
}

function persistOfflineSales() { writeJson(STORAGE_KEYS.offlineSales, state.sales); }
function persistFavorites() { writeJson(STORAGE_KEYS.favorites, Array.from(state.favorites)); }
function persistSettings() { writeJson(STORAGE_KEYS.settings, { center: state.center, radiusMiles: state.radiusMiles, openOnly: state.openOnly }); }

function readJson(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch (error) { return null; }
}

function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) { }
}

function getDisplayAddress(sale) {
  return sale.approximateAddress || approximateAddress(sale.address, sale.lat, sale.lng);
}

function approximateAddress(address, lat, lng) {
  const fallback = "Sale pin near " + formatCoordinate(Number(lat || DEFAULT_CENTER.lat)) + ", " + formatCoordinate(Number(lng || DEFAULT_CENTER.lng));
  const text = String(address || "").replace(/\s+/g, " ").trim();
  if (!text) return fallback;
  if (/\b(block|near| at | and |cross|intersection)\b/i.test(text) || /[&/]/.test(text)) return text;

  const match = text.match(/^(\d{1,6})\s+(.+)$/);
  if (!match) return text;

  const number = Number(match[1]);
  const street = match[2].trim();
  if (!street) return fallback;
  if (!Number.isFinite(number) || number < 100) return "Near " + street;
  return Math.floor(number / 100) * 100 + " block of " + street;
}

function normalizeUsername(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 32);
}

function cleanDisplayName(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 60);
}

function slugify(value) {
  const slug = normalizeUsername(String(value || "").replace(/\s+/g, "_"));
  return slug || "salescout_user";
}

function generateSaleMetadataFromPhoto(photoUrl) {
  return {
    title: "Garage Sale Nearby",
    description: "Crowdsourced garage sale reported by a SaleScout user.",
    categories: photoUrl ? ["general", "furniture", "tools", "toys"] : ["general"]
  };
}

function inferCategories(text) {
  const value = String(text || "").toLowerCase();
  const categories = [];
  if (/tool|drill|saw|wrench|garage/.test(value)) categories.push("tools");
  if (/furniture|chair|table|shelf|desk|sofa|rug/.test(value)) categories.push("furniture");
  if (/baby|kid|toy|stroller|clothes/.test(value)) categories.push("baby_items");
  if (/electronic|game|console|speaker|computer/.test(value)) categories.push("electronics");
  if (/vintage|collectible|record|glassware|art/.test(value)) categories.push("collectibles");
  if (/book|clothing|clothes|shoes/.test(value)) categories.push("clothing");
  return categories.length ? categories : ["general"];
}

function cleanCategories(categories) {
  const allowed = new Set(["general", "tools", "furniture", "baby_items", "electronics", "collectibles", "clothing", "books", "toys"]);
  const seen = new Set();
  return (Array.isArray(categories) ? categories : [])
    .map(function (category) { return String(category || "").trim().toLowerCase().replace(/\s+/g, "_"); })
    .filter(function (category) {
      if (!allowed.has(category) || seen.has(category)) return false;
      seen.add(category);
      return true;
    })
    .slice(0, 8);
}

function formatCategory(category) {
  return String(category || "general").replaceAll("_", " ").replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
}

function formatReportType(type) {
  const labels = {
    still_open: "Still open",
    closed: "Closed",
    worth_the_stop: "Worth the stop",
    picked_over: "Picked over",
    mostly_tools: "Mostly tools",
    mostly_furniture: "Mostly furniture",
    mostly_baby_items: "Mostly baby items",
    mostly_electronics: "Mostly electronics",
    mostly_collectibles: "Mostly collectibles",
    easy_parking: "Easy parking",
    cash_only: "Cash only",
    accepts_venmo: "Accepts Venmo",
    note: "Note"
  };
  return labels[type] || formatCategory(type);
}

function distanceMiles(origin, sale) {
  const toRad = function (value) { return (value * Math.PI) / 180; };
  const earthMiles = 3958.8;
  const dLat = toRad(sale.lat - origin.lat);
  const dLng = toRad(sale.lng - origin.lng);
  const lat1 = toRad(origin.lat);
  const lat2 = toRad(sale.lat);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * earthMiles * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatRadiusLabel() {
  return state.radiusMiles === null ? "any distance" : "within " + state.radiusMiles + " mi";
}

function formatDistance(miles) {
  if (miles < 0.1) return "nearby";
  if (miles < 10) return miles.toFixed(1) + " mi";
  return Math.round(miles) + " mi";
}

function formatSaleHours(sale) {
  const formatter = new Intl.DateTimeFormat([], { hour: "numeric", minute: "2-digit" });
  return formatter.format(new Date(sale.startsAt)) + " - " + formatter.format(new Date(sale.endsAt));
}

function formatRelativeTime(value) {
  const diffMinutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  const abs = Math.abs(diffMinutes);
  if (abs < 1) return "just now";
  if (diffMinutes < 0) return "in " + abs + " min";
  if (diffMinutes < 60) return diffMinutes + " min ago";
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return diffHours + " hr ago";
  return Math.round(diffHours / 24) + " days ago";
}

function toDateTimeLocal(date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function addHours(date, hours) { return new Date(date.getTime() + hours * 60 * 60000); }
function randomOffset(amount) { return (Math.random() - 0.5) * amount; }
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function formatCoordinate(value) { return value.toFixed(4); }
function capitalize(value) { return value.charAt(0).toUpperCase() + value.slice(1); }
function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
  return "sale-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  toastTimer = window.setTimeout(function () {
    elements.toast.hidden = true;
  }, 3000);
}

