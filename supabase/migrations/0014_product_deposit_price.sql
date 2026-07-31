-- Migration: ürünlere teminat fiyatı.
--
-- Kiralamadan alınan depozito. Günlük fiyat gibi opsiyonel — girilmediğinde
-- null kalır, "teminat alınmıyor" demektir. Eksi bir teminat anlamsız olduğu
-- için kontrol negatif değerleri engelliyor.

alter table products
  add column if not exists deposit_price numeric;

alter table products
  drop constraint if exists products_deposit_price_non_negative;
alter table products
  add constraint products_deposit_price_non_negative
    check (deposit_price is null or deposit_price >= 0);
