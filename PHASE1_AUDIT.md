# SaleScout Phase 1 Audit

## Objective

Build Phase 1 of SaleScout: a location-based, crowdsourced garage sale discovery app where users can quickly report garage, yard, and estate sales, view active sales on a map, confirm whether sales are still open, and save favorites.

## Current Evidence

- Report sale flow: `index.html` report dialog and `app.js` `submitReport()` post to `/api/sales`.
- PDF requirements were decoded into `docs/prd-readable.txt` and `docs/mvp-readable.txt` for audit. The MVP doc calls for map discovery, fast photo-backed reports, GPS capture, optional title/description/categories/comments, check-ins, favorites, profile/settings surfaces, and expiration rules.
- Sale types: garage, yard, estate, and moving are supported in the form and API validation.
- Location-based UI: app tracks map center, distance radius filtering, use-my-location, and a report pin picker for GPS-style coordinates.
- Address privacy: exact-looking street-number addresses are approximated to block-level labels before display/API return.
- Map view: `index.html` map canvas plus `app.js` `renderMap()` render sale pins for active/filter-matching sales.
- Route planning: `app.js` provides a Route tab that orders saved or nearby open sales from the current map center and builds a Google Maps driving route link.
- Crowdsourced shared data: `server.js` stores listings, creator identity, reports, reporter identity, comments, confirmations, closed reporter IDs, and lifecycle fields in `data/sales.json` through a local shared API.
- Photo-backed reporting: `index.html` and `app.js` support optional image upload with browser-side compression; `server.js` validates incoming image data URLs, writes shared uploads to `data/uploads/`, stores `/uploads/...` URLs, and serves those images.
- Basic AI placeholder: `generateSaleMetadataFromPhoto()` returns mock title, description, and categories for fast reports.
- Open confirmations: `server.js` `/api/sales/:id/confirm-open` records a still-open report and keeps sale open.
- Closed reports: `server.js` `/api/sales/:id/report-closed` and `/api/sales/:id/report` close a sale after 2 unique closed reporters.
- Check-ins and comments: sale detail includes rich report types and notes, stored as report/comment history.
- Expiration logic: `server.js` and `app.js` expire listings after sale end, after 48 hours, or after 24 hours without verification.
- Favorites: `app.js` keeps favorites per browser in local storage so each user can save their own list.
- Local profile and settings: `index.html` and `app.js` provide sign-in/profile controls, a profile dialog, Map/Saved/Profile navigation tabs, saved-listing view, profile stats, and default distance/open-list settings.
- User identity fields: shared sale creation now sends the local profile/device ID, API records include `createdBy`/`createdByName`, reports include reporter identity, and comments preserve reporter display names.
- Verification: `scripts/api-smoke.mjs` covers seed sales, stale seed refresh, creating a report with photo/default metadata/comment, confirming open, rich reports, two unique closed reports, and re-reading persisted sale data.

## Verified This Pass

- `server.js` is import-safe and exports `createSaleScoutServer()` plus `startSaleScoutServer()`.
- A test server instance started on port 5175 and returned 200 for `/api/health`, `/api/sales`, and `/`.
- The shared sale board returned 5 sales from the current data file.
- Seed demo data refresh was verified with stale seed input plus a preserved user sale.
- Distance radius filtering was added to the active list and map controls.
- The sales API now returns refreshed seed sales even when a read-only data file prevents persisting the refresh.
- `app.js` parse-checked successfully; runtime stops at `window is not defined` when loaded outside a browser, which is expected.
- PDF text extraction succeeded for the PRD and MVP documents and confirmed the larger Phase 1 scope.
- A temporary API verification created a photo-backed sale, generated default metadata, preserved categories/comments, added a worth-the-stop report, closed after 2 unique closed reports, expired stale listings, and parse-checked `app.js`.
- Served preview assets were checked on `http://127.0.0.1:5176/`: health returned OK, HTML contained the photo input, and `/api/sales` returned 5 demo sales.
- A profile pass parse-checked `app.js` again and confirmed the served page includes the profile dialog, Map/Saved/Profile tabs, and profile button.
- Address privacy verification created a report with `1234 Maple Street` and confirmed the API returned `1200 block of Maple Street`.
- Route planner pass parse-checked `app.js`, started a fresh preview on `http://127.0.0.1:5179/`, and confirmed the served app includes the Route tab and route panel code.
- Stored-photo verification created a photo-backed report, confirmed the API returned `/uploads/...` instead of inline image data, fetched the served PNG, and confirmed one upload file was written.
- `scripts/api-smoke.mjs` passed through the bundled Node runtime after being updated to avoid `process.cwd()`.
- A fresh upload-storage preview started on `http://127.0.0.1:5180/` and confirmed health, photo input markup, and upload-aware client code.
- Identity-backed smoke verification passed: created sale retained `createdBy`/`createdByName`, initial comment retained the profile name, and a later report comment retained its reporter name.
- A fresh identity preview started on `http://127.0.0.1:5181/` and confirmed health plus served client code for reporter identity and creator attribution.

## Not Yet Proven Complete

- `npm test` could not be executed in the current shell because `node` and `npm` are not on PATH, though the smoke test itself passed through the bundled Node runtime.
- Browser visual automation was attempted, but the Playwright availability check timed out and reset the bundled Node runner; API and served-asset checks passed afterward.
- Authentication/profile/settings are implemented only as a lightweight local profile, not real Supabase Auth. This local MVP uses browser-local identity for profile, unique reports, and favorites.
- This remains a local shared backend with local file uploads, not a deployed public service with hosted durable storage.
- The map is an app-native visual map rather than a production map/geocoding provider.
- The recommended Expo, TypeScript, Supabase, and Google Maps/Mapbox stack from the PDF was not adopted; the existing no-dependency local web app was extended instead.



