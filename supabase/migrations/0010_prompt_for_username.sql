-- Migration: türetilmiş kullanıcı adlarını "sahibi seçmedi" diye işaretle.
--
-- 0009, kullanıcı adı olmayan eski hesaplara e-postalarından bir ad türetti.
-- O adı satıcı seçmedi ve bilmiyor da; panel, girişten sonra kendi adını
-- belirlemesi için soruyor. Bunu sorabilmek için hangi adın türetilmiş
-- olduğunu bilmek gerekiyor.

alter table profiles add column if not exists username_auto boolean not null default false;

-- 0009'daki backfill ile birebir aynı ifade: yalnızca o üretmiş olduğu adlar
-- işaretlenir, satıcının kendi seçtiği bir ad yanlışlıkla yakalanmaz.
update profiles p
set username_auto = true
from auth.users u
where u.id = p.id
  and p.username =
    left(regexp_replace(lower(split_part(u.email, '@', 1)), '[^a-z0-9_]', '', 'g'), 13)
      || '_' || left(replace(p.id::text, '-', ''), 6);

-- Kullanıcı adını değiştirme hakkı tek seferlik: `using` yalnızca henüz
-- türetilmiş adı taşıyan satırı açar, `with check` de aynı update'in bayrağı
-- düşürmesini zorunlu kılar. Böylece satıcı adını bir kez belirler, sonrasında
-- politika kapanır — kullanıcı adı kalıcı bir kimlik.
drop policy if exists "profiles_update_own_pending_username" on profiles;

create policy "profiles_update_own_pending_username" on profiles
  for update to authenticated
  using (id = (select auth.uid()) and username_auto)
  with check (id = (select auth.uid()) and not username_auto);
