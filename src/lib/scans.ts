import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * QR okutmalarının kaydı.
 *
 * "Okutma" burada şu demek: ürün sayfası, sahibi olmayan biri tarafından
 * açıldı. QR etiketinin götürdüğü tek yer o sayfa olduğu için sayfanın
 * ziyaretiyle etiketin okutulması pratikte aynı şey; satıcının kendi
 * panelinden ürüne bakması ise sayılmıyor, yoksa ölçü müşteri ilgisini değil
 * satıcının gün içindeki gezinmesini gösterirdi.
 *
 * Kayıt service role ile atılıyor (bkz. 0019: tabloda insert politikası yok),
 * böylece tarayıcıdaki anon anahtarla sayaç şişirilemiyor.
 */

/**
 * Link önizlemesi çıkaran botlar ve tarayıcılar. WhatsApp'a ürün bağlantısı
 * gönderildiğinde sunucusu sayfayı kendisi çekiyor; onu müşteri saymak
 * istatistiği tek bir paylaşımla katlıyordu.
 */
const BOT_PATTERN =
  /bot|crawler|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|preview|embed|curl|wget|python-requests|headless|lighthouse|monitor|pingdom|uptime/i;

/**
 * Ziyaretçinin tekrar kontrolü için kullanılan tek yönlü özet.
 *
 * Tuz olarak service role anahtarı kullanılıyor: yalnızca sunucuda bulunan,
 * her ortamda zaten tanımlı bir gizli değer. Tuzsuz bir SHA-256, IP adresi
 * uzayı küçük olduğu için kaba kuvvetle geri çevrilebilirdi.
 */
function visitorHash(productId: string, ip: string | null, userAgent: string | null) {
  if (!ip) return null;

  return createHash("sha256")
    .update(`${productId}|${ip}|${userAgent ?? ""}|${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`)
    .digest("hex");
}

export type ScanContext = {
  ip: string | null;
  userAgent: string | null;
};

/**
 * Okutmayı kaydeder. Hiçbir koşulda çağıranı patlatmaz — istatistik tutmak
 * müşterinin gördüğü sayfayı bozmamalı. Hata olursa sunucu log'una düşer.
 *
 * Aynı ziyaretçinin 30 dakika içindeki tekrarları veritabanı tarafında
 * eleniyor (`record_product_scan`).
 */
export async function recordProductScan(
  productId: string,
  { ip, userAgent }: ScanContext
): Promise<void> {
  if (userAgent && BOT_PATTERN.test(userAgent)) return;

  try {
    await createAdminClient().rpc("record_product_scan", {
      p_product_id: productId,
      p_visitor_hash: visitorHash(productId, ip, userAgent),
    });
  } catch (error) {
    console.error("[scans] okutma kaydedilemedi:", error);
  }
}
