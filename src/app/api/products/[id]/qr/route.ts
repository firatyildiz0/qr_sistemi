import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { productQrPdf } from "@/lib/qr";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const [{ id }, supabase] = await Promise.all([params, createClient()]);

  // Ürün tablosu artık sahibine kapalı (bkz. 0018), o yüzden ad herkese açık
  // görünümden alınıyor. Etiketin üstüne yalnızca ürünün adı basılıyor — o da
  // aynı kimlikle açılan ürün sayfasında zaten yazıyor.
  //
  // Etiket numarası ise satıcının kendi iç numarası ve herkese açık görünümde
  // yok; tabloyu doğrudan okuyabilen, yani ürünün sahibi, onu da alıyor.
  // Etiketi indiren zaten sahibi — başkasının indirdiği PDF eskisi gibi
  // yalnızca adı taşıyor.
  const [{ data }, { data: owned }] = await Promise.all([
    supabase.rpc("product_public", { p_id: id }),
    supabase.from("products").select("barcode").eq("id", id).maybeSingle(),
  ]);
  const product = data?.[0];

  if (!product) return new NextResponse("Not found", { status: 404 });

  const pdf = await productQrPdf(id, product.name, owned?.barcode ?? null);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="product-${id}-qr.pdf"`,
    },
  });
}
