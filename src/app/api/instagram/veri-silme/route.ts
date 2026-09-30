import { NextRequest, NextResponse } from "next/server";
import { yonlendirmeAdresi } from "@/lib/instagram/kurulum";
import { baglantiyiSil, imzaliIstekCoz, onayKoduUret } from "@/lib/instagram/meta-bildirim";

/**
 * Hesap sahibi Instagram'dan "verilerimi silin" dediğinde Meta buraya
 * geliyor ve cevapta bir durum adresiyle takip kodu bekliyor; ikisini de
 * kullanıcıya gösteriyor.
 *
 * Silme hemen yapılıyor, kuyruğa alınmıyor: bu hesap için tuttuğumuz tek şey
 * bağlantı kaydı ve belirteç. Durum sayfası bu yüzden kodu saklamadan
 * "tamamlandı" diyebiliyor.
 *
 * Meta Business login ayarlarında "Data deletion request URL" olarak kayıtlı.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const igId = imzaliIstekCoz(form?.get("signed_request")?.toString() ?? null);

  if (!igId) return NextResponse.json({ hata: "geçersiz imza" }, { status: 400 });

  const { hata } = await baglantiyiSil(igId);
  if (hata) {
    console.error("[instagram] veri silme işlenemedi", hata);
    return NextResponse.json({ hata: "işlenemedi" }, { status: 500 });
  }

  const kod = onayKoduUret();
  const durum = yonlendirmeAdresi("/instagram/veri-silme");
  durum.searchParams.set("kod", kod);

  return NextResponse.json({ url: durum.toString(), confirmation_code: kod });
}
