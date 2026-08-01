-- Product Rental Reservation System — schema + RLS policies
-- Run this in the Supabase SQL editor (or via the CLI) on a fresh project.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Satıcının kullanıcı adı. Supabase Auth yalnızca e-posta + şifre ile oturum
-- açtığı için kullanıcı adı burada tutulur; giriş sırasında sunucu bu tablodan
-- kullanıcıyı bulup oturumu yine e-posta ile açar. Kayıt, aşağıdaki
-- `handle_new_user` trigger'ı ile auth.users ile aynı işlemde oluşur.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  -- Kullanıcı adı sahibi tarafından seçilmedi, e-postasından türetildi (bkz.
  -- 0009 backfill'i). Panel girişten sonra kendi adını belirlemesini ister.
  username_auto boolean not null default false,
  -- Satıcı mı, paneli yöneten superuser mı. İlk superuser elle belirlenir:
  --   update profiles set role = 'superuser' where username = '...';
  role text not null default 'seller' check (role in ('seller', 'superuser')),
  -- Yeni kayıtlar onay bekler; superuser onaylayana kadar ne giriş yapılabilir
  -- ne de veri yazılabilir (aşağıdaki is_approved() politikaları).
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,20}$')
);

create index if not exists profiles_status_idx on profiles(status);

-- İkisi de `security definer`: `profiles` politikasının içinden yine `profiles`
-- sorgulanırsa Postgres politikayı tekrar uygulayıp sonsuz döngüye girer.
-- Definer olarak çalışan fonksiyon RLS'i atladığı için döngü kırılır — bu
-- yüzden ikisi de yalnızca oturumun kendi satırına bakar, parametre almaz.
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

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, lower(trim(new.raw_user_meta_data->>'username')));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user();

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
  -- Toplu rezervasyonun kimliği: aynı müşteri, aynı tarihler, birden çok ürün.
  -- Satır başına bir ürün ilkesi bozulmuyor — aynı üründen 3 adet 3 satır —
  -- yalnızca birlikte oluşan satırlar bu kolonda birbirine bağlanıyor. Tek
  -- ürünlü eski (ve yeni) rezervasyonlarda null.
  group_id uuid,
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
  -- Siparişin tamamı için alınan depozito. Grubun her satırına aynı tutar
  -- kopyalanır (müşteri bilgileri gibi), o yüzden okunurken toplanmaz.
  deposit_price numeric,
  created_at timestamptz not null default now(),
  constraint bookings_date_range check (end_date >= start_date),
  constraint bookings_deposit_price_non_negative
    check (deposit_price is null or deposit_price >= 0),
  constraint bookings_blocked_range check (
    blocked_end >= blocked_start
    and blocked_start <= start_date
    and blocked_end >= end_date
  )
);

create index if not exists bookings_product_id_idx on bookings(product_id);
create index if not exists bookings_group_id_idx on bookings(group_id);
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

-- Toplu rezervasyonun satırlarını tek işlemde ekler: biri stok yüzünden
-- reddedilirse hiçbiri kalmaz.
--
-- Neden uygulamadan tek tek insert değil: supabase-js her isteği ayrı işlemde
-- çalıştırdığı için yarıda kalan bir grup temizlenemezdi. Neden tek çok satırlı
-- insert değil: aynı komutta eklenen satırlar birbirini göremiyor, dolayısıyla
-- aynı üründen 2 adet istendiğinde yukarıdaki trigger ikinci satırı ilkinden
-- habersiz onaylardı. Buradaki döngüde her insert ayrı bir komut, sıradaki
-- kendinden öncekini sayıyor.
--
-- `security invoker` (varsayılan): satırlar çağıran satıcının yetkisiyle
-- ekleniyor, yani `bookings_insert_owner` politikası her satır için yine
-- çalışıyor. Fonksiyon hiçbir kapıyı atlamıyor.
create or replace function create_booking_group(
  p_group_id uuid,
  -- [{"product_id": "...", "quantity": 2}, ...]
  p_items jsonb,
  p_customer_name text,
  p_customer_phone text,
  p_customer_city text,
  p_customer_district text,
  p_customer_address text,
  p_start_date date,
  p_end_date date,
  p_delivery_mode text,
  p_blocked_start date,
  p_blocked_end date
)
returns integer
language plpgsql
as $$
declare
  v_item jsonb;
  v_quantity integer;
  v_inserted integer := 0;
begin
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := coalesce((v_item->>'quantity')::integer, 1);

    if v_quantity < 1 then
      raise exception 'Adet en az 1 olmalı.';
    end if;

    for i in 1..v_quantity loop
      insert into bookings (
        group_id,
        product_id,
        customer_name,
        customer_phone,
        customer_city,
        customer_district,
        customer_address,
        start_date,
        end_date,
        delivery_mode,
        blocked_start,
        blocked_end
      ) values (
        p_group_id,
        (v_item->>'product_id')::uuid,
        p_customer_name,
        p_customer_phone,
        p_customer_city,
        p_customer_district,
        p_customer_address,
        p_start_date,
        p_end_date,
        p_delivery_mode,
        p_blocked_start,
        p_blocked_end
      );

      v_inserted := v_inserted + 1;
    end loop;
  end loop;

  if v_inserted = 0 then
    raise exception 'Rezervasyona en az bir ürün eklemelisiniz.';
  end if;

  return v_inserted;
end;
$$;

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
-- Sahiplik ve herkese açık müsaitlik
-- ---------------------------------------------------------------------------

-- `security definer`: politikanın içinden `products` sorgulanınca o tablonun
-- kendi RLS'i de devreye girer ve iç içe geçmiş politikalar birbirini
-- kilitleyebilir. Definer olarak çalışan fonksiyon o bağı kesiyor.
create or replace function owns_product(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from products
    where products.id = p_product_id
      and products.owner_id = auth.uid()
  );
$$;

-- QR'ı okutan müşterinin gördüğü müsaitlik takvimi. `bookings` satırları kişisel
-- veri taşıdığı için ona kapalı; takvimin saydığı tarihler buradan geliyor.
-- Dönen satırlarda ad, telefon, adres, teminat ya da rezervasyon kimliği yok.
--
-- `delivery_mode` burada çözülüyor: kolon eklenmeden önceki kayıtlarda null ve
-- uygulama onu müşterinin ilinden türetiyor. Aynı kural (Bursa → elden) burada
-- uygulanıyor ki il dışarı çıkmasın.
create or replace function product_availability(p_product_id uuid)
returns table (
  start_date date,
  end_date date,
  delivery_mode text,
  blocked_start date,
  blocked_end date
)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.start_date,
    b.end_date,
    coalesce(
      b.delivery_mode,
      case when b.customer_city = 'Bursa' then 'elden' else 'kargo' end
    ),
    b.blocked_start,
    b.blocked_end
  from bookings b
  where b.product_id = p_product_id
    and b.status <> 'cancelled';
$$;

-- Kimliği bilinen tek bir ürünün herkese açık görünümü. Liste döndürmüyor,
-- filtrelenemiyor: geçerli bir UUID bilmeden hiçbir şey alınamaz, o da QR
-- etiketinin üstünde zaten yazıyor. `owner_id` bilinçli olarak dönmüyor —
-- uygulama sahipliği "satır tablodan geldi mi" diye anlıyor.
create or replace function product_public(p_id uuid)
returns table (
  id uuid,
  name text,
  description text,
  features text[],
  daily_price numeric,
  stock integer,
  images text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.name, p.description, p.features, p.daily_price, p.stock, p.images
  from products p
  where p.id = p_id;
$$;

-- `security definer` fonksiyonların yetkisi açıkça veriliyor: varsayılan
-- `public` grubu alınıp yerine yalnızca gerçekten çağıracak roller konuyor.
revoke all on function product_availability(uuid) from public;
grant execute on function product_availability(uuid) to anon, authenticated;

revoke all on function product_public(uuid) from public;
grant execute on function product_public(uuid) to anon, authenticated;

revoke all on function owns_product(uuid) from public;
grant execute on function owns_product(uuid) to authenticated;

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
alter table profiles enable row level security;

-- profiles: satıcı yalnızca kendi kaydını görür. Kullanıcı adı → e-posta
-- eşlemesi girişte service role anahtarıyla okunduğu için başka politika yok;
-- kayıt trigger ile oluşur, kullanıcı adı sonradan değişmez.
create policy "profiles_select_own" on profiles
  for select to authenticated using (id = (select auth.uid()));

-- Kullanıcı adını değiştirme hakkı tek seferlik: `using` yalnızca türetilmiş
-- adı taşıyan satırı açar, `with check` de aynı update'in bayrağı düşürmesini
-- zorunlu kılar. Satıcı adını bir kez belirler, sonra politika kapanır.
create policy "profiles_update_own_pending_username" on profiles
  for update to authenticated
  using (id = (select auth.uid()) and username_auto)
  with check (id = (select auth.uid()) and not username_auto);

-- Superuser bütün profilleri görür ve durumlarını değiştirir. `with check`
-- içinde de is_superuser(): yetkiyi devredip başkasını superuser yapmak yine
-- superuser olmayı gerektirsin.
create policy "profiles_select_superuser" on profiles
  for select to authenticated using (is_superuser());

create policy "profiles_update_superuser" on profiles
  for update to authenticated
  using (is_superuser())
  with check (is_superuser());

-- rental_settings: satıcının kendi işletme ayarı. Ne başkası okur ne yazar.
create policy "rental_settings_select_owner" on rental_settings
  for select to authenticated using (owner_id = (select auth.uid()));

-- is_approved(): onay bekleyen hesap veri yazamaz. Girişte oturumu kapatmak
-- yalnızca bizim arayüzümüzü korur; onaylanmamış biri Supabase API'sine
-- doğrudan token alıp istek atabilir, asıl kapı burası.
--
-- Şart her yazma politikasında, yalnızca insert'lerde değil: onaylıyken veri
-- oluşturup sonra reddedilen bir hesabın satırları duruyor ve sahiplik şartı
-- hâlâ sağlanıyor. `using` tarafındaki is_approved() o satırları onaysız
-- hesap için tamamen görünmez kılıyor.
create policy "rental_settings_insert_owner" on rental_settings
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and is_approved());

create policy "rental_settings_update_owner" on rental_settings
  for update to authenticated
  using (owner_id = (select auth.uid()) and is_approved())
  with check (owner_id = (select auth.uid()) and is_approved());

-- products: public read, owner-only write
-- products: okuma sahibine ait, yazma zaten öyleydi. QR'ı okutan müşteri tek
-- bir ürünü kimliğiyle `product_public()` üzerinden görüyor.
--
-- Bu politika da eskiden `using (true)` idi; o hâliyle bütün satıcıların ürün,
-- fiyat ve stok listesi tek istekte indirilebiliyordu (bkz. 0018). Müşteri
-- verisi değil ama ticari veri, ve ziyaretçinin bütün listeye hiç ihtiyacı yok.
create policy "products_select_owner" on products
  for select to authenticated using (owner_id = (select auth.uid()));

create policy "products_insert_authenticated" on products
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and is_approved());

create policy "products_update_owner" on products
  for update to authenticated
  using (owner_id = (select auth.uid()) and is_approved())
  with check (owner_id = (select auth.uid()) and is_approved());

create policy "products_delete_owner" on products
  for delete to authenticated
  using (owner_id = (select auth.uid()) and is_approved());

-- bookings: satır müşterinin adını, telefonunu ve açık adresini taşıyor, o
-- yüzden okuması da yazması da ürünün sahibine ait. Herkese açık ürün sayfası
-- takvimi `product_availability()` üzerinden besleniyor: dolu tarihler dönüyor,
-- kimin doldurduğu dönmüyor.
--
-- Bu politika eskiden `using (true)` idi. Anon anahtar tarayıcıdaki pakette
-- göründüğü için o hâliyle bütün müşteri kayıtları internete açıktı (bkz.
-- 0016). Takvimin ihtiyaç duyduğu şeyle kişisel verinin aynı sorgudan gelmesi
-- gerekmiyordu; ikisi ayrıldı.
create policy "bookings_select_owner" on bookings
  for select to authenticated using (owns_product(product_id));

create policy "bookings_insert_owner" on bookings
  for insert to authenticated with check (
    is_approved()
    and exists (
      select 1 from products
      where products.id = bookings.product_id
        and products.owner_id = (select auth.uid())
    )
  );

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

-- Deleting is the seller's too. The admin panel deletes bookings when a
-- customer is removed — customers are derived from bookings, so there is
-- nothing else to delete.
create policy "bookings_delete_owner" on bookings
  for delete to authenticated using (
    is_approved()
    and exists (
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
