-- Instagram asistanının satıcı tarafından yönetilen ayarları
--
-- Sohbet şimdiye kadar yalnızca rezervasyon alıyordu ve her cümlesi kodda
-- sabitti. Artık müşterinin serbest sorularına da (fiyat, kargo, kapora,
-- beden, çalışma saatleri...) cevap veriyor ve bu cevapların dayanağı
-- satıcının panelden yazdığı bilgiler: işletme bilgisi, kurallar, örnek
-- soru-cevaplar, karşılama mesajı, üslup.
--
-- Ayarlar tek bir jsonb kolonunda: alan eklemek migration gerektirmesin diye.
-- Şekli uygulama doğruluyor (bkz. lib/instagram/ayarlar.ts), eksik alan
-- varsayılana düşüyor.
create table if not exists instagram_settings (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table instagram_settings enable row level security;

-- Satıcı yalnızca kendi ayarını okur ve yazar. Webhook service role ile okuyor.
create policy "instagram_settings_select_own" on instagram_settings
  for select to authenticated using (owner_id = (select auth.uid()));

create policy "instagram_settings_insert_own" on instagram_settings
  for insert to authenticated with check (owner_id = (select auth.uid()));

create policy "instagram_settings_update_own" on instagram_settings
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- Serbest soruya cevap verirken sohbetin son birkaç mesajı bağlam olarak
-- gerekiyor ("peki kargosu?" tek başına anlamsız). Konuşma satırında kısa bir
-- geçmiş tutuluyor; uygulama son birkaç mesajdan fazlasını saklamıyor.
alter table instagram_threads add column if not exists history jsonb not null default '[]'::jsonb;
