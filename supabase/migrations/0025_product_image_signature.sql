-- Migration: ürünün fotoğrafından çıkarılmış görsel parmak izini sakla.
--
-- Kamerayla ürün bulma özelliği, kadrajdaki kareyi satıcının katalog
-- fotoğraflarıyla karşılaştırıyor. Karşılaştırma tarayıcıda yapılıyor ama
-- fotoğrafların parmak izi her tarama açılışında yeniden hesaplanamaz:
-- hesaplamak için her ürünün görselini indirmek gerekir ve yüz ürünlük bir
-- katalogda bu, tarayıcının açılmasını saniyelere yayardı. Parmak izi bir kez
-- çıkarılıp buraya yazılıyor, sonraki açılışlar tek sorguyla hazır geliyor.
--
-- İçerik `[{ "url": ..., "hash": ..., "colors": [...] }]` biçiminde bir dizi:
-- ürünün iki fotoğrafı olabilir ve ikisi de eşleşmeye giriyor. `url` alanı
-- imzanın hangi fotoğraftan geldiğini söylüyor — satıcı fotoğrafı
-- değiştirdiğinde URL tutmayacağı için imza kendiliğinden geçersiz olur ve
-- yeniden hesaplanır.
--
-- Kolon `products` üzerinde, yani okuması da yazması da 0018'deki sahiplik
-- politikalarına tabi: satıcı yalnızca kendi ürünlerinin imzasını görür.

alter table products
  add column if not exists image_signature jsonb;

alter table products
  drop constraint if exists products_image_signature_is_array;
alter table products
  add constraint products_image_signature_is_array check (
    image_signature is null or jsonb_typeof(image_signature) = 'array'
  );
