import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Meta'nın hesap sahibi adına bize gönderdiği iki bildirim: "uygulamanın
 * erişimini kaldırdım" ve "verilerimi silin".
 *
 * İkisi de `signed_request` adlı tek bir form alanıyla geliyor:
 * `<imza>.<gövde>`, ikisi de base64url. İmza gövde metninin uygulama gizli
 * anahtarıyla HMAC-SHA256'sı. Uçlar herkese açık olduğundan imza tutmayan
 * istek hiçbir şey sildiremez — yoksa adresi bilen herkes satıcıların
 * Instagram bağlantısını koparabilirdi.
 */

type ImzaliIstek = { user_id?: string | number; algorithm?: string; issued_at?: number };

/** İmza geçerliyse Instagram hesabının kimliği, değilse `null`. */
export function imzaliIstekCoz(ham: string | null): string | null {
  const secret = process.env.INSTAGRAM_APP_SECRET;
  if (!secret || !ham) return null;

  const [imza, govde] = ham.split(".", 2);
  if (!imza || !govde) return null;

  const beklenen = createHmac("sha256", secret).update(govde).digest();
  const gelen = Buffer.from(imza, "base64url");
  if (gelen.length !== beklenen.length || !timingSafeEqual(gelen, beklenen)) return null;

  let veri: ImzaliIstek;
  try {
    veri = JSON.parse(Buffer.from(govde, "base64url").toString("utf8")) as ImzaliIstek;
  } catch {
    return null;
  }

  if (veri.algorithm && veri.algorithm.toUpperCase() !== "HMAC-SHA256") return null;

  const id = veri.user_id !== undefined ? String(veri.user_id) : "";
  return /^\d{1,25}$/.test(id) ? id : null;
}

/**
 * Hesabın bağlantı kaydını siler — belirteç de onunla gidiyor.
 *
 * Meta hangi kimliği göndereceğini belgelemediği için ikisine de bakılıyor:
 * uygulamaya özel kimlik ve işletme kimliği (bkz. 0028). Konuşmalar ve açılmış
 * talepler kalıyor; onlar satıcının müşteri kaydı, bağlantının değil — satıcı
 * panelden bağlantıyı kestiğinde de aynısı oluyor.
 */
export async function baglantiyiSil(igId: string): Promise<{ hata: string | null }> {
  const { error } = await createAdminClient()
    .from("instagram_accounts")
    .delete()
    .or(`ig_user_id.eq.${igId},ig_business_id.eq.${igId}`);

  return { hata: error?.message ?? null };
}

/** Silme talebinin takip kodu; Meta bunu kullanıcıya gösteriyor. */
export function onayKoduUret(): string {
  return randomBytes(8).toString("hex").toUpperCase();
}
