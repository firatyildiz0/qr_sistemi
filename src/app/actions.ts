"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { isProductImageUrl } from "@/lib/storage";
import { isImageSignature, type ImageSignature } from "@/lib/vision";

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

// ---------------------------------------------------------------------------
// Görselden ürün bulma
// ---------------------------------------------------------------------------

/** Tarayıcıdaki eşleştiricinin bir ürün hakkında bilmesi gereken her şey. */
export type VisualCandidate = {
  id: string;
  name: string;
  barcode: string | null;
  images: string[];
  /**
   * Kayıtlı parmak izleri. Boş geldiğinde tarayıcı fotoğrafı kendisi indirip
   * çıkarır ve `saveImageSignatures` ile geri yazar — böylece özellik, eski
   * ürünler için ayrıca bir toplu iş çalıştırmayı beklemeden çalışır.
   */
  signatures: ImageSignature[];
};

/**
 * Satıcının fotoğrafı olan ürünleri.
 *
 * Eşleştirme sunucuda değil tarayıcıda yapılıyor: aksi hâlde her kamera karesi
 * için bir istek gitmesi gerekirdi ve depoda mobil bağlantıyla çalışan satıcı
 * ürünü saniyeler sonra bulurdu. Sunucunun işi adayları bir kez vermek.
 *
 * Fotoğrafsız ürünler hiç gelmiyor — karşılaştırılacak bir şeyleri yok.
 */
export async function getVisualCandidates(): Promise<VisualCandidate[]> {
  const [user, supabase] = await Promise.all([getCurrentUser(), createClient()]);
  if (!user) return [];

  const { data } = await supabase
    .from("products")
    .select("id, name, barcode, images, image_signature")
    .eq("owner_id", user.id)
    .order("name");

  return (data ?? [])
    .map((row) => ({
      id: row.id as string,
      name: row.name as string,
      barcode: (row.barcode ?? null) as string | null,
      images: ((row.images ?? []) as string[]).filter(isProductImageUrl),
      signatures: Array.isArray(row.image_signature)
        ? (row.image_signature as unknown[]).filter(isImageSignature)
        : [],
    }))
    .filter((product) => product.images.length > 0);
}

/**
 * Tarayıcının çıkardığı parmak izlerini ürüne yazar.
 *
 * Gelen imzanın `url`'i ürünün kendi fotoğraflarından biri olmak zorunda:
 * istek elle de gönderilebilir ve o zaman kolona ürünle ilgisi olmayan bir
 * içerik yazılabilirdi. Yazma hakkını 0018'deki politika zaten sahibiyle
 * sınırlıyor, buradaki kontrol içeriğin anlamını koruyor.
 */
export async function saveImageSignatures(
  productId: string,
  signatures: ImageSignature[]
): Promise<void> {
  const [user, supabase] = await Promise.all([getCurrentUser(), createClient()]);
  if (!user || !UUID_RE.test(productId)) return;

  const { data: product } = await supabase
    .from("products")
    .select("images")
    .eq("id", productId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!product) return;

  const own = new Set((product.images ?? []) as string[]);
  const clean = signatures
    .filter(isImageSignature)
    .filter((signature) => own.has(signature.url));

  if (!clean.length) return;

  await supabase
    .from("products")
    .update({ image_signature: clean })
    .eq("id", productId)
    .eq("owner_id", user.id);
}
