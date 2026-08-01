-- Superuser girişinde ikinci adım: telefona giden tek kullanımlık kod.
--
-- Şifre tek başına yetmiyor artık: superuser'ın şifresi doğru olsa bile oturum
-- açılmıyor, önce bu tabloya bir "bilet" yazılıyor ve kod Telegram üzerinden
-- kullanıcının telefonuna gidiyor. Oturum ancak kod doğrulanınca açılıyor.
--
-- Kodun kendisi burada durmuyor: tabloda `salt:hash` biçiminde scrypt özeti var.
-- Tablo bir şekilde okunsa bile kod okunamıyor, üstelik beş dakika sonra
-- geçersiz oluyor.

create table if not exists login_challenges (
  id uuid primary key default gen_random_uuid(),

  -- Kodun ait olduğu hesap. Doğrulama başarılınca oturum bu kullanıcı için
  -- açılıyor; istemciden yalnızca `id` geliyor, kullanıcı bilgisi hiç gitmiyor.
  user_id uuid not null references auth.users (id) on delete cascade,

  -- scrypt özeti, `salt:hash`. Kodun düz hâli hiçbir yere yazılmıyor.
  code_hash text not null,

  -- Kaç kez yanlış girildi. Eşiği aşınca bilet yanıyor: altı haneli bir kod
  -- sınırsız denemeye bırakılırsa saniyeler içinde bulunur.
  attempts integer not null default 0,

  -- Doğrulanınca damgalanıyor. Aynı bilet ikinci kez oturum açamasın diye.
  consumed_at timestamptz,

  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Süresi geçmiş biletler her yeni bilet açılışında siliniyor; indeks o silme
-- için.
create index if not exists login_challenges_expires_at_idx
  on login_challenges (expires_at);

alter table login_challenges enable row level security;

-- Hiçbir politika yok: tabloya yalnızca sunucu tarafındaki service role
-- dokunuyor. Tarayıcıdan gelen bir istek biletleri ne okuyabilir ne
-- damgalayabilir.
