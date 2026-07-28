"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

/**
 * Ids of the products the signed-in seller owns, used to scope notification
 * writes. Returns null when there is no session.
 *
 * The RLS policies on `notifications` already restrict these updates to the
 * owner; scoping here as well means a misapplied migration can't turn into
 * one seller clearing another's notifications.
 */
async function ownedProductIds() {
  const [user, supabase] = await Promise.all([getCurrentUser(), createClient()]);
  if (!user) return null;

  const { data, error } = await supabase
    .from("products")
    .select("id")
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);
  return (data ?? []).map((p: { id: string }) => p.id);
}

function revalidateNotifications() {
  revalidatePath("/admin/products");
  revalidatePath("/admin/notifications");
}

export async function markNotificationRead(notificationId: string) {
  const productIds = await ownedProductIds();
  if (!productIds) throw new Error("Oturum bulunamadı.");
  if (productIds.length === 0) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .in("product_id", productIds);

  if (error) {
    throw new Error(error.message);
  }

  revalidateNotifications();
}

export async function markAllNotificationsRead() {
  const productIds = await ownedProductIds();
  if (!productIds) throw new Error("Oturum bulunamadı.");
  if (productIds.length === 0) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("is_read", false)
    .in("product_id", productIds);

  if (error) {
    throw new Error(error.message);
  }

  revalidateNotifications();
}
