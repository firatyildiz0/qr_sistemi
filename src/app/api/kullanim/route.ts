import { NextResponse } from "next/server";
import { getProfile } from "@/lib/profile";
import { getUsage } from "@/lib/usage";

/**
 * Kullanım sayfasının canlı ucu.
 *
 * Sayfa ilk değeri sunucudan alıyor, sonrasını buradan tazeliyor (bkz.
 * components/yonetim/UsageDials.tsx). Yalnızca superuser'a: içinde projenin
 * kapasitesi ve kullanıcı sayıları var.
 */
export async function GET() {
  const me = await getProfile();
  if (me?.role !== "superuser" || me.status !== "approved") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await getUsage(), {
    headers: { "Cache-Control": "no-store" },
  });
}
