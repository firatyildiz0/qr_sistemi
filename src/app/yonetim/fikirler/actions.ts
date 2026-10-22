"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";

export type FikirDurumu = "yeni" | "okundu" | "arsiv";

const DURUMLAR: FikirDurumu[] = ["yeni", "okundu", "arsiv"];

/**
 * Bir önerinin durumunu değiştirir. Yetki `fikirler_update_superuser`
 * politikasında; buradaki kontrol yalnızca hatayı anlaşılır kılmak için.
 */
export async function fikirDurumuDegistir(id: string, durum: FikirDurumu): Promise<void> {
  const me = await getProfile();
  if (me?.role !== "superuser" || me.status !== "approved") throw new Error("Bu işlem için yetkiniz yok.");
  if (!DURUMLAR.includes(durum)) throw new Error("Geçersiz durum.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fikirler")
    .update({ durum })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !data) throw new Error("Durum güncellenemedi. Lütfen tekrar deneyin.");

  revalidatePath("/yonetim/fikirler");
}
