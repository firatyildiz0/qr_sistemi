"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateStock(productId: string, nextStock: number) {
  if (!Number.isInteger(nextStock) || nextStock < 0) throw new Error("Geçersiz stok değeri.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Oturum açmanız gerekiyor.");
  const { error } = await supabase.from("products").update({ stock: nextStock }).eq("id", productId).eq("owner_id", user.id);
  if (error) throw new Error("Stok güncellenemedi.");
  revalidatePath("/stok");
  revalidatePath("/admin/products");
  return { ok: true };
}
