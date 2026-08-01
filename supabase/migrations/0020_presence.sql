-- "Şu anda sitede kaç kişi var" — anlık etkin kullanıcı sayısı.
--
-- Bir oturum tablosu değil, bir *son görülme* tablosu: her açık sekme dakikada
-- bir sunucuya "buradayım" diyor (bkz. components/PresenceBeacon.tsx), burada da
-- anahtar başına tek satır güncelleniyor. Satır sayısı aynı anda siteyi kullanan
-- kişi sayısı kadar kalıyor, geçmiş biriktirmiyor.
--
-- Anahtar kişiyi tanımlamıyor: giriş yapmış satıcı için kullanıcı kimliği,
-- ziyaretçi için IP'nin tek yönlü özeti (bkz. lib/presence.ts). Ham IP, çerez ya
-- da müşteri bilgisi buraya girmiyor.

create table if not exists active_sessions (
  session_key text primary key,
  -- Nerede olduğu: satıcı panelinde mi, herkese açık ürün sayfasında mı.
  kind text not null check (kind in ('panel', 'urun')),
  last_seen_at timestamptz not null default now()
);

create index if not exists active_sessions_last_seen_idx
  on active_sessions (last_seen_at desc);

alter table active_sessions enable row level security;

-- Okuma politikası yok: tabloda kimin nerede olduğu yazıyor ve tek tek satırlara
-- kimsenin ihtiyacı yok. Panelin gördüğü şey aşağıdaki fonksiyonun döndürdüğü
-- sayı. Yazma da yalnızca service role'den geçiyor.

-- ---------------------------------------------------------------------------
-- Kalp atışı
-- ---------------------------------------------------------------------------
create or replace function touch_presence(p_key text, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_kind not in ('panel', 'urun') then
    return;
  end if;

  insert into active_sessions (session_key, kind, last_seen_at)
  values (p_key, p_kind, now())
  on conflict (session_key)
  do update set kind = excluded.kind, last_seen_at = now();
end;
$$;

revoke all on function touch_presence(text, text) from public;
revoke all on function touch_presence(text, text) from anon;
revoke all on function touch_presence(text, text) from authenticated;
grant execute on function touch_presence(text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Panelin gördüğü sayı
-- ---------------------------------------------------------------------------
-- Son iki dakikada haber veren anahtarlar. Kalp atışı 45 saniyede bir geldiği
-- için iki dakika, bir sekmenin kapandığına karar vermeden önce iki atışlık pay
-- bırakıyor — kısa bir ağ kesintisi kullanıcıyı listeden düşürmesin.
create or replace function admin_presence()
returns table (kind text, viewers bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_superuser() then
    raise exception 'Bu veriye erişim yetkiniz yok.';
  end if;

  return query
  select a.kind, count(*)
  from active_sessions a
  where a.last_seen_at > now() - interval '2 minutes'
  group by a.kind;
end;
$$;

revoke all on function admin_presence() from public;
revoke all on function admin_presence() from anon;
grant execute on function admin_presence() to authenticated;

-- ---------------------------------------------------------------------------
-- Temizlik
-- ---------------------------------------------------------------------------
-- Kapanan sekmeler geriye ölü satır bırakıyor. Sayımı etkilemiyorlar (iki
-- dakikalık pencerenin dışındalar) ama tablo boşuna büyümesin. Bildirim cron'u
-- her sabah çağırıyor.
create or replace function prune_presence()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from active_sessions where last_seen_at < now() - interval '1 day';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function prune_presence() from public;
revoke all on function prune_presence() from anon;
revoke all on function prune_presence() from authenticated;
grant execute on function prune_presence() to service_role;
