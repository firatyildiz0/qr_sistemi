-- Migration: let stock, not the calendar, decide availability.
--
-- A product with stock 2 can carry two bookings on the same date; the day is
-- only closed once as many active bookings cover it as there are units. The
-- server action checks this before inserting, but that is a read-then-write,
-- so two simultaneous requests could both pass it. This trigger is the
-- authority: an advisory lock keyed on the product serialises concurrent
-- bookings for the same product, then the day-by-day count is re-checked.

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
  from generate_series(new.start_date::timestamp, new.end_date::timestamp, interval '1 day') as g(day)
  where (
    select count(*)
    from bookings b
    where b.product_id = new.product_id
      and b.status <> 'cancelled'
      and b.id <> new.id
      and g.day::date between b.start_date and b.end_date
  ) >= v_stock
  limit 1;

  if v_full_day is not null then
    raise exception 'Stok dolu: % tarihinde müsait ürün kalmadı.', to_char(v_full_day, 'DD.MM.YYYY');
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_enforce_stock on bookings;

create trigger bookings_enforce_stock
  before insert or update of product_id, start_date, end_date, status on bookings
  for each row
  execute function enforce_booking_stock();
