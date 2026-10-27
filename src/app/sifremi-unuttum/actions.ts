"use server";

import { createClient } from "@/lib/supabase/server";
import { emailForUsername } from "@/lib/kullanici-eposta";
import { normalizeUsername } from "@/lib/username";
import { checkSifirlamaRateLimit, recordSecurityEvent } from "@/lib/security";

export type SifirlamaDurumu = { hata: string | null; gonderildi: boolean; deger: string };

/**
 * Şifre sıfırlama bağlantısı ister.
 *
 * Hesap bulunsa da bulunmasa da aynı cevap dönüyor: aksi halde form hangi
 * kullanıcı adlarının ve e-postaların kayıtlı olduğunu ele verirdi. Bağlantı
 * `/auth/confirm`'e geliyor, oradan yeni şifre sayfasına.
 */
export async function sifirlamaIste(_onceki: SifirlamaDurumu, formData: FormData): Promise<SifirlamaDurumu> {
  const deger = String(formData.get("kimlik") ?? "");
  const kimlik = normalizeUsername(deger);
  if (!kimlik) return { hata: "Kullanıcı adınızı ya da e-postanızı yazın.", gonderildi: false, deger };

  const sinir = await checkSifirlamaRateLimit(kimlik);
  if (!sinir.allowed) return { hata: sinir.message, gonderildi: false, deger };

  // Sayaç her istekte artıyor, hesap olmasa da: yoksa var olmayan adlarla
  // sınırsız deneme yapılabilirdi.
  await recordSecurityEvent({ kind: "sifre_sifirlama", identifier: kimlik });

  const eposta = kimlik.includes("@") ? kimlik : await emailForUsername(kimlik);
  if (eposta) {
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(eposta, {
      redirectTo: `${site}/auth/confirm?next=/sifre-yenile`,
    });
    // Hata ziyaretçiye söylenmiyor (hesabın varlığını ele verirdi); sunucu
    // log'unda görünsün ki e-posta servisi düştüyse fark edilsin.
    if (error) console.error("[sifirlama] e-posta gönderilemedi:", error.message);
  }

  return { hata: null, gonderildi: true, deger: "" };
}
