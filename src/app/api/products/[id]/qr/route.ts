import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { productQrPdf } from "@/lib/qr";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const [{ id }, supabase] = await Promise.all([params, createClient()]);
  const { data: product } = await supabase
    .from("products")
    .select("name")
    .eq("id", id)
    .single();

  if (!product) return new NextResponse("Not found", { status: 404 });

  const pdf = await productQrPdf(id, product.name);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="product-${id}-qr.pdf"`,
    },
  });
}
