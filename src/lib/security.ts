import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Güvenlik olaylarının kaydı ve hız sınırı.
 *
 * İki işi birden yapıyor çünkü ikisi aynı veriye bakıyor: "son 15 dakikada bu
 * kullanıcı adıyla kaç kez başarısız giriş denendi" sorusunun cevabı hem isteği
 * reddetmeye hem de size haber vermeye yarıyor.
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
 * Olayı kaydeder ve gerekiyorsa uyarı gönderir.
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

    if (severity === "critical") {
      await maybeAlert(event, ip);
    }
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

// ---------------------------------------------------------------------------
// Bildirim
// ---------------------------------------------------------------------------

/** Aynı türden uyarıyı bu kadar dakika içinde tekrar göndermez. */
const ALERT_THROTTLE_MINUTES = 30;

/**
 * Kritik olayda haber verir — ama saldırı sürerken dakikada bir e-posta
 * göndermez. Gönderilen her uyarı `alert_sent` olarak kaydediliyor ve bir
 * sonraki gönderimden önce o kayda bakılıyor.
 */
async function maybeAlert(event: SecurityEvent, ip: string | null): Promise<void> {
  const since = new Date(Date.now() - ALERT_THROTTLE_MINUTES * 60_000).toISOString();

  const { count } = await createAdminClient()
    .from("security_events")
    .select("id", { count: "exact", head: true })
    .eq("kind", "alert_sent")
    .contains("detail", { about: event.kind })
    .gte("created_at", since);

  if ((count ?? 0) > 0) return;

  const subject = `[Güvenlik] ${ALERT_TITLES[event.kind] ?? event.kind}`;
  const body = [
    ALERT_TITLES[event.kind] ?? event.kind,
    "",
    `Zaman:      ${new Date().toLocaleString("tr-TR")}`,
    `Olay:       ${event.kind}`,
    `Kullanıcı:  ${event.identifier ?? "—"}`,
    `IP:         ${ip ?? "—"}`,
    `Ayrıntı:    ${JSON.stringify(event.detail ?? {})}`,
    "",
    "Ayrıntılar için yönetim panelindeki Güvenlik sekmesine bakın.",
  ].join("\n");

  const sent = await sendAlertEmail(subject, body);

  await createAdminClient().from("security_events").insert({
    kind: "alert_sent",
    severity: "info",
    detail: { about: event.kind, delivered: sent },
  });
}

const ALERT_TITLES: Partial<Record<SecurityEventKind, string>> = {
  rate_limited: "Yoğun başarısız giriş denemesi engellendi",
  unauthorized: "Yetkisiz veri erişimi denemesi",
  cron_unauthorized: "Cron ucuna geçersiz anahtarla istek geldi",
};

/**
 * Uyarı e-postası.
 *
 * Resend'in HTTP API'sine doğrudan `fetch` ile gidiyor — bir paket daha kurmaya
 * değmeyecek kadar basit bir istek, ve bağımlılık sayısı da bir saldırı yüzeyi.
 * Anahtarlar tanımlı değilse sessizce log'a düşüyor: bildirim kurulmamış olması
 * uygulamayı durdurmamalı.
 */
async function sendAlertEmail(subject: string, body: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ALERT_EMAIL_TO;
  const from = process.env.ALERT_EMAIL_FROM;

  if (!apiKey || !to || !from) {
    console.warn(`[security] ${subject}\n${body}`);
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, text: body }),
    });

    if (!response.ok) {
      console.error("[security] uyarı e-postası gönderilemedi:", await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("[security] uyarı e-postası gönderilemedi:", error);
    return false;
  }
}
