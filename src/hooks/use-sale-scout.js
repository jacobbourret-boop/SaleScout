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
      new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          const reason = new Error("This browser cannot provide your location");
          if (!silent) showToast(reason.message);
          reject(reason);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = { lat: roundCoord(position.coords.latitude), lng: roundCoord(position.coords.longitude) };
            setCenter(location);
            if (!silent) showToast("Map centered on your location");
            resolve(location);
          },
          () => {
            const reason = new Error("Location permission was not available");
            if (!silent) showToast(reason.message);
            reject(reason);
          },
          { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
        );
      }),
    [setCenter, showToast]
  );

  useEffect(() => {
    locate({ silent: true }).catch(() => {});
  }, [locate]);

  const selectSale = useCallback((saleId) => {
    setSelectedId(saleId);
    const url = new URL(window.location.href);
    if (saleId) url.searchParams.set("sale", saleId);
    else url.searchParams.delete("sale");
    window.history.pushState({}, "", url);
  }, []);

  const toggleSave = useCallback(
    (saleId) => {
      setFavorites((current) => {
        const next = new Set(current);
        if (next.has(saleId)) next.delete(saleId);
        else next.add(saleId);
        localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify([...next]));
        showToast(next.has(saleId) ? "Saved for Saturday" : "Removed from saved sales");
        return next;
      });
    },
    [showToast]
  );

  const replaceSale = useCallback((sale) => {
    if (!sale) return;
    setSales((current) => {
      const index = current.findIndex((item) => item.id === sale.id);
      if (index === -1) return [sale, ...current];
      const next = [...current];
      next[index] = sale;
      return next;
    });
  }, []);

  const publishSale = useCallback(
    async (body) => {
      if (pendingAction) return null;
      if (!user) {
        setView("profile");
        showToast("Sign in before publishing a sale");
        return null;
      }
      setPendingAction("publish");
      try {
        const sale = await createSale(body, user, profile.displayName || profile.username || "Local scout");
        replaceSale(sale);
        selectSale(sale.id);
        showToast("Sale published for nearby scouts");
        return sale;
      } catch (requestError) {
        showToast(requestError.message || "Could not publish this sale");
        return null;
      } finally {
        setPendingAction("");
      }
    },
    [pendingAction, profile, replaceSale, selectSale, showToast, user]
  );

  const reportSale = useCallback(
    async (saleId, type, note = "") => {
      if (pendingAction) return null;
      if (!user) {
        setView("profile");
        showToast("Sign in before updating a sale");
        return null;
      }
      setPendingAction(`report:${type}`);
      try {
        const sale = await reportSaleToSupabase(saleId, type, note, user, profile.displayName || profile.username || "Local scout");
        replaceSale(sale);
        showToast(type === "closed" ? "Closed report added. Two unique reports close a sale." : "Thanks for helping nearby scouts");
        return sale;
      } catch (requestError) {
        showToast(requestError.message || "Could not post that update");
        return null;
      } finally {
        setPendingAction("");
      }
    },
    [pendingAction, profile, replaceSale, showToast, user]
  );

  const saveProfile = useCallback(
    async (nextProfile) => {
      const normalized = { ...profile, ...nextProfile };
      setProfile(normalized);
      localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(normalized));
      const radius = Number(normalized.defaultRadius || 5);
      setFilters((current) => ({ ...current, radius }));
      try {
        if (user?.id) await saveRemoteProfile(user.id, normalized);
        showToast("Profile preferences saved");
      } catch (profileError) {
        showToast(profileError.message || "Preferences saved on this device only");
      }
    },
    [profile, showToast, user?.id]
  );

  const openDirections = useCallback((sale) => {
    const url = new URL("https://www.google.com/maps/dir/");
    url.searchParams.set("api", "1");
    url.searchParams.set("destination", `${sale.location.lat},${sale.location.lng}`);
    window.open(url.toString(), "_blank", "noopener");
  }, []);

  const openRoute = useCallback(() => {
    if (!route.length) return;
    const destination = route.at(-1).location;
    const waypoints = route.slice(0, -1).map((sale) => `${sale.location.lat},${sale.location.lng}`).join("|");
    const url = new URL("https://www.google.com/maps/dir/");
    url.searchParams.set("api", "1");
    url.searchParams.set("origin", `${center.lat},${center.lng}`);
    url.searchParams.set("destination", `${destination.lat},${destination.lng}`);
    if (waypoints) url.searchParams.set("waypoints", waypoints);
    window.open(url.toString(), "_blank", "noopener");
  }, [center, route]);

  const shareSale = useCallback(
    async (sale) => {
      const shareUrl = new URL(window.location.href);
      shareUrl.searchParams.set("sale", sale.id);
      const payload = { title: `${sale.title} on SaleScout`, text: `${titleCase(sale.type)} sale near ${sale.address}. ${sale.hours}`, url: shareUrl.toString() };
      if (navigator.share && config.sharing.nativeShare) {
        try {
          await navigator.share(payload);
          return;
        } catch (shareError) {
          if (shareError?.name === "AbortError") return;
        }
      }
      if (config.sharing.facebookSharer) {
        const facebookUrl = new URL("https://www.facebook.com/sharer/sharer.php");
        facebookUrl.searchParams.set("u", shareUrl.toString());
        window.open(facebookUrl.toString(), "_blank", "noopener,width=680,height=520");
      } else {
        await navigator.clipboard?.writeText(shareUrl.toString());
        showToast("Sale link copied");
      }
    },
    [config, showToast]
  );

  const isAuthReady = useCallback((provider) => config.auth.enabledProviders.includes(provider), [config]);

  const startAuth = useCallback(
    (provider) => {
      if (!isAuthReady(provider)) {
        showToast(`${titleCase(provider)} sign-in is not configured yet`);
        return;
      }
      setPendingAction(`auth:${provider}`);
      signInWithProvider(provider)
        .catch((authError) => showToast(authError.message || `Could not sign in with ${titleCase(provider)}`))
        .finally(() => setPendingAction(""));
    },
    [isAuthReady, showToast]
  );

  const sendMagicLink = useCallback(async (email) => {
    if (!email?.trim()) return false;
    setPendingAction("auth:email");
    try {
      await signInWithMagicLink(email);
      showToast("Check your email for a secure sign-in link");
      return true;
    } catch (authError) {
      showToast(authError.message || "Could not send the sign-in link");
      return false;
    } finally {
      setPendingAction("");
    }
  }, [showToast]);

  const signOut = useCallback(async () => {
    setPendingAction("auth:signout");
    try {
      await signOutFromSupabase();
      showToast("Signed out");
    } catch (authError) {
      showToast(authError.message || "Could not sign out");
    } finally {
      setPendingAction("");
    }
  }, [showToast]);

  const submitBetaFeedback = useCallback(async ({ type, message }) => {
    if (!user) {
      showToast("Sign in before sending beta feedback");
      return false;
    }
    setPendingAction("feedback");
    try {
      await submitFeedbackToSupabase({ user, type, message });
      showToast("Feedback sent. Thank you for testing SaleScout!");
      return true;
    } catch (feedbackError) {
      showToast(feedbackError.message || "Could not send feedback");
      return false;
    } finally {
      setPendingAction("");
    }
  }, [showToast, user]);

  return {
    sales,
    visibleSales,
    savedSales,
    selectedSale,
    selectedId,
    favorites,
    profile,
    session,
    user,
    authLoading,
    config,
    center,
    filters,
    route,
    loading,
    error,
    syncMessage,
    view,
    theme,
    toast,
    pendingAction,
    setView,
    setFilters,
    setCenter,
    setTheme,
    locate,
    selectSale,
    toggleSave,
    publishSale,
    reportSale,
    saveProfile,
    openDirections,
    openRoute,
    shareSale,
    startAuth,
    isAuthReady,
    sendMagicLink,
    signOut,
    submitBetaFeedback,
    retry: () => loadSales({ initial: true }),
    showToast
  };
}
