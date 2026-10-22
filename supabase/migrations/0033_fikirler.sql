-- Anasayfadaki "Fikriniz mi var?" kartından gelen öneriler
--
-- Ziyaretçi /fikir sayfasındaki formu dolduruyor; öneri yönetim panelinin
-- Fikirler sekmesine düşüyor. Ziyaretçinin oturumu yok, satırı uygulama
-- sunucusu service role ile yazıyor (bkz. app/fikir/actions.ts). Ziyaretçiye
-- insert politikası açılmıyor: açılsaydı hız sınırını atlayan bir kapı olurdu.

create table if not exists fikirler (
  id uuid primary key default gen_random_uuid(),
  ad text not null check (char_length(ad) between 1 and 80),
  isletme text check (char_length(isletme) <= 120),
  eposta text check (char_length(eposta) <= 200),
  telefon text check (char_length(telefon) <= 20),
  mesaj text not null check (char_length(mesaj) between 1 and 2000),
  -- yeni: henüz bakılmadı · okundu: bakıldı · arsiv: listeden kaldırıldı
  durum text not null default 'yeni' check (durum in ('yeni', 'okundu', 'arsiv')),
  created_at timestamptz not null default now(),
  -- Size dönebilmemiz için en az bir iletişim yolu şart.
  constraint fikirler_iletisim_check check (eposta is not null or telefon is not null)
);

create index if not exists fikirler_created_at_idx on fikirler (created_at desc);

alter table fikirler enable row level security;

-- Yalnızca superuser okur ve durumunu değiştirir. Yazma service role'de.
drop policy if exists "fikirler_select_superuser" on fikirler;
create policy "fikirler_select_superuser" on fikirler
  for select to authenticated using (is_superuser());

drop policy if exists "fikirler_update_superuser" on fikirler;
create policy "fikirler_update_superuser" on fikirler
  for update to authenticated using (is_superuser()) with check (is_superuser());
