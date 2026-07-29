"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { customerKey } from "@/lib/customers";

/**
 * Deletes everything the panel knows about these customers.
 *
 * There is no customers table — a customer is a group of bookings sharing an
 * identity (see `@/lib/customers`), so removing one means removing its
 * bookings. Notifications cascade with them.
 *
 * The client sends only customer keys. The bookings behind each key are
 * re-derived here from the caller's own rows, so a crafted request can never
 * reach another seller's bookings even if it guesses a valid key.
 */
export async function deleteCustomers(keys: string[]) {
  const wanted = new Set(keys.map((k) => String(k)).filter(Boolean));
  if (wanted.size === 0) throw new Error("Silinecek müşteri seçilmedi.");

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Giriş yapmalısınız.");

  const { data, error } = await supabase
    .from("bookings")
    .select("id, customer_name, customer_phone, products!inner(owner_id)")
    .eq("products.owner_id", user.id);

  if (error) throw new Error(error.message);

  const ids = (data ?? []).filter((row) => wanted.has(customerKey(row))).map((row) => row.id);

  if (ids.length === 0) {
    throw new Error("Bu müşteriler bulunamadı. Sayfayı yenileyip tekrar deneyin.");
  }

  // `select()` so a delete blocked by RLS — which reports no error, just no
  // rows — fails loudly instead of looking like it worked.
  const { data: deleted, error: deleteError } = await supabase
    .from("bookings")
    .delete()
    .in("id", ids)
    .select("id");

  if (deleteError) throw new Error(deleteError.message);

  if ((deleted ?? []).length === 0) {
    throw new Error("Silme yetkiniz yok gibi görünüyor. Hiçbir kayıt silinmedi.");
  }

  // "layout" so the customer detail pages under this segment go stale too —
  // the one just deleted must not stay in the cache as a live page.
  revalidatePath("/admin/customers", "layout");
  revalidatePath("/admin");
}
