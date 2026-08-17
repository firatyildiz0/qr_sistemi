-- Migration: ürünlere barkod (etiket) numarası.
--
-- Satıcı ürünlerini rafta kendi numarasıyla tanıyor ("001", "002", "A-14").
-- Numara QR etiketinin üstüne, ürün adının altına basılıyor; yani etikete
-- bakan kişi ürünü okutmadan da hangi kayıt olduğunu görebiliyor.
--
-- Opsiyonel: girilmediğinde null kalır ve etikette o satır hiç çıkmaz.

alter table products
  add column if not exists barcode text;

-- Boş metin null'dan ayrı bir "değer" gibi davranır ve aşağıdaki tekillik
-- kontrolüne takılırdı; uygulama zaten boşu null'a çeviriyor, kontrol de aynı
-- şeyi veritabanı tarafında garantiliyor. Uzunluk sınırı etikete sığması için.
alter table products
  drop constraint if exists products_barcode_shape;
alter table products
  add constraint products_barcode_shape
    check (barcode is null or barcode ~ '^[A-Za-z0-9][A-Za-z0-9._/-]{0,31}$');

-- Aynı satıcıda iki ürün aynı numarayı taşıyamaz: numaranın tek işi ürünü
-- ayırt etmek, tekrarlanırsa etiket yalan söyler. Farklı satıcılar birbirinden
-- bağımsız numaralandırır, o yüzden tekillik owner_id ile birlikte.
create unique index if not exists products_owner_barcode_key
  on products(owner_id, barcode)
  where barcode is not null;
