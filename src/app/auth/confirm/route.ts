import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Bu adresin gönderebileceği tek yer. `next` sorgudan geliyor, serbest bırakılmıyor. */
const IZINLI = new Set(["/sifre-yenile"]);

/**
 * E-postadaki bağlantının indiği yer: bağlantıyı oturuma çevirip yeni şifre
 * sayfasına geçiriyor.
 *
 * İki biçim de kabul ediliyor. `token_hash` + `type`, Supabase'in e-posta
 * şablonu bu adrese işaret edecek şekilde düzenlendiğinde geliyor ve her
 * cihazda çalışıyor. `code` ise şablon olduğu gibi bırakıldığında geliyor;
 * o yol isteğin yapıldığı tarayıcıdaki doğrulayıcı çereze dayandığı için
 * yalnızca aynı tarayıcıda çalışıyor.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/sifre-yenile";
  const hedef = IZINLI.has(next) ? next : "/sifre-yenile";

  const supabase = await createClient();
  let basarili = false;

  if (tokenHash && type === "recovery") {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    basarili = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    basarili = !error;
  }

  return NextResponse.redirect(new URL(basarili ? hedef : "/sifremi-unuttum?hata=gecersiz", request.url));
}
