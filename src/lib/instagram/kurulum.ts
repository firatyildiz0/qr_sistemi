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
