import { BookmarkSimple, Clock, ImageSquare, MapPin, UsersThree } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { Badge } from "./ui/badge";
import { saleConfidence } from "../lib/sales";
import { cn, formatDistance, getSalePhoto, photoAlt, relativeTime, titleCase } from "../lib/utils";

export function SaleCard({ sale, saved, onSelect, onToggleSave, variant = "standard", priority = false }) {
  const reduceMotion = useReducedMotion();
  const confidence = saleConfidence(sale);
  const photo = getSalePhoto(sale);
  const confirmations = Number(sale.confirmations || (sale.reports || []).filter((report) => report.type === "confirm-open").length);
  return (
    <motion.article
      className={cn("sale-card", `sale-card-${variant}`)}
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
    >
      <button className="sale-card-hit" type="button" onClick={() => onSelect(sale.id)} aria-label={`View ${sale.title}`}>
        <span className="sale-card-media">
          {photo ? (
            <img src={photo} alt={photoAlt(sale)} width="1280" height="960" loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} />
          ) : (
            <span className="sale-photo-fallback" aria-hidden="true"><ImageSquare size={28} /></span>
          )}
        </span>
        <span className="sale-card-copy">
          <span className="sale-card-kicker">
            <strong>{titleCase(sale.type)} sale</strong>
            <span>{formatDistance(sale.distance)}</span>
          </span>
          <strong className="sale-card-title">{sale.title}</strong>
          <span className="sale-card-confidence"><Badge variant={confidence.tone}>{confidence.label}</Badge></span>
          <span className="sale-card-address"><MapPin size={15} weight="fill" />{sale.address}</span>
          <span className="sale-card-detail-row">
            <span><Clock size={15} />{sale.hours}</span>
            <span><UsersThree size={16} />{confirmations ? `${confirmations} confirmed` : "No confirmations yet"}</span>
          </span>
          <span className="sale-card-tags">
            {(sale.categories || []).slice(0, variant === "feature" ? 3 : 2).map((category) => <Badge key={category}>{category}</Badge>)}
            <span className="sale-card-updated">{relativeTime(sale.updatedAt)}</span>
          </span>
        </span>
      </button>
      <button
        type="button"
        className={cn("favorite-button", saved && "is-saved")}
        onClick={() => onToggleSave(sale.id)}
        aria-label={saved ? `Remove ${sale.title} from saved` : `Save ${sale.title}`}
        aria-pressed={saved}
      >
        <BookmarkSimple size={20} weight={saved ? "fill" : "bold"} />
      </button>
    </motion.article>
  );
}
