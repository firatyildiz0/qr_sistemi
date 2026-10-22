/**
 * Ödeme formunun konuştuğu iyzico alan adları — CSP'ye eklenmesi gerekenler.
 *
 * Neden ayrı bir dosya: bu listeyi hem `proxy.ts` (CSP başlığını kuran taraf)
 * hem `lib/iyzico.ts` istiyor, ama proxy Edge çalışma zamanında koşuyor ve
 * `lib/iyzico.ts` `node:crypto` içeriyor — oradan içe aktarmak proxy'yi
 * patlatırdı. Liste burada, hiçbir şey içe aktarmayan bu dosyada duruyor ki
 * tek kaynak kalsın; iki yere elle yazılıp birinin güncellenmesi unutulmasın.
 *
 * iyzico'nun parçacığı kendi paketini `document.createElement('script')` ile
 * ekliyor ve formu bir iframe içinde çiziyor. `strict-dynamic` yalnızca
 * nonce'lu script'in *kendi* eklediklerini kapsıyor, iframe'i kapsamıyor — o
 * yüzden alan adları açıkça listeleniyor.
 *
 * Sandbox ve canlı ayrı alt alan adları kullanıyor (`sandbox-api.` gibi);
 * joker ikisini de kapsıyor, `IYZICO_ENV` değişince CSP'yi güncellemek
 * gerekmiyor.
 */
export const IYZICO_CSP_ORIGINS = [
  // Ödeme formu dosyalarını birden çok alt alan adından çekiyor ve bu liste
  // iyzico'nun elinde değişiyor: paket `static.`, kart logoları ve stiller
  // `cdn.`, istekler `api.`, `merchant-gateway.`, `consumerapigw.`. Tek tek
  // yazılan liste `cdn.` eksik kaldığında formu stilsiz ve logosuz
  // bırakmıştı; iki alan adının bütün alt alan adlarına izin veriliyor.
  "https://*.iyzipay.com",
  "https://*.iyzico.com",
] as const;

/** CSP yönergesine girecek biçim: boşlukla ayrılmış tek dize. */
export const IYZICO_CSP_SOURCES = IYZICO_CSP_ORIGINS.join(" ");
