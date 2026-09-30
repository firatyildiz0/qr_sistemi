-- Telefon bildirimleri (Web Push)
--
-- Satıcı panelde "bildirimleri aç" dediğinde tarayıcı bir abonelik üretiyor:
-- bir adres (endpoint) ve o adrese şifreli mesaj göndermek için iki anahtar.
-- Instagram'dan talep geldiğinde sunucu bu satırları okuyup her cihaza bildirim
-- yolluyor. İzin vermeyen satıcının satırı hiç oluşmadığı için ona bir şey
-- gitmiyor.
--
-- Bir satıcının birden çok cihazı olabilir (telefon + bilgisayar); her cihaz
-- ayrı satır. Adres tarayıcıya özgü ve benzersiz: aynı cihaz yeniden abone
-- olursa satır güncelleniyor, çoğalmıyor.
--
-- Okuma/yazma satıcının kendi satırlarıyla sınırlı. Gönderim tarafı webhook'ta
-- servis anahtarıyla çalışıyor; RLS'e takılmıyor.

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists push_subscriptions_owner_idx
  on push_subscriptions(owner_id);

alter table push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_owner" on push_subscriptions;
drop policy if exists "push_subscriptions_insert_owner" on push_subscriptions;
drop policy if exists "push_subscriptions_update_owner" on push_subscriptions;
drop policy if exists "push_subscriptions_delete_owner" on push_subscriptions;

create policy "push_subscriptions_select_owner" on push_subscriptions
  for select to authenticated using (owner_id = (select auth.uid()));

create policy "push_subscriptions_insert_owner" on push_subscriptions
  for insert to authenticated with check (owner_id = (select auth.uid()));

create policy "push_subscriptions_update_owner" on push_subscriptions
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "push_subscriptions_delete_owner" on push_subscriptions
  for delete to authenticated using (owner_id = (select auth.uid()));

-- Bildirim ekranındaki "sil" için: satıcı kendi bildirimini kaldırabilsin.
drop policy if exists "notifications_delete_owner" on notifications;
create policy "notifications_delete_owner" on notifications
  for delete to authenticated using (owner_id = (select auth.uid()));
