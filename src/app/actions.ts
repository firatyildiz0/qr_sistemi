"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export type ScanResult =
  | { ok: true; productId: string; productName: string; href: string }
  | { ok: false; error: string; publicHref?: string };

const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * Printed labels carry the public URL (`.../product/<id>`), but people also
 * paste an admin URL or the bare id, so accept all three shapes.
 */
function extractProductId(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;

  const fromPath = text.match(/\/(?:product|products)\/([^/?#\s]+)/i);
  if (fromPath) {
    const candidate = decodeURIComponent(fromPath[1]);
    if (UUID_RE.test(candidate)) return candidate.match(UUID_RE)![0];
  }

  const bare = text.match(UUID_RE);
  return bare ? bare[0] : null;
}

export async function resolveScannedCode(raw: string): Promise<ScanResult> {
  const productId = extractProductId(raw);

  if (!productId) {
    return { ok: false, error: "Bu QR kodu bir RentQR ürün etiketi değil." };
  }

  const [user, supabase] = await Promise.all([getCurrentUser(), createClient()]);

  // Tablo yalnızca sahibine açık (bkz. 0018), ama sahiplik burada da açıkça
  // karşılaştırılıyor — panel bağlantısını vermeden önce tek bir politikaya
  // güvenmiyoruz. Satır gelmediğinde ürün ya başkasınındır ya da hiç yoktur;
  // ikisini ayırmak için herkese açık görünüme bakılıyor, aksi hâlde
  // başkasının etiketini okutan satıcıya "böyle bir ürün yok" denirdi.
  const { data: row } = await supabase
    .from("products")
    .select("id, name, owner_id")
    .eq("id", productId)
    .maybeSingle();

  const owned = row && user && row.owner_id === user.id ? row : null;

  if (!owned) {
    const { data } = await supabase.rpc("product_public", { p_id: productId });
    const other = data?.[0];

    if (!other) {
      return { ok: false, error: "Bu QR koda ait bir ürün bulunamadı." };
    }

    return {
      ok: false,
      error: user
        ? "Bu ürün size ait değil, herkese açık sayfasını görüntüleyebilirsiniz."
        : "Ürün paneline gitmek için giriş yapmalısınız.",
      publicHref: `/product/${other.id}`,
    };
  }

  // Buraya gelindiyse satır RLS'ten geçmiş demektir: tarayan kişi hem oturum
  // açmış hem de ürünün sahibi. Eskiden burada duran "giriş yaptın mı" ve
  // "sahibi misin" kontrolleri artık politikanın kendisinde.
  return {
    ok: true,
    productId: owned.id,
    productName: owned.name,
    href: `/admin/products/${owned.id}`,
  };
}
