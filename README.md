# SaleScout Phase 1

SaleScout is a local Phase 1 MVP for discovering nearby garage, yard, estate, and moving sales.

## What is included

- Shared active-sale board backed by a small local API and `data/sales.json`
- Active sales list with search, sale-type filters, distance radius filtering, open-now filtering, and favorites filtering
- Visual map surface with sale pins, current map center, and zoom controls
- Quick report form for adding a sale with optional photo upload, address/cross-streets, hours, type, highlights, categories, note, and a map/current-location pin
- Shared photo reports are stored as local files under `data/uploads/` and served back through `/uploads/...`
- Approximate address display so exact-looking street numbers become block-level sale locations
- Basic metadata fallback for fast photo-first reports: blank titles become "Garage Sale Nearby" and blank descriptions get a crowdsourced default
- Sale detail panel with photo, hours, distance, categories, confirmations, closed reports, directions, saved favorites, check-ins, and recent notes
- Rich quick reports for still open, closed, worth the stop, picked over, category-specific inventory, parking, cash-only, and Venmo
- Automatic lifecycle rules for stale listings: 48-hour expiry, 24-hour no-verification expiry, and closure after 2 unique closed reports
- Lightweight local sign-in/profile, saved listings tab, profile tab, and basic default settings
- Shared listings and comments carry the local scout identity when signed in
- Route planner tab for saved or nearby open sales with ordered stops and a Google Maps route link
- Personal favorites, profile, and map preferences stored in the current browser

## Run the app

```bash
npm start
```

Then open:

```text
http://127.0.0.1:5173/
```

Anyone using that same local server URL shares the same sale reports and confirmations. Favorites stay private on each device/browser.

## Hosted Sites demo

```bash
npm run build
```

The hosted demo runs without the local Node API. Map data, sale reports, check-ins, photos, saved listings, profile settings, and route planning are stored in each visitor's browser for the demo session.

## Data

The server creates `data/sales.json` on first run. Deleting that file resets the shared sale board to demo sales.

## Verify

```bash
npm test
```


