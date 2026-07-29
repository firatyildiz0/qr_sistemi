-- Migration: let a seller delete the bookings of a product they own.
--
-- Customers are derived from bookings, so "deleting a customer" in the admin
-- panel means deleting that person's bookings. Until now `bookings` had no
-- delete policy at all, which under RLS is a silent no-op rather than an
-- error — the delete would appear to succeed and change nothing.
--
-- Scoped exactly like the update policy: ownership is derived through
-- bookings.product_id. Notifications reference the booking with
-- `on delete cascade`, so they go with it.

drop policy if exists "bookings_delete_owner" on bookings;

create policy "bookings_delete_owner" on bookings
  for delete to authenticated using (
    exists (
      select 1 from products
      where products.id = bookings.product_id
        and products.owner_id = (select auth.uid())
    )
  );
