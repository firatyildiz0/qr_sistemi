"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Bağlantıyı kapatır.
 *
 * Satır siliniyor, `is_active = false` yapılmıyor: elde tutulacak tek şey
 * belirteçti ve satıcı bağlantıyı kestiğinde onu saklamak için hiçbir sebep
 * yok. Konuşma geçmişi ve açılmış talepler duruyor — onlar satıcının kaydı,
 * bağlantının değil.
 *
 * Service role ile, çünkü `instagram_accounts` tablosuna `authenticated`
 * rolünün hiçbir erişimi yok (bkz. 0027). Yetkiyi buradaki oturum kontrolü ve
 * `owner_id` koşulu veriyor.
 */
export async function baglantiyiKes(): Promise<{ hata: string | null }> {
  const user = await getCurrentUser();
  if (!user) return { hata: "Bunu yapmak için giriş yapmalısınız." };

  const { error } = await createAdminClient()
    .from("instagram_accounts")
    .delete()
    .eq("owner_id", user.id);

  if (error) return { hata: error.message };

  revalidatePath("/admin/instagram");
  return { hata: null };
}
