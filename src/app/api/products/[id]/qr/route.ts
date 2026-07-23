import { NextRequest, NextResponse } from "next/server";
import { productQrPng, productQrSvg } from "@/lib/qr";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const format = request.nextUrl.searchParams.get("format") === "svg" ? "svg" : "png";

  if (format === "svg") {
    const svg = await productQrSvg(id);
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Content-Disposition": `attachment; filename="product-${id}-qr.svg"`,
      },
    });
  }

  const png = await productQrPng(id);
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="product-${id}-qr.png"`,
    },
  });
}
