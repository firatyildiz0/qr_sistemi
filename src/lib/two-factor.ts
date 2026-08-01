import { randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTelegramMessage } from "@/lib/telegram";

/**
 * Superuser girişinin ikinci adımı.
 *
 * Şifre doğru olsa bile oturum açılmıyor: burada tek kullanımlık bir kod
 * üretiliyor, telefona gidiyor ve oturum ancak o kod geri girilince açılıyor.
 * Böylece şifreyi ele geçiren biri yönetim paneline giremiyor — telefona da
 * erişmesi gerekiyor.
 *
 * Bilet `login_challenges` tablosunda duruyor (bkz. 0022). Kodun düz hâli
 * hiçbir yere yazılmıyor; tabloda yalnızca scrypt özeti var.
 */

export const CODE_LENGTH = 6;

/** Kodun ömrü. Kısa tutuluyor: bilet ne kadar uzun yaşarsa o kadar denenir. */
const TTL_MINUTES = 5;

/** Bir bilet için kaç yanlış denemeye izin var. */
const MAX_ATTEMPTS = 5;

/**
 * scrypt özeti, `salt:hash` biçiminde.
 *
 * Altı haneli bir kodun düz SHA özeti bir milyon denemede çözülür; scrypt her
 * denemeyi bilerek pahalı yapıyor. Tuz satır başına farklı, o yüzden özetin
 * kendisiyle birlikte saklanıyor.
 */
function hashWithSalt(code: string, salt: string): Buffer {
  return scryptSync(code, salt, 32);
}

function hashCode(code: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${hashWithSalt(code, salt).toString("hex")}`;
}

function codeMatches(code: string, stored: string): boolean {
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;

  const actual = hashWithSalt(code, salt);
  const target = Buffer.from(expected, "hex");

  // Uzunluklar tutmuyorsa `timingSafeEqual` fırlatır; önce ona bakılıyor.
  return actual.length === target.length && timingSafeEqual(actual, target);
}

/** `Math.random` değil: kod tahmin edilemez olmalı. */
function makeCode(): string {
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
}

export type ChallengeResult =
  | { ok: true; challengeId: string }
  | { ok: false; message: string };

/**
 * Bilet açar ve kodu telefona gönderir.
 *
 * Gönderim başarısızsa bilet siliniyor ve kapı kapanıyor: kullanıcının eline
 * geçmeyen bir kodu bekleyen açık bir bilet bırakmanın anlamı yok.
 */
export async function startLoginChallenge(
  userId: string
): Promise<ChallengeResult> {
  const admin = createAdminClient();

  // Süresi geçmiş biletler burada temizleniyor. Ayrı bir cron'a gerek yok:
  // tablo yalnızca girişlerde büyüyor, temizlik de girişte yapılıyor.
  await admin
    .from("login_challenges")
    .delete()
    .lt("expires_at", new Date().toISOString());

  const code = makeCode();
  const expiresAt = new Date(Date.now() + TTL_MINUTES * 60_000);

  const { data, error } = await admin
    .from("login_challenges")
    .insert({
      user_id: userId,
      code_hash: hashCode(code),
      expires_at: expiresAt.toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[2fa] bilet açılamadı:", error);
    return { ok: false, message: "Doğrulama kodu oluşturulamadı. Tekrar deneyin." };
  }

  const sent = await sendTelegramMessage(
    [
      `Yönetim paneli giriş kodu: ${code}`,
      "",
      `Kod ${TTL_MINUTES} dakika geçerli.`,
      "Bu girişi siz yapmadıysanız şifrenizi hemen değiştirin.",
    ].join("\n")
  );

  if (!sent) {
    await admin.from("login_challenges").delete().eq("id", data.id);
    return {
      ok: false,
      message: "Doğrulama kodu telefona gönderilemedi. Biraz sonra tekrar deneyin.",
    };
  }

  return { ok: true, challengeId: data.id };
}

export type VerifyResult =
  | { ok: true; userId: string }
  | { ok: false; message: string; expired: boolean };

const EXPIRED_MESSAGE =
  "Kodun süresi doldu ya da çok fazla yanlış denendi. Baştan giriş yapın.";

/**
 * Kodu doğrular ve bileti tüketir.
 *
 * Yanlış kod da sayılıyor: `attempts` eşiği aşınca bilet geçersiz oluyor, yani
 * altı haneli kod sınırsız denenemiyor. Doğru kod da bileti kapatıyor —
 * `consumed_at` damgalı bir bilet ikinci kez oturum açamıyor.
 */
export async function verifyLoginChallenge(
  challengeId: string,
  code: string
): Promise<VerifyResult> {
  const admin = createAdminClient();

  const { data: challenge } = await admin
    .from("login_challenges")
    .select("id, user_id, code_hash, attempts, consumed_at, expires_at")
    .eq("id", challengeId)
    .maybeSingle();

  // Bilet yok, kullanılmış ya da süresi geçmiş — üçü de aynı cevabı alıyor.
  // Hangisi olduğunu söylemenin kullanıcıya faydası yok, saldırgana var.
  if (
    !challenge ||
    challenge.consumed_at ||
    new Date(challenge.expires_at).getTime() < Date.now() ||
    challenge.attempts >= MAX_ATTEMPTS
  ) {
    return { ok: false, message: EXPIRED_MESSAGE, expired: true };
  }

  if (!codeMatches(code, challenge.code_hash)) {
    const attempts = challenge.attempts + 1;
    await admin.from("login_challenges").update({ attempts }).eq("id", challenge.id);

    if (attempts >= MAX_ATTEMPTS) {
      return { ok: false, message: EXPIRED_MESSAGE, expired: true };
    }

    const left = MAX_ATTEMPTS - attempts;
    return {
      ok: false,
      message: `Kod hatalı. ${left} deneme hakkınız kaldı.`,
      expired: false,
    };
  }

  // Damga koşullu atılıyor: aynı kodla aynı anda gelen iki istekten yalnızca
  // biri satırı güncelleyebiliyor, ikincisine dönecek satır kalmıyor.
  const { data: consumed } = await admin
    .from("login_challenges")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", challenge.id)
    .is("consumed_at", null)
    .select("id")
    .maybeSingle();

  if (!consumed) {
    return { ok: false, message: EXPIRED_MESSAGE, expired: true };
  }

  return { ok: true, userId: challenge.user_id };
}
