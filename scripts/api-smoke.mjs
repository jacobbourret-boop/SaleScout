import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSaleScoutServer, normalizeSales } from "../server.js";

const port = 5174;
const baseUrl = "http://127.0.0.1:" + port;
const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dataFile = path.join(projectRoot, "data", "api-smoke-sales.json");
const uploadDir = path.join(projectRoot, "data", "api-smoke-uploads");
const staleSeed = {
  id: "seed-1",
  type: "garage",
  title: "Stale demo sale",
  address: "Old block",
  description: "Should refresh.",
  lat: 41.8,
  lng: -87.6,
  startsAt: "2020-01-01T10:00:00.000Z",
  endsAt: "2020-01-01T12:00:00.000Z",
  createdAt: "2020-01-01T09:00:00.000Z",
  lastConfirmedAt: null,
  openConfirmations: 99,
  closedReports: 0,
  status: "open"
};
const userSale = {
  id: "user-sale-1",
  type: "yard",
  title: "Preserved user yard sale",
  address: "55 User Lane",
  description: "Should survive refresh.",
  lat: 41.87,
  lng: -87.62,
  startsAt: new Date(Date.now() - 60000).toISOString(),
  endsAt: new Date(Date.now() + 3600000).toISOString(),
  createdAt: new Date().toISOString(),
  lastConfirmedAt: null,
  openConfirmations: 1,
  closedReports: 0,
  status: "open"
};
const normalized = normalizeSales([staleSeed, userSale]);
assert.equal(normalized.changed, true, "stale seeded demo data should refresh");
assert.equal(normalized.sales.some(function (sale) { return sale.id === "user-sale-1"; }), true, "user reports should be preserved during seed refresh");
assert.equal(normalized.sales.find(function (sale) { return sale.id === "seed-1"; }).title, "Maple block garage sale");
const server = createSaleScoutServer({ salesFile: dataFile, uploadDir });
const tinyPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

await fs.rm(dataFile, { force: true });
await fs.rm(uploadDir, { force: true, recursive: true });
await listen(server, port);

try {
  const initial = await getJson("/api/sales");
  assert.equal(initial.sales.length, 5, "seed sales should load");

  const now = Date.now();
  const created = await postJson("/api/sales", {
    type: "garage",
    title: "",
    address: "",
    description: "",
    categories: ["tools"],
    comment: "Lots of tools in the garage.",
    photoUrl: tinyPng,
    deviceId: "smoke-reporter",
    profileName: "Smoke Reporter",
    lat: 41.88,
    lng: -87.63,
    startsAt: new Date(now - 15 * 60000).toISOString(),
    endsAt: new Date(now + 3 * 60 * 60000).toISOString()
  });

  assert.equal(created.sale.title, "Garage Sale Nearby");
  assert.match(created.sale.photoUrl, /^\/uploads\/.+\.png$/);
  const uploadResponse = await fetch(baseUrl + created.sale.photoUrl);
  assert.equal(uploadResponse.ok, true, "uploaded photo should be served");
  assert.equal(uploadResponse.headers.get("content-type"), "image/png");
  assert.equal(created.sale.categories.includes("tools"), true);
  assert.equal(created.sale.createdBy, "smoke-reporter");
  assert.equal(created.sale.createdByName, "Smoke Reporter");
  assert.equal(created.sale.comments.length, 1);
  assert.equal(created.sale.comments[0].profileName, "Smoke Reporter");
  assert.equal(created.sale.openConfirmations, 1);

  const open = await postJson("/api/sales/" + encodeURIComponent(created.sale.id) + "/confirm-open", { deviceId: "smoke-open", profileName: "Open Checker" });
  assert.equal(open.sale.openConfirmations, 2);
  assert.equal(open.sale.status, "open");

  const note = await postJson("/api/sales/" + encodeURIComponent(created.sale.id) + "/report", { reportType: "worth_the_stop", comment: "Worth the stop.", deviceId: "smoke-note", profileName: "Note Writer" });
  assert.equal(note.sale.comments.some(function (comment) { return comment.text === "Worth the stop."; }), true);
  assert.equal(note.sale.comments.some(function (comment) { return comment.profileName === "Note Writer"; }), true);

  const closed = await postJson("/api/sales/" + encodeURIComponent(created.sale.id) + "/report-closed", { deviceId: "smoke-closed-1" });
  assert.equal(closed.sale.closedReports, 1);

  const closedAgain = await postJson("/api/sales/" + encodeURIComponent(created.sale.id) + "/report", { reportType: "closed", deviceId: "smoke-closed-2" });
  assert.equal(closedAgain.sale.closedReports, 2);
  assert.equal(closedAgain.sale.status, "closed");

  const final = await getJson("/api/sales");
  assert.equal(final.sales.some(function (sale) { return sale.id === created.sale.id; }), true);

  console.log("SaleScout API smoke test passed");
} finally {
  await close(server);
  await fs.rm(dataFile, { force: true });
  await fs.rm(uploadDir, { force: true, recursive: true });
}

function listen(server, port) {
  return new Promise(function (resolve, reject) {
    server.once("error", reject);
    server.listen(port, function () {
      server.off("error", reject);
      resolve();
    });
  });
}

function close(server) {
  return new Promise(function (resolve, reject) {
    server.close(function (error) {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function getJson(pathname) {
  const response = await fetch(baseUrl + pathname);
  assert.equal(response.ok, true, pathname + " should return OK");
  return response.json();
}

async function postJson(pathname, body) {
  const response = await fetch(baseUrl + pathname, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  assert.equal(response.ok, true, pathname + " should return OK");
  return response.json();
}

