-- Instagram hesabının ikinci kimliği
--
-- Instagram bir hesabı iki ayrı numarayla anıyor ve hangisini kullandığı
-- hangi kapıdan geçtiğinize bağlı:
--
--   id      → uygulamaya özel kimlik. OAuth belirteç takasının döndürdüğü
--             değer bu; her uygulama için farklı.
--   user_id → hesabın asıl işletme kimliği (IGID). Webhook gövdesindeki
--             `entry[].id` bu.
--
-- 0027 yalnızca ilkini saklıyordu, dolayısıyla gelen mesaj hiçbir satıcıya
-- çözülemiyor ve sessizce düşüyordu: müşteri yazıyor, cevap gelmiyor, hiçbir
-- yerde de hata görünmüyordu. Canlı denemede böyle yakalandı.
--
-- İkisi de saklanıyor ve arama ikisine birden bakıyor. Tek doğru olanı seçip
-- diğerini atmak yerine ikisini de tutmanın sebebi şu: hangi kimliğin
-- geleceği Meta'nın akışına göre değişebiliyor ve bu, tahmin edilecek bir şey
-- değil. İkisini de tanıyan bir arama her iki durumda da çalışır.
alter table instagram_accounts add column if not exists ig_business_id text;

-- Bir işletme hesabı tek satıcıya bağlanabilir — `ig_user_id` üzerindeki
-- benzersizlik kısıtının aynısı. Kısmi, çünkü kolon eski satırlarda boş.
create unique index if not exists instagram_accounts_business_id_key
  on instagram_accounts(ig_business_id)
  where ig_business_id is not null;

comment on column instagram_accounts.ig_user_id is
  'Uygulamaya özel kimlik (OAuth /me?fields=id). Bağlantıyı kuran akış bunu döndürüyor.';
comment on column instagram_accounts.ig_business_id is
  'Instagram işletme hesabı kimliği (IGID, /me?fields=user_id). Webhook entry[].id bu.';

-- Panelin bağlantı durumu sorgusu da yeni kolonu tanısın. Belirteç yine
-- dönmüyor; fonksiyonun tek işi token dışındaki alanları vermek.
create or replace function instagram_account_status()
returns table (
  username text,
  ig_user_id text,
  is_active boolean,
  token_expires_at timestamptz,
  connected_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select a.username, a.ig_user_id, a.is_active, a.token_expires_at, a.connected_at
  from instagram_accounts a
  where a.owner_id = auth.uid();
$$;

revoke all on function instagram_account_status() from public, anon;
grant execute on function instagram_account_status() to authenticated;
