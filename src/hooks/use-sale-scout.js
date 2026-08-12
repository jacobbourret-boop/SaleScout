import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createSale,
  getPublicConfig,
  getSession,
  isSupabaseConfigured,
  loadProfile,
  loadSalesFromSupabase,
  onAuthStateChange,
  reportSaleToSupabase,
  saveRemoteProfile,
  signInWithMagicLink,
  signInWithProvider,
  signOut as signOutFromSupabase,
  submitBetaFeedback as submitFeedbackToSupabase
} from "../lib/backend";
import { buildRoute, getVisibleSales } from "../lib/sales";
import { distanceBetween, isValidLocation, readStoredJson, roundCoord, titleCase } from "../lib/utils";

const DEFAULT_CENTER = { lat: 41.5868, lng: -93.625 };
const STORAGE_KEYS = {
  favorites: "salescout:favorites",
  profile: "salescout:profile",
  center: "salescout:center",
  theme: "salescout:theme"
};

const FALLBACK_CONFIG = getPublicConfig();

const DEFAULT_PROFILE = {
  displayName: "",
  username: "",
  defaultRadius: "5",
  defaultView: "home",
  connectedProvider: ""
};

export function useSaleScout() {
  const storedProfile = useMemo(() => ({ ...DEFAULT_PROFILE, ...readStoredJson(STORAGE_KEYS.profile, {}) }), []);
  const [sales, setSales] = useState([]);
  const [config, setConfig] = useState(FALLBACK_CONFIG);
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [syncMessage, setSyncMessage] = useState("Finding the best sales near you");
  const [view, setView] = useState(() => {
    const legacyView = storedProfile.defaultView;
    return ["home", "explore", "map", "saved", "profile"].includes(legacyView) ? legacyView : "home";
  });
  const [selectedId, setSelectedId] = useState(() => new URLSearchParams(window.location.search).get("sale") || "");
  const [profile, setProfile] = useState(storedProfile);
  const [favorites, setFavorites] = useState(() => new Set(readStoredJson(STORAGE_KEYS.favorites, [])));
  const [center, setCenterState] = useState(() => {
    const stored = readStoredJson(STORAGE_KEYS.center, null);
    return isValidLocation(stored) ? stored : DEFAULT_CENTER;
  });
  const [filters, setFilters] = useState({ search: "", type: "all", radius: Number(storedProfile.defaultRadius || 5), openOnly: true });
  const [theme, setTheme] = useState(() => localStorage.getItem(STORAGE_KEYS.theme) || "system");
  const [toast, setToast] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const requestSequence = useRef(0);
  const toastTimer = useRef();
  const showToast = useCallback((message) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 3800);
  }, []);

  const loadSales = useCallback(async ({ initial = false } = {}) => {
    const sequence = ++requestSequence.current;
    if (initial) setLoading(true);
    try {
      const nextSales = await loadSalesFromSupabase();
      if (sequence !== requestSequence.current) return;
      setSales(nextSales);
      setError("");
      setSyncMessage("Community reports are up to date");
    } catch (requestError) {
      if (sequence !== requestSequence.current) return;
      setError(requestError.message || "Could not load nearby sales");
      setSyncMessage("Showing the latest available information");
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    setConfig(getPublicConfig());
    loadSales({ initial: true });
    const interval = window.setInterval(() => loadSales(), 45_000);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.clearTimeout(toastTimer.current);
    };
  }, [loadSales]);

  useEffect(() => {
    let active = true;
    getSession()
      .then(({ session: nextSession, user: nextUser }) => {
        if (!active) return;
        setSession(nextSession);
        setUser(nextUser);
      })
      .catch((authError) => active && setError(authError.message || "Could not restore your sign-in"))
      .finally(() => active && setAuthLoading(false));
    const unsubscribe = onAuthStateChange((nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setUser(nextSession?.user || null);
      setAuthLoading(false);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    loadProfile(user.id).then((remoteProfile) => {
      if (!active || !remoteProfile) return;
      setProfile((current) => ({ ...current, ...remoteProfile }));
    }).catch(() => {});
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    const onPopState = () => setSelectedId(new URLSearchParams(window.location.search).get("sale") || "");
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => root.dataset.theme = theme === "system" ? (media.matches ? "dark" : "light") : theme;
    apply();
    media.addEventListener("change", apply);
    localStorage.setItem(STORAGE_KEYS.theme, theme);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  const visibleSales = useMemo(() => getVisibleSales(sales, center, filters), [sales, center, filters]);
  const selectedSale = useMemo(() => sales.find((sale) => sale.id === selectedId) || null, [sales, selectedId]);
  const savedSales = useMemo(
    () => sales
      .filter((sale) => favorites.has(sale.id))
      .map((sale) => ({ ...sale, distance: distanceBetween(center, sale.location) }))
      .sort((a, b) => a.distance - b.distance),
    [sales, center, favorites]
  );
  const route = useMemo(() => buildRoute(savedSales.filter((sale) => sale.status !== "closed"), center, favorites), [savedSales, center, favorites]);

  const setCenter = useCallback((location) => {
    if (!isValidLocation(location)) return;
    const next = { lat: roundCoord(location.lat), lng: roundCoord(location.lng) };
    setCenterState(next);
    localStorage.setItem(STORAGE_KEYS.center, JSON.stringify(next));
  }, []);

  const locate = useCallback(
    ({ silent = false } = {}) =>
      new Promise((resolve…2484 tokens truncated…, "other"]);
const FEEDBACK_TYPES = new Set(["busy", "great-deals", "worth-visiting", "lots-of-furniture", "kid-friendly", "cash-only", "comment"]);

export { isSupabaseConfigured };

export function getPublicConfig() {
  const requestedMapProvider = String(import.meta.env.VITE_SALESCOUT_MAP_PROVIDER || "local").toLowerCase();
  const googleMapsApiKey = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "");
  const googleMapId = String(import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "");
  const appleMapKitToken = String(import.meta.env.VITE_APPLE_MAPKIT_JWT || "");
  const enabledAuthProviders = String(import.meta.env.VITE_AUTH_PROVIDERS || "")
    .split(",")
    .map((provider) => provider.trim().toLowerCase())
    .filter(Boolean);

  const provider = requestedMapProvider === "google" && googleMapsApiKey
    ? "google"
    : requestedMapProvider === "apple" && appleMapKitToken
      ? "apple"
      : "local";

  return {
    maps: { provider, googleMapsApiKey, googleMapId, appleMapKitToken, fallbackProvider: "local" },
    auth: {
      enabledProviders: isSupabaseConfigured ? enabledAuthProviders : [],
      magicLink: isSupabaseConfigured
    },
    sharing: { facebookSharer: true, nativeShare: true },
    productionReady: isSupabaseConfigured
  };
}

export async function getSession() {
  if (!supabase) return { session: null, user: null };
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return { session: data.session, user: data.session?.user || null };
}

export function onAuthStateChange(callback) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

export async function signInWithMagicLink(email) {
  const client = requireSupabase();
  const { error } = await client.auth.signInWithOtp({
    email: String(email || "").trim(),
    options: { emailRedirectTo: window.location.origin }
  });
  if (error) throw error;
}

export async function signInWithProvider(provider) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin }
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function loadProfile(userId) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase.from("profiles").select("display_name, username").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data ? { displayName: data.display_name || "", username: data.username || "" } : null;
}

export async function saveRemoteProfile(userId, profile) {
  const client = requireSupabase();
  const { error } = await client.from("profiles").upsert({
    user_id: userId,
    display_name: cleanText(profile.displayName, 80),
    username: cleanText(profile.username, 40) || null,
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id" });
  if (error) throw error;
}

export async function loadSalesFromSupabase() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("sales")
    .select(SALES_SELECT)
    .order("updated_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data || []).map(normalizeSale);
}

export async function createSale(body, user, profileName) {
  const client = requireSupabase();
  if (!user) throw new Error("Sign in before publishing a sale.");

  let photoUrl = cleanPhotoUrl(body.photoUrl);
  if (body.photoDataUrl) photoUrl = await uploadSalePhoto(body.photoDataUrl, user.id);

  const now = new Date();
  const payload = {
    owner_id: user.id,
    type: SALE_TYPES.has(body.type) ? body.type : "garage",
    title: cleanText(body.title, 80) || "Neighborhood sale",
    description: cleanText(body.description, 280),
    address: approximateAddress(cleanText(body.address, 120) || cleanText(body.crossStreets, 120) || "Approximate location shared"),
    cross_streets: cleanText(body.crossStreets, 120),
    latitude: validCoordinate(body.location?.lat, 90) ? Number(body.location.lat) : 41.5868,
    longitude: validCoordinate(body.location?.lng, 180) ? Number(body.location.lng) : -93.625,
    categories: cleanList(body.categories, 12),
    highlights: cleanList(body.highlights, 8),
    hours: cleanText(body.hours, 80) || "Reported open now",
    ends_at: cleanIsoDate(body.endsAt) || new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(),
    photo_url: photoUrl || null,
    creator_name: cleanText(profileName, 80) || "Local scout"
  };

  const { data, error } = await client.from("sales").insert(payload).select("id").single();
  if (error) throw error;

  const initialNote = cleanText(body.note, 240);
  const { error: reportError } = await client.from("sale_status_reports").insert({
    sale_id: data.id,
    reporter_id: user.id,
    status: "confirm-open",
    profile_name: payload.creator_name
  });
  if (reportError) console.warn("Sale created without its initial confirmation", reportError);

  if (initialNote) {
    const { error: noteError } = await client.from("sale_feedback").insert({
      sale_id: data.id,
      reporter_id: user.id,
      type: "comment",
      note: initialNote,
      profile_name: payload.creator_name
    });
    if (noteError) console.warn("Sale created without its initial note", noteError);
  }

  return loadSaleById(data.id);
}

export async function reportSaleToSupabase(saleId, type, note, user, profileName) {
  const client = requireSupabase();
  if (!user) throw new Error("Sign in before updating a sale.");
  const safeName = cleanText(profileName, 80) || "Local scout";

  if (type === "confirm-open" || type === "closed") {
    const { error } = await client.from("sale_status_reports").upsert({
      sale_id: saleId,
      reporter_id: user.id,
      status: type,
      profile_name: safeName,
      created_at: new Date().toISOString()
    }, { onConflict: "sale_id,reporter_id" });
    if (error) throw error;
  } else {
    const feedbackType = FEEDBACK_TYPES.has(type) ? type : "comment";
    const { error } = await client.from("sale_feedback").insert({
      sale_id: saleId,
      reporter_id: user.id,
      type: feedbackType,
      note: cleanText(note, 240),
      profile_name: safeName
    });
    if (error) throw error;
  }

  return loadSaleById(saleId);
}

export async function submitBetaFeedback({ user, type, message }) {
  const client = requireSupabase();
  if (!user) throw new Error("Sign in before sending beta feedback.");
  const { error } = await client.from("beta_feedback").insert({
    reporter_id: user.id,
    type: ["bug", "idea", "other"].includes(type) ? type : "bug",
    message: cleanText(message, 1200),
    page_url: window.location.href.slice(0, 500),
    user_agent: navigator.userAgent.slice(0, 500)
  });
  if (error) throw error;
}

async function loadSaleById(id) {
  const client = requireSupabase();
  const { data, error } = await client.from("sales").select(SALES_SELECT).eq("id", id).single();
  if (error) throw error;
  return normalizeSale(data);
}

async function uploadSalePhoto(dataUrl, userId) {
  const client = requireSupabase();
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) throw new Error("The selected file is not an image.");
  if (blob.size > 5 * 1024 * 1024) throw new Error("Photos must be smaller than 5 MB.");

  const objectPath = `${userId}/${crypto.randomUUID()}.jpg`;
  const { error } = await client.storage.from("sale-photos").upload(objectPath, blob, {
    cacheControl: "3600",
    contentType: "image/jpeg",
    upsert: false
  });
  if (error) throw error;
  return client.storage.from("sale-photos").getPublicUrl(objectPath).data.publicUrl;
}

function normalizeSale(row) {
  const statusReports = (row.status_reports || []).map((report) => ({
    id: report.id,
    type: report.status,
    deviceId: "",
    profileName: report.profile_name || "Local scout",
    note: "",
    createdAt: report.created_at
  }));
  const feedback = (row.feedback || []).map((report) => ({
    id: report.id,
    type: report.type,
    deviceId: "",
    profileName: report.profile_name || "Local scout",
    note: report.note || "",
    createdAt: report.created_at
  }));
  const reports = [...statusReports, ...feedback].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  const closedSignals = statusReports.filter((report) => report.type === "closed").length;
  const status = closedSignals >= 2 ? "closed" : closedSignals === 1 ? "questionable" : row.base_status || "open";
  const updatedAt = reports.reduce((latest, report) => {
    const timestamp = Date.parse(report.createdAt);
    return Number.isNaN(timestamp) || timestamp <= Date.parse(latest) ? latest : report.createdAt;
  }, row.updated_at);

  return {
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description || "",
    address: row.address,
    crossStreets: row.cross_streets || "",
    location: { lat: Number(row.latitude), lng: Number(row.longitude) },
    categories: row.categories || [],
    highlights: row.highlights || [],
    hours: row.hours,
    createdAt: row.created_at,
    updatedAt,
    endsAt: row.ends_at,
    status,
    photoUrl: row.photo_url || "",
    createdBy: "",
    createdByName: row.creator_name || "Local scout",
    confirmations: statusReports.filter((report) => report.type === "confirm-open").length,
    reports,
    comments: feedback.filter((item) => item.note).map((item) => ({
      id: item.id,
      body: item.note,
      type: item.type,
      profileName: item.profileName,
      createdAt: item.createdAt
    }))
  };
}

function validCoordinate(value, maximum) {
  return Number.isFinite(Number(value)) && Math.abs(Number(value)) <= maximum;
}

function cleanText(value, maxLength = 120) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
}

function cleanList(value, limit) {
  const list = Array.isArray(value) ? value : [];
  return [...new Set(list.map((item) => cleanText(item, 40)).filter(Boolean))].slice(0, limit);
}

function cleanIsoDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : "";
}

function cleanPhotoUrl(value) {
  const url = cleanText(value, 500);
  return /^https:\/\/[^\s]+$/i.test(url) ? url : "";
}

function approximateAddress(address) {
  if (/\b\d{2,5}\s+block of\b/i.test(address)) return address;
  return address.replace(/\b(\d{2,5})\s+([^,]+)/, (_match, number, street) => `${Math.floor(Number(number) / 100) * 100} block of ${street}`);
}
