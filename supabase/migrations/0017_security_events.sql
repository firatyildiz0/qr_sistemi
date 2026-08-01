-- Güvenlik olaylarının kaydı.
--
-- Bugüne kadar sistemde hiçbir iz yoktu: birisi binlerce şifre denese, başkasının
-- rezervasyonunu silmeye kalksa ya da bütün müşteri listesini indirse geriye
-- bakılabilecek tek bir satır kalmıyordu. Bu tablo o boşluğu dolduruyor —
-- hem "olan biteni sonradan görebilmek" hem de "eşik aşılınca haber vermek" için.
--
-- Tablo bilinçli olarak kişisel veri tutmuyor: `identifier` denenen kullanıcı
-- adı (şifre asla), `ip` ve `user_agent` isteğin geldiği yer. Müşteri adı,
-- telefonu, adresi buraya hiç girmiyor — güvenlik kaydının kendisi yeni bir
-- sızıntı kaynağı olmasın.

create table if not exists security_events (
  id uuid primary key default gen_random_uuid(),

  -- Ne oldu. Serbest metin değil, uygulamadaki sabit listeden geliyor:
  --   login_failed      şifre yanlış ya da kullanıcı adı yok
  --   login_ok          başarılı giriş (patlamayı normalden ayırmak için)
  --   signup            yeni kayıt denemesi
  --   rate_limited      eşik aşıldı, istek reddedildi
  --   unauthorized      oturumu olan biri başkasının verisine uzandı
  --   cron_unauthorized cron ucuna geçersiz anahtarla istek geldi
  --   alert_sent        bildirim gönderildi (tekrar tekrar göndermemek için)
  kind text not null,

  severity text not null default 'info'
    check (severity in ('info', 'warning', 'critical')),

  -- Denenen kullanıcı adı / e-posta. Var olmayan bir hesap için de dolu olur.
  identifier text,
  ip text,
  user_agent text,

  -- Olaya özel ayrıntı. Şifre, token ya da müşteri verisi buraya yazılmaz.
  detail jsonb,

  created_at timestamptz not null default now()
);

-- Üç sorgu için üç indeks: panelin zaman sıralı listesi, hız sınırının
-- "şu kullanıcı adı son 15 dakikada kaç kez" sayımı ve aynısının IP hâli.
create index if not exists security_events_created_at_idx
  on security_events (created_at desc);
create index if not exists security_events_identifier_idx
  on security_events (identifier, kind, created_at desc);
create index if not exists security_events_ip_idx
  on security_events (ip, kind, created_at desc);

alter table security_events enable row level security;

-- Yalnızca superuser okur. Yazma politikası yok: kayıtları sadece sunucu
-- tarafındaki service role açar, dolayısıyla bir saldırgan kendi izini
-- silemez ya da sahte olay üretemez.
create policy "security_events_select_superuser" on security_events
  for select to authenticated using (is_superuser());

-- ---------------------------------------------------------------------------
-- Eski kayıtları budama
-- ---------------------------------------------------------------------------
-- Tablo giriş denemesi başına bir satır alıyor; sınırsız büyümesin. 90 gün
-- hem olayı incelemeye hem KVKK saklama süresine fazlasıyla yetiyor.
-- Bildirim cron'u her sabah çağırıyor.
create or replace function prune_security_events()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from security_events where created_at < now() - interval '90 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function prune_security_events() from public;
