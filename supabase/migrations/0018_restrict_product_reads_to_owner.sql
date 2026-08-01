-- Ürün kataloğunu toptan indirilebilir olmaktan çıkarır.
--
-- `products_select_public` (`using (true)`) bütün ürünleri anon anahtara
-- açıyordu. Anahtar tarayıcıdaki pakette göründüğü için
--
--   curl "$URL/rest/v1/products?select=*" -H "apikey: $ANON_KEY"
--
-- her satıcının tüm ürünlerini, günlük fiyatlarını ve stok adetlerini tek
-- istekte döküyordu. Müşteri verisi değil ama ticari veri: rakip fiyat
-- listenizi ve envanterinizi kopyalayabilir.
--
-- Politika böyleydi çünkü QR'ı okutan müşteri hesapsız olarak ürün sayfasını
-- görebilmeli. Ama o müşterinin ihtiyacı olan tek şey *elindeki kimliğe ait*
-- ürün — bütün listeyi taramak değil. Ayrım burada: tabloya erişim sahibine
-- ait, ziyaretçi tek bir ürünü kimliğiyle aşağıdaki fonksiyondan alıyor.

-- ---------------------------------------------------------------------------
-- 1. Tablo okuması sahibine ait
-- ---------------------------------------------------------------------------
drop policy if exists "products_select_public" on products;

create policy "products_select_owner" on products
  for select to authenticated using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 2. Tek ürünün herkese açık görünümü
-- ---------------------------------------------------------------------------
-- Kimliği bilinen tek bir ürünü döndürür — liste döndürmez, arama yapmaz,
-- filtrelenemez. Enumerasyonu bitiren şey bu: geçerli bir UUID bilmeden hiçbir
-- şey alınamıyor, UUID de QR etiketinin üstünde zaten yazıyor.
--
-- `owner_id` bilinçli olarak dönmüyor. Uygulama sahipliği şöyle anlıyor: satır
-- tablodan geldiyse (yukarıdaki politika) bakan kişi sahibidir; buradan
-- geldiyse değildir. Yani sahiplik bilgisine hiç ihtiyaç kalmıyor.
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

revoke all on function product_public(uuid) from public;
grant execute on function product_public(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Not: diğer politikalar etkilenmiyor
-- ---------------------------------------------------------------------------
-- `bookings` ve `notifications` politikalarındaki `exists (select 1 from
-- products ...)` koşulları çalışmaya devam ediyor, çünkü hepsi ürünün *sahibi*
-- için değerlendiriliyor ve sahip kendi ürününü yukarıdaki politikayla zaten
-- görüyor. Stok trigger'ı (`enforce_booking_stock`) da rezervasyonu ekleyen
-- satıcının yetkisiyle çalıştığı için aynı sebeple sorunsuz.
--
-- Cron işi service role kullanıyor ve RLS'i tamamen atlıyor.
