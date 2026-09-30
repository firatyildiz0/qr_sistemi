import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { hesapBilgisiOku, mesajlaraAboneOl, tokenAl } from "@/lib/instagram/graph";
import { instagramYapilandirildi, stateCoz, yonlendirmeAdresi } from "@/lib/instagram/kurulum";

/**
 * İzin ekranından dönüş: kod belirtece çevrilir ve hesap satıcıya bağlanır.
 *
 * Belirteç `instagram_accounts` tablosuna service role ile yazılıyor, çünkü o
 * tablonun hiçbir okuma politikası yok — belirteç satıcı adına mesaj yazmaya
 * yeter, dolayısıyla tarayıcıya asla çıkmamalı (bkz. 0027 migration'ı).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function panele(durum: string) {
  return NextResponse.redirect(yonlendirmeAdresi(`/admin/instagram?durum=${durum}`));
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const [user, profil] = await Promise.all([getCurrentUser(), getProfile()]);

  // Dönüş oturumsuz bir tarayıcıda açılmış olabilir (telefonda Instagram
  // uygulamasından dönüş gibi). Satıcıyı kaybetmek yerine giriş yaptırıp aynı
  // adrese geri getiriyoruz; kod o sırada hâlâ geçerli.
  if (!user) {
    const giris = yonlendirmeAdresi("/login");
    giris.searchParams.set("next", `/api/instagram/callback?${params.toString()}`);
    return NextResponse.redirect(giris);
  }

  if (profil?.status !== "approved") return NextResponse.redirect(yonlendirmeAdresi("/admin"));

  if (!instagramYapilandirildi()) return panele("yapilandirilmadi");

  // Satıcı izin ekranında vazgeçtiyse Instagram `error` ile döner.
  if (params.get("error")) {
    return panele(params.get("error_reason") === "user_denied" ? "vazgecildi" : "baglanamadi");
  }

  // İmzalı state bu oturumdaki satıcıya ait olmalı. Başkasının başlattığı bir
  // bağlantıyı (CSRF) ya da süresi geçmiş bir denemeyi burada durduruyoruz.
  if (stateCoz(params.get("state")) !== user.id) return panele("dogrulanamadi");

  const kod = params.get("code");
  if (!kod) return panele("kod-yok");

  const belirtec = await tokenAl(
    kod,
    process.env.INSTAGRAM_APP_ID!,
    process.env.INSTAGRAM_APP_SECRET!,
    yonlendirmeAdresi("/api/instagram/callback").toString()
  );

  if (!belirtec.ok) {
    console.error("[instagram] belirteç alınamadı", belirtec.hata);
    return panele("baglanamadi");
  }

  // Belirteç takası yalnızca uygulamaya özel kimliği veriyor; webhook'un
  // kullandığı işletme kimliği ayrı bir sorgudan geliyor ve ikisi de saklanıyor
  // (bkz. 0028 — biri eksikken gelen mesaj satıcıya çözülemiyordu).
  const bilgi = await hesapBilgisiOku(belirtec.token);
  const db = createAdminClient();

  // Aynı Instagram hesabı başka bir satıcıya bağlıysa devralınmıyor: iki
  // satıcının aynı gelen kutusunu paylaşması, müşteri mesajlarının yanlış
  // kataloğa düşmesi demek olurdu.
  const sayisal = (deger: string | null) =>
    deger && /^\d{1,25}$/.test(deger) ? deger : null;

  const scopedId = sayisal(bilgi.scopedId) ?? sayisal(belirtec.igUserId);
  const businessId = sayisal(bilgi.businessId);

  if (!scopedId) {
    console.error("[instagram] hesap kimliği okunamadı");
    return panele("baglanamadi");
  }

  const { data: mevcut } = await db
    .from("instagram_accounts")
    .select("owner_id")
    .or(
      [
        `ig_user_id.eq.${scopedId}`,
        businessId ? `ig_business_id.eq.${businessId}` : null,
      ]
        .filter(Boolean)
        .join(",")
    )
    .maybeSingle();

  if (mevcut && mevcut.owner_id !== user.id) return panele("baska-hesapta");

  const { error } = await db.from("instagram_accounts").upsert(
    {
      owner_id: user.id,
      ig_user_id: scopedId,
      ig_business_id: businessId,
      username: bilgi.username,
      access_token: belirtec.token,
      token_expires_at: belirtec.expiresAt,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner_id" }
  );

  if (error) {
    console.error("[instagram] hesap kaydedilemedi", error.message);
    return panele("baglanamadi");
  }

  // Abone olunamazsa bağlantı kaydı yine duruyor — belirteç geçerli ve
  // satıcı tekrar bastığında aynı satır güncellenir — ama satıcı mesajların
  // gelmeyeceğini bilmeli.
  const abonelik = await mesajlaraAboneOl(belirtec.token);
  if (!abonelik.ok) {
    console.error("[instagram] webhook aboneliği yapılamadı", abonelik.hata);
    return panele("abone-olunamadi");
  }

  return panele("bagli");
}
