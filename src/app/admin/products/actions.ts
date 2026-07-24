"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ProductFormState = { error: string | null };

async function assertOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "Giriş yapmalısınız.";

  const { data: product } = await supabase
    .from("products")
    .select("owner_id")
    .eq("id", productId)
    .single();

  if (!product || product.owner_id !== user.id) {
    return "Bu ürünü değiştirme yetkiniz yok.";
  }

  return null;
}

function parseFeatures(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((f) => f.trim())
    .filter(Boolean);
}

export async function createProduct(
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const featuresRaw = String(formData.get("features") ?? "");
  const dailyPriceRaw = String(formData.get("daily_price") ?? "").trim();

  if (!name) {
    return { error: "Ürün adı gereklidir." };
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
      description: description || null,
      features: parseFeatures(featuresRaw),
      daily_price: dailyPriceRaw ? Number(dailyPriceRaw) : null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Ürün oluşturulamadı." };
  }

  revalidatePath("/admin");
  redirect(`/admin/products/${data.id}`);
}

export async function updateProduct(
  productId: string,
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const featuresRaw = String(formData.get("features") ?? "");
  const dailyPriceRaw = String(formData.get("daily_price") ?? "").trim();

  if (!name) {
    return { error: "Ürün adı gereklidir." };
  }

  const supabase = await createClient();

  const ownerError = await assertOwner(supabase, productId);
  if (ownerError) return { error: ownerError };

  const { error } = await supabase
    .from("products")
    .update({
      name,
      description: description || null,
      features: parseFeatures(featuresRaw),
      daily_price: dailyPriceRaw ? Number(dailyPriceRaw) : null,
    })
    .eq("id", productId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath(`/product/${productId}`);
  redirect(`/admin/products/${productId}`);
}

export async function deleteProduct(productId: string) {
  const supabase = await createClient();

  const ownerError = await assertOwner(supabase, productId);
  if (ownerError) throw new Error(ownerError);

  const { error } = await supabase.from("products").delete().eq("id", productId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
  redirect("/admin");
}
