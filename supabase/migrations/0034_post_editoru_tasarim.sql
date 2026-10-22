-- Post editörünün Canva yerine geçecek hâli: superuser dışında da kullanan
-- olacak (Nihat), postlara yorum yazılacak, sürüm geçmişi tutulacak,
-- şablonlar kaydedilecek ve Reels videosu yüklenecek.
--
-- 0033'teki gibi hiçbir tabloda politika yok; erişim API ucunda.

-- Editörü superuser dışında kimlerin açabileceği. Superuser her zaman açar.
create table public.post_editoru_erisim (
  kullanici uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.post_editoru_erisim enable row level security;

-- Nihat'ın iki hesabı (kullanıcı 2026-10-22'de ikisini de istedi).
insert into public.post_editoru_erisim (kullanici)
select id from public.profiles where username in ('nihatyavuz', 'nihat11')
on conflict do nothing;

-- Postlara yorum. `post_id` ortak listedeki postun kimliği (jsonb içinde
-- yaşadığı için yabancı anahtar yok; post silinse de yorum kalır).
create table public.post_editoru_yorumlar (
  id bigint generated always as identity primary key,
  post_id text not null,
  kullanici uuid references auth.users (id) on delete set null,
  ad text not null,
  renk text not null,
  metin text not null check (char_length(metin) between 1 and 2000),
  cozuldu boolean not null default false,
  created_at timestamptz not null default now()
);
create index post_editoru_yorumlar_post on public.post_editoru_yorumlar (post_id, created_at);
alter table public.post_editoru_yorumlar enable row level security;

-- Ortak listenin anlık görüntüleri. Kayıt sırasında en fazla 10 dakikada bir
-- alınıyor; editörden bir postu ya da tüm listeyi geri yüklemek için.
create table public.post_editoru_surumler (
  id bigint generated always as identity primary key,
  rev bigint not null,
  data jsonb not null,
  kim text,
  created_at timestamptz not null default now()
);
create index post_editoru_surumler_created_at on public.post_editoru_surumler (created_at desc);
alter table public.post_editoru_surumler enable row level security;

-- Kaydedilmiş tasarım şablonları.
create table public.post_editoru_sablonlar (
  id text primary key,
  ad text not null,
  post jsonb not null,
  kim text,
  created_at timestamptz not null default now()
);
alter table public.post_editoru_sablonlar enable row level security;

-- Kova artık Reels videosu da alıyor (Instagram videoyu bu adresten indiriyor).
update storage.buckets
   set file_size_limit = 104857600,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'video/mp4']
 where id = 'post-editoru';
