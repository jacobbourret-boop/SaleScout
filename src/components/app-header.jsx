import { Camera, CloudCheck, MapPin } from "@phosphor-icons/react";
import { Brand } from "./brand";
import { Button } from "./ui/button";

const titles = { explore: "Explore", map: "Map", saved: "Saved", profile: "Profile" };

export function AppHeader({ view, syncMessage, onMap, onQuickAdd }) {
  return (
    <header className={view === "map" ? "app-header is-map" : "app-header"}>
      <div className="header-brand">{view === "home" ? <Brand /> : <><Brand compact /><strong>{titles[view]}</strong></>}</div>
      <div className="header-actions">
        <span className="sync-label"><CloudCheck size={17} weight="duotone" />{syncMessage}</span>
        <Button variant="ghost" onClick={onMap}><MapPin size={18} weight="fill" />Near me</Button>
        <Button className="header-add" variant="discovery" onClick={onQuickAdd}><Camera size={18} weight="bold" />Add sale</Button>
      </div>
    </header>
  );
}
