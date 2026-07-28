-- Migration: rezervasyona teslimat adresi alanları.
--
-- İl ve ilçe uygulamadaki sabit listeden seçilir, açık adres serbest metindir.
-- Üçü de nullable: mevcut rezervasyonların adresi yok ve yeni kayıtlarda da
-- alan opsiyonel. Doğrulama (ilçenin gerçekten o ile ait olması) sunucu
-- action'ında yapılır — burada bir referans tablosu tutmuyoruz, çünkü liste
-- uygulamayla birlikte sürümleniyor.

alter table bookings add column if not exists customer_city text;
alter table bookings add column if not exists customer_district text;
alter table bookings add column if not exists customer_address text;
