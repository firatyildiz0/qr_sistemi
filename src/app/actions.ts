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

  const { data: product } = await supabase
    .from("products")
    .select("id, name, owner_id")
    .eq("id", productId)
    .single();

  if (!product) {
    return { ok: false, error: "Bu QR koda ait bir ürün bulunamadı." };
  }

  if (!user) {
    return {
      ok: false,
      error: "Ürün paneline gitmek için giriş yapmalısınız.",
      publicHref: `/product/${product.id}`,
    };
  }

  // /admin/products/[id] 404'ler when the viewer is not the owner, so send
  // other people to the public page instead of a dead end.
  if (product.owner_id !== user.id) {
    return {
      ok: false,
      error: "Bu ürün size ait değil, herkese açık sayfasını görüntüleyebilirsiniz.",
      publicHref: `/product/${product.id}`,
    };
  }

  return {
    ok: true,
    productId: product.id,
    productName: product.name,
    href: `/admin/products/${product.id}`,
  };
}
