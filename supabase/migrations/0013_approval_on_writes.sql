-- Migration: onay şartını update/delete politikalarına da taşı.
--
-- 0011 yalnızca insert'leri kapatmıştı; gerekçesi "onaylanmamış hesabın hiç
-- ürünü olamaz" idi. Bu `pending` için doğru ama `rejected` için değil:
-- onaylıyken ürün açıp sonra reddedilen bir hesabın satırları duruyor ve
-- sahiplik şartı hâlâ sağlanıyor. Böyle bir kullanıcı, doğrudan Supabase
-- auth endpoint'inden token alıp (bizim giriş ekranımızı hiç görmeden) kendi
-- ürünlerini, rezervasyonlarını ve işletme ayarını değiştirmeye ya da
-- silmeye devam edebiliyordu.
--
-- Şart `using` tarafına giriyor: satır onaysız hesap için hiç görünmüyor, o
-- yüzden update de delete de sıfır satıra dokunuyor.

drop policy if exists "rental_settings_update_owner" on rental_settings;

create policy "rental_settings_update_owner" on rental_settings
  for update to authenticated
  using (owner_id = (select auth.uid()) and is_approved())
  with check (owner_id = (select auth.uid()) and is_approved());

drop policy if exists "products_update_owner" on products;

create policy "products_update_owner" on products
  for update to authenticated
  using (owner_id = (select auth.uid()) and is_approved())
  with check (owner_id = (select auth.uid()) and is_approved());

drop policy if exists "products_delete_owner" on products;

create policy "products_delete_owner" on products
  for delete to authenticated
  using (owner_id = (select auth.uid()) and is_approved());

drop policy if exists "bookings_update_owner" on bookings;

create policy "bookings_update_owner" on bookings
  for update to authenticated using (
    is_approved()
    and exists (
      select 1 from products
      where products.id = bookings.product_id
        and products.owner_id = (select auth.uid())
    )
  ) with check (
    is_approved()
    and exists (
      select 1 from products
      where products.id = bookings.product_id
        and products.owner_id = (select auth.uid())
    )
  );

drop policy if exists "bookings_delete_owner" on bookings;

create policy "bookings_delete_owner" on bookings
  for delete to authenticated using (
    is_approved()
    and exists (
      select 1 from products
      where products.id = bookings.product_id
        and products.owner_id = (select auth.uid())
    )
  );
