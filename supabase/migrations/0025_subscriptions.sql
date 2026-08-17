-- Migration: aylık abonelik (premium üyelik).
--
-- Onay (`is_approved`) "bu hesap gerçek mi" sorusunu yanıtlıyordu; abonelik
-- "bu hesap ödemesini yaptı mı" sorusunu ekliyor. İkisi ayrı tutuluyor çünkü
-- ayrı sebeplerle kapanıyorlar: reddedilen hesap geri dönmez, ödemesi geciken
-- hesap ödeyince yerinden devam eder.
--
-- Kural: abonesi olmayan satıcı **yazamaz** — ürün eklemez, rezervasyon
-- açmaz, ayar değiştirmez. Ama **okur**: verisi duruyor, panelde görüyor,
-- ödediği anda kaldığı yerden devam ediyor. Verisini rehin almıyoruz.
--
-- Kapı yine RLS'te, uygulamada değil. Arayüzdeki yönlendirme yalnızca
-- kullanıcıyı ödeme ekranına götürüyor; abonesi bitmiş biri doğrudan Supabase
-- API'sine token alıp istek atsa da bu politikalar onu durduruyor.

-- ---------------------------------------------------------------------------
-- Tablo
-- ---------------------------------------------------------------------------
-- Satıcı başına tek satır: `owner_id` hem birincil anahtar hem yabancı anahtar.
-- Abonelik geçmişi (hangi ay ne ödendi) iyzico'da duruyor, burada yalnızca
-- "şu an erişimi var mı" sorusunu yanıtlayacak kadarı tutuluyor.
create table if not exists subscriptions (
  owner_id uuid primary key references auth.users(id) on delete cascade,

  -- trialing : deneme sürüyor, kart istenmedi
  -- active   : ödeme alındı, dönem sonuna kadar erişim var
  -- past_due : yenileme başarısız — erişim ödenmiş dönemin sonuna kadar sürer
  -- canceled : kullanıcı iptal etti; dönem sonuna kadar erişim yine sürer
  -- expired  : dönem de bitti, erişim yok
  -- lifetime : ödeme beklenmiyor (kurucu, demo, muaf hesaplar)
  status text not null default 'trialing'
    check (status in ('trialing', 'active', 'past_due', 'canceled', 'expired', 'lifetime')),

  -- Denemenin bittiği an. Deneme kartsız olduğu için iyzico'nun
  -- `trialPeriodDays` alanı kullanılmıyor — süreyi biz tutuyoruz.
  trial_ends_at timestamptz,

  -- Ödenmiş dönemin bittiği an. Erişimin asıl ölçütü bu: iptal de, ödeme
  -- hatası da bu tarihi geriye çekmiyor, çünkü o dönemin parası alınmış.
  current_period_end timestamptz,

  -- Tahsil edilen aylık tutar (TL). Fiyat sonradan değişse bile mevcut
  -- abonenin ne ödediği kaydında kalsın.
  price_try numeric(10, 2),

  -- iyzico tarafındaki karşılıklar. Webhook ve iptal bunlarla eşleşiyor.
  iyzico_subscription_ref text unique,
  iyzico_customer_ref text,
  iyzico_plan_ref text,

  -- Başlatılan ama henüz tamamlanmamış ödeme formunun token'ı.
  --
  -- Ödeme bitince iyzico tarayıcıyı `callbackUrl`'imize yönlendiriyor, fakat o
  -- isteğin gövdesi "bu hangi hesap" sorusunu güvenli biçimde yanıtlamıyor —
  -- aynı adrese elle istek atılabilir. Token form başlatılırken buraya
  -- yazılıyor, geri dönüşte satır *token ile* bulunuyor. Böylece bir kullanıcı
  -- başkasının aboneliğini açtırabileceği bir yol kalmıyor.
  pending_checkout_token text unique,

  -- Son webhook'un izi. Bir yenileme neden düştü sorusunun yanıtı destek
  -- ekranında lazım oluyor; iyzico panelini açmadan görülsün.
  last_event_at timestamptz,
  last_failure_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Deneme durumundaysa bitiş tarihi olmak zorunda, yoksa `has_subscription`
  -- sessizce false döner ve kullanıcı sebepsiz kilitlenirdi.
  constraint subscriptions_trial_needs_date
    check (status <> 'trialing' or trial_ends_at is not null)
);

-- Süresi dolanları tarayan işler (aşağıdaki `expire_subscriptions`) durum ve
-- tarih üzerinden gidiyor.
create index if not exists subscriptions_status_idx on subscriptions(status);
create index if not exists subscriptions_period_end_idx
  on subscriptions(current_period_end);

-- ---------------------------------------------------------------------------
-- Erişim fonksiyonları
-- ---------------------------------------------------------------------------

-- `is_approved()` ile aynı gerekçeyle `security definer` ve parametresiz:
-- politikanın içinden çağrıldığı için RLS'i atlaması gerekiyor, ve parametre
-- almadığı için kimse başkasının abonelik durumunu sorgulayamıyor.
create or replace function has_subscription()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from subscriptions s
    where s.owner_id = auth.uid()
      and (
        s.status = 'lifetime'
        -- Deneme: tarihine bakılıyor, durum kendiliğinden değişmese de süre
        -- dolduğu an erişim kapanıyor.
        or (s.status = 'trialing' and s.trial_ends_at > now())
        -- Ödenmiş dönem: iptal edilmiş ya da yenilemesi düşmüş olsa bile
        -- parası alınan günler kullanıcının hakkı.
        or (s.status in ('active', 'past_due', 'canceled')
            and s.current_period_end is not null
            and s.current_period_end > now())
      )
  );
$$;

-- Yazma izninin tek kapısı. Politikalar artık `is_approved()` yerine bunu
-- çağırıyor, böylece iki koşul tek yerde birleşiyor ve ileride üçüncü bir
-- koşul eklenirse yine tek yer değişiyor.
--
-- Superuser muaf: paneli yöneten hesap kendi ürününü satmıyor, ondan abonelik
-- beklemek anlamsız olurdu.
create or replace function can_write()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select is_approved() and (is_superuser() or has_subscription());
$$;

-- ---------------------------------------------------------------------------
-- Deneme, onayla birlikte başlar
-- ---------------------------------------------------------------------------
-- Tetikleyici tabloda, uygulamada değil: onay `/yonetim`'den bir `profiles`
-- update'i ile veriliyor ve ileride başka bir yerden de verilebilir. Denemeyi
-- veritabanına bağlamak, onayın hangi yoldan geldiğinden bağımsız kılıyor.
create or replace function start_trial_on_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Onaylı bir satıcı değilse yapacak bir şey yok.
  if new.status <> 'approved' or new.role <> 'seller' then
    return new;
  end if;

  -- Yalnızca onaya *geçiş* anında: zaten onaylı bir satırın başka bir alanı
  -- güncellendiğinde deneme yeniden başlamasın.
  --
  -- `old`'a yalnızca UPDATE dalında dokunuluyor, iç içe `if` ile. Tek bir
  -- birleşik koşulda (`tg_op = 'INSERT' or old.status <> ...`) yazılsaydı
  -- güvenli olmazdı: PL/pgSQL boole ifadesini SQL çalıştırıcısına veriyor ve
  -- kısa devre garantisi yok, INSERT tetiklenmesinde `old` ise atanmamış.
  if tg_op = 'UPDATE' then
    if old.status = 'approved' then
      return new;
    end if;
  end if;

  insert into subscriptions (owner_id, status, trial_ends_at, price_try)
  values (new.id, 'trialing', now() + interval '14 days', 999.00)
  -- Reddedilip sonra yeniden onaylanan hesap ikinci bir deneme kazanmasın.
  on conflict (owner_id) do nothing;

  return new;
end;
$$;

drop trigger if exists profiles_start_trial on profiles;

create trigger profiles_start_trial
  after insert or update of status on profiles
  for each row
  execute function start_trial_on_approval();

-- `updated_at` elle yazılmasın: webhook'un dokunduğu her satırda kendiliğinden
-- ilerlesin.
create or replace function touch_subscription()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists subscriptions_touch on subscriptions;

create trigger subscriptions_touch
  before update on subscriptions
  for each row
  execute function touch_subscription();

-- ---------------------------------------------------------------------------
-- Süresi dolanları işaretle
-- ---------------------------------------------------------------------------
-- `has_subscription()` zaten tarihe bakıyor, yani erişim bu iş çalışmasa da
-- doğru kapanıyor. Bu yalnızca durumu okunur kılıyor: `/yonetim`'deki liste
-- "deneme sürüyor" yazmasın, geciken tahsilat gözle görülsün. Günlük cron
-- (`/api/cron/notifications` ile aynı iş) çağırıyor.
create or replace function expire_subscriptions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update subscriptions
  set status = 'expired'
  where status in ('trialing', 'past_due', 'canceled')
    and coalesce(current_period_end, trial_ends_at) < now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Politikalar
-- ---------------------------------------------------------------------------

alter table subscriptions enable row level security;

-- Satıcı kendi satırını görür: ödeme ekranı "denemeniz 3 gün sonra bitiyor"
-- diyebilsin.
drop policy if exists "subscriptions_select_own" on subscriptions;

create policy "subscriptions_select_own" on subscriptions
  for select to authenticated using (owner_id = (select auth.uid()));

drop policy if exists "subscriptions_select_superuser" on subscriptions;

create policy "subscriptions_select_superuser" on subscriptions
  for select to authenticated using (is_superuser());

-- Superuser elle uzatabilir ya da bir hesabı muaf tutabilir (`lifetime`).
-- Havale ile ödeyen müşteri de buradan işleniyor.
drop policy if exists "subscriptions_update_superuser" on subscriptions;

create policy "subscriptions_update_superuser" on subscriptions
  for update to authenticated
  using (is_superuser())
  with check (is_superuser());

-- Satıcının kendi satırına yazma politikası **bilinçli olarak yok**: durumu
-- değiştiren tek şey iyzico'dan gelen webhook, o da service role ile yazıyor.
-- Kullanıcının kendini `lifetime` yapabildiği bir yol olmasın.

-- ---------------------------------------------------------------------------
-- Yazma politikalarına abonelik şartı
-- ---------------------------------------------------------------------------
-- 0011 ve 0013'te kurulan politikaların birebir aynısı; tek fark
-- `is_approved()` yerine `can_write()`. Okuma politikalarına dokunulmuyor.

drop policy if exists "products_insert_authenticated" on products;

create policy "products_insert_authenticated" on products
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and can_write());

drop policy if exists "products_update_owner" on products;

create policy "products_update_owner" on products
  for update to authenticated
  using (owner_id = (select auth.uid()) and can_write())
  with check (owner_id = (select auth.uid()) and can_write());

drop policy if exists "products_delete_owner" on products;

create policy "products_delete_owner" on products
  for delete to authenticated
  using (owner_id = (select auth.uid()) and can_write());

drop policy if exists "bookings_insert_owner" on bookings;

create policy "bookings_insert_owner" on bookings
  for insert to authenticated with check (
    can_write()
    and exists (
      select 1 from products
      where products.id = bookings.product_id
        and products.owner_id = (select auth.uid())
    )
  );

drop policy if exists "bookings_update_owner" on bookings;

create policy "bookings_update_owner" on bookings
  for update to authenticated using (
    can_write()
    and exists (
      select 1 from products
      where products.id = bookings.product_id
        and products.owner_id = (select auth.uid())
    )
  ) with check (
    can_write()
    and exists (
      select 1 from products
      where products.id = bookings.product_id
        and products.owner_id = (select auth.uid())
    )
  );

drop policy if exists "bookings_delete_owner" on bookings;

create policy "bookings_delete_owner" on bookings
  for delete to authenticated using (
    can_write()
    and exists (
      select 1 from products
      where products.id = bookings.product_id
        and products.owner_id = (select auth.uid())
    )
  );

drop policy if exists "rental_settings_insert_owner" on rental_settings;

create policy "rental_settings_insert_owner" on rental_settings
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and can_write());

drop policy if exists "rental_settings_update_owner" on rental_settings;

create policy "rental_settings_update_owner" on rental_settings
  for update to authenticated
  using (owner_id = (select auth.uid()) and can_write())
  with check (owner_id = (select auth.uid()) and can_write());

-- ---------------------------------------------------------------------------
-- Mevcut hesaplar
-- ---------------------------------------------------------------------------
-- Bugün onaylı olan herkes muaf: sistemi kullanan test ve demo hesapları bir
-- göç yüzünden kilitlenmesin. Ücret yalnızca bundan sonra onaylanan
-- hesaplardan bekleniyor.
--
-- Bir hesabı sonradan ücretliye çevirmek için:
--   update subscriptions set status = 'expired' where owner_id = '...';
insert into subscriptions (owner_id, status, price_try)
select p.id, 'lifetime', null
from profiles p
where p.status = 'approved'
on conflict (owner_id) do nothing;
