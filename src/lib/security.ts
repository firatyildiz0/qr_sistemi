import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Güvenlik olaylarının kaydı ve hız sınırı.
 *
 * İki işi birden yapıyor çünkü ikisi aynı veriye bakıyor: "son 15 dakikada bu
 * kullanıcı adıyla kaç kez başarısız giriş denendi" sorusunun cevabı hem isteği
 * reddetmeye hem de olayı yönetim panelinin Güvenlik sekmesinde göstermeye
 * yarıyor.
 *
 * Kayıtlar service role ile yazılıyor (bkz. 0017: tabloda insert politikası
 * yok). Saldırgan kendi izini silemesin diye.
 */

export type SecurityEventKind =
  | "login_failed"
  | "login_ok"
  | "signup"
  | "rate_limited"
  | "unauthorized"
  | "cron_unauthorized"
  // Artık üretilmiyor (uyarı e-postası kaldırıldı); eski kayıtlar Güvenlik
  // sekmesinde okunabilsin diye tipte duruyor.
  | "alert_sent";

export type Severity = "info" | "warning" | "critical";

export type SecurityEvent = {
  kind: SecurityEventKind;
  severity?: Severity;
  /** Denenen kullanıcı adı ya da e-posta. Şifre asla. */
  identifier?: string | null;
  detail?: Record<string, unknown>;
};

/** İsteğin geldiği yer. Vercel arkasında gerçek IP `x-forwarded-for`'un ilkidir. */
async function requestContext(): Promise<{ ip: string | null; userAgent: string | null }> {
  const list = await headers();
  const forwarded = list.get("x-forwarded-for");

  return {
    ip: forwarded?.split(",")[0]?.trim() || list.get("x-real-ip") || null,
    // Uzun bir user-agent'ın tabloyu şişirmesine gerek yok.
    userAgent: list.get("user-agent")?.slice(0, 300) ?? null,
  };
}

/**
 * Olayı kaydeder.
 *
 * Hiçbir koşulda çağıranı patlatmaz: kayıt tutmak asıl işi engellememeli, giriş
 * formu güvenlik tablosu erişilemez diye çalışmaz hale gelmemeli. Hata olursa
 * sunucu log'una düşer, o kadar.
 */
export async function recordSecurityEvent(event: SecurityEvent): Promise<void> {
  try {
    const { ip, userAgent } = await requestContext();
    const severity = event.severity ?? "info";

    await createAdminClient().from("security_events").insert({
      kind: event.kind,
      severity,
      identifier: event.identifier ?? null,
      ip,
      user_agent: userAgent,
      detail: event.detail ?? null,
    });
  } catch (error) {
    console.error("[security] olay kaydedilemedi:", error);
  }
}

/** Belirli bir anahtar için son `windowMinutes` dakikadaki olay sayısı. */
async function countRecent(
  column: "identifier" | "ip",
  value: string,
  kind: SecurityEventKind,
  windowMinutes: number
): Promise<number> {
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();

  const { count } = await createAdminClient()
    .from("security_events")
    .select("id", { count: "exact", head: true })
    .eq(column, value)
    .eq("kind", kind)
    .gte("created_at", since);

  return count ?? 0;
}

/**
 * Giriş denemesi eşiği.
 *
 * İki ayrı sayaç var çünkü iki ayrı saldırı var: tek bir hesabın şifresini
 * deneyen (aynı kullanıcı adı, çok deneme) ve elindeki şifre listesini bütün
 * hesaplarda deneyen (aynı IP, çok kullanıcı adı). Birincisi kullanıcı adına,
 * ikincisi IP'ye bakarak yakalanıyor.
 *
 * Sayaç veritabanında; Vercel'de her istek başka bir sunucu örneğine düşebildiği
 * için bellekteki bir sayaç işe yaramazdı.
 */
const LIMITS = {
  /** Aynı kullanıcı adı: 15 dakikada 5 başarısız deneme. */
  perIdentifier: { max: 5, windowMinutes: 15 },
  /** Aynı IP: 15 dakikada 20 başarısız deneme (ofisten birkaç kişi girebilir). */
  perIp: { max: 20, windowMinutes: 15 },
  /** Aynı IP: bir saatte 5 kayıt (aşağıdaki gerekçe). */
  signupPerIp: { max: 5, windowMinutes: 60 },
};

export type RateLimitResult = { allowed: true } | { allowed: false; message: string };

const BLOCKED_MESSAGE =
  "Çok fazla başarısız deneme yapıldı. Güvenlik için 15 dakika bekleyip tekrar deneyin.";

const SIGNUP_BLOCKED_MESSAGE =
  "Bu bağlantıdan çok fazla kayıt yapıldı. Güvenlik için bir saat bekleyip tekrar deneyin.";

export async function checkLoginRateLimit(
  identifier: string
): Promise<RateLimitResult> {
  try {
    const { ip } = await requestContext();

    const [byIdentifier, byIp] = await Promise.all([
      countRecent("identifier", identifier, "login_failed", LIMITS.perIdentifier.windowMinutes),
      ip
        ? countRecent("ip", ip, "login_failed", LIMITS.perIp.windowMinutes)
        : Promise.resolve(0),
    ]);

    const overIdentifier = byIdentifier >= LIMITS.perIdentifier.max;
    const overIp = byIp >= LIMITS.perIp.max;

    if (!overIdentifier && !overIp) return { allowed: true };

    // IP eşiğinin aşılması tek bir hesabı zorlamaktan daha ciddi: elde bir liste
    // var demektir. Onu `critical` işaretleyip anında haber veriyoruz.
    await recordSecurityEvent({
      kind: "rate_limited",
      severity: overIp ? "critical" : "warning",
      identifier,
      detail: {
        failedForIdentifier: byIdentifier,
        failedForIp: byIp,
        reason: overIp ? "ip" : "identifier",
      },
    });

    return { allowed: false, message: BLOCKED_MESSAGE };
  } catch (error) {
    // Sayaç okunamadıysa girişi engellemiyoruz: güvenlik tablosundaki bir arıza
    // bütün satıcıları dışarıda bırakmasın. Olay yine de log'a düşüyor.
    console.error("[security] hız sınırı okunamadı:", error);
    return { allowed: true };
  }
}

/**
 * Kayıt eşiği.
 *
 * Girişten ayrı bir sayaç, çünkü ölçtüğü şey farklı: burada sayılan başarısız
 * denemeler değil *başarılı* kayıtlar. Her başarılı kayıt, Supabase'in formda
 * yazılan adrese bir doğrulama e-postası göndermesi demek — ve o adres
 * saldırganın seçtiği herhangi biri olabilir. Yani sayaç şu soruyu yanıtlıyor:
 * "bu bağlantı son bir saatte kaç kişinin gelen kutusuna e-posta yollattı".
 * Başarısız denemeler sayılmıyor çünkü ne hesap açıyorlar ne e-posta
 * gönderiyorlar; onları da saymak yalnızca kaydı gürültüye boğardı.
 *
 * Yalnızca IP'ye bakıyor: kullanıcı adı ve e-posta her denemede farklı
 * olabiliyor, saldırganın değiştirmesi en pahalı olan şey bağlantısı.
 *
 * Eşik bilinçli olarak cömert — kayıt nadir bir işlem ve aynı ofisten birkaç
 * satıcı arka arkaya kaydolabilir. Beşi aşan bir IP artık elle kaydolan bir
 * insan değil.
 */
export async function checkSignupRateLimit(): Promise<RateLimitResult> {
  try {
    const { ip } = await requestContext();

    // IP okunamadıysa sayılacak bir şey yok. Girişteki sayaçla aynı davranış:
    // sayamadığımız bir isteği engellemiyoruz.
    if (!ip) return { allowed: true };

    const recent = await countRecent(
      "ip",
      ip,
      "signup",
      LIMITS.signupPerIp.windowMinutes
    );

    if (recent < LIMITS.signupPerIp.max) return { allowed: true };

    // Otomatik bir betiğin işareti ve doğrudan e-posta kotasına dokunuyor —
    // giriş tarafındaki IP eşiğiyle aynı ciddiyette, o yüzden `critical`.
    await recordSecurityEvent({
      kind: "rate_limited",
      severity: "critical",
      detail: { signupsForIp: recent, reason: "signup_ip" },
    });

    return { allowed: false, message: SIGNUP_BLOCKED_MESSAGE };
  } catch (error) {
    // Girişteki gerekçenin aynısı: güvenlik tablosundaki bir arıza yeni
    // satıcıların kaydolmasını tümden engellemesin.
    console.error("[security] kayıt hız sınırı okunamadı:", error);
    return { allowed: true };
  }
}
