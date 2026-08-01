/**
 * Telefona mesaj gönderme — Telegram botu üzerinden.
 *
 * Neden SMS değil: Türkiye'ye SMS'in ücretsizi yok, her giriş denemesi para
 * demek olurdu. Telegram bot API'si ücretsiz, limitsiz ve teslimatı anında;
 * mesaj kullanıcının telefonuna bildirim olarak düşüyor — yani "telefonuma kod
 * gelsin" ihtiyacını maliyetsiz karşılıyor.
 *
 * Güvenlik olayı e-postasındaki (lib/security.ts) düzenin aynısı: paket
 * kurmaya değmeyecek kadar basit bir HTTP isteği, doğrudan `fetch` ile.
 */

const TELEGRAM_TIMEOUT_MS = 5000;

/** Bot ve alıcı tanımlı mı. Tanımlı değilse ikinci adım hiç devreye girmiyor. */
export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

/**
 * Mesajı gönderir, gönderilip gönderilmediğini döndürür.
 *
 * Çağıranı patlatmıyor: hata fırlatmak yerine `false` dönüyor, çünkü gönderimin
 * başarısız olduğu durumda ne yapılacağına çağıran karar veriyor (giriş
 * akışında kapı kapanıyor, bildirimde yalnızca log'a düşüyor).
 */
export async function sendTelegramMessage(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn("[telegram] bot tanımlı değil, mesaj gönderilmedi");
    return false;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      // Telegram erişilemezse giriş formu dakikalarca beklemesin.
      signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error("[telegram] mesaj gönderilemedi:", await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("[telegram] mesaj gönderilemedi:", error);
    return false;
  }
}
