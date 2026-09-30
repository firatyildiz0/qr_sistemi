"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MAX_AD_UZUNLUGU, MAX_SEKTOR_UZUNLUGU, renkGecerli } from "@/lib/hesap";
import { PRODUCT_IMAGES_BUCKET, storagePathFromUrl } from "@/lib/storage";

export type ProfilGirdisi = {
  adSoyad: string;
  sektor: string;
  avatarUrl: string | null;
  avatarRenk: string | null;
};

/**
 * Hesabım ekranındaki bilgileri kaydeder.
 *
 * Yazma `update_my_profile()` fonksiyonundan geçiyor (bkz. 0030): profil
 * satırında rol ve onay durumu da var, doğrudan update izni onlara da uzanırdı.
 * Fotoğraf adresi burada da kontrol ediliyor — kendi kovamızda, satıcının
 * kendi klasöründe olmalı — fonksiyon aynı kontrolü bir kez daha yapıyor.
 *
 * Eski fotoğraf değiştiyse kovadan siliniyor; silinemese de profil kaydı
 * geçerli, yalnızca kovada sahipsiz bir dosya kalır.
 */
export async function profiliKaydet(girdi: ProfilGirdisi): Promise<{ hata: string | null }> {
  const user = await getCurrentUser();
  if (!user) return { hata: "Oturumunuz sona ermiş. Lütfen tekrar giriş yapın." };

  const adSoyad = String(girdi.adSoyad ?? "").trim().replace(/\s+/g, " ");
  const sektor = String(girdi.sektor ?? "").trim();

  if (adSoyad.length > MAX_AD_UZUNLUGU) return { hata: "Ad soyad çok uzun." };
  if (sektor.length > MAX_SEKTOR_UZUNLUGU) return { hata: "Sektör adı çok uzun." };
  if (girdi.avatarRenk !== null && !renkGecerli(girdi.avatarRenk)) {
    return { hata: "Geçersiz renk." };
  }

  let avatarUrl: string | null = null;
  if (girdi.avatarUrl) {
    const yol = storagePathFromUrl(girdi.avatarUrl);
    if (!yol || !yol.startsWith(`${user.id}/avatar/`)) {
      return { hata: "Profil fotoğrafı yüklenemedi, tekrar deneyin." };
    }
    avatarUrl = girdi.avatarUrl;
  }

  const supabase = await createClient();

  const { data: onceki } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const { error } = await supabase.rpc("update_my_profile", {
    p_full_name: adSoyad,
    p_sector: sektor,
    p_avatar_url: avatarUrl,
    p_avatar_color: girdi.avatarRenk,
  });

  if (error) return { hata: "Bilgiler kaydedilemedi. Birkaç dakika sonra tekrar deneyin." };

  const eskiYol = onceki?.avatar_url ? storagePathFromUrl(onceki.avatar_url) : null;
  if (eskiYol && onceki?.avatar_url !== avatarUrl && eskiYol.startsWith(`${user.id}/avatar/`)) {
    await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([eskiYol]);
  }

  // Avatar kenar çubuğunda da görünüyor; bütün panel yeniden çizilsin.
  revalidatePath("/admin", "layout");
  return { hata: null };
}
