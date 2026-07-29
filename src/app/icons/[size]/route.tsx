import { ImageResponse } from "next/og";
import { BrandIcon } from "@/lib/brand-icon";

/**
 * Manifest'in gösterdiği PNG simgeler. Depoda ikili dosya tutmak yerine burada
 * üretiliyorlar: marka rengi değiştiğinde tek bir bileşen güncelleniyor,
 * yeniden dışa aktarılacak bir görsel kalmıyor.
 */
const SIZES = ["192", "512"] as const;

export function generateStaticParams() {
  return SIZES.map((size) => ({ size }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size } = await params;
  if (!SIZES.includes(size as (typeof SIZES)[number])) {
    return new Response("Not found", { status: 404 });
  }

  const px = Number(size);
  return new ImageResponse(<BrandIcon size={px} />, { width: px, height: px });
}
