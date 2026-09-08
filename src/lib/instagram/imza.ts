import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Webhook'un gerçekten Meta'dan geldiğinin kanıtı.
 *
 * Uç herkese açık: adresi bilen biri sahte bir "müşteri mesajı" gönderip
 * satıcının takvimine talep düşürebilir, hatta satıcı adına müşteriye mesaj
 * yazdırabilirdi. Meta her isteği uygulama gizli anahtarıyla imzalıyor;
 * doğrulama başarısızsa istek hiç okunmuyor.
 *
 * `secret` yoksa fonksiyon `false` dönüyor — eksik yapılandırma açık kapı
 * değil, kapalı kapı olmalı (bkz. cron ucundaki aynı yaklaşım).
 */
export function imzaGecerli(
  govde: string,
  baslik: string | null,
  secret: string | undefined
): boolean {
  if (!secret || !baslik) return false;

  const beklenen = "sha256=" + createHmac("sha256", secret).update(govde, "utf8").digest("hex");

  const a = Buffer.from(beklenen);
  const b = Buffer.from(baslik);

  // `timingSafeEqual` farklı uzunlukta patlıyor; uzunluk zaten sabit.
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Webhook'u kurarken Meta'nın bir kez sorduğu doğrulama belirteci. Sabit
 * karşılaştırma, imzada olduğu gibi: belirteç tahmin edilmeye çalışılabilir.
 */
export function belirtecGecerli(
  gelen: string | null,
  beklenen: string | undefined
): boolean {
  if (!beklenen || !gelen) return false;

  const a = Buffer.from(beklenen);
  const b = Buffer.from(gelen);

  return a.length === b.length && timingSafeEqual(a, b);
}
