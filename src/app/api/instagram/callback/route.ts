import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { hesapBilgisiOku, tokenAl } from "@/lib/instagram/graph";
import { instagramYapilandirildi, yonlendirmeAdresi } from "@/lib/instagram/kurulum";

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

function stateEsitMi(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function GET(request: NextRequest) {
  const [user, profil] = await Promise.all([getCurrentUser(), getProfile()]);

  if (!user || profil?.status !== "approved") {
    return NextResponse.redirect(yonlendirmeAdresi("/login"));
  }

  if (!instagramYapilandirildi()) return panele("yapilandirilmadi");

  const params = request.nextUrl.searchParams;

  // Satıcı izin ekranında vazgeçtiyse Instagram `error` ile döner.
  if (params.get("error")) return panele("vazgecildi");

  const beklenen = request.cookies.get("ig_state")?.value;
  if (!stateEsitMi(params.get("state") ?? undefined, beklenen)) {
    return panele("dogrulanamadi");
  }

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

  const cevap = panele("bagli");
  cevap.cookies.delete("ig_state");
  return cevap;
}
