import Image from "next/image";
import { IconQrCode } from "@/components/icons";

/**
 * Rezervasyon satırlarındaki küçük ürün görseli.
 *
 * Satıcı listeye "hangi sipariş bu" diye bakıyor ve ürünü adından önce
 * resminden tanıyor. Görsel yüklenmemiş ürünlerde yer boş kalmıyor: aynı
 * ölçüde bir QR yer tutucusu duruyor, yoksa satırlar birbirine göre kayardı.
 *
 * Kırpmak yerine sığdırılıyor — satıcının yüklediği çerçeve neyse listede de o
 * görünsün.
 */
export default function ProductThumb({
  src,
  /** Kutunun ölçüsü; `sizes` ile birlikte değişmeli. */
  className = "h-11 w-11",
  sizes = "44px",
}: {
  src: string | null;
  className?: string;
  sizes?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`relative block shrink-0 overflow-hidden rounded-md border border-border bg-surface ${className}`}
    >
      {src ? (
        <Image src={src} alt="" fill sizes={sizes} className="object-contain p-0.5" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center">
          <IconQrCode className="h-1/2 w-1/2 text-ink-muted/40" strokeWidth={1} />
        </span>
      )}
    </span>
  );
}

/** Ürünün kapak görseli: `images` boş ya da yokken null. */
export function coverImage(images: string[] | null | undefined): string | null {
  return images?.[0] ?? null;
}
