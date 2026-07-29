-- Migration: teslimat şekli ve ürün dönüş süreleri.
--
-- Bir rezervasyon ürünü kiralama günlerinden daha uzun süre meşgul eder:
-- kına gününden önce kargoya verilir, düğünden sonra geri gelir ve
-- temizlenir. Müsaitliğin dayanacağı aralık artık bu geniş aralık.
--
-- Aralık her kayıtta `rental_settings`ten hesaplanıp `blocked_start` /
-- `blocked_end` kolonlarına yazılır — okuma anında hesaplanmıyor. Böylece
-- aşağıdaki stok trigger'ının ayar tablosunu okuması, teslimat şekline göre
-- dallanması ve uygulamadaki hesabı SQL'de tekrar etmesi gerekmiyor:
-- baktığı kolonların adı değişiyor, mantığı aynı kalıyor.

-- ---------------------------------------------------------------------------
-- Satıcı başına dönüş süreleri
-- ---------------------------------------------------------------------------
-- jsonb, çünkü değerler {kargo,elden} × {outbound,returnLag,inbound,prep}
-- şeklinde iç içe ve yalnızca uygulama tarafından okunuyor. Bozuk ya da eksik
-- alanlar `parseTurnaround` (src/lib/turnaround.ts) içinde varsayılana düşer.
create table if not exists rental_settings (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  turnaround jsonb not null default '{
    "kargo": {"outbound": 3, "returnLag": 1, "inbound": 2, "prep": 0},
    "elden": {"outbound": 1, "returnLag": 1, "inbound": 1, "prep": 1}
  }'::jsonb,
  updated_at timestamptz not null default now()
);

alter table rental_settings enable row level security;

-- Süreler satıcının kendi işletme bilgisi; ne başkası okur ne de yazar.
drop policy if exists "rental_settings_select_owner" on rental_settings;
create policy "rental_settings_select_owner" on rental_settings
  for select to authenticated using (owner_id = (select auth.uid()));

drop policy if exists "rental_settings_insert_owner" on rental_settings;
create policy "rental_settings_insert_owner" on rental_settings
  for insert to authenticated with check (owner_id = (select auth.uid()));

drop policy if exists "rental_settings_update_owner" on rental_settings;
create policy "rental_settings_update_owner" on rental_settings
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Rezervasyon kolonları
-- ---------------------------------------------------------------------------
alter table bookings add column if not exists delivery_mode text
  check (delivery_mode in ('kargo', 'elden'));
alter table bookings add column if not exists blocked_start date;
alter table bookings add column if not exists blocked_end date;

-- Mevcut kayıtlar için doldurma. Bu rezervasyonlarda teslimat şekli hiç
-- sorulmadığı için ilden türetiliyor; il boşsa kargo sayılır, yani daha uzun
-- ve güvenli tarafta kalan aralık uygulanır.
update bookings
set delivery_mode = case
      when customer_city = 'Bursa' then 'elden'
      else 'kargo'
    end
where delivery_mode is null;

-- Varsayılan sürelerle: kargoda gidiş 3 gün, elden teslimde 1. Dönüş tarafı
-- iki modda da toplam 3 gün tuttuğu için orada dallanmaya gerek yok.
update bookings
set blocked_start = start_date - (case delivery_mode when 'elden' then 1 else 3 end),
    blocked_end = end_date + 3
where blocked_start is null or blocked_end is null;

-- Artık her satırda dolu olduklarına göre zorunlu kılınabilirler; müsaitlik
-- kontrolü tamamen bu kolonlara dayandığı için boş kalmaları sessiz bir
-- çakışma demek olurdu.
alter table bookings alter column delivery_mode set not null;
alter table bookings alter column blocked_start set not null;
alter table bookings alter column blocked_end set not null;

alter table bookings drop constraint if exists bookings_blocked_range;
alter table bookings add constraint bookings_blocked_range
  check (blocked_end >= blocked_start
     and blocked_start <= start_date
     and blocked_end >= end_date);

-- `bookings_end_date_idx` duruyor: bildirim cron'u hâlâ `end_date` üzerinden
-- sorguluyor. Müsaitlik sorguları ise artık meşguliyet aralığını tarıyor.
create index if not exists bookings_blocked_end_idx on bookings(blocked_end);

-- ---------------------------------------------------------------------------
-- Stok trigger'ı artık meşguliyet aralığına bakıyor
-- ---------------------------------------------------------------------------
-- 0004'teki fonksiyonla aynı; tek fark taradığı aralığın `start_date`/
-- `end_date` yerine `blocked_start`/`blocked_end` olması. Sunucu action'ı
-- aynı kontrolü önceden yapıyor, ama o bir oku-sonra-yaz; yarışan iki isteğin
-- son ürünü birlikte alamamasını sağlayan advisory lock ile burası.
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
