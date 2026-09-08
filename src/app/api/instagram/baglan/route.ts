import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import { instagramYapilandirildi, yonlendirmeAdresi } from "@/lib/instagram/kurulum";

/**
 * Satıcıyı Instagram'ın izin ekranına yollar.
 *
 * Bağlantı satıcının kendi hesabına ait, o yüzden oturum şart ve onay bekleyen
 * hesap buradan geçemiyor — geçseydi onaylanmamış biri sisteme dışarıdan mesaj
 * alan bir uç bağlayabilirdi.
 *
 * `state` rastgele üretilip hem adrese hem çereze yazılıyor: dönüşte ikisi
 * tutmuyorsa istek başkası tarafından başlatılmış demektir (CSRF) ve bağlantı
 * kurulmuyor.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [user, profil] = await Promise.all([getCurrentUser(), getProfile()]);

  if (!user || profil?.status !== "approved") {
    return NextResponse.redirect(new URL("/login", yonlendirmeAdresi("/")));
  }

  if (!instagramYapilandirildi()) {
    return NextResponse.redirect(yonlendirmeAdresi("/admin/instagram?durum=yapilandirilmadi"));
  }

  const state = randomBytes(24).toString("hex");

  const adres = new URL("https://www.instagram.com/oauth/authorize");
  adres.searchParams.set("client_id", process.env.INSTAGRAM_APP_ID!);
  adres.searchParams.set("redirect_uri", yonlendirmeAdresi("/api/instagram/callback").toString());
  adres.searchParams.set("response_type", "code");
  adres.searchParams.set(
    "scope",
    // Mesaj okuma ve yazma izni; ürün/medya izinleri istenmiyor.
    "instagram_business_basic,instagram_business_manage_messages"
  );
  adres.searchParams.set("state", state);

  const cevap = NextResponse.redirect(adres);

  cevap.cookies.set("ig_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/instagram",
    maxAge: 600,
  });

  return cevap;
}
