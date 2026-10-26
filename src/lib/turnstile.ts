/**
 * Cloudflare Turnstile ("robot değilim" doğrulaması).
 *
 * Hız sınırı aşıldığında hesabı kilitlemek yerine doğrulama isteniyor. Kilit,
 * bir kullanıcı adını bilen herkesin o kişiyi beş yanlış şifreyle 15 dakika
 * dışarıda tutabilmesi demekti; doğrulama ise gerçek kişiyi geçirip betiği
 * durduruyor.
 *
 * İki anahtar da tanımlı değilse kapalı: o zaman hız sınırı eskisi gibi kilit
 * olarak çalışıyor. Site anahtarı derlemede pakete gömüldüğü için eklendikten
 * sonra yeniden deploy gerekiyor.
 */
export function turnstileEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY);
}

/** Widget'ın forma koyduğu gizli alanın adı. */
export const TURNSTILE_FIELD = "cf-turnstile-response";

export type TurnstileAction = "login" | "signup";

/**
 * Jetonu Cloudflare'e doğrulatır. Jeton tek kullanımlık ve 5 dakika geçerli.
 * `action` widget'a verilenle karşılaştırılıyor: kayıt formunda çözülen bir
 * jeton girişte kullanılamasın.
 *
 * Cloudflare'e ulaşılamazsa doğrulanmamış sayılıyor. Bu yalnızca sınırı zaten
 * aşmış isteklere uygulandığı için sıradan bir girişi etkilemiyor.
 */
export async function verifyTurnstile(
  token: string,
  action: TurnstileAction,
  ip: string | null
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || !token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set("remoteip", ip);

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as { success?: boolean; action?: string };

    // Cloudflare'in test anahtarları `action` döndürmüyor; döndüğünde eşleşmeli.
    return data.success === true && (!data.action || data.action === action);
  } catch (error) {
    console.error("[turnstile] doğrulama yapılamadı:", error);
    return false;
  }
}
