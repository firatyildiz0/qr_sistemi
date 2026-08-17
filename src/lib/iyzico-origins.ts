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
 * Sandbox ve canlı ayrı alan adları kullanıyor; ikisi birden veriliyor ki
 * `IYZICO_ENV` değişince CSP'yi güncellemek gerekmesin.
 */
export const IYZICO_CSP_ORIGINS = [
  "https://static.iyzipay.com",
  "https://sandbox-static.iyzipay.com",
  "https://api.iyzipay.com",
  "https://sandbox-api.iyzipay.com",
  "https://merchantgw.iyzipay.com",
  "https://sandbox-merchantgw.iyzipay.com",
  "https://cpp.iyzipay.com",
  "https://sandbox-cpp.iyzipay.com",
  "https://ode.iyzico.com",
  "https://sandbox-ode.iyzico.com",
] as const;

/** CSP yönergesine girecek biçim: boşlukla ayrılmış tek dize. */
export const IYZICO_CSP_SOURCES = IYZICO_CSP_ORIGINS.join(" ");
