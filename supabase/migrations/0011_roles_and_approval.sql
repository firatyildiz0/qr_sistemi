-- Migration: rol (satıcı / superuser) ve kayıt onayı.
--
-- Yeni kayıtlar artık doğrudan kullanılamıyor: hesap `pending` doğuyor ve bir
-- superuser onaylayana kadar ne giriş yapılabiliyor ne de veri yazılabiliyor.
-- Mevcut hesaplar geriye dönük olarak `approved` işaretleniyor.

alter table profiles
  add column if not exists role text not null default 'seller',
  add column if not exists status text not null default 'pending';

-- Kısıtlar sütunlar doldurulduktan sonra: `add column ... default 'pending'`
-- eski satırları da 'pending' yapardı, onları önce approved'a çekiyoruz.
update profiles set status = 'approved' where status = 'pending';

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('seller', 'superuser'));

alter table profiles drop constraint if exists profiles_status_check;
alter table profiles add constraint profiles_status_check
  check (status in ('pending', 'approved', 'rejected'));

create index if not exists profiles_status_idx on profiles(status);

-- ---------------------------------------------------------------------------
-- Yetki fonksiyonları
-- ---------------------------------------------------------------------------
-- İkisi de `security definer`: `profiles` üzerindeki bir politikanın içinden
-- yine `profiles` sorgulanırsa Postgres politikayı tekrar uygulamaya çalışır ve
-- sonsuz döngüye girer. Definer olarak çalışan fonksiyon RLS'i atladığı için
-- döngü kırılır — bu yüzden ikisi de yalnızca oturumun kendi satırına bakar,
-- dışarıdan parametre almaz.

create or replace function is_approved()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select status = 'approved' from profiles where id = auth.uid()),
    false
  );
$$;

create or replace function is_superuser()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'superuser' and status = 'approved' from profiles where id = auth.uid()),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- profiles politikaları
-- ---------------------------------------------------------------------------

-- Superuser bütün profilleri görür ve durumlarını değiştirir. `with check`
-- içinde de is_superuser(): yetkiyi kendine devredip başkasını superuser
-- yapmak yine superuser olmayı gerektirsin.
drop policy if exists "profiles_select_superuser" on profiles;

create policy "profiles_select_superuser" on profiles
  for select to authenticated using (is_superuser());

drop policy if exists "profiles_update_superuser" on profiles;

create policy "profiles_update_superuser" on profiles
  for update to authenticated
  using (is_superuser())
  with check (is_superuser());

-- ---------------------------------------------------------------------------
-- Onay bekleyen hesap veri yazamaz
-- ---------------------------------------------------------------------------
-- Uygulama tarafındaki kontrol (girişte oturumu kapatmak) yalnızca bizim
-- arayüzümüzü korur; onaylanmamış biri Supabase API'sine doğrudan token alıp
-- istek atabilir. Asıl kapı bu politikalar.
--
-- Yalnızca insert'ler kapatılıyor: onaylanmamış bir hesabın hiç ürünü
-- olamayacağı için update/delete politikalarının sahiplik şartı zaten boşa
-- düşüyor.

drop policy if exists "products_insert_authenticated" on products;

create policy "products_insert_authenticated" on products
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and is_approved());

drop policy if exists "bookings_insert_owner" on bookings;

create policy "bookings_insert_owner" on bookings
  for insert to authenticated with check (
    is_approved()
    and exists (
      select 1 from products
      where products.id = bookings.product_id
        and products.owner_id = (select auth.uid())
    )
  );

drop policy if exists "rental_settings_insert_owner" on rental_settings;

create policy "rental_settings_insert_owner" on rental_settings
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and is_approved());

-- ---------------------------------------------------------------------------
-- İlk superuser
-- ---------------------------------------------------------------------------
-- Kendini superuser yapan bir arayüz yok — ilki elle belirlenir. Kendi
-- kullanıcı adınla çalıştır:
--   update profiles set role = 'superuser' where username = 'kullanici_adin';
