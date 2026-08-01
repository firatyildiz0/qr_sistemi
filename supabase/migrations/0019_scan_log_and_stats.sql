-- QR okutma kaydı ve yönetim panelinin istatistikleri.
--
-- Bugüne kadar "bu QR kaç kez okutuldu" sorusunun cevabı hiçbir yerde yoktu:
-- ürün sayfası açılıyor, kapanıyor ve geriye iz kalmıyordu. Ürün ve rezervasyon
-- sayıları zaten `created_at` kolonlarında duruyor; eksik olan tek ölçü buydu.
--
-- Tablo bilinçli olarak kişisel veri tutmuyor. Ziyaretçiden saklanan tek şey
-- `visitor_hash`: IP + tarayıcı bilgisinin tek yönlü özeti, yalnızca aynı kişinin
-- sayfayı arka arkaya yenilemesini tek okutma saymak için. Ham IP, user-agent ya
-- da müşteri bilgisi buraya girmiyor — istatistik yeni bir sızıntı kaynağı olmasın.

create table if not exists product_scans (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  -- Ürünün o anki sahibi. `products` üzerinden de bulunabilirdi ama satıcı
  -- kırılımlı sorgular her seferinde join istemesin diye burada duruyor.
  owner_id uuid not null references auth.users(id) on delete cascade,
  -- Tekrarları elemek için kullanılan tek yönlü özet (bkz. lib/scans.ts).
  visitor_hash text,
  created_at timestamptz not null default now()
);

-- Panelin zaman kırılımlı sayımı, ürün bazlı sıralama ve tekrar kontrolü.
create index if not exists product_scans_created_at_idx
  on product_scans (created_at desc);
create index if not exists product_scans_product_id_idx
  on product_scans (product_id, created_at desc);
create index if not exists product_scans_owner_id_idx
  on product_scans (owner_id, created_at desc);
create index if not exists product_scans_visitor_idx
  on product_scans (product_id, visitor_hash, created_at desc);

alter table product_scans enable row level security;

-- Satıcı kendi ürünlerinin okutulmasını görebilir, superuser hepsini.
-- Yazma politikası yok: kayıt yalnızca aşağıdaki fonksiyondan geçiyor,
-- dolayısıyla kimse elle sayı şişiremiyor.
create policy "product_scans_select_owner" on product_scans
  for select to authenticated using (owner_id = (select auth.uid()));

create policy "product_scans_select_superuser" on product_scans
  for select to authenticated using (is_superuser());

-- ---------------------------------------------------------------------------
-- Okutmayı kaydetme
-- ---------------------------------------------------------------------------
-- Uygulama tabloya doğrudan yazmıyor, buradan geçiyor: `owner_id` ürünün
-- kendisinden okunuyor (istemciden gelen bir değere güvenilmiyor) ve aynı
-- ziyaretçinin 30 dakika içindeki tekrarları eleniyor. Sayfa yenilendiğinde ya
-- da müşteri geri tuşuyla döndüğünde sayaç ikinci kez artmasın.
--
-- Dönen değer: kayıt gerçekten eklendi mi.
create or replace function record_product_scan(
  p_product_id uuid,
  p_visitor_hash text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select owner_id into v_owner from products where id = p_product_id;

  -- Silinmiş ya da uydurma bir kimlik. Sessizce geçiyoruz: bu fonksiyon sayfa
  -- görüntülemenin yan işi, hata fırlatıp isteği bozmasının anlamı yok.
  if v_owner is null then
    return false;
  end if;

  if p_visitor_hash is not null and exists (
    select 1 from product_scans
    where product_id = p_product_id
      and visitor_hash = p_visitor_hash
      and created_at > now() - interval '30 minutes'
  ) then
    return false;
  end if;

  insert into product_scans (product_id, owner_id, visitor_hash)
  values (p_product_id, v_owner, p_visitor_hash);

  return true;
end;
$$;

-- Yalnızca sunucu tarafındaki service role çağırır. Supabase yeni fonksiyonları
-- varsayılan olarak anon ve authenticated rollerine de açtığı için yetkiler
-- burada tek tek geri alınıyor — aksi halde tarayıcıdaki anahtarla sayaç
-- şişirilebilirdi.
revoke all on function record_product_scan(uuid, text) from public;
revoke all on function record_product_scan(uuid, text) from anon;
revoke all on function record_product_scan(uuid, text) from authenticated;
grant execute on function record_product_scan(uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- Panelin zaman kırılımlı özeti
-- ---------------------------------------------------------------------------
-- Gün / hafta / ay kovalarında okutma, eklenen ürün ve oluşturulan rezervasyon
-- sayıları. Sayım veritabanında yapılıyor: satırları uygulamaya çekip orada
-- gruplamak hem supabase-js'in 1000 satır sınırına takılırdı hem de bir yıllık
-- okutma kaydını boşuna taşımak olurdu.
--
-- Kovalar Türkiye saatine göre kesiliyor — "bugün" satıcının günü, UTC'nin değil.
-- `security definer`, çünkü fonksiyon bütün satıcıların verisini topluyor;
-- yetkiyi aşağıdaki `is_superuser()` kontrolü veriyor.
create or replace function admin_stats_buckets(
  p_unit text,
  p_buckets integer
)
-- Dönen kolonlar bilerek `_count` ekiyle: PL/pgSQL çıkış parametrelerinin adı
-- sorgunun içindeki tablo ve kolon adlarıyla çakışırsa "ambiguous reference"
-- hatası veriyor, `products` ve `bookings` de tam olarak öyle adlar.
returns table (
  bucket_start timestamp,
  scan_count bigint,
  product_count bigint,
  booking_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_unit text := case when p_unit in ('day', 'week', 'month') then p_unit else 'day' end;
  v_n integer := greatest(1, least(coalesce(p_buckets, 14), 60));
  v_step interval := ('1 ' || v_unit)::interval;
  v_now timestamp := now() at time zone 'Europe/Istanbul';
  v_last timestamp;
  v_first timestamp;
begin
  if not is_superuser() then
    raise exception 'Bu veriye erişim yetkiniz yok.';
  end if;

  v_last := date_trunc(v_unit, v_now);
  v_first := v_last - (v_n - 1) * v_step;

  return query
  with span as (
    select generate_series(v_first, v_last, v_step) as b
  ),
  scan_counts as (
    select date_trunc(v_unit, s.created_at at time zone 'Europe/Istanbul') as b,
           count(*) as n
    from product_scans s
    where s.created_at >= (v_first at time zone 'Europe/Istanbul')
    group by 1
  ),
  product_counts as (
    select date_trunc(v_unit, p.created_at at time zone 'Europe/Istanbul') as b,
           count(*) as n
    from products p
    where p.created_at >= (v_first at time zone 'Europe/Istanbul')
    group by 1
  ),
  booking_counts as (
    -- Satır başına bir ürün: üç adetlik bir rezervasyon üç satır, dolayısıyla
    -- bu sayı "kaç ürün rezerve edildi" sorusunun cevabı. İptal edilenler de
    -- burada — sayılan şey o an yapılan işlem, kaydın bugünkü durumu değil.
    select date_trunc(v_unit, k.created_at at time zone 'Europe/Istanbul') as b,
           count(*) as n
    from bookings k
    where k.created_at >= (v_first at time zone 'Europe/Istanbul')
    group by 1
  )
  select
    span.b,
    coalesce(scan_counts.n, 0),
    coalesce(product_counts.n, 0),
    coalesce(booking_counts.n, 0)
  from span
  left join scan_counts on scan_counts.b = span.b
  left join product_counts on product_counts.b = span.b
  left join booking_counts on booking_counts.b = span.b
  order by span.b;
end;
$$;

revoke all on function admin_stats_buckets(text, integer) from public;
revoke all on function admin_stats_buckets(text, integer) from anon;
grant execute on function admin_stats_buckets(text, integer) to authenticated;

-- En çok okutulan ürünler. Yukarıdakiyle aynı yetki gerekçesi; satıcının
-- kullanıcı adı listede duruyor çünkü panelin sahibi hangi satıcının etiketinin
-- çalıştığını görmek istiyor.
--
-- Dönem, grafikle aynı parametrelerden hesaplanıyor (hazır bir tarih almak
-- yerine): iki liste aynı aralığı göstersin ve saat dilimi çevrimi tek yerde
-- kalsın.
create or replace function admin_top_scanned_products(
  p_unit text,
  p_buckets integer,
  p_limit integer
)
returns table (
  scanned_product_id uuid,
  scanned_product_name text,
  owner_username text,
  scan_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_unit text := case when p_unit in ('day', 'week', 'month') then p_unit else 'day' end;
  v_n integer := greatest(1, least(coalesce(p_buckets, 14), 60));
  v_first timestamp;
begin
  if not is_superuser() then
    raise exception 'Bu veriye erişim yetkiniz yok.';
  end if;

  v_first := date_trunc(v_unit, (now() at time zone 'Europe/Istanbul'))
    - (v_n - 1) * (('1 ' || v_unit)::interval);

  return query
  select
    p.id,
    p.name,
    coalesce(pr.username, '—'),
    count(s.id)
  from product_scans s
  join products p on p.id = s.product_id
  left join profiles pr on pr.id = p.owner_id
  where s.created_at >= (v_first at time zone 'Europe/Istanbul')
  group by p.id, p.name, pr.username
  order by count(s.id) desc, p.name
  limit greatest(1, least(coalesce(p_limit, 5), 20));
end;
$$;

revoke all on function admin_top_scanned_products(text, integer, integer) from public;
revoke all on function admin_top_scanned_products(text, integer, integer) from anon;
grant execute on function admin_top_scanned_products(text, integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Eski kayıtları budama
-- ---------------------------------------------------------------------------
-- Okutma kaydı sayfa görüntüleme başına bir satır alıyor; sınırsız büyümesin.
-- Sınır 400 gün: panelin en uzun görünümü son 12 ay, o yüzden bir yıl artı
-- yedek pay. Bildirim cron'u her sabah çağırıyor (bkz. api/cron/notifications).
create or replace function prune_product_scans()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from product_scans where created_at < now() - interval '400 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function prune_product_scans() from public;
revoke all on function prune_product_scans() from anon;
revoke all on function prune_product_scans() from authenticated;
grant execute on function prune_product_scans() to service_role;
