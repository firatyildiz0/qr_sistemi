-- Migration: give products a stock count and up to two images.
--
-- Stock defaults to 1 so every existing product stays rentable; the check
-- keeps it non-negative. Images are stored as an array of public URLs in the
-- `product-images` storage bucket, capped at two by a check constraint so a
-- bad client can't grow the array past what the UI allows.

alter table products
  add column if not exists stock integer not null default 1;

alter table products
  drop constraint if exists products_stock_non_negative;
alter table products
  add constraint products_stock_non_negative check (stock >= 0);

alter table products
  add column if not exists images text[] not null default '{}';

alter table products
  drop constraint if exists products_images_max_two;
alter table products
  add constraint products_images_max_two check (coalesce(array_length(images, 1), 0) <= 2);

-- ---------------------------------------------------------------------------
-- Storage bucket for product images
-- ---------------------------------------------------------------------------
-- Public read (customers scanning a QR code have no account), owner-only
-- write. Objects are keyed `{owner_id}/{uuid}.{ext}`, so the first path
-- segment is what the write policies check against auth.uid().

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "product_images_select_public" on storage.objects;
drop policy if exists "product_images_insert_owner" on storage.objects;
drop policy if exists "product_images_update_owner" on storage.objects;
drop policy if exists "product_images_delete_owner" on storage.objects;

create policy "product_images_select_public" on storage.objects
  for select using (bucket_id = 'product-images');

create policy "product_images_insert_owner" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "product_images_update_owner" on storage.objects
  for update to authenticated using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "product_images_delete_owner" on storage.objects
  for delete to authenticated using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
