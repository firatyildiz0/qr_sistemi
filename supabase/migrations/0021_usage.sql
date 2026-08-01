-- "Supabase'de ne kadar yer kaldı" — kullanım sayfasının veritabanı tarafı.
--
-- Sayfanın gösterdiği rakamların çoğu Supabase'in kendi ölçüm ucundan geliyor
-- (bkz. lib/usage.ts): veritabanı boyutu, disk, bellek, işlemci yükü. Ama o uç
-- üç şeyi bilmiyor: yüklenen dosyaların toplam boyutunu, aylık aktif kullanıcı
-- sayısını ve hangi tablonun ne kadar yer kapladığını. Bunlar burada.
--
-- Fonksiyon `security definer`, çünkü `storage.objects` ve `auth.users` normal
-- bir oturumun okuyamayacağı yerler. Yetkiyi veritabanı veriyor: içeride
-- `is_superuser()` var, panelin geri kalanındaki düzenin aynısı.

create or replace function admin_usage()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result json;
begin
  if not is_superuser() then
    raise exception 'Bu veriye erişim yetkiniz yok.';
  end if;

  select json_build_object(
    -- Yüklenen dosyalar. Boyut nesnenin kendi `metadata` alanında yazılı;
    -- yazılmamışsa (eski nesneler) sıfır sayılıyor, toplam eksik kalır ama
    -- sorgu patlamaz.
    'storage_bytes', coalesce(
      (select sum(coalesce((o.metadata->>'size')::bigint, 0)) from storage.objects o),
      0
    ),
    'storage_objects', (select count(*) from storage.objects),

    -- Supabase'in faturalama ölçüsüyle aynı tanım: son 30 günde en az bir kez
    -- oturum açmış kullanıcı.
    'mau', (
      select count(*) from auth.users
      where last_sign_in_at > now() - interval '30 days'
    ),
    'users_total', (select count(*) from auth.users),

    -- Açık bağlantılar. Havuz sınırına ne kadar yaklaşıldığını gösteriyor;
    -- ölçüm ucu yalnızca üst sınırı veriyor, o anki sayıyı vermiyor.
    'connections', (
      select count(*) from pg_stat_activity where datname = current_database()
    ),

    -- Yeri kim kaplıyor. `pg_total_relation_size` indeksleri ve TOAST'ı da
    -- sayıyor — "bu tablo diskte ne kadar tutuyor" sorusunun gerçek cevabı o.
    -- Satır sayısı planlayıcının tahmini (`reltuples`), tam sayım değil:
    -- her açılışta bütün tabloları saymak bu sayfaya değmez.
    'tables', coalesce((
      select json_agg(t)
      from (
        select
          c.relname as name,
          pg_total_relation_size(c.oid) as bytes,
          greatest(c.reltuples, 0)::bigint as rows
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relkind = 'r'
          and pg_total_relation_size(c.oid) > 0
        order by pg_total_relation_size(c.oid) desc
        limit 8
      ) t
    ), '[]'::json)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function admin_usage() from public;
revoke all on function admin_usage() from anon;
grant execute on function admin_usage() to authenticated;
