-- Product Rental Reservation System — schema + RLS policies
-- Run this in the Supabase SQL editor (or via the CLI) on a fresh project.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  features text[],
  daily_price numeric,
  created_at timestamptz not null default now()
);

create index if not exists products_owner_id_idx on products(owner_id);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  customer_name text not null,
  customer_phone text,
  start_date date not null,
  end_date date not null,
  status text not null default 'upcoming'
    check (status in ('upcoming', 'active', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  constraint bookings_date_range check (end_date >= start_date)
);

create index if not exists bookings_product_id_idx on bookings(product_id);
create index if not exists bookings_end_date_idx on bookings(end_date);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_is_read_idx on notifications(is_read);

-- One "returning tomorrow" notification per booking.
create unique index if not exists notifications_booking_id_unique on notifications(booking_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Multi-seller app: each product has an owner (the seller who created it via
-- Supabase Auth). Anyone with the product link (customers scanning the QR
-- code) can view the product and create a booking without an account, but
-- only the owning seller can edit/delete the product or manage (edit/cancel)
-- its bookings. The cron job uses the service role key, which bypasses RLS
-- entirely.

alter table products enable row level security;
alter table bookings enable row level security;
alter table notifications enable row level security;

-- products: public read, owner-only write
create policy "products_select_public" on products
  for select using (true);

create policy "products_insert_authenticated" on products
  for insert to authenticated with check (owner_id = auth.uid());

create policy "products_update_owner" on products
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "products_delete_owner" on products
  for delete to authenticated using (owner_id = auth.uid());

-- bookings: public read/insert (no customer accounts, so anyone can view
-- availability and make a reservation), but only the owning seller can
-- edit or cancel an existing booking
create policy "bookings_select_public" on bookings
  for select using (true);

create policy "bookings_insert_public" on bookings
  for insert with check (true);

create policy "bookings_update_owner" on bookings
  for update to authenticated using (
    exists (
      select 1 from products
      where products.id = bookings.product_id
        and products.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from products
      where products.id = bookings.product_id
        and products.owner_id = auth.uid()
    )
  );

-- notifications: seller-only
create policy "notifications_select_authenticated" on notifications
  for select to authenticated using (true);

create policy "notifications_update_authenticated" on notifications
  for update to authenticated using (true) with check (true);
