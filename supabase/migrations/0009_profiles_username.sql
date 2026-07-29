-- Migration: kullanıcı adı ile giriş.
--
-- Supabase Auth her zaman e-posta + şifre ile oturum açar; kullanıcı adı diye
-- bir kimlik bilgisi yoktur. Bu yüzden kullanıcı adını ayrı bir tabloda
-- tutuyoruz ve girişte sunucu tarafında kullanıcı adı → kullanıcı → e-posta
-- çevirisini yapıp asıl oturumu yine e-posta ile açıyoruz.
--
-- Tablo herkese kapalı: eşleme yalnızca service role anahtarıyla (server
-- action içinde) okunur, böylece kimse kullanıcı adı listesini çekemez ya da
-- bir kullanıcı adının e-postasını öğrenemez.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now(),
  -- Küçük harf, rakam ve alt çizgi. Büyük/küçük harf farkından doğan iki ayrı
  -- "ayni" kullanıcı adını engellemek için normalizasyon yazma anında yapılır.
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,20}$')
);

alter table profiles enable row level security;

-- Satıcı yalnızca kendi kaydını görebilir. insert/update/delete politikası
-- bilerek yok: kayıt aşağıdaki trigger ile oluşur, kullanıcı adı sonradan
-- değişmez.
drop policy if exists "profiles_select_own" on profiles;

create policy "profiles_select_own" on profiles
  for select to authenticated using (id = (select auth.uid()));

-- Kaydın auth.users ile aynı anda oluşması şart: profil ayrı bir adımda
-- yazılsaydı, kullanıcı adı çakışmasında ortada kullanıcı adı olmayan ve bu
-- yüzden hiç giriş yapamayan bir hesap kalırdı. Trigger aynı işlemde
-- çalıştığı için unique ihlali tüm kaydı geri alır.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, lower(trim(new.raw_user_meta_data->>'username')));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user();

-- Bu migration'dan önce açılmış hesapların kullanıcı adı yok; profil kaydı
-- olmadan giriş de yapamazlar. E-postanın @ öncesinden bir kullanıcı adı
-- türetip sonuna kısa bir kimlik eki koyuyoruz (çakışmasın diye). Satıcı
-- isterse SQL editöründen düzeltebilir:
--   update profiles set username = 'istedigi_ad' where id = '<user id>';
insert into profiles (id, username)
select
  u.id,
  -- Kimlik eki hep sonda kalsın diye kırpma e-posta tarafında yapılır.
  left(regexp_replace(lower(split_part(u.email, '@', 1)), '[^a-z0-9_]', '', 'g'), 13)
    || '_' || left(replace(u.id::text, '-', ''), 6)
from auth.users u
where u.email is not null
  and not exists (select 1 from profiles p where p.id = u.id)
on conflict do nothing;
