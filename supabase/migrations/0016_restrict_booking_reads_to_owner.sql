-- Müşteri verilerini herkese açık olmaktan çıkarır.
--
-- `bookings_select_public` (`using (true)`) tablonun tamamını anon anahtara
-- açıyordu. O anahtar tarayıcıdaki paketin içinde, yani gizli değil: tek bir
--
--   curl "$URL/rest/v1/bookings?select=*" -H "apikey: $ANON_KEY"
--
-- isteği bütün müşterilerin adını, telefonunu, açık adresini, kiralama
-- tarihlerini ve teminatını döküyordu. Kimlik doğrulama da iz de yoktu.
--
-- Politika baştan böyle yazılmıştı çünkü herkese açık ürün sayfası müsaitlik
-- takvimini `bookings`'ten besliyor. Ama takvimin bilmesi gereken tek şey hangi
-- günlerin dolu olduğu; müşterinin kim olduğu değil. Bu migration ikisini
-- ayırıyor: tablo satıcıya kapanıyor, takvim aşağıdaki fonksiyondan besleniyor.

-- ---------------------------------------------------------------------------
-- 1. Sahiplik yardımcısı
-- ---------------------------------------------------------------------------
-- `security definer`: politikanın içinden `products` sorgulanınca o tablonun
-- kendi RLS'i de devreye girer. Bugün `products` herkese açık olduğu için sorun
-- çıkmıyor, ama ürün okuması da kısıtlandığında iç içe geçmiş iki politika
-- birbirini kilitlerdi. Definer olarak çalışan fonksiyon o bağı kesiyor.
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

-- ---------------------------------------------------------------------------
-- 2. Okuma artık ürün sahibine ait
-- ---------------------------------------------------------------------------
drop policy if exists "bookings_select_public" on bookings;
-- Yenisi de düşürülüyor: dosya tekrar çalıştırılabilsin.
drop policy if exists "bookings_select_owner" on bookings;

create policy "bookings_select_owner" on bookings
  for select to authenticated using (owns_product(product_id));

-- ---------------------------------------------------------------------------
-- 3. Herkese açık müsaitlik: tarih var, müşteri yok
-- ---------------------------------------------------------------------------
-- QR'ı okutan müşteri hangi günlerin dolu olduğunu görmeye devam etsin diye.
-- Dönen satırlarda ad, telefon, adres, teminat ya da rezervasyon kimliği yok —
-- yalnızca takvimin saydığı tarihler.
--
-- `delivery_mode` burada çözülüyor: kolon eklenmeden önce oluşmuş kayıtlarda
-- null ve uygulama onu müşterinin ilinden türetiyor. O ili dışarı vermemek için
-- aynı kural (Bursa → elden) fonksiyonun içinde uygulanıyor; sonuç aynı, şehir
-- fonksiyondan çıkmıyor.
--
-- `security definer`: çağıran anon, oysa okunan tablo artık ona kapalı.
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

-- Fonksiyon `security definer` olduğu için yetkileri açıkça veriliyor:
-- varsayılan `public` grubu alınıp yerine yalnızca gerçekten çağıracak iki rol
-- konuyor.
revoke all on function product_availability(uuid) from public;
grant execute on function product_availability(uuid) to anon, authenticated;

revoke all on function owns_product(uuid) from public;
grant execute on function owns_product(uuid) to authenticated;
