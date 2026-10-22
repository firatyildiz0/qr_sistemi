-- Post editörü (/yonetim/post-editoru): RentQR'ın kendi Instagram postlarını
-- hazırladığı ortak çalışma alanı. Eskiden Fırat'ın bilgisayarında yerel bir
-- Node sunucusuyla (WebSocket + JSON dosyaları) çalışıyordu; bu tablolar o
-- dosyaların yerini alıyor.
--
-- Hiçbir tabloda politika yok: RLS açık ve yalnızca service role okuyup
-- yazıyor. Erişim kontrolü API ucunda (superuser + onaylı), çünkü işlemleri
-- uygulayan mantık (ortak-ops) JavaScript'te ve sunucuda çalışıyor.

-- Ortak post listesi: tek satır. `data` = { posts, uploads }, `rev` her
-- kayıtta bir artıyor.
create table public.post_editoru_durum (
  id smallint primary key default 1 check (id = 1),
  rev bigint not null default 0,
  data jsonb,
  updated_at timestamptz not null default now()
);
insert into public.post_editoru_durum (id) values (1);

-- Her kaydın işlemleri. Açık editörler `rev > son gördüğüm` diye yoklayıp
-- başkalarının değişikliğini buradan alıyor; eski kayıtlar budanıyor (yoklama
-- aradaki boşluğu fark ederse tam listeyi baştan alıyor).
create table public.post_editoru_islemler (
  rev bigint primary key,
  cid text not null,
  seq integer,
  kim text,
  ops jsonb not null,
  created_at timestamptz not null default now()
);
create index post_editoru_islemler_created_at on public.post_editoru_islemler (created_at);

-- Editörü açık olanlar ve imleçleri. Her yoklamada güncelleniyor; birkaç
-- saniye sesi çıkmayan "ayrıldı" sayılıyor.
create table public.post_editoru_kisiler (
  cid text primary key,
  kullanici uuid not null references auth.users (id) on delete cascade,
  ad text not null,
  renk text not null,
  konum jsonb,
  goruldu timestamptz not null default now()
);

-- "AI ile post üret" ve "AI ile yeniden üret" işleri. Üretim bir dakikayı
-- bulabildiği için istek hemen dönüyor, iş arka planda sürüyor; editör durumu
-- buradan yokluyor.
create table public.post_editoru_isler (
  id text primary key,
  tur text not null,
  durum text not null default 'running' check (durum in ('running', 'done', 'error', 'cancelled')),
  asama text,
  sonuc jsonb,
  hata text,
  kullanici uuid references auth.users (id) on delete set null,
  basladi timestamptz not null default now(),
  bitti timestamptz
);

-- Anahtar → değer: öğrenilen tarz tercihleri (`tercihler`), Instagram
-- bağlantısının yenilenen token'ı (`instagram`) ve paylaşılan postlar
-- (`ig_paylasimlar`).
create table public.post_editoru_ayarlar (
  anahtar text primary key,
  deger jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.post_editoru_durum enable row level security;
alter table public.post_editoru_islemler enable row level security;
alter table public.post_editoru_kisiler enable row level security;
alter table public.post_editoru_isler enable row level security;
alter table public.post_editoru_ayarlar enable row level security;

-- Kaydı ve işlem günlüğünü tek işlemde yazar. Başka biri araya girdiyse
-- (rev değişmişse) hiçbir şey yazmaz ve null döner; çağıran taraf güncel
-- hâli okuyup işlemleri yeniden uygular.
create function public.post_editoru_kaydet(
  p_rev bigint,
  p_data jsonb,
  p_ops jsonb,
  p_cid text,
  p_seq integer,
  p_kim text
) returns bigint
language plpgsql
set search_path = ''
as $$
declare
  yeni bigint;
begin
  update public.post_editoru_durum
     set data = p_data, rev = rev + 1, updated_at = now()
   where id = 1 and rev = p_rev
  returning rev into yeni;

  if yeni is null then
    return null;
  end if;

  insert into public.post_editoru_islemler (rev, cid, seq, kim, ops)
  values (yeni, p_cid, p_seq, p_kim, p_ops);

  return yeni;
end;
$$;

revoke all on function public.post_editoru_kaydet(bigint, jsonb, jsonb, text, integer, text) from public, anon, authenticated;

-- Editöre yüklenen fotoğraflar. Herkese açık okunuyor (editör ve PNG dışa
-- aktarma doğrudan bu adresten çiziyor); yazma yalnızca service role ile.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-editoru', 'post-editoru', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
