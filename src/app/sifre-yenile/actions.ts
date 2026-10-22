"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, homePathFor } from "@/lib/profile";
import { passwordError } from "@/lib/password";
import { recordSecurityEvent } from "@/lib/security";

export type YenilemeDurumu = { hata: string | null };

/**
 * Sıfırlama bağlantısıyla açılan oturumda yeni şifreyi kaydeder.
 *
 * Kurallar kayıttakiyle aynı (lib/password.ts). Başarıdan sonra diğer
 * cihazlardaki oturumlar kapatılıyor: şifre sıfırlamanın bir sebebi de
 * hesabın başkasının elinde olduğundan şüphelenmek.
 */
export async function sifreyiYenile(_onceki: YenilemeDurumu, formData: FormData): Promise<YenilemeDurumu> {
  const sifre = String(formData.get("password") ?? "");
  const tekrar = String(formData.get("password_tekrar") ?? "");

  const zayif = passwordError(sifre);
  if (zayif) return { hata: zayif };
  if (sifre !== tekrar) return { hata: "İki şifre birbirini tutmuyor." };

  const supabase = await createClient();
  const { data: oturum } = await supabase.auth.getUser();
  if (!oturum.user) {
    return { hata: "Oturumunuzun süresi dolmuş. Şifremi unuttum ekranından yeni bir bağlantı isteyin." };
  }

  const { error } = await supabase.auth.updateUser({ password: sifre });
  if (error) {
    // Supabase yeni şifrenin eskisiyle aynı olmasını reddediyor; diğer
    // hatalar ayrıntı vermeden.
    if (error.code === "same_password") return { hata: "Yeni şifre eskisiyle aynı olamaz." };
    console.error("[sifre-yenile] güncellenemedi:", error.message);
    return { hata: "Şifre güncellenemedi. Biraz sonra tekrar deneyin." };
  }

  await supabase.auth.signOut({ scope: "others" });
  await recordSecurityEvent({ kind: "sifre_degisti", identifier: oturum.user.email ?? null });

  const profil = await getProfile();
  redirect(profil?.status === "approved" ? homePathFor(profil) : "/login");
}
