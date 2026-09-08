-- Instagram üzerinden müşteri rezervasyon talebi
--
-- Müşteri artık rezervasyonu kendisi başlatabiliyor ama panelden değil,
-- satıcının Instagram hesabına attığı mesajdan. Mesajlaşma bir *talep*
-- üretiyor; takvimi kapatan gerçek rezervasyon ancak satıcı onayladığında
-- açılıyor.
--
-- Neden talep ayrı bir tablo:
--
-- Onay beklerken `bookings` tablosuna satır yazsaydık takvim, stok trigger'ı ve
-- panelin bütün listeleri o satırı gerçek rezervasyon sayardı — satıcı henüz
-- "olur" dememişken ürün kapanırdı. Talep kendi tablosunda duruyor, hiçbir gün
-- kapatmıyor; onay anında `approve_booking_request()` satırları tek işlemde
-- açıyor ve stok kontrolünü yine `bookings_enforce_stock` yapıyor. Yani iki
-- kaynak yok: müsaitliğin tek sahibi hâlâ `bookings`.

-- ---------------------------------------------------------------------------
-- Bağlı Instagram hesabı
-- ---------------------------------------------------------------------------
-- Satır başına bir satıcı: her satıcı kendi işletme hesabını bağlıyor, gelen
-- webhook `ig_user_id` üzerinden satıcıya çözülüyor.
--
-- `access_token` bu tablonun neden hiç select politikası olmadığının sebebi:
-- token satıcı adına mesaj göndermeye yeter, dolayısıyla tarayıcıya asla
-- çıkmamalı. Panel bağlantı durumunu aşağıdaki `instagram_account_status()`
-- fonksiyonundan okuyor; yazma yalnızca sunucudaki service role'den geçiyor.
create table if not exists instagram_accounts (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  -- Webhook gövdesindeki `entry[].id`. Hesap tek bir satıcıya bağlanabilir.
  ig_user_id text not null unique,
  username text,
  access_token text not null,
  -- Uzun ömürlü token 60 gün yaşıyor; günlük cron son 10 güne girenleri
  -- yeniliyor, o yüzden bitiş tarihi saklanıyor.
  token_expires_at timestamptz,
  is_active boolean not null default true,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Konuşma durumu
-- ---------------------------------------------------------------------------
-- Mesajlaşma adım adım ilerliyor (kod → tarih → ad → telefon → il/ilçe → onay)
-- ve her adım bir önceki cevabı hatırlamak zorunda. Durum burada duruyor.
--
-- `updated_at` yalnızca bilgi değil: webhook aynı anda iki mesaj teslim
-- edebiliyor ve ikisi de aynı satırı yazacak. Uygulama satırı okuduğu andaki
-- `updated_at` ile güncelliyor (compare-and-swap), eşleşmezse durumu yeniden
-- okuyup tekrar deniyor. Böylece geç kalan bir mesaj öncekinin cevabını ezmiyor.
create table if not exists instagram_threads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  ig_user_id text not null,
  -- Müşterinin Instagram kimliği (IGSID). Cevap buraya gidiyor.
  sender_id text not null,
  state text not null default 'kod',
  -- Yarım kalan talebin alanları: ürünler, tarihler, ad, telefon, adres.
  draft jsonb not null default '{}'::jsonb,
  last_message_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (ig_user_id, sender_id)
);

create index if not exists instagram_threads_owner_idx
  on instagram_threads(owner_id, last_message_at desc);

-- Meta aynı olayı teslim edilemedi sayıp tekrar gönderebiliyor. Mesaj kimliği
-- (`mid`) burada birincil anahtar: ikinci teslimat çakışıyor ve sessizce
-- düşüyor, yani müşteri aynı cevabı iki kez almıyor, talep iki kez açılmıyor.
create table if not exists instagram_events (
  mid text primary key,
  received_at timestamptz not null default now()
);

create index if not exists instagram_events_received_idx
  on instagram_events(received_at);

-- ---------------------------------------------------------------------------
-- Rezervasyon talebi
-- ---------------------------------------------------------------------------
-- Alanlar `bookings` ile aynı isimleri taşıyor: onay anında satırlar
-- birebir kopyalanıyor, aradan çeviri geçmiyor.
--
-- `blocked_start`/`blocked_end` talep açılırken hesaplanıyor ki satıcı panelde
-- ürünün gerçekte kaç gün kapanacağını onaydan *önce* görebilsin.
create table if not exists booking_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  source text not null default 'instagram' check (source in ('instagram')),
  thread_id uuid references instagram_threads(id) on delete set null,
  -- Kararın müşteriye geri yazılabilmesi için; thread silinse de duruyor.
  sender_id text,
  customer_name text not null,
  customer_phone text,
  customer_city text not null,
  customer_district text not null,
  customer_address text,
  start_date date not null,
  end_date date not null,
  delivery_mode text not null check (delivery_mode in ('kargo', 'elden')),
  blocked_start date not null,
  blocked_end date not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'expired')),
  -- Satıcının reddederken yazdığı not; müşteriye aynen iletiliyor.
  decision_note text,
  -- Onaydan doğan rezervasyon grubu. Panel talebi rezervasyona bağlayabilsin
  -- diye saklanıyor.
  group_id uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  constraint booking_requests_date_range check (end_date >= start_date),
  constraint booking_requests_blocked_range check (
    blocked_end >= blocked_start
    and blocked_start <= start_date
    and blocked_end >= end_date
  )
);

create index if not exists booking_requests_owner_idx
  on booking_requests(owner_id, status, created_at desc);
create index if not exists booking_requests_thread_idx
  on booking_requests(thread_id);

-- Talebin kalemleri. `bookings`ten farklı olarak adet ayrı bir kolon: talep
-- henüz ünite tüketmiyor, satır çoğaltmanın anlamı yok. Onay anında adet kadar
-- `bookings` satırına açılıyor.
create table if not exists booking_request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references booking_requests(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  quantity integer not null,
  constraint booking_request_items_quantity check (quantity between 1 and 20),
  unique (request_id, product_id)
);

create index if not exists booking_request_items_request_idx
  on booking_request_items(request_id);

-- ---------------------------------------------------------------------------
-- Bildirimler artık iki türlü
-- ---------------------------------------------------------------------------
-- Şimdiye kadar tek bildirim vardı: "yarın iade". Talep bildiriminin ise tek
-- bir ürünü yok (toplu talep birden çok ürün taşıyabiliyor) ve rezervasyonu da
-- yok — henüz açılmadı. O yüzden `booking_id` ve `product_id` isteğe bağlı
-- hale geliyor, sahiplik de artık satır üstünde duruyor.
alter table notifications add column if not exists kind text not null default 'iade';
alter table notifications add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table notifications add column if not exists request_id uuid references booking_requests(id) on delete cascade;

alter table notifications alter column booking_id drop not null;
alter table notifications alter column product_id drop not null;

-- Mevcut satırların sahibi ürününden okunuyor; sonrasında kolon zorunlu.
update notifications n
set owner_id = p.owner_id
from products p
where p.id = n.product_id and n.owner_id is null;

delete from notifications where owner_id is null;

alter table notifications alter column owner_id set not null;

alter table notifications drop constraint if exists notifications_kind_check;
alter table notifications add constraint notifications_kind_check
  check (kind in ('iade', 'talep'));

create index if not exists notifications_owner_idx
  on notifications(owner_id, is_read, created_at desc);

-- Cron tekrar çalışırsa iade hatırlatması bir kez kalsın; talep bildirimi de
-- talep başına bir tane. İkisi de kısmi: artık null olabilen kolonlar.
drop index if exists notifications_booking_id_unique;
create unique index if not exists notifications_booking_id_unique
  on notifications(booking_id) where booking_id is not null;
create unique index if not exists notifications_request_id_unique
  on notifications(request_id) where request_id is not null;

-- Politikalar ürün üzerinden değil doğrudan sahiplik kolonundan okuyor: ürünü
-- olmayan bildirim (talep) de aynı kapıdan geçsin diye.
drop policy if exists "notifications_select_owner" on notifications;
drop policy if exists "notifications_update_owner" on notifications;

create policy "notifications_select_owner" on notifications
  for select to authenticated using (owner_id = (select auth.uid()));

create policy "notifications_update_owner" on notifications
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Onay ve ret
-- ---------------------------------------------------------------------------
-- Onay tek işlem: ya talebin bütün kalemleri açılır ya hiçbiri. Araya giren
-- başka bir rezervasyon son üniteyi almışsa `bookings_enforce_stock` hata
-- fırlatıyor, işlem geri sarılıyor ve talep `pending` kalıyor — yani satıcı
-- "onayladım" görüp de rezervasyonun açılmadığı bir durum oluşamıyor.
--
-- `security definer`: satırları fonksiyon açıyor, dolayısıyla `bookings`
-- politikaları devrede değil. Yetkiyi baştaki iki kontrol veriyor (talebin
-- sahibi ve onaylı hesap) ve her ürünün yine aynı satıcıya ait olduğu tek tek
-- doğrulanıyor. Fonksiyon hiçbir kapıyı atlamıyor, yalnızca sırayı sabitliyor.
create or replace function approve_booking_request(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request booking_requests;
  v_item record;
  v_group uuid := gen_random_uuid();
  v_owner uuid := auth.uid();
begin
  if v_owner is null or not is_approved() then
    raise exception 'Bu işlem için yetkiniz yok.';
  end if;

  -- `for update`: aynı talebi iki sekmeden onaylamak iki rezervasyon açmasın.
  select * into v_request
  from booking_requests
  where id = p_request_id
  for update;

  if v_request.id is null then
    raise exception 'Talep bulunamadı.';
  end if;

  if v_request.owner_id <> v_owner then
    raise exception 'Bu talebi onaylama yetkiniz yok.';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Bu talep zaten sonuçlandırılmış.';
  end if;

  if not exists (select 1 from booking_request_items where request_id = p_request_id) then
    raise exception 'Talepte ürün yok.';
  end if;

  for v_item in
    select i.product_id, i.quantity, p.owner_id as product_owner, p.name
    from booking_request_items i
    join products p on p.id = i.product_id
    where i.request_id = p_request_id
    order by p.name
  loop
    if v_item.product_owner <> v_owner then
      raise exception 'Talepteki ürünlerden biri size ait değil.';
    end if;

    -- Adet kadar ayrı satır, tek tek: aynı komutta eklenen satırlar birbirini
    -- göremediği için stok trigger'ı ikinci adedi ilkinden habersiz onaylardı
    -- (bkz. `create_booking_group`).
    for i in 1..v_item.quantity loop
      insert into bookings (
        group_id, product_id,
        customer_name, customer_phone,
        customer_city, customer_district, customer_address,
        start_date, end_date, delivery_mode,
        blocked_start, blocked_end
      ) values (
        v_group, v_item.product_id,
        v_request.customer_name, v_request.customer_phone,
        v_request.customer_city, v_request.customer_district, v_request.customer_address,
        v_request.start_date, v_request.end_date, v_request.delivery_mode,
        v_request.blocked_start, v_request.blocked_end
      );
    end loop;
  end loop;

  update booking_requests
  set status = 'approved', group_id = v_group, decided_at = now()
  where id = p_request_id;

  -- Talep sonuçlandı; bildirimi de listede bekletmenin anlamı yok.
  update notifications set is_read = true where request_id = p_request_id;

  return v_group;
end;
$$;

create or replace function reject_booking_request(p_request_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_updated integer;
begin
  if v_owner is null or not is_approved() then
    raise exception 'Bu işlem için yetkiniz yok.';
  end if;

  update booking_requests
  set status = 'rejected',
      decision_note = nullif(btrim(coalesce(p_note, '')), ''),
      decided_at = now()
  where id = p_request_id
    and owner_id = v_owner
    and status = 'pending';

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    raise exception 'Talep bulunamadı ya da zaten sonuçlandırılmış.';
  end if;

  update notifications set is_read = true where request_id = p_request_id;
end;
$$;

-- Başlangıç tarihi geçmiş talepler artık cevaplanamaz; günlük cron kapatıyor.
create or replace function expire_booking_requests()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expired integer;
begin
  update booking_requests
  set status = 'expired', decided_at = now()
  where status = 'pending'
    and start_date < (now() at time zone 'Europe/Istanbul')::date;

  get diagnostics v_expired = row_count;

  update notifications
  set is_read = true
  where request_id in (
    select id from booking_requests where status = 'expired'
  ) and is_read = false;

  return v_expired;
end;
$$;

-- Tekrar teslimatı yakalamak için birkaç gün yetiyor; tablo boşuna büyümesin.
create or replace function prune_instagram_events()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from instagram_events where received_at < now() - interval '7 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

-- Panelin gördüğü bağlantı durumu. Tablo doğrudan okunamıyor (token orada),
-- bu fonksiyon token dışındaki alanları döndürüyor.
create or replace function instagram_account_status()
returns table (
  username text,
  ig_user_id text,
  is_active boolean,
  token_expires_at timestamptz,
  connected_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select a.username, a.ig_user_id, a.is_active, a.token_expires_at, a.connected_at
  from instagram_accounts a
  where a.owner_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table instagram_accounts enable row level security;
alter table instagram_threads enable row level security;
alter table instagram_events enable row level security;
alter table booking_requests enable row level security;
alter table booking_request_items enable row level security;

-- instagram_accounts / instagram_threads / instagram_events: hiçbir politika
-- yok, yani `authenticated` tek satır bile göremiyor. Hepsine yalnızca
-- sunucudaki service role (webhook ve OAuth ucu) dokunuyor; panel bağlantı
-- durumunu `instagram_account_status()` üzerinden okuyor.

-- Talepleri satıcı görür. Yazma politikası yok: talebi webhook (service role)
-- açıyor, kararı da yukarıdaki iki fonksiyon veriyor. Böylece satıcı kendine
-- talep uyduramıyor ve bir başkasının talebini sonuçlandıramıyor.
create policy "booking_requests_select_owner" on booking_requests
  for select to authenticated using (owner_id = (select auth.uid()));

create policy "booking_request_items_select_owner" on booking_request_items
  for select to authenticated using (
    exists (
      select 1 from booking_requests r
      where r.id = booking_request_items.request_id
        and r.owner_id = (select auth.uid())
    )
  );

-- Yetkiler: karar fonksiyonlarını panel çağırıyor (yetkiyi içerideki sahiplik
-- kontrolü veriyor), bakım işleri yalnızca cron'un service role'ünden.
revoke all on function approve_booking_request(uuid) from public, anon;
grant execute on function approve_booking_request(uuid) to authenticated;

revoke all on function reject_booking_request(uuid, text) from public, anon;
grant execute on function reject_booking_request(uuid, text) to authenticated;

revoke all on function instagram_account_status() from public, anon;
grant execute on function instagram_account_status() to authenticated;

revoke all on function expire_booking_requests() from public, anon, authenticated;
grant execute on function expire_booking_requests() to service_role;

revoke all on function prune_instagram_events() from public, anon, authenticated;
grant execute on function prune_instagram_events() to service_role;
