"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { isValidUsername, normalizeUsername, USERNAME_RULE } from "@/lib/username";

export type UsernameState = { error: string | null };

/**
 * Türetilmiş kullanıcı adını satıcının kendi seçtiğiyle değiştirir.
 *
 * Yetki kontrolü `profiles_update_own_pending_username` politikasında: kendi
 * satırı değilse ya da adını zaten bir kez belirlemişse update hiçbir satıra
 * dokunmaz. Buradaki `username_auto` filtresi o politikayı tekrar etmek için
 * değil, "hiç satır dönmedi" durumunu ayırt edebilmek için.
 */
export async function setUsername(
  _prevState: UsernameState,
  formData: FormData
): Promise<UsernameState> {
  const username = normalizeUsername(formData.get("username"));

  if (!isValidUsername(username)) {
    return { error: `Kullanıcı adı geçersiz. ${USERNAME_RULE}` };
  }

  const user = await getCurrentUser();
  if (!user) return { error: "Oturumunuz sona ermiş. Lütfen tekrar giriş yapın." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ username, username_auto: false })
    .eq("id", user.id)
    .eq("username_auto", true)
    .select("username")
    .maybeSingle();

  // 23505: unique_violation — aynı kullanıcı adı başkasında.
  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Bu kullanıcı adı kullanılıyor, başka bir tane deneyin."
          : "Kullanıcı adı kaydedilemedi. Lütfen tekrar deneyin.",
    };
  }

  if (!data) {
    return { error: "Kullanıcı adınız zaten belirlenmiş." };
  }

  // Layout profili okuyor; yenilenmezse pencere kapanmaz.
  revalidatePath("/admin", "layout");
  return { error: null };
}
