-- Migration: only the product's owner may create a booking.
--
-- The insert policy was `with check (true)`, left over from when the public
-- product page carried the booking form. That form is now owner-only (the
-- public page shows a read-only availability calendar), but the policy and the
-- server action stayed open — and hiding a form in the UI is not a control.
-- With the anon key being public by design, anyone could POST straight to
-- PostgREST and fill a seller's calendar with fake bookings until the stock
-- trigger locked the product out, picking their own `status` while at it.
--
-- Ownership is derived through bookings.product_id, matching the update policy.
-- If customer-submitted requests come back later they belong in their own
-- table with their own rate limiting, not in this one.

drop policy if exists "bookings_insert_public" on bookings;

create policy "bookings_insert_owner" on bookings
  for insert to authenticated with check (
    exists (
      select 1 from products
      where products.id = bookings.product_id
        and products.owner_id = (select auth.uid())
    )
  );
