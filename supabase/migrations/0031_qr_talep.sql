-- QR etiketten müşteri rezervasyon talebi
--
-- Müşteri ürünün etiketini okutup açılan sayfadan tarih seçiyor ve talep
-- bırakıyor. Talep Instagram talebiyle aynı tabloya, aynı kurallarla düşüyor:
-- takvimi kapatmıyor, satıcı onayladığında `approve_booking_request()` gerçek
-- rezervasyonu açıyor. Yeni olan iki şey var: talebin kaynağı ve müşterinin
-- sonucu görebildiği takip kodu.
--
-- Talebi bu migration açmıyor; uygulama sunucusu service role ile yazıyor
-- (bkz. app/product/[id]/talep.ts). Ziyaretçiye insert politikası açmak, hız
-- sınırını ve stok kontrolünü atlayabilen bir kapı açmak olurdu.

alter table booking_requests drop constraint if exists booking_requests_source_check;
alter table booking_requests add constraint booking_requests_source_check
  check (source in ('instagram', 'qr'));

-- Müşterinin takip sayfasının anahtarı. Tahmin edilemez olmalı: sayfa giriş
-- istemiyor, kodu bilen talebin durumunu görüyor. Instagram taleplerinde boş;
-- orada karar müşteriye mesajla gidiyor.
alter table booking_requests add column if not exists takip_kodu text;
create unique index if not exists booking_requests_takip_kodu_unique
  on booking_requests(takip_kodu) where takip_kodu is not null;

-- Takip sayfasının okuduğu tek şey.
--
-- `security definer`: tabloda ziyaretçiye select politikası yok ve olmamalı —
-- içinde müşterinin adı, telefonu, adresi var. Fonksiyon yalnızca durumu ve
-- müşterinin zaten bildiği talep ayrıntılarını döndürüyor; telefon ve adres
-- dönmüyor, kodu ele geçiren biri bunları göremesin.
create or replace function qr_talep_durumu(p_kod text)
returns table (
  status text,
  decision_note text,
  start_date date,
  end_date date,
  delivery_mode text,
  created_at timestamptz,
  decided_at timestamptz,
  urunler jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.status,
    r.decision_note,
    r.start_date,
    r.end_date,
    r.delivery_mode,
    r.created_at,
    r.decided_at,
    coalesce(
      (
        select jsonb_agg(jsonb_build_object('ad', p.name, 'adet', i.quantity, 'id', p.id) order by p.name)
        from booking_request_items i
        join products p on p.id = i.product_id
        where i.request_id = r.id
      ),
      '[]'::jsonb
    ) as urunler
  from booking_requests r
  where r.source = 'qr'
    and r.takip_kodu = p_kod
    and length(p_kod) >= 20;
$$;

revoke all on function qr_talep_durumu(text) from public;
grant execute on function qr_talep_durumu(text) to anon, authenticated;
