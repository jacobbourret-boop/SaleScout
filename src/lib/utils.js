import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function titleCase(value) {
  return String(value || "")
    .replace(/[-_]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function formatDistance(distance) {
  if (!Number.isFinite(distance)) return "Nearby";
  if (distance < 0.1) return "Near you";
  return `${distance.toFixed(distance < 10 ? 1 : 0)} mi`;
}

export function relativeTime(value) {
  const then = Date.parse(value);
  if (Number.isNaN(then)) return "Recently";
  const diff = Math.max(0, Date.now() - then);
  const minutes = Math.max(1, Math.round(diff / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function distanceBetween(a, b) {
  if (!isValidLocation(a) || !isValidLocation(b)) return 0;
  const earthMiles = 3958.8;
  const lat1 = toRad(Number(a.lat));
  const lat2 = toRad(Number(b.lat));
  const dLat = toRad(Number(b.lat) - Number(a.lat));
  const dLng = toRad(Number(b.lng) - Number(a.lng));
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthMiles * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function isValidLocation(location) {
  return Boolean(
    location &&
      Number.isFinite(Number(location.lat)) &&
      Number.isFinite(Number(location.lng)) &&
      Math.abs(Number(location.lat)) <= 90 &&
      Math.abs(Number(location.lng)) <= 180
  );
}

export function roundCoord(value) {
  return Math.round(Number(value) * 1_000_000) / 1_000_000;
}

export function getSalePhoto(sale) {
  return sale?.photoUrl || "";
}

export function photoAlt(sale) {
  const finds = [...(sale?.highlights || []), ...(sale?.categories || [])].slice(0, 3).join(", ");
  return finds ? `${sale.title}: ${finds}` : `Items available at ${sale?.title || "this sale"}`;
}

export function buildPhotoSuggestion(file) {
  const name = String(file?.name || "").toLowerCase();
  const matches = [
    { words: ["tool", "drill", "saw", "bike"], category: "Tools", title: "Tools, bikes, and garage finds" },
    { words: ["kid", "toy", "baby", "cloth"], category: "Kids", title: "Kids clothes, toys, and books" },
    { words: ["chair", "table", "sofa", "furniture"], category: "Furniture", title: "Furniture and home finds" },
    { words: ["record", "vinyl", "vintage", "estate"], category: "Collectibles", title: "Vintage finds and collectibles" },
    { words: ["electronic", "game", "computer"], category: "Electronics", title: "Electronics and weekend finds" }
  ];
  return matches.find((item) => item.words.some((word) => name.includes(word))) || {
    category: "Home",
    title: "Neighborhood treasure sale"
  };
}

export function compressPhoto(file, maxDimension = 1280, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function readStoredJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}
