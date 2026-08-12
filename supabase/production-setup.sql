-- SaleScout private-beta database setup.
-- Run this once in the Supabase SQL Editor, then run seed.sql if desired.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  username text unique check (username is null or char_length(username) between 2 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  type text not null check (type in ('garage', 'yard', 'estate', 'moving', 'rummage', 'other')),
  title text not null check (char_length(title) between 1 and 80),
  description text not null default '' check (char_length(description) <= 280),
  address text not null check (char_length(address) between 1 and 120),
  cross_streets text not null default '' check (char_length(cross_streets) <= 120),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  categories text[] not null default '{}' check (cardinality(categories) <= 12),
  highlights text[] not null default '{}' check (cardinality(highlights) <= 8),
  hours text not null check (char_length(hours) between 1 and 80),
  base_status text not null default 'open' check (base_status in ('open', 'questionable', 'closed')),
  photo_url text check (photo_url is null or char_length(photo_url) <= 500),
  creator_name text not null default 'Local scout' check (char_length(creator_name) <= 80),
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sale_status_reports (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete cascade,
  status text not null check (status in ('confirm-open', 'closed')),
  profile_name text not null default 'Local scout' check (char_length(profile_name) <= 80),
  created_at timestamptz not null default now(),
  unique (sale_id, reporter_id)
);

create table if not exists public.sale_feedback (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete cascade,
  type text not null check (type in ('busy', 'great-deals', 'worth-visiting', 'lots-of-furniture', 'kid-friendly', 'cash-only', 'comment')),
  note text not null default '' check (char_length(note) <= 240),
  profile_name text not null default 'Local scout' check (char_length(profile_name) <= 80),
  created_at timestamptz not null default now()
);

create table if not exists public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('bug', 'idea', 'other')),
  message text not null check (char_length(message) between 1 and 1200),
  page_url text not null default '' check (char_length(page_url) <= 500),
  user_agent text not null default '' check (char_length(user_agent) <= 500),
  status text not null default 'new' check (status in ('new', 'reviewing', 'resolved', 'closed')),
  created_at timestamptz not null default now()
);

create index if not exists sales_ends_at_idx on public.sales (ends_at);
create index if not exists sales_updated_at_idx on public.sales (updated_at desc);
create index if not exists sale_status_reports_sale_id_idx on public.sale_status_reports (sale_id);
create index if not exists sale_feedback_sale_id_created_at_idx on public.sale_feedback (sale_id, created_at desc);
create index if not exists beta_feedback_status_created_at_idx on public.beta_feedback (status, created_at desc);

alter table public.profiles enable row level security;
alter table public.sales enable row level security;
alter table public.sale_status_reports enable row level security;
alter table public.sale_feedback enable row level security;
alter table public.beta_feedback enable row level security;

revoke all on public.profiles, public.sales, public.sale_status_reports, public.sale_feedback, public.beta_feedback from anon, authenticated;
grant select (
  id, type, title, description, address, cross_streets, latitude, longitude, categories,
  highlights, hours, base_status, photo_url, creator_name, ends_at, created_at, updated_at
) on public.sales to anon, authenticated;
grant select (id, sale_id, status, profile_name, created_at) on public.sale_status_reports to anon, authenticated;
grant select (id, sale_id, type, note, profile_name, created_at) on public.sale_feedback to anon, authenticated;
grant insert on public.sales, public.sale_feedback, public.beta_feedback to authenticated;
grant insert, update on public.sale_status_reports to authenticated;
grant select, insert, update on public.profiles to authenticated;

drop policy if exists "Public can browse sales" on public.sales;
create policy "Public can browse sales" on public.sales for select to anon, authenticated using (true);

drop policy if exists "Testers can create their own sales" on public.sales;
create policy "Testers can create their own sales" on public.sales for insert to authenticated
with check ((select auth.uid()) = owner_id);

drop policy if exists "Public can read sale status reports" on public.sale_status_reports;
create policy "Public can read sale status reports" on public.sale_status_reports for select to anon, authenticated using (true);

drop policy if exists "Testers can create their own status reports" on public.sale_status_reports;
create policy "Testers can create their own status reports" on public.sale_status_reports for insert to authenticated
with check ((select auth.uid()) = reporter_id);

drop policy if exists "Testers can revise their own status reports" on public.sale_status_reports;
create policy "Testers can revise their own status reports" on public.sale_status_reports for update to authenticated
using ((select auth.uid()) = reporter_id)
with check ((select auth.uid()) = reporter_id);

drop policy if exists "Public can read sale feedback" on public.sale_feedback;
create policy "Public can read sale feedback" on public.sale_feedback for select to anon, authenticated using (true);

drop policy if exists "Testers can add sale feedback" on public.sale_feedback;
create policy "Testers can add sale feedback" on public.sale_feedback for insert to authenticated
with check ((select auth.uid()) = reporter_id);

drop policy if exists "Testers can read their own profiles" on public.profiles;
create policy "Testers can read their own profiles" on public.profiles for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Testers can create their own profiles" on public.profiles;
create policy "Testers can create their own profiles" on public.profiles for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Testers can update their own profiles" on public.profiles;
create policy "Testers can update their own profiles" on public.profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Testers can submit beta feedback" on public.beta_feedback;
create policy "Testers can submit beta feedback" on public.beta_feedback for insert to authenticated
with check ((select auth.uid()) = reporter_id);

-- Create a PUBLIC Storage bucket named sale-photos in the dashboard before testing uploads.
drop policy if exists "Public can read sale photos" on storage.objects;
create policy "Public can read sale photos" on storage.objects for select to anon, authenticated
using (bucket_id = 'sale-photos');

drop policy if exists "Testers can upload sale photos" on storage.objects;
create policy "Testers can upload sale photos" on storage.objects for insert to authenticated
with check (
  bucket_id = 'sale-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

drop policy if exists "Testers can delete their own sale photos" on storage.objects;
create policy "Testers can delete their own sale photos" on storage.objects for delete to authenticated
using (bucket_id = 'sale-photos' and owner_id = (select auth.uid())::text);
