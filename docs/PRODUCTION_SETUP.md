# SaleScout private-beta launch guide

Complete these steps in order. The code is already configured for a Vite deployment on Vercel and a Supabase production backend.

## 1. Create the Supabase project

1. Sign in at [supabase.com](https://supabase.com) and select **New project**.
2. Name it `SaleScout` and choose the region closest to the initial testers.
3. Generate a strong database password and save it in a password manager.
4. Wait for the project to finish provisioning.

## 2. Create the database

1. In the Supabase project, open **SQL Editor**.
2. Select **New query**.
3. Open `supabase/production-setup.sql` from this project, copy the complete file into the editor, and select **Run**.
4. Confirm the query completes successfully.
5. Optional: create another query, paste `supabase/seed.sql`, and run it to add three demo sales with fresh expiration times.

The setup script creates the application tables, constraints, indexes, explicit Data API grants, and Row Level Security policies. Do not disable RLS.

## 3. Create photo storage

1. Open **Storage** in Supabase.
2. Select **New bucket**.
3. Set the bucket name to exactly `sale-photos`.
4. Make the bucket **Public** so sale images can appear in public listings.
5. If the form offers file restrictions, set a 5 MB limit and allow JPEG, PNG, and WebP images.
6. Create the bucket. The upload and delete policies were already created by the SQL setup script.

## 4. Enable tester sign-in

Email magic links are the fastest beta option.

1. Open **Authentication → Providers**.
2. Confirm the Email provider is enabled.
3. Keep email confirmation enabled for the beta.
4. Open **Authentication → URL Configuration**.
5. While testing locally, add `http://127.0.0.1:5173/**` to the allowed Redirect URLs.

Optional Google sign-in can be added later:

1. Create a Web OAuth client in Google Cloud.
2. Use the callback URL shown on the Supabase Google provider page. It normally has the form `https://PROJECT_REF.supabase.co/auth/v1/callback`.
3. Add the Google client ID and secret in **Authentication → Providers → Google** and enable it.
4. Set `VITE_AUTH_PROVIDERS` to `google` in Vercel. Do not list a provider until it is enabled in Supabase.

## 5. Copy the browser-safe Supabase values

1. Open the project's **Connect** panel or **Project Settings → API**.
2. Copy the **Project URL**.
3. Copy the **Publishable key**.
4. Do not copy the secret key or legacy `service_role` key into the frontend or Vercel variables.

You will use these values for:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## 6. Put the code on GitHub

The project still needs a working local Git repository, a GitHub remote, and its first commit.

1. On GitHub, create a new private repository named `SaleScout`.
2. Do not add a README, `.gitignore`, or license on GitHub because the project already contains them.
3. In a terminal opened in this project folder, initialize Git and then run the commands GitHub shows under **push an existing repository from the command line**.
4. Before pushing, confirm `.env` and `.env.local` are not included. They are ignored by Git.

A typical first push looks like this, with your own repository URL:

```powershell
git init -b main
git add .
git commit -m "Prepare SaleScout private beta"
git remote add origin https://github.com/YOUR_ACCOUNT/SaleScout.git
git push -u origin main
```

## 7. Import the project into Vercel

1. Sign in at [vercel.com](https://vercel.com).
2. Select **Add New → Project**.
3. Import the `SaleScout` GitHub repository.
4. Confirm the framework preset is **Vite**.
5. Leave the root directory as the repository root.
6. Confirm:
   - Install command: `pnpm install --frozen-lockfile`
   - Build command: `pnpm run build`
   - Output directory: `dist`
   - Node.js version: 22.x or newer
7. Add these Environment Variables for Production, Preview, and Development:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_AUTH_PROVIDERS` (leave empty for magic-link-only testing, or use `google` after Google is enabled)
8. For a real Google map, also add:
   - `VITE_SALESCOUT_MAP_PROVIDER=google`
   - `VITE_GOOGLE_MAPS_API_KEY`
   - `VITE_GOOGLE_MAPS_MAP_ID` if the map configuration uses one
9. Select **Deploy**.

## 8. Finish production URL configuration

After Vercel gives you the production URL:

1. Return to **Supabase → Authentication → URL Configuration**.
2. Set **Site URL** to the exact production URL, such as `https://salescout.vercel.app`.
3. Add `https://salescout.vercel.app/**` to Redirect URLs, using the actual URL.
4. If you want authentication on Vercel preview deployments, also add the preview pattern recommended by Supabase: `https://*-YOUR_VERCEL_TEAM_SLUG.vercel.app/**`.
5. In Google Cloud, restrict the Maps browser key to your production hostname and the preview hostnames you intentionally use.
6. Trigger a new Vercel deployment if any `VITE_` variable changed. Vite embeds those values during the build.

## 9. Run the launch checks

Use two different tester accounts or devices.

1. Open the production URL while signed out and confirm public sales load.
2. Request an email sign-in link and confirm it returns to SaleScout as signed in.
3. Publish a sale without a photo.
4. Publish a second sale with a photo and confirm the photo appears on another device.
5. Add a comment and a still-open confirmation from a different account.
6. Have two distinct accounts report one sale closed; confirm it changes to **Reported closed**.
7. Save a sale, open directions, and share its link.
8. Submit a test item through **Profile → Beta feedback** and confirm it appears in the `beta_feedback` table.
9. Open Supabase **Database → Advisors** and review both Security and Performance findings before inviting a larger group.
10. Confirm Vercel Deployment Protection is not preventing the invited testers from opening the production deployment.

## 10. Invite the first testers

Start with 10–20 people. Ask each person to try browsing, posting, uploading a photo, commenting, confirming a listing, saving it, sharing it, and submitting one feedback report. Review the `beta_feedback` table daily and treat broken sign-in, missing data, failed photo uploads, or incorrect location behavior as launch-blocking bugs.
