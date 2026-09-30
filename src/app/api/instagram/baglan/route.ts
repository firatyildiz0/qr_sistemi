import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import { instagramYapilandirildi, stateUret, yonlendirmeAdresi } from "@/lib/instagram/kurulum";

/**
 * Satıcıyı Instagram'ın izin ekranına yollar.
 *
 * Bağlantı satıcının kendi hesabına ait, o yüzden oturum şart ve onay bekleyen
 * hesap buradan geçemiyor — geçseydi onaylanmamış biri sisteme dışarıdan mesaj
 * alan bir uç bağlayabilirdi. Oturumu olmayan satıcı girişe, girişten de
 * doğrudan buraya dönüyor: düğmeye bir kez basmak yetsin.
 *
 * `state` bağlantıyı başlatan satıcıyı imzalı taşıyor (bkz. `stateUret`).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [user, profil] = await Promise.all([getCurrentUser(), getProfile()]);

  if (!user) {
    const giris = yonlendirmeAdresi("/login");
    giris.searchParams.set("next", "/api/instagram/baglan");
    return NextResponse.redirect(giris);
  }

  if (profil?.status !== "approved") {
    return NextResponse.redirect(yonlendirmeAdresi("/admin"));
  }

  if (!instagramYapilandirildi()) {
    return NextResponse.redirect(yonlendirmeAdresi("/admin/instagram?durum=yapilandirilmadi"));
  }

  const adres = new URL("https://www.instagram.com/oauth/authorize");
  adres.searchParams.set("client_id", process.env.INSTAGRAM_APP_ID!);
  adres.searchParams.set("redirect_uri", yonlendirmeAdresi("/api/instagram/callback").toString());
  adres.searchParams.set("response_type", "code");
  adres.searchParams.set(
    "scope",
    // Mesaj okuma ve yazma izni; ürün/medya izinleri istenmiyor.
    "instagram_business_basic,instagram_business_manage_messages"
  );
  // Doğrudan Instagram girişi. Açık bırakılınca ekranda "Facebook ile devam
  // et" çıkıyor ve o yol, Instagram'ı bir Facebook sayfasına bağlamamış
  // işletmeleri yarı yolda bırakıyor.
  adres.searchParams.set("enable_fb_login", "0");
  adres.searchParams.set("state", stateUret(user.id));

  return NextResponse.redirect(adres);
}
