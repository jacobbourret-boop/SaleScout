import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_PORT = 5173;
const DEFAULT_DATA_DIR = path.join(__dirname, "data");
const STATIC_FILES = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/styles.css", "styles.css"],
  ["/app.js", "app.js"]
]);
const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp"
};
const SALE_TYPES = new Set(["garage", "yard", "estate", "moving"]);
const REPORT_TYPES = new Set([
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
]);
const SEED_REFRESH_GRACE_MS = 2 * 60 * 60 * 1000;
const INACTIVITY_EXPIRATION_MS = 24 * 60 * 60 * 1000;
const DEFAULT_EXPIRATION_MS = 48 * 60 * 60 * 1000;
const CLOSED_REPORT_THRESHOLD = 2;
const BODY_LIMIT = 1500000;
const PHOTO_URL_LIMIT = 900000;

export function createSaleScoutServer(options = {}) {
  const staticDir = options.staticDir || __dirname;
  const salesFile = options.salesFile
    ? path.resolve(options.salesFile)
    : path.join(options.dataDir || DEFAULT_DATA_DIR, "sales.json");
  const uploadDir = options.uploadDir
    ? path.resolve(options.uploadDir)
    : path.join(path.dirname(salesFile), "uploads");

  return http.createServer(async function (request, response) {
    try {
      response.setHeader("Access-Control-Allow-Origin", "*");
      response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      response.setHeader("Access-Control-Allow-Headers", "Content-Type");

      if (request.method === "OPTIONS") {
        response.writeHead(204);
        response.end();
        return;
      }

      const url = new URL(request.url, "http://127.0.0.1");

      if (url.pathname === "/api/health" && request.method === "GET") {
        sendJson(response, 200, { ok: true });
        return;
      }

      if (url.pathname === "/api/sales" && request.method === "GET") {
        const sales = await readSales(salesFile);
        sendJson(response, 200, { sales: sortSales(sales), updatedAt: new Date().toISOString() });
        return;
      }

      if (url.pathname === "/api/sales" && request.method === "POST") {
        const body = await readBody(request);
        const sale = await buildSale(body, uploadDir);
        const sales = await readSales(salesFile);
        sales.unshift(sale);
        await writeSales(salesFile, sales);
        sendJson(response, 201, { sale });
        return;
      }

      const confirmationMatch = url.pathname.match(/^\/api\/sales\/([^/]+)\/(confirm-open|report-closed)$/);
      if (confirmationMatch && request.method === "POST") {
        const body = await readBody(request);
        const sale = await updateConfirmation(salesFile, confirmationMatch[1], confirmationMatch[2], body);
        sendJson(response, 200, { sale });
        return;
      }

      const reportMatch = url.pathname.match(/^\/api\/sales\/([^/]+)\/report$/);
      if (reportMatch && request.method === "POST") {
        const body = await readBody(request);
        const sale = await addSaleReport(salesFile, reportMatch[1], body);
        sendJson(response, 200, { sale });
        return;
      }

      if (request.method === "GET" && STATIC_FILES.has(url.pathname)) {
        await sendStatic(response, staticDir, STATIC_FILES.get(url.pathname));
        return;
      }

      if (request.method === "GET" && url.pathname.startsWith("/uploads/")) {
        await sendUpload(response, uploadDir, url.pathname);
        return;
      }

      sendJson(response, 404, { error: "Not found" });
    } catch (error) {
      const status = error.statusCode || 500;
      sendJson(response, status, { error: status === 500 ? "Server error" : error.message });
    }
  });
}

export function startSaleScoutServer(options = {}) {
  const port = Number(options.port || getEnv("PORT") || DEFAULT_PORT);
  const salesFile = options.salesFile || getEnv("SALES_FILE");
  const server = createSaleScoutServer({ salesFile, staticDir: options.staticDir, dataDir: options.dataDir });

  server.listen(port, function () {
    console.log("SaleScout is running at http://127.0.0.1:" + port + "/");
  });

  return server;
}

if (isMainModule()) {
  startSaleScoutServer();
}

async function sendStatic(response, staticDir, fileName) {
  const filePath = path.join(staticDir, fileName);
  const body = await fs.readFile(filePath);
  response.writeHead(200, { "content-type": CONTENT_TYPES[path.extname(fileName)] || "application/octet-stream" });
  response.end(body);
}

async function sendUpload(response, uploadDir, pathname) {
  const fileName = path.basename(decodeURIComponent(pathname));
  if (!/^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp)$/.test(fileName)) {
    throw httpError(404, "Upload not found");
  }

  const filePath = path.join(uploadDir, fileName);
  const resolvedUploadDir = path.resolve(uploadDir);
  const resolvedFile = path.resolve(filePath);
  if (!resolvedFile.startsWith(resolvedUploadDir + path.sep)) {
    throw httpError(404, "Upload not found");
  }

  let body;
  try {
    body = await fs.readFile(resolvedFile);
  } catch (error) {
    if (error.code === "ENOENT") throw httpError(404, "Upload not found");
    throw error;
  }
  response.writeHead(200, {
    "content-type": CONTENT_TYPES[path.extname(fileName).toLowerCase()] || "application/octet-stream",
    "cache-control": "public, max-age=31536000, immutable"
  });
  response.end(body);
}

async function readSales(salesFile) {
  await fs.mkdir(path.dirname(salesFile), { recursive: true });
  try {
    const text = await fs.readFile(salesFile, "utf8");
    const loadedSales = JSON.parse(text);
    const normalized = normalizeSales(loadedSales);
    if (normalized.changed) await tryWriteSales(salesFile, normalized.sales);
    return normalized.sales;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const sales = seedSales();
    await tryWriteSales(salesFile, sales);
    return sales;
  }
}

export function normalizeSales(sales) {
  if (!Array.isArray(sales)) {
    return { sales: seedSales(), changed: true };
  }

  const freshSeeds = seedSales();
  const seedIds = new Set(freshSeeds.map(function (sale) { return sale.id; }));
  const hasStaleSeed = sales.some(function (sale) {
    return seedIds.has(sale.id) && isStaleSeedSale(sale);
  });

  if (!hasStaleSeed) {
    const normalizedSales = sales.map(normalizeSaleRecord).map(applySaleLifecycle);
    return { sales: normalizedSales, changed: JSON.stringify(normalizedSales) !== JSON.stringify(sales) };
  }

  const userSales = sales.filter(function (sale) {
    return !seedIds.has(sale.id);
  });

  return { sales: freshSeeds.concat(userSales.map(normalizeSaleRecord).map(applySaleLifecycle)), changed: true };
}

function isStaleSeedSale(sale) {
  const endsAt = new Date(sale.endsAt).getTime();
  return Number.isNaN(endsAt) || endsAt < Date.now() - SEED_REFRESH_GRACE_MS;
}
async function tryWriteSales(salesFile, sales) {
  try {
    await writeSales(salesFile, sales);
  } catch (error) {
    if (error && (error.code === "EACCES" || error.code === "EPERM" || error.code === "EROFS")) {
      return false;
    }
    throw error;
  }
  return true;
}
async function writeSales(salesFile, sales) {
  await fs.mkdir(path.dirname(salesFile), { recursive: true });
  await fs.writeFile(salesFile, JSON.stringify(sales, null, 2) + "\n", "utf8");
}

async function updateConfirmation(salesFile, id, action, body = {}) {
  const sales = await readSales(salesFile);
  const sale = sales.find(function (item) { return item.id === id; });
  if (!sale) throw httpError(404, "Sale not found");

  applyReportToSale(sale, buildReport(body, action === "confirm-open" ? "still_open" : "closed"));

  await writeSales(salesFile, sales);
  return sale;
}

async function addSaleReport(salesFile, id, body = {}) {
  const sales = await readSales(salesFile);
  const sale = sales.find(function (item) { return item.id === id; });
  if (!sale) throw httpError(404, "Sale not found");

  applyReportToSale(sale, buildReport(body, body.reportType));

  await writeSales(salesFile, sales);
  return sale;
}

async function buildSale(body, uploadDir) {
  const type = cleanText(body.type, 20).toLowerCase();
  const startsAt = new Date(body.startsAt);
  const endsAt = new Date(body.endsAt);
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const photoUrl = await storePhotoUpload(body.photoUrl, uploadDir);
  const metadata = generateSaleMetadataFromPhoto(photoUrl);
  const title = cleanText(body.title, 70) || metadata.title;
  const description = cleanText(body.description || "", 220) || metadata.description;
  const categories = cleanCategories(body.categories && body.categories.length ? body.categories : metadata.categories);
  const address = approximateAddress(cleanText(body.address, 110), lat, lng);
  const createdAt = new Date();
  const initialComment = cleanText(body.comment || "", 180);
  const createdBy = cleanText(body.deviceId || "", 80) || "anonymous-" + crypto.randomUUID();
  const createdByName = cleanText(body.profileName || "", 60);
  const initialReport = buildReport({
    reportType: "still_open",
    comment: initialComment,
    deviceId: createdBy,
    profileName: createdByName,
    lat,
    lng
  }, "still_open", createdAt);

  if (!SALE_TYPES.has(type)) throw httpError(400, "Choose a valid sale type.");
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw httpError(400, "Add a valid sale location.");
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
    throw httpError(400, "Use valid sale hours.");
  }
  if (!title) throw httpError(400, "Add a sale title.");

  return {
    id: crypto.randomUUID(),
    type,
    title,
    address,
    approximateAddress: address,
    description,
    createdBy,
    createdByName,
    categories,
    comments: initialComment ? [{
      id: crypto.randomUUID(),
      text: initialComment,
      reportType: "still_open",
      profileName: createdByName,
      createdAt: createdAt.toISOString()
    }] : [],
    reports: [initialReport],
    photoUrl,
    lat,
    lng,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    createdAt: createdAt.toISOString(),
    lastConfirmedAt: createdAt.toISOString(),
    expiresAt: new Date(createdAt.getTime() + DEFAULT_EXPIRATION_MS).toISOString(),
    openConfirmations: 1,
    closedReports: 0,
    closedReporterIds: [],
    status: "open"
  };
}

function buildReport(body = {}, fallbackType = "still_open", now = new Date()) {
  const requestedType = cleanText(body.reportType || fallbackType, 40).toLowerCase();
  const reportType = REPORT_TYPES.has(requestedType) ? requestedType : "still_open";
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  return {
    id: crypto.randomUUID(),
    type: reportType,
    comment: cleanText(body.comment || "", 180),
    deviceId: cleanText(body.deviceId || "", 80) || "anonymous-" + crypto.randomUUID(),
    profileName: cleanText(body.profileName || "", 60),
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    createdAt: now.toISOString()
  };
}

function applyReportToSale(sale, report) {
  sale.reports = Array.isArray(sale.reports) ? sale.reports : [];
  sale.comments = Array.isArray(sale.comments) ? sale.comments : [];
  sale.closedReporterIds = Array.isArray(sale.closedReporterIds) ? sale.closedReporterIds : [];
  sale.reports.unshift(report);
  sale.updatedAt = report.createdAt;

  if (report.comment) {
    sale.comments.unshift({
      id: crypto.randomUUID(),
      text: report.comment,
      reportType: report.type,
      profileName: report.profileName,
      createdAt: report.createdAt
    });
  }

  if (report.type === "still_open") {
    sale.lastConfirmedAt = report.createdAt;
    sale.openConfirmations = Number(sale.openConfirmations || 0) + 1;
    sale.status = "open";
  }

  if (report.type === "closed") {
    if (!sale.closedReporterIds.includes(report.deviceId)) sale.closedReporterIds.push(report.deviceId);
    sale.closedReports = sale.closedReporterIds.length;
    if (sale.closedReports >= CLOSED_REPORT_THRESHOLD) sale.status = "closed";
  }

  applySaleLifecycle(sale);
  return sale;
}

function normalizeSaleRecord(sale) {
  const normalized = Object.assign({}, sale);
  const lat = Number(normalized.lat);
  const lng = Number(normalized.lng);
  normalized.title = cleanText(normalized.title, 70) || "Garage Sale Nearby";
  normalized.description = cleanText(normalized.description || "", 220) || "Crowdsourced garage sale reported by a SaleScout user.";
  normalized.approximateAddress = approximateAddress(normalized.approximateAddress || normalized.address, lat, lng);
  normalized.address = normalized.approximateAddress;
  normalized.createdBy = cleanText(normalized.createdBy || "", 80);
  normalized.createdByName = cleanText(normalized.createdByName || "", 60);
  normalized.categories = cleanCategories(normalized.categories && normalized.categories.length ? normalized.categories : inferCategories(normalized.description));
  normalized.comments = Array.isArray(normalized.comments) ? normalized.comments.map(normalizeComment).filter(Boolean) : [];
  normalized.reports = Array.isArray(normalized.reports) ? normalized.reports.map(normalizeReport).filter(Boolean) : [];
  normalized.closedReporterIds = Array.isArray(normalized.closedReporterIds) ? Array.from(new Set(normalized.closedReporterIds.map(function (id) { return cleanText(id, 80); }).filter(Boolean))) : [];
  normalized.photoUrl = cleanPhotoUrl(normalized.photoUrl || "");
  normalized.openConfirmations = Number(normalized.openConfirmations || 0);
  normalized.closedReports = Math.max(Number(normalized.closedReports || 0), normalized.closedReporterIds.length);
  normalized.expiresAt = validIsoDate(normalized.expiresAt) || new Date(new Date(normalized.createdAt || Date.now()).getTime() + DEFAULT_EXPIRATION_MS).toISOString();
  return normalized;
}

function normalizeComment(comment) {
  const text = cleanText(comment && comment.text, 180);
  if (!text) return null;
  return {
    id: cleanText(comment.id, 80) || crypto.randomUUID(),
    text,
    reportType: cleanText(comment.reportType || "note", 40),
    profileName: cleanText(comment.profileName || "", 60),
    createdAt: validIsoDate(comment.createdAt) || new Date().toISOString()
  };
}

function normalizeReport(report) {
  if (!report) return null;
  const requestedType = cleanText(report.type || report.reportType, 40).toLowerCase();
  const type = REPORT_TYPES.has(requestedType) ? requestedType : "still_open";
  return {
    id: cleanText(report.id, 80) || crypto.randomUUID(),
    type,
    comment: cleanText(report.comment || "", 180),
    deviceId: cleanText(report.deviceId || "", 80) || "anonymous-" + crypto.randomUUID(),
    profileName: cleanText(report.profileName || "", 60),
    lat: Number.isFinite(Number(report.lat)) ? Number(report.lat) : null,
    lng: Number.isFinite(Number(report.lng)) ? Number(report.lng) : null,
    createdAt: validIsoDate(report.createdAt) || new Date().toISOString()
  };
}

function applySaleLifecycle(sale) {
  if (sale.status === "closed" || sale.status === "flagged") return sale;

  const now = Date.now();
  const endsAt = new Date(sale.endsAt).getTime();
  const expiresAt = new Date(sale.expiresAt || 0).getTime();
  const lastVerifiedAt = new Date(sale.lastConfirmedAt || sale.createdAt || 0).getTime();

  if (
    (Number.isFinite(endsAt) && endsAt < now) ||
    (Number.isFinite(expiresAt) && expiresAt > 0 && expiresAt < now) ||
    (Number.isFinite(lastVerifiedAt) && now - lastVerifiedAt > INACTIVITY_EXPIRATION_MS)
  ) {
    sale.status = "expired";
  }

  return sale;
}

export function generateSaleMetadataFromPhoto(photoUrl) {
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
    .map(function (category) { return cleanText(category, 40).toLowerCase().replace(/\s+/g, "_"); })
    .filter(function (category) {
      if (!allowed.has(category) || seen.has(category)) return false;
      seen.add(category);
      return true;
    })
    .slice(0, 8);
}

async function storePhotoUpload(value, uploadDir) {
  const photoUrl = cleanPhotoUrl(value);
  if (!photoUrl || isStoredPhotoUrl(photoUrl)) return photoUrl;

  const parsed = parseImageDataUrl(photoUrl);
  if (!parsed) throw httpError(400, "Use a valid image upload.");

  await fs.mkdir(uploadDir, { recursive: true });
  const fileName = Date.now() + "-" + crypto.randomUUID() + "." + parsed.extension;
  await fs.writeFile(path.join(uploadDir, fileName), parsed.bytes);
  return "/uploads/" + fileName;
}

function cleanPhotoUrl(value) {
  const photoUrl = String(value || "").trim();
  if (!photoUrl) return "";
  if (photoUrl.length > PHOTO_URL_LIMIT) throw httpError(413, "Photo is too large.");
  if (isStoredPhotoUrl(photoUrl)) return photoUrl;
  if (!parseImageDataUrl(photoUrl)) throw httpError(400, "Use a valid image upload.");
  return photoUrl;
}

function isStoredPhotoUrl(value) {
  return /^\/uploads\/[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp)$/.test(value);
}

function parseImageDataUrl(value) {
  const match = String(value || "").match(/^data:image\/(jpeg|jpg|png|webp);base64,([a-z0-9+/=]+)$/i);
  if (!match) return null;
  const extension = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
  try {
    return {
      extension,
      bytes: Buffer.from(match[2], "base64")
    };
  } catch (error) {
    return null;
  }
}

function approximateAddress(address, lat, lng) {
  const safeLat = Number.isFinite(lat) ? lat.toFixed(4) : "unknown";
  const safeLng = Number.isFinite(lng) ? lng.toFixed(4) : "unknown";
  const fallback = "Sale pin near " + safeLat + ", " + safeLng;
  const text = cleanText(address || "", 110);
  if (!text) return fallback;
  if (/\b(block|near| at | and |cross|intersection)\b/i.test(text) || /[&/]/.test(text)) return text;

  const match = text.match(/^(\d{1,6})\s+(.+)$/);
  if (!match) return text;

  const number = Number(match[1]);
  const street = cleanText(match[2], 100);
  if (!street) return fallback;
  if (!Number.isFinite(number) || number < 100) return "Near " + street;
  return Math.floor(number / 100) * 100 + " block of " + street;
}

function validIsoDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function cleanText(value, maxLength) {
  return String(value == null ? "" : value).replace(/\s+/g, " ").trim().slice(0, maxLength);
}

async function readBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > BODY_LIMIT) throw httpError(413, "Request is too large.");
  }
  try {
    return body ? JSON.parse(body) : {};
  } catch (error) {
    throw httpError(400, "Send valid JSON.");
  }
}

function sortSales(sales) {
  return sales.slice().sort(function (a, b) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function seedSales() {
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
      approximateAddress: approximateAddress(sale.address, 41.8781 + sale.latOffset, -87.6298 + sale.lngOffset),
      description: sale.description,
      createdBy: "seed",
      createdByName: "SaleScout demo",
      categories: inferCategories(sale.description),
      comments: [],
      reports: [],
      photoUrl: "",
      lat: 41.8781 + sale.latOffset,
      lng: -87.6298 + sale.lngOffset,
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

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60000);
}

function getEnv(name) {
  return globalThis.process && globalThis.process.env ? globalThis.process.env[name] : undefined;
}

function isMainModule() {
  return Boolean(globalThis.process && globalThis.process.argv && path.resolve(globalThis.process.argv[1] || "") === __filename);
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function sendJson(response, statusCode, value) {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(value));
}



