import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Entegrasyonun yapılandırma yüzü.
 *
 * Dört ortam değişkeni olmadan Instagram akışı çalışamaz. Eksik olduğunda
 * uygulamanın geri kalanı etkilenmiyor — panel "bağlanmamış" diyor, webhook
 * imzasız isteği zaten reddediyor — ama eksikliğin tek yerden anlaşılması
 * gerekiyor ki panel ile uç aynı cevabı versin.
 */
export function instagramYapilandirildi(): boolean {
  return Boolean(
    process.env.INSTAGRAM_APP_ID &&
      process.env.INSTAGRAM_APP_SECRET &&
      process.env.INSTAGRAM_VERIFY_TOKEN
  );
}

/** İzin ekranında geçirilebilecek en uzun süre; sonra `state` bayatlıyor. */
const STATE_OMRU_MS = 15 * 60 * 1000;

function imza(govde: string): string {
  return createHmac("sha256", process.env.INSTAGRAM_APP_SECRET!)
    .update(`instagram-state:${govde}`)
    .digest("base64url");
}

/**
 * OAuth `state` değeri: bağlantıyı başlatan satıcı + zaman, uygulama sırrıyla
 * imzalı.
 *
 * Eskiden `state` bir çerezle karşılaştırılıyordu ve dönüş başka bir
 * tarayıcıda açıldığında (telefonda Instagram uygulamasından dönüş, farklı alan
 * adı) çerez olmadığı için bağlantı "doğrulanamadı" diye düşüyordu. İmzalı
 * değer çerez istemiyor; CSRF korumasını ise dönüşteki oturumun bu satıcıyla
 * aynı olması şartı veriyor (bkz. callback).
 */
export function stateUret(saticiId: string): string {
  const govde = `${saticiId}.${Date.now()}.${randomBytes(9).toString("base64url")}`;
  return `${govde}.${imza(govde)}`;
}

/** İmza tutuyor ve süresi geçmemişse state'i başlatan satıcının kimliği. */
export function stateCoz(state: string | null): string | null {
  if (!state) return null;

  const son = state.lastIndexOf(".");
  if (son === -1) return null;

  const govde = state.slice(0, son);
  const gelen = Buffer.from(state.slice(son + 1));
  const beklenen = Buffer.from(imza(govde));
  if (gelen.length !== beklenen.length || !timingSafeEqual(gelen, beklenen)) return null;

  const [saticiId, zaman] = govde.split(".");
  if (!saticiId || Date.now() - Number(zaman) > STATE_OMRU_MS) return null;

  return saticiId;
}

/**
 * Uygulamanın herkese açık adresi üzerinden tam URL.
 *
 * OAuth dönüş adresi Meta'ya kayıtlı olanla *birebir* aynı olmak zorunda, o
 * yüzden istekteki host'tan türetilmiyor: ters vekil arkasında host değişebilir
 * ve bağlantı sessizce kırılırdı.
 */
export function yonlendirmeAdresi(yol: string): URL {
  const taban = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return new URL(yol, taban.endsWith("/") ? taban : `${taban}/`);
}
