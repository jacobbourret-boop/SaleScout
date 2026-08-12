import { useMemo, useState } from "react";
import { BookmarkSimple, Car, ChatCircleDots, CheckCircle, Clock, CurrencyDollar, HouseLine, MapPin, ShareNetwork, Smiley, Storefront, UsersThree, WarningCircle } from "@phosphor-icons/react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { saleConfidence } from "../lib/sales";
import { formatDistance, getSalePhoto, photoAlt, relativeTime, titleCase } from "../lib/utils";

const communityActions = [
  { value: "confirm-open", label: "Still open", icon: CheckCircle },
  { value: "busy", label: "Busy", icon: UsersThree },
  { value: "worth-visiting", label: "Worth visiting", icon: Smiley },
  { value: "lots-of-furniture", label: "Furniture", icon: HouseLine },
  { value: "kid-friendly", label: "Kid friendly", icon: Storefront },
  { value: "cash-only", label: "Cash only", icon: CurrencyDollar },
  { value: "closed", label: "Looks closed", icon: WarningCircle, danger: true }
];

export function ListingDetail({ sale, open, onOpenChange, saved, onToggleSave, onDirections, onShare, onReport, pending, similarSales, onSelectSimilar }) {
  const [note, setNote] = useState("");
  const confidence = useMemo(() => sale ? saleConfidence(sale) : null, [sale]);
  if (!sale) return null;
  const photo = getSalePhoto(sale);
  const confirmations = Number(sale.confirmations || (sale.reports || []).filter((report) => report.type === "confirm-open").length);

  async function submitNote(event) {
    event.preventDefault();
    if (!note.trim()) return;
    const updatedSale = await onReport(sale.id, "comment", note.trim());
    if (updatedSale) setNote("");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="listing-detail-sheet" aria-describedby="listing-description">
        <div className="detail-hero">
          {photo ? <img src={photo} alt={photoAlt(sale)} width="1280" height="960" /> : <div className="detail-hero-fallback"><Storefront size={48} weight="duotone" /></div>}
          <button type="button" className={saved ? "detail-save is-saved" : "detail-save"} onClick={() => onToggleSave(sale.id)} aria-pressed={saved} aria-label={saved ? "Remove from saved sales" : "Save this sale"}>
            <BookmarkSimple size={22} weight={saved ? "fill" : "bold"} />
          </button>
        </div>
        <div className="detail-content">
          <SheetHeader>
            <div className="detail-kicker">
              <Badge variant={confidence.tone}>{confidence.label}</Badge>
              <span>{formatDistance(sale.distance)}</span>
            </div>
            <SheetTitle>{sale.title}</SheetTitle>
            <SheetDescription id="listing-description">{titleCase(sale.type)} sale near {sale.address}</SheetDescription>
          </SheetHeader>

          <div className="detail-primary-facts">
            <div><Clock size={21} weight="duotone" /><span><small>Hours</small><strong>{sale.hours}</strong></span></div>
            <div><MapPin size={21} weight="duotone" /><span><small>Distance</small><strong>{formatDistance(sale.distance)}</strong></span></div>
            <div><UsersThree size={21} weight="duotone" /><span><small>Community</small><strong>{confirmations ? `${confirmations} confirmed` : "Not yet confirmed"}</strong></span></div>
          </div>

          <div className="detail-cta-row">
            <Button size="lg" onClick={() => onDirections(sale)}><Car size={20} weight="fill" />Directions</Button>
            <Button size="lg" variant="secondary" onClick={() => onShare(sale)} aria-label="Share this sale"><ShareNetwork size={20} weight="bold" /></Button>
          </div>

          <section className="detail-section">
            <h3>What you might find</h3>
            <div className="detail-tags">{[...(sale.highlights || []), ...(sale.categories || [])].slice(0, 6).map((item) => <Badge key={item} variant="discovery">{titleCase(item)}</Badge>)}</div>
            <p>{sale.description || "A nearby community sale with new finds waiting to be discovered."}</p>
          </section>

          <section className="detail-section community-checkin">
            <div className="detail-section-title"><div><h3>Help the next scout</h3><p>One tap keeps this listing accurate.</p></div><UsersThree size={24} weight="duotone" /></div>
            <ToggleGroup type="single" value="" onValueChange={…4485 tokens truncated…  >
      <Icon size={23} weight={active ? "fill" : "regular"} />
      <span>{item.label}</span>
    </button>
  );
}
