# SaleScout

SaleScout is a mobile-first, crowdsourced garage-sale discovery app built with React and Vite. The private-beta production architecture uses:

- Vercel for the web app
- Supabase Postgres for sales, reports, profiles, and beta feedback
- Supabase Storage for sale photos
- Supabase Auth for email magic links and optional social sign-in

Public visitors can browse. Signed-in testers can publish sales, upload photos, add notes, confirm/close listings, and send beta feedback.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Add the browser-safe Supabase project URL and publishable key.
3. Run `supabase/production-setup.sql` in the Supabase SQL Editor.
4. Create the public `sale-photos` Storage bucket.
5. Optionally run `supabase/seed.sql`.
6. Install and start:

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://127.0.0.1:5173`.

## Production build

```powershell
pnpm run check
```

Vercel configuration is committed in `vercel.json`. See `docs/PRODUCTION_SETUP.md` for the complete dashboard and deployment checklist.

## Security notes

- Never put a Supabase secret key or `service_role` key in a `VITE_` variable.
- Every exposed application table has Row Level Security enabled.
- Database privileges are granted explicitly because new Supabase projects no longer automatically expose new tables to the Data API.
- Sale photo uploads are restricted to authenticated users and user-owned Storage folders.
- The old file-backed `server.js` remains only as a Phase 1 reference and is not used by the Vercel production build.
