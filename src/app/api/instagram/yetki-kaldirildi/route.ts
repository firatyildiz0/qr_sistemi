import { NextRequest, NextResponse } from "next/server";
import { baglantiyiSil, imzaliIstekCoz } from "@/lib/instagram/meta-bildirim";

/**
 * Satıcı uygulamanın erişimini Instagram ayarlarından kaldırdığında Meta
 * buraya haber veriyor. Belirteç o andan itibaren işe yaramıyor; kaydı
 * tutmak panelde "bağlı" yazan ama hiçbir mesaja cevap vermeyen bir hesap
 * bırakırdı.
 *
 * Meta Business login ayarlarında "Deauthorize callback URL" olarak kayıtlı.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const igId = imzaliIstekCoz(form?.get("signed_request")?.toString() ?? null);

  if (!igId) return NextResponse.json({ hata: "geçersiz imza" }, { status: 400 });

  const { hata } = await baglantiyiSil(igId);
  if (hata) {
    console.error("[instagram] yetki kaldırma işlenemedi", hata);
    return NextResponse.json({ hata: "işlenemedi" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
