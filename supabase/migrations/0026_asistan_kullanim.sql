-- Asistanın günlük kullanım sayacı.
--
-- Panelin sağ altındaki asistan her mesajda Anthropic'e istek atıyor ve o
-- isteğin bir bedeli var. Bedel küçük ama sınırsız değil: hatalı bir döngü, açık
-- unutulmuş bir sekme ya da kötü niyetli bir hesap faturayı bir gecede
-- büyütebilir. Bu tablo tavanı koyuyor — satıcı başına, gün başına.
--
-- Neden `lib/usage.ts` değil: oradaki `admin_usage()` Supabase'in altyapı
-- ölçümlerini (disk, bellek, tablo boyutu) topluyor, kullanıcı başına istek
-- saymıyor. Farklı soru, farklı tablo.
--
-- Sayaç güne göre bölünmüş: geçmiş günlerin satırları duruyor, böylece
-- "asistan ne kadar kullanılıyor" sorusu sonradan cevaplanabilir. Temizlik
-- gerekirse `gun < current_date - 90` silinebilir.

create table if not exists asistan_kullanim (
  user_id uuid not null references auth.users (id) on delete cascade,
  gun date not null default current_date,
  adet integer not null default 0,
  primary key (user_id, gun)
);

alter table asistan_kullanim enable row level security;

-- Satıcı yalnızca kendi sayacını görebilir. Yazma politikası yok: sayacı
-- yalnızca aşağıdaki fonksiyon artırıyor, istemci elle artıramaz.
drop policy if exists asistan_kullanim_select_own on asistan_kullanim;
create policy asistan_kullanim_select_own on asistan_kullanim
  for select
  using (user_id = auth.uid());

/**
 * Bir mesaj hakkı harcar ve geriye kalanı söyler.
 *
 * Sayma ile sınır kontrolü tek ifadede: iki ayrı sorgu (önce oku, sonra artır)
 * olsaydı aynı anda gelen iki istek aynı sayıyı okuyup ikisi de geçerdi.
 * `insert ... on conflict do update` satırı kilitliyor, `where` koşulu sınırı
 * aşan artırmayı hiç yaptırmıyor: hak dolduğunda güncelleme satır döndürmez ve
 * `izin` false olur.
 *
 * `security definer`, çünkü tabloda yazma politikası bilerek yok — sayacı
 * artırma yetkisi yalnızca burada.
 */
create or replace function asistan_kota_harca(p_limit integer)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_adet integer;
begin
  if v_uid is null then
    raise exception 'Oturum bulunamadı.';
  end if;

  insert into asistan_kullanim (user_id, gun, adet)
  values (v_uid, current_date, 1)
  on conflict (user_id, gun) do update
    set adet = asistan_kullanim.adet + 1
    where asistan_kullanim.adet < p_limit
  returning adet into v_adet;

  -- Satır dönmediyse çakışma dalına girilmiş ve `where` tutmamış demektir:
  -- hak bugünlük bitmiş.
  if v_adet is null then
    return json_build_object('izin', false, 'kalan', 0, 'limit', p_limit);
  end if;

  return json_build_object(
    'izin', true,
    'kalan', greatest(p_limit - v_adet, 0),
    'limit', p_limit
  );
end;
$$;

revoke all on function asistan_kota_harca(integer) from public;
revoke all on function asistan_kota_harca(integer) from anon;
grant execute on function asistan_kota_harca(integer) to authenticated;
