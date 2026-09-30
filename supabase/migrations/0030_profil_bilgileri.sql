-- Hesabım: profil fotoğrafı, ad soyad ve sektör
--
-- Satıcının kendi hesabını görebileceği ve düzenleyebileceği bir ekran
-- ekleniyor. Profil satırına dört alan geliyor; hepsi isteğe bağlı.
--
-- Yazma bir politika ile değil aşağıdaki fonksiyonla açılıyor: `profiles`
-- satırında rol ve onay durumu da duruyor, geniş bir update politikası
-- satıcının kendini superuser yapmasına kapı açardı. Fonksiyon yalnızca bu
-- dört kolona dokunuyor.

alter table profiles add column if not exists full_name text;
alter table profiles add column if not exists sector text;
-- Fotoğraf ürün görselleriyle aynı kovada, satıcının kendi klasöründe
-- (`<uid>/avatar/...`); oradaki yazma politikaları aynen geçerli.
alter table profiles add column if not exists avatar_url text;
-- Fotoğraf yoksa baş harfin zemin rengi.
alter table profiles add column if not exists avatar_color text;

alter table profiles drop constraint if exists profiles_full_name_length;
alter table profiles add constraint profiles_full_name_length
  check (full_name is null or char_length(full_name) between 1 and 80);

alter table profiles drop constraint if exists profiles_sector_length;
alter table profiles add constraint profiles_sector_length
  check (sector is null or char_length(sector) between 1 and 60);

alter table profiles drop constraint if exists profiles_avatar_color_format;
alter table profiles add constraint profiles_avatar_color_format
  check (avatar_color is null or avatar_color ~ '^#[0-9a-fA-F]{6}$');

create or replace function update_my_profile(
  p_full_name text,
  p_sector text,
  p_avatar_url text,
  p_avatar_color text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  -- Fotoğraf yalnızca satıcının kendi klasöründen olabilir; başkasının
  -- dosyasını ya da dışarıdan bir adresi profile bağlamak mümkün olmasın.
  if p_avatar_url is not null
     and position('/storage/v1/object/public/product-images/' || auth.uid()::text || '/avatar/' in p_avatar_url) = 0 then
    raise exception 'invalid avatar url';
  end if;

  update profiles
  set full_name = nullif(trim(p_full_name), ''),
      sector = nullif(trim(p_sector), ''),
      avatar_url = p_avatar_url,
      avatar_color = p_avatar_color
  where id = auth.uid();
end;
$$;

revoke all on function update_my_profile(text, text, text, text) from public, anon;
grant execute on function update_my_profile(text, text, text, text) to authenticated;
