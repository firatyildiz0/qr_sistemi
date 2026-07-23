-- Migration: restrict product/booking editing to the product's owner.
-- Run this against an existing database that was created from an older
-- version of schema.sql (i.e. one where `products` has no owner_id column).

-- 1. Add the owner_id column, nullable at first so we can backfill.
alter table products add column if not exists owner_id uuid references auth.users(id) on delete cascade;

-- 2. Backfill existing rows. There is no reliable way to know who created a
--    product that predates this column, so this assigns every existing
--    product to a single seller account. Replace the subquery below with the
--    correct auth.users id (or run a manual UPDATE) before/after applying
--    this migration if you have more than one seller account.
update products
set owner_id = (select id from auth.users order by created_at asc limit 1)
where owner_id is null;

-- 3. Now that every row has an owner, enforce it going forward.
alter table products alter column owner_id set not null;

create index if not exists products_owner_id_idx on products(owner_id);

-- 4. Replace the old "any authenticated user" policies with owner-only ones.
drop policy if exists "products_update_authenticated" on products;
drop policy if exists "products_delete_authenticated" on products;

create policy "products_update_owner" on products
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "products_delete_owner" on products
  for delete to authenticated using (owner_id = auth.uid());

-- The insert policy previously allowed any authenticated user; scope it to
-- rows the requester actually owns.
drop policy if exists "products_insert_authenticated" on products;

create policy "products_insert_authenticated" on products
  for insert to authenticated with check (owner_id = auth.uid());

-- 5. Booking edits/cancellations were fully public; restrict updates to the
--    owner of the product the booking belongs to. Inserts stay public so
--    customers can still make a reservation from the QR page.
drop policy if exists "bookings_update_public" on bookings;

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
