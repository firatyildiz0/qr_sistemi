-- Migration: teminat ürünün değil rezervasyonun bilgisi.
--
-- 0014'te ürüne eklenmişti; yanlış yerdi. Teminat satıcının o müşteriden o
-- sipariş için aldığı tutar — aynı ürün bir müşteriden depozitosuz, bir
-- başkasından depozitolu çıkabilir. O yüzden kolon `products`'tan kalkıp
-- `bookings`'e geçiyor.
--
-- Sipariş başına TEK tutar: toplu alımın her satırına aynı değer kopyalanıyor
-- (müşteri adı, tarihler ve teslimat şekli gibi). Grubun teminatı okunurken
-- satırlar TOPLANMAZ, herhangi biri alınır.

alter table products
  drop constraint if exists products_deposit_price_non_negative;
alter table products
  drop column if exists deposit_price;

alter table bookings
  add column if not exists deposit_price numeric;

alter table bookings
  drop constraint if exists bookings_deposit_price_non_negative;
alter table bookings
  add constraint bookings_deposit_price_non_negative
    check (deposit_price is null or deposit_price >= 0);

-- Grup insert'i teminatı da yazmalı. Yeni parametre imzayı değiştirdiği için
-- eskisi önce düşürülüyor; `create or replace` bırakılsa iki aşırı yüklenmiş
-- sürüm birden kalır ve isimli çağrı belirsizleşirdi.
drop function if exists create_booking_group(
  uuid, jsonb, text, text, text, text, text, date, date, text, date, date
);

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
  p_blocked_end date,
  -- Siparişin tamamı için tek tutar; grubun her satırına aynısı yazılır.
  p_deposit_price numeric default null
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
        blocked_end,
        deposit_price
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
        p_blocked_end,
        p_deposit_price
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
