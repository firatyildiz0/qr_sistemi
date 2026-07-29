-- Toplu rezervasyon: tek müşteri, tek tarih aralığı, birden çok ürün.
--
-- Satır başına bir ürün ilkesi korunuyor — stok trigger'ı, müsaitlik sorguları
-- ve RLS politikalarının tamamı buna dayanıyor. Aynı üründen 3 adet de 3 ayrı
-- satır; ürün gün bazında sayıldığı için adet başka türlü doğru hesaplanmaz.
-- Değişen tek şey, birlikte oluşan satırların ortak bir `group_id` taşıması.

alter table bookings add column if not exists group_id uuid;

create index if not exists bookings_group_id_idx on bookings(group_id);

-- Satırları tek işlemde ekler: biri stok yüzünden reddedilirse hiçbiri kalmaz.
--
-- Neden uygulamadan tek tek insert değil: supabase-js her isteği ayrı işlemde
-- çalıştırdığı için yarıda kalan bir grup temizlenemezdi. Neden tek çok satırlı
-- insert değil: aynı komutta eklenen satırlar birbirini göremiyor, dolayısıyla
-- aynı üründen 2 adet istendiğinde stok trigger'ı ikinci satırı ilkinden habersiz
-- onaylardı. Buradaki döngüde her insert ayrı bir komut, sıradaki kendinden
-- öncekini sayıyor.
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
