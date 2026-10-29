-- =========================================================
-- ARstore — Supabase schema
-- Run this in Supabase → SQL Editor → New query → Run.
-- After running, reload the ARstore page and the footer
-- badge should say "☁ Supabase connected".
-- =========================================================

create table if not exists public.users (
  id text primary key,
  name text,
  email text,
  role text,
  pw text,
  salt text,
  phone text,
  city text,
  "createdAt" bigint
);

create table if not exists public.products (
  id text primary key,
  "sellerId" text,
  "sellerName" text,
  title text,
  emoji text,
  category text,
  price numeric,
  stock int,
  description text,
  image text,
  palette jsonb,
  city text,
  lat double precision,
  lng double precision,
  "createdAt" bigint
);

create table if not exists public.reviews (
  id text primary key,
  "productId" text,
  "userId" text,
  "userName" text,
  rating int,
  comment text,
  "createdAt" bigint
);

create table if not exists public.orders (
  id text primary key,
  "productId" text,
  "buyerId" text,
  "buyerName" text,
  "sellerId" text,
  "productTitle" text,
  qty int,
  total numeric,
  status text,
  "createdAt" bigint
);

alter table public.users enable row level security;
alter table public.products enable row level security;
alter table public.reviews enable row level security;
alter table public.orders enable row level security;

-- Demo policies: allow the publishable (anon) key to read/write.
-- NOTE: this is demo-grade. For production use Supabase Auth and
-- replace these with auth-based policies, and never store raw
-- password hashes in a public table.
drop policy if exists "ar_all_users" on public.users;
drop policy if exists "ar_all_products" on public.products;
drop policy if exists "ar_all_reviews" on public.reviews;
drop policy if exists "ar_all_orders" on public.orders;

create policy "ar_all_users" on public.users for all using (true) with check (true);
create policy "ar_all_products" on public.products for all using (true) with check (true);
create policy "ar_all_reviews" on public.reviews for all using (true) with check (true);
create policy "ar_all_orders" on public.orders for all using (true) with check (true);

-- Reload PostgREST schema cache so the new tables are visible.
notify pgrst, 'reload schema';
