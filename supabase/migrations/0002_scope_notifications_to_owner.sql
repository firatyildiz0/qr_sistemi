-- Migration: scope notifications to the seller who owns the related product.
--
-- The previous policies were `using (true)` for both select and update, so any
-- authenticated seller could read — and mark read — every other seller's
-- notifications. Ownership is derived through notifications.product_id, the
-- same way the bookings policies do it.
--
-- The cron job at /api/cron/notifications uses the service role key and
-- bypasses RLS, so inserts are unaffected. (There is deliberately still no
-- insert policy: only the service role may create notifications.)

-- `auth.uid()` is wrapped in a scalar subquery so Postgres evaluates it once
-- per statement instead of once per row.

drop policy if exists "notifications_select_authenticated" on notifications;
drop policy if exists "notifications_update_authenticated" on notifications;

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

-- Every notification read now filters through product_id, both in the policy
-- above and in the application queries.
create index if not exists notifications_product_id_idx on notifications(product_id);
