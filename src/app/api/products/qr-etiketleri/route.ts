import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { LABELS_PER_SHEET, productQrSheetPdf, type QrLabel } from "@/lib/qr";

/** 25 sayfa; daha fazlası tek seferde yazıcıya gitmiyor zaten. */
const MAX_LABELS = LABELS_PER_SHEET * 25;

/**
 * Satıcının seçtiği ürünlerin QR etiketlerini A4'e ızgara halinde dizilmiş
 * tek PDF olarak verir. `ids` virgülle ayrılmış ürün kimlikleri; etiketler bu
 * sırayla basılıyor, yani ekrandaki sırayla.
 *
 * Yalnızca satıcının kendi ürünleri: kimliği başkasına ait olan ürün sessizce
 * atlanıyor, hata vermiyor — listede neyin kime ait olduğunu sızdırmasın diye.
 */
export async function GET(request: Request) {
  const [user, supabase] = await Promise.all([getCurrentUser(), createClient()]);
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const ids = [
    ...new Set(
      (new URL(request.url).searchParams.get("ids") ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    ),
  ];
  if (ids.length === 0) return new NextResponse("No products", { status: 400 });
  if (ids.length > MAX_LABELS) {
    return new NextResponse(`At most ${MAX_LABELS} labels`, { status: 400 });
  }

  const { data, error } = await supabase
    .from("products")
    .select("id, name, barcode")
    .eq("owner_id", user.id)
    .in("id", ids);
  if (error) return new NextResponse(error.message, { status: 500 });

  const byId = new Map((data ?? []).map((p) => [p.id as string, p as QrLabel]));
  const labels = ids.flatMap((id) => byId.get(id) ?? []);
  if (labels.length === 0) return new NextResponse("Not found", { status: 404 });

  const pdf = await productQrSheetPdf(labels);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="qr-etiketleri-${labels.length}.pdf"`,
    },
  });
}
