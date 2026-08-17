"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { readPriceField } from "@/lib/format";
import {
  MAX_PRODUCT_IMAGES,
  PRODUCT_IMAGES_BUCKET,
  isProductImageUrl,
  storagePathFromUrl,
} from "@/lib/storage";

export type ProductFormState = { error: string | null };

/**
 * Resolves the product only if the caller owns it. `images` comes back with it
 * because both callers need the current list to clean up storage.
 */
async function loadOwnedProduct(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string
): Promise<{ error: string | null; images: string[] }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Giriş yapmalısınız.", images: [] };

  const { data: product } = await supabase
    .from("products")
    .select("owner_id, images")
    .eq("id", productId)
    .single();

  if (!product || product.owner_id !== user.id) {
    return { error: "Bu ürünü değiştirme yetkiniz yok.", images: [] };
  }

  return { error: null, images: product.images ?? [] };
}

function parseFeatures(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((f) => f.trim())
    .filter(Boolean);
}

/**
 * The uploader submits public storage URLs, not files. Anything that doesn't
 * point at our bucket is dropped so a crafted submission can't park arbitrary
 * URLs on a product, and the list is capped to match the DB constraint.
 */
function parseImages(raw: FormDataEntryValue[]): string[] {
  return raw
    .map((v) => String(v).trim())
    .filter((url) => url && isProductImageUrl(url))
    .slice(0, MAX_PRODUCT_IMAGES);
}

/**
 * Etiket numarası serbest metin ama etikete basılıyor: boşluk ve okunamayan
 * karakterler basılı numarayı işe yaramaz hale getirir, o yüzden veritabanı
 * kısıtıyla (bkz. 0022) aynı biçim burada da uygulanıyor. Boş bırakılırsa null
 * — numara zorunlu değil.
 *
 * `undefined` "biçim tutmuyor" demek; null "numara yok".
 */
const BARCODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,31}$/;

const BARCODE_ERROR =
  "Barkod numarası harf ve rakamla başlamalı; yalnızca harf, rakam, tire, alt çizgi, nokta ve eğik çizgi içerebilir (en fazla 32 karakter).";

const duplicateBarcodeError = (barcode: string) =>
  `"${barcode}" barkod numarası başka bir üründe kullanılıyor. Her ürüne kendi numarasını verin.`;

function parseBarcode(raw: string): string | null | undefined {
  const barcode = raw.trim();
  if (!barcode) return null;
  return BARCODE_PATTERN.test(barcode) ? barcode : undefined;
}

/** Aynı satıcıda numara tekrarlandığında dönen tekillik ihlali. */
function isDuplicateBarcode(error: { code?: string; message?: string }) {
  return error.code === "23505" && (error.message ?? "").includes("products_owner_barcode_key");
}

function parseStock(raw: string): number | null {
  if (!raw) return 1;
  const stock = Number(raw);
  if (!Number.isFinite(stock) || stock < 0) return null;
  return Math.trunc(stock);
}

/**
 * Best-effort cleanup of images dropped from a product. A failure here leaves
 * an orphaned object in the bucket, which is harmless — it must not fail the
 * save the seller actually asked for.
 */
async function removeStoredImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  urls: string[]
) {
  const paths = urls
    .map(storagePathFromUrl)
    .filter((p): p is string => p !== null);

  if (paths.length === 0) return;

  await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove(paths);
}

export async function createProduct(
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const featuresRaw = String(formData.get("features") ?? "");
  const dailyPrice = readPriceField(String(formData.get("daily_price") ?? ""));
  const stock = parseStock(String(formData.get("stock") ?? "").trim());
  const images = parseImages(formData.getAll("images"));
  const barcode = parseBarcode(String(formData.get("barcode") ?? ""));

  if (!name) {
    return { error: "Ürün adı gereklidir." };
  }

  if (stock === null) {
    return { error: "Stok adedi 0 veya daha büyük bir sayı olmalıdır." };
  }

  if (dailyPrice === undefined) {
    return { error: "Günlük kiralama fiyatı 0 veya daha büyük bir sayı olmalıdır." };
  }

  if (barcode === undefined) {
    return { error: BARCODE_ERROR };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Ürün oluşturmak için giriş yapmalısınız." };
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      owner_id: user.id,
      name,
      features: parseFeatures(featuresRaw),
      daily_price: dailyPrice,
      stock,
      images,
      barcode,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error && isDuplicateBarcode(error)) {
      return { error: duplicateBarcodeError(barcode!) };
    }
    return { error: error?.message ?? "Ürün oluşturulamadı." };
  }

  revalidatePath("/admin/products");
  revalidatePath("/admin");
  redirect(`/admin/products/${data.id}`);
}

export async function updateProduct(
  productId: string,
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const featuresRaw = String(formData.get("features") ?? "");
  const dailyPrice = readPriceField(String(formData.get("daily_price") ?? ""));
  const stock = parseStock(String(formData.get("stock") ?? "").trim());
  const images = parseImages(formData.getAll("images"));
  const barcode = parseBarcode(String(formData.get("barcode") ?? ""));

  if (!name) {
    return { error: "Ürün adı gereklidir." };
  }

  if (stock === null) {
    return { error: "Stok adedi 0 veya daha büyük bir sayı olmalıdır." };
  }

  if (dailyPrice === undefined) {
    return { error: "Günlük kiralama fiyatı 0 veya daha büyük bir sayı olmalıdır." };
  }

  if (barcode === undefined) {
    return { error: BARCODE_ERROR };
  }

  const supabase = await createClient();

  const owned = await loadOwnedProduct(supabase, productId);
  if (owned.error) return { error: owned.error };

  const { error } = await supabase
    .from("products")
    .update({
      name,
      features: parseFeatures(featuresRaw),
      daily_price: dailyPrice,
      stock,
      images,
      barcode,
    })
    .eq("id", productId);

  if (error) {
    return { error: isDuplicateBarcode(error) ? duplicateBarcodeError(barcode!) : error.message };
  }

  await removeStoredImages(
    supabase,
    owned.images.filter((url) => !images.includes(url))
  );

  revalidatePath("/admin/products");
  revalidatePath("/admin");
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath(`/product/${productId}`);
  redirect(`/admin/products/${productId}`);
}

export async function deleteProduct(productId: string) {
  const supabase = await createClient();

  const owned = await loadOwnedProduct(supabase, productId);
  if (owned.error) throw new Error(owned.error);

  const { error } = await supabase.from("products").delete().eq("id", productId);

  if (error) {
    throw new Error(error.message);
  }

  await removeStoredImages(supabase, owned.images);

  revalidatePath("/admin/products");
  revalidatePath("/admin");
  redirect("/admin/products");
}
