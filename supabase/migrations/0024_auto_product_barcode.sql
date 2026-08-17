-- Migration: barkod numarasını sistem üretsin.
--
-- 0022 alanı açtı ama doldurmayı satıcıya bıraktı; pratikte her ürünün bir
-- numarası olması gerekiyor ve numarayı elle uydurmak (hangi numaraya kadar
-- geldim?) satıcının işi değil. Artık numara boş bırakılırsa veritabanı
-- üretiyor: hem yeni ürünlerde, hem de bu dosyanın sonundaki geriye dönük
-- doldurmayla eski ürünlerde.
--
-- Numara sırayla değil rastgele veriliyor. Sıra numarası (001, 002, ...) tek
-- kullanıcıda güzel görünür ama eş zamanlı iki eklemede aynı sayıya oturur ve
-- "kaçıncı üründeyim" bilgisini de dışarı sızdırır; rastgele numara ikisinden
-- de muaf. Altı hane, 900.000 olasılık: birkaç bin ürünlük bir katalogda bile
-- çakışma pratikte görülmez, görülürse de aşağıdaki döngü yenisini seçer.

-- ---------------------------------------------------------------------------
-- 1. Numarayı ayıran fonksiyon
-- ---------------------------------------------------------------------------
-- Tekillik satıcı başına (bkz. 0022 `products_owner_barcode_key`), o yüzden
-- arama da satıcı başına. `p_exclude` güncellenen satırın kendisi: kendi
-- numarasıyla çakışıyor sayılmamalı.
create or replace function allocate_product_barcode(p_owner uuid, p_exclude uuid)
returns text
language plpgsql
as $$
declare
  candidate text;
  tries int := 0;
begin
  loop
    -- İlk hane 1-9: baştaki sıfır etiketten Excel'e taşınırken kayboluyor ve
    -- "012" ile "12" aynı numara sanılıyor.
    candidate := (floor(random() * 9 + 1)::int)::text
              || lpad(floor(random() * 100000)::int::text, 5, '0');

    exit when not exists (
      select 1
      from products p
      where p.owner_id = p_owner
        and p.barcode = candidate
        and (p_exclude is null or p.id <> p_exclude)
    );

    tries := tries + 1;
    -- 50 denemenin hepsinin dolu numaraya düşmesi, alan dolmadan mümkün değil.
    -- Buraya düşülüyorsa sessizce denemeye devam etmek yanlış olur.
    if tries >= 50 then
      raise exception 'Barkod numarası üretilemedi (satıcı %).', p_owner;
    end if;
  end loop;

  return candidate;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Boş bırakılan numarayı dolduran trigger
-- ---------------------------------------------------------------------------
-- Kapı uygulamada değil burada: numarası olmayan ürün, hangi yoldan
-- eklenirse eklensin (panel, içe aktarma, elle SQL) oluşamıyor. Satıcı kendi
-- numarasını yazdığında ona dokunulmuyor.
create or replace function assign_product_barcode()
returns trigger
language plpgsql
as $$
begin
  if new.barcode is null then
    new.barcode := allocate_product_barcode(new.owner_id, new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists products_assign_barcode on products;
create trigger products_assign_barcode
  before insert or update on products
  for each row
  execute function assign_product_barcode();

-- ---------------------------------------------------------------------------
-- 3. Eski ürünler
-- ---------------------------------------------------------------------------
-- Satır satır ve ayrı ayrı UPDATE'lerle: tek bir toplu UPDATE'in alt sorgusu
-- deyim başlangıcındaki anlık görüntüyü görür, yani aynı deyimde biraz önce
-- verilmiş numarayı görmez ve aynı satıcının iki ürünü aynı numarayı alabilir.
-- Ayrı deyimler birbirinin sonucunu gördüğü için bu döngü ondan muaf.
do $$
declare
  urun record;
begin
  for urun in select id, owner_id from products where barcode is null loop
    update products
      set barcode = allocate_product_barcode(urun.owner_id, urun.id)
      where id = urun.id;
  end loop;
end;
$$;
