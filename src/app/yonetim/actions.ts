"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import type { ProfileStatus } from "@/lib/profile";

/**
 * Bir kaydın durumunu değiştirir. Yetki `profiles_update_superuser`
 * politikasında; buradaki rol kontrolü sadece hatayı anlaşılır kılmak ve
 * superuser'ın kendi hesabını kilitlemesini engellemek için.
 */
async function setStatus(userId: string, status: ProfileStatus): Promise<void> {
  const me = await getProfile();
  if (me?.role !== "superuser") throw new Error("Bu işlem için yetkiniz yok.");
  if (me.id === userId) throw new Error("Kendi hesabınızın durumunu değiştiremezsiniz.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ status })
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  if (error || !data) throw new Error("Durum güncellenemedi. Lütfen tekrar deneyin.");

  revalidatePath("/yonetim");
}

export async function approveUser(userId: string): Promise<void> {
  await setStatus(userId, "approved");
}

export async function rejectUser(userId: string): Promise<void> {
  await setStatus(userId, "rejected");
}
