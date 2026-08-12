import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AppHeader } from "./components/app-header";
import { Navigation } from "./components/navigation";
import { RecoveryBoundary } from "./components/recovery-boundary";
import { HomeScreen } from "./screens/home-screen";
import { ExploreScreen } from "./screens/explore-screen";
import { SavedScreen } from "./screens/saved-screen";
import { useSaleScout } from "./hooks/use-sale-scout";
import { distanceBetween } from "./lib/utils";

const loadQuickAdd = () => import("./components/quick-add");
const QuickAdd = lazyFeature(loadQuickAdd, "QuickAdd");
const ListingDetail = lazyFeature(() => import("./components/listing-detail"), "ListingDetail");
const MapScreen = lazyFeature(() => import("./screens/map-screen"), "MapScreen");
const ProfileScreen = lazyFeature(() => import("./screens/profile-screen"), "ProfileScreen");

export default function App() {
  const model = useSaleScout();
  const reduceMotion = useReducedMotion();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddMounted, setQuickAddMounted] = useState(false);
  const [detailOpen, setDetailOpen] = useState(() => Boolean(new URLSearchParams(window.location.search).get("sale")));
  const detailSale = useMemo(() => {
    if (!model.selectedSale) return null;
    const visible = model.visibleSales.find((sale) => sale.id === model.selectedSale.id);
    return { ...model.selectedSale, distance: visible?.distance ?? distanceBetween(model.center, model.selectedSale.location) };
  }, [model.center, model.selectedSale, model.visibleSales]);
  const similarSales = useMemo(() => model.visibleSales.filter((sale) => sale.id !== model.selectedId), [model.selectedId, model.visibleSales]);

  useEffect(() => {
    const preload = () => loadQuickAdd();
    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(preload, { timeout: 2400 });
      return () => window.cancelIdleCallback(idleId);
    }
    const timer = window.setTimeout(preload, 1400);
    return () => window.clearTimeout(timer);
  }, []);

  function openQuickAdd() {
    if (!model.user) {
      model.setView("profile");
      model.showToast("Sign in to publish a sale");
      return;
    }
    setQuickAddMounted(true);
    setQuickAddOpen(true);
  }

  function openSale(saleId) {
    model.selectSale(saleId);
    setDetailOpen(true);
  }

  function previewSale(saleId) {
    model.selectSale(saleId);
    setDetailOpen(false);
  }

  function closeDetail(nextOpen) {
    setDetailOpen(nextOpen);
    if (!nextOpen) model.selectSale("");
  }

  async function publishSale(body) {
    const sale = await model.publishSale(body);
    if (sale) setDetailOpen(true);
    return sale;
  }

  async function reportSale(saleId, type, note) {
    if (!model.user) {
      setDetailOpen(false);
      model.selectSale("");
      model.setView("profile");
      model.showToast("Sign in to help keep sales accurate");
      return null;
    }
    return model.reportSale(saleId, type, note);
  }

  function renderScreen() {
    if (model.view === "home") return <HomeScreen model={model} onQuickAdd={openQuickAdd} onOpenSale={openSale} />;
    if (model.view === "explore") return <ExploreScreen model={model} onQuickAdd={openQuickAdd} onOpenSale={openSale} />;
    if (model.view === "saved") return <SavedScreen model={model} onOpenSale={openSale} />;
    if (model.view === "profile") return <RecoveryBoundary title="Your profile needs a quick refresh" resetKey={model.view}><Suspense fallback={<LazyScreenFallback label="Opening your profile" />}><ProfileScreen model={model} /></Suspense></RecoveryBoundary>;
    return null;
  }

  return (
    <div className="app-shell">
      <Navigation view={model.view} onViewChange={model.setView} onQuickAdd={openQuickAdd} />
      <div className="app-column">
        <AppHeader view={model.view} syncMessage={model.syncMessage} onMap={() => model.setView("map")} onQuickAdd={openQuickAdd} />
        <main id="main-content" className={`app-main view-${model.view}`}>
          {model.view === "map" ? (
            <div className="map-mount">
              <RecoveryBoundary title="The map needs a quick refresh" description="Refresh to reconnect the live map without losing your saved sales." map resetKey={model.view}>
                <Suspense fallback={<LazyScreenFallback label="Opening the sale map" map />}>
                  <MapScreen model={model} onOpenSale={openSale} onPreviewSale={previewSale} />
                </Suspense>
              </RecoveryBoundary>
            </div>
          ) : null}
          <AnimatePresence mode="wait">
            {model.view !== "map" ? (
              <motion.div
                key={model.view}
                className="page-transition"
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              >
                {renderScreen()}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </main>
      </div>

      <RecoveryBoundary title="Quick Add needs a refresh" overlay resetKey={quickAddOpen}>
        <Suspense fallback={quickAddOpen ? <QuickAddFallback /> : null}>
          {quickAddMounted ? <QuickAdd open={quickAddOpen} onOpenChange={setQuickAddOpen} center={model.center} onLocate={model.locate} onPublish={publishSale} onError={model.showToast} pending={model.pendingAction === "publish"} /> : null}
        </Suspense>
      </RecoveryBoundary>
      <RecoveryBoundary title="This sale needs a quick refresh" overlay resetKey={model.selectedId}>
        <Suspense fallback={null}>
          {detailSale ? (
            <ListingDetail
              sale={detailSale}
              open={Boolean(detailOpen)}
              onOpenChange={closeDetail}
              saved={model.favorites.has(detailSale.id)}
              onToggleSave={model.toggleSave}
              onDirections={model.openDirections}
              onShare={model.shareSale}
              onReport={reportSale}
              pending={model.pendingAction}
              similarSales={similarSales}
              onSelectSimilar={openSale}
            />
          ) : null}
        </Suspense>
      </RecoveryBoundary>

      <AnimatePresence>
        {model.toast ? (
          <motion.div className="toast" role="status" aria-live="polite" initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduceMotion ? undefined : { opacity: 0, y: 8 }}>
            {model.toast.toLowerCase().includes("could not") || model.toast.toLowerCase().includes("not available") ? <WarningCircle size={20} weight="fill" /> : <CheckCircle size={20} weight="fill" />}
            <span>{model.toast}</span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function LazyScreenFallback({ label, map = false }) {
  return <div className={map ? "lazy-screen is-map" : "lazy-screen"} role="status" aria-live="polite"><span className="skeleton" /><strong>{label}</strong></div>;
}

function QuickAddFallback() {
  return <div className="quick-add-loading" role="status" aria-live="polite"><div><span className="skeleton" /><strong>Opening quick add</strong></div></div>;
}

function lazyFeature(loader, exportName) {
  return lazy(async () => {
    try {
      const module = await loader();
      try {
        sessionStorage.removeItem(`salescout:feature-retry:${exportName}`);
      } catch {
        // Storage can be unavailable in strict private browsing modes.
      }
      return { default: module[exportName] };
    } catch (error) {
      try {
        const retryKey = `salescout:feature-retry:${exportName}`;
        const lastRetry = Number(sessionStorage.getItem(retryKey) || 0);
        if (!lastRetry || Date.now() - lastRetry > 60_000) {
          sessionStorage.setItem(retryKey, String(Date.now()));
          window.location.reload();
          return await new Promise(() => {});
        }
      } catch {
        // The recovery boundary below remains available without storage.
      }
      throw error;
    }
  });
}
