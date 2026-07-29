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
  stock integer not null default 1,
  images text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint products_stock_non_negative check (stock >= 0),
  constraint products_images_max_two check (coalesce(array_length(images, 1), 0) <= 2)
);

create index if not exists products_owner_id_idx on products(owner_id);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  customer_name text not null,
  customer_phone text,
  -- Teslimat adresi: il ve ilçe seçim listesinden gelir, açık adres serbest metin.
  customer_city text,
  customer_district text,
  customer_address text,
  start_date date not null,
  end_date date not null,
  -- Kargo mu elden mi. Müşterinin ilinden türetilir (Bursa → elden), ama
  -- satıcı istisnai durumlar için elle değiştirebildiğinden saklanır.
  delivery_mode text not null check (delivery_mode in ('kargo', 'elden')),
  -- Ürünün gerçekte meşgul olduğu aralık: kiralamadan önce yola çıktığı
  -- günden temizlenip tekrar kiralanabilir hale geldiği güne kadar. Kayıt
  -- anında `rental_settings` sürelerinden hesaplanıp yazılır — müsaitlik
  -- kontrolü kiralama tarihlerine değil buna bakar.
  blocked_start date not null,
  blocked_end date not null,
  status text not null default 'upcoming'
    check (status in ('upcoming', 'active', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  constraint bookings_date_range check (end_date >= start_date),
  constraint bookings_blocked_range check (
    blocked_end >= blocked_start
    and blocked_start <= start_date
    and blocked_end >= end_date
  )
);

create index if not exists bookings_product_id_idx on bookings(product_id);
-- `end_date` bildirim cron'u için, `blocked_end` müsaitlik sorguları için.
create index if not exists bookings_end_date_idx on bookings(end_date);
create index if not exists bookings_blocked_end_idx on bookings(blocked_end);

-- Satıcı başına ürün dönüş süreleri: kargo ve elden teslim için ayrı ayrı
-- gidiş, iade gecikmesi, dönüş ve hazırlık günleri. Rezervasyonun meşguliyet
-- aralığı bunlardan hesaplanır. jsonb, çünkü yalnızca uygulama okuyor ve
-- bozuk/eksik alanlar `parseTurnaround` içinde varsayılana düşüyor.
create table if not exists rental_settings (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  turnaround jsonb not null default '{
    "kargo": {"outbound": 3, "returnLag": 1, "inbound": 2, "prep": 0},
    "elden": {"outbound": 1, "returnLag": 1, "inbound": 1, "prep": 1}
  }'::jsonb,
  updated_at timestamptz not null default now()
);

-- Availability is limited by stock, not by the calendar: a product with stock
-- 2 can carry two bookings on the same date, and a day only closes once as
-- many active bookings cover it as there are units. The server action checks
-- this before inserting, but that is a read-then-write; this trigger is the
-- authority. The advisory lock serialises concurrent bookings for the same
-- product so two requests can't both take the last unit.
--
-- Taranan aralık kiralama günleri değil `blocked_start`/`blocked_end`: ürün
-- kına gününden önce yola çıkıyor, düğünden sonra da dönüp temizleniyor. O
-- aralık kayıt anında hesaplanıp yazıldığı için burada ayar tablosunu okumak
-- ya da teslimat şekline göre dallanmak gerekmiyor.
create or replace function enforce_booking_stock()
returns trigger
language plpgsql
as $$
declare
  v_stock integer;
  v_full_day date;
begin
  -- Cancelling frees units, it never consumes any.
  if new.status = 'cancelled' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.product_id::text, 0));

  select stock into v_stock from products where id = new.product_id;

  if v_stock is null then
    raise exception 'Ürün bulunamadı.';
  end if;

  if v_stock <= 0 then
    raise exception 'Bu ürün stokta yok, rezervasyon oluşturulamaz.';
  end if;

  select day::date into v_full_day
  from generate_series(new.blocked_start::timestamp, new.blocked_end::timestamp, interval '1 day') as g(day)
  where (
    select count(*)
    from bookings b
    where b.product_id = new.product_id
      and b.status <> 'cancelled'
      and b.id <> new.id
      and g.day::date between b.blocked_start and b.blocked_end
  ) >= v_stock
  limit 1;

  if v_full_day is not null then
    raise exception 'Stok dolu: % tarihinde müsait ürün kalmadı (kargo ve hazırlık süreleri dahil).', to_char(v_full_day, 'DD.MM.YYYY');
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_enforce_stock on bookings;

create trigger bookings_enforce_stock
  before insert or update of product_id, start_date, end_date, blocked_start, blocked_end, status on bookings
  for each row
  execute function enforce_booking_stock();

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_is_read_idx on notifications(is_read);
create index if not exists notifications_product_id_idx on notifications(product_id);

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
alter table rental_settings enable row level security;

-- rental_settings: satıcının kendi işletme ayarı. Ne başkası okur ne yazar.
create policy "rental_settings_select_owner" on rental_settings
  for select to authenticated using (owner_id = (select auth.uid()));

create policy "rental_settings_insert_owner" on rental_settings
  for insert to authenticated with check (owner_id = (select auth.uid()));

create policy "rental_settings_update_owner" on rental_settings
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- products: public read, owner-only write
create policy "products_select_public" on products
  for select using (true);

create policy "products_insert_authenticated" on products
  for insert to authenticated with check (owner_id = auth.uid());

create policy "products_update_owner" on products
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "products_delete_owner" on products
  for delete to authenticated using (owner_id = auth.uid());

-- bookings: public read (no customer accounts, so anyone with the link can see
-- what dates are taken), but every write — creating, editing, cancelling — is
-- restricted to the seller who owns the product. The public product page shows
-- a read-only availability calendar; only the owner gets the booking form, and
-- the insert policy below is what actually enforces that.
create policy "bookings_select_public" on bookings
  for select using (true);

create policy "bookings_insert_owner" on bookings
  for insert to authenticated with check (
    exists (
      select 1 from products
      where products.id = bookings.product_id
        and products.owner_id = (select auth.uid())
    )
  );

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

-- Deleting is the seller's too. The admin panel deletes bookings when a
-- customer is removed — customers are derived from bookings, so there is
-- nothing else to delete.
create policy "bookings_delete_owner" on bookings
  for delete to authenticated using (
    exists (
      select 1 from products
      where products.id = bookings.product_id
        and products.owner_id = (select auth.uid())
    )
  );

-- notifications: restricted to the seller who owns the related product.
-- There is deliberately no insert policy — only the cron job's service role key
-- (which bypasses RLS) may create notifications.
create policy "notifications_select_owner" on notifications
  for select to authenticated using (
    exists (
      select 1 from products
      where products.id = notifications.product_id
        and products.owner_id = (select auth.uid())
    )
  );

create policy "notifications_update_owner" on notifications
  for update to authenticated using (
    exists (
      select 1 from products
      where products.id = notifications.product_id
        and products.owner_id = (select auth.uid())
    )
  ) with check (
    exists (
      select 1 from products
      where products.id = notifications.product_id
        and products.owner_id = (select auth.uid())
    )
  );
