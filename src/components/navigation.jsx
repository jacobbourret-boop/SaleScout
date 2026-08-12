import { BookmarkSimple, Camera, Compass, House, MapTrifold, UserCircle } from "@phosphor-icons/react";
import { Brand } from "./brand";
import { cn } from "../lib/utils";

const items = [
  { id: "home", label: "Home", icon: House },
  { id: "explore", label: "Explore", icon: Compass },
  { id: "map", label: "Map", icon: MapTrifold },
  { id: "saved", label: "Saved", icon: BookmarkSimple },
  { id: "profile", label: "Profile", icon: UserCircle }
];

export function Navigation({ view, onViewChange, onQuickAdd }) {
  return (
    <>
      <aside className="desktop-rail" aria-label="Primary navigation">
        <Brand compact />
        <nav className="rail-items">
          {items.map((item) => <NavItem key={item.id} item={item} active={view === item.id} onClick={() => onViewChange(item.id)} />)}
        </nav>
        <button className="rail-add" type="button" onClick={onQuickAdd} aria-label="Quick add a sale">
          <Camera size={24} weight="bold" />
          <span>Add</span>
        </button>
      </aside>

      <nav className="bottom-nav" aria-label="Primary navigation">
        {items.map((item) => <NavItem key={item.id} item={item} active={view === item.id} onClick={() => onViewChange(item.id)} />)}
      </nav>
      <button className={cn("quick-add-fab", ["map", "profile"].includes(view) && "is-context-hidden")} type="button" onClick={onQuickAdd} aria-label="Quick add a sale">
        <Camera size={26} weight="bold" />
      </button>
    </>
  );
}

function NavItem({ item, active, onClick }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      className={cn("nav-item", active && "is-active")}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={23} weight={active ? "fill" : "regular"} />
      <span>{item.label}</span>
    </button>
  );
}
