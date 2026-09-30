"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { saticiyaPushGonder } from "@/lib/bildirim/push";

/*
 * Bildirim yazmaları doğrudan sahiplik kolonundan (`owner_id`) süzülüyor.
 * Eskiden ürün üzerinden süzülüyordu; ürünü olmayan talep bildirimleri (çok
 * ürünlü talep) bu yüzden hiç okundu işaretlenemiyordu. RLS de aynı kolona
 * bakıyor; buradaki filtre yanlış uygulanmış bir migration'a karşı ikinci kilit.
 */

function revalidateNotifications() {
  revalidatePath("/admin/products");
  revalidatePath("/admin/notifications");
  revalidatePath("/admin", "layout");
}

async function oturum() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Oturum bulunamadı.");
  return user;
}

export async function markNotificationRead(notificationId: string) {
  const user = await oturum();
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);
  revalidateNotifications();
}

export async function markAllNotificationsRead() {
  const user = await oturum();
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("is_read", false)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);
  revalidateNotifications();
}

export async function deleteNotification(notificationId: string) {
  const user = await oturum();
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);
  revalidateNotifications();
}

export async function deleteReadNotifications() {
  const user = await oturum();
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("is_read", true)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);
  revalidateNotifications();
}

/* ------------------------------------------------------------------------ */
/* Telefon bildirimleri                                                     */
/* ------------------------------------------------------------------------ */

export type PushAboneligi = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

function gecerliMi(a: PushAboneligi): boolean {
  return (
    typeof a?.endpoint === "string" &&
    a.endpoint.startsWith("https://") &&
    a.endpoint.length < 1000 &&
    typeof a.keys?.p256dh === "string" &&
    typeof a.keys?.auth === "string" &&
    a.keys.p256dh.length < 200 &&
    a.keys.auth.length < 100
  );
}

/**
 * Cihazın aboneliğini kaydeder.
 *
 * Servis anahtarıyla yazılıyor çünkü adres cihaza ait, hesaba değil: aynı
 * telefonda önce başka bir hesap açıkmış olabilir. O zaman satır yeni sahibe
 * geçmeli — bildirim artık o telefonda oturum açmış kişiye gitmeli. RLS'li bir
 * upsert başkasının satırını devralamazdı. Sahip her zaman oturumdan geliyor.
 */
export async function pushAboneOl(
  abonelik: PushAboneligi,
  userAgent: string | null
): Promise<{ ok: boolean }> {
  const user = await oturum();
  if (!gecerliMi(abonelik)) return { ok: false };

  const db = createAdminClient();
  const { error } = await db.from("push_subscriptions").upsert(
    {
      owner_id: user.id,
      endpoint: abonelik.endpoint,
      p256dh: abonelik.keys.p256dh,
      auth: abonelik.keys.auth,
      user_agent: userAgent?.slice(0, 300) ?? null,
    },
    { onConflict: "endpoint" }
  );

  return { ok: !error };
}

export async function pushAboneligiSil(endpoint: string): Promise<void> {
  const user = await oturum();
  const supabase = await createClient();
  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("owner_id", user.id);
}

/** Ayar kartındaki "deneme bildirimi gönder". */
export async function denemeBildirimiGonder(): Promise<{ ulasan: number }> {
  const user = await oturum();
  const ulasan = await saticiyaPushGonder(user.id, {
    title: "Bildirimler açık 🎉",
    body: "Instagram'dan yeni bir talep geldiğinde size böyle haber vereceğiz.",
    url: "/admin/notifications",
    tag: "deneme",
  });
  return { ulasan };
}
