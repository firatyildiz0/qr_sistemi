import Image from "next/image";
import logo from "@/assets/rentqr-logo.png";

/**
 * Marka işareti. Ad rozetin içinde yazılı olduğu için yanına ayrıca "RentQR"
 * metni konmuyor — aynı kelime iki kez okunurdu. Erişilebilirlik tarafında adı
 * `alt` taşıyor, yani ekran okuyucu logoyu yine "RentQR" diye okuyor.
 *
 * Ölçüyü kullanan yer veriyor: görsel kare olduğu için `className` hem
 * yüksekliği hem genişliği vermeli, `sizes` da onunla birlikte değişmeli —
 * tarayıcı indireceği kopyanın çözünürlüğünü oradan seçiyor.
 */
export default function Logo({
  className = "h-9 w-9",
  sizes = "36px",
}: {
  className?: string;
  sizes?: string;
}) {
  return (
    <Image
      src={logo}
      alt="RentQR"
      sizes={sizes}
      // Her sayfanın en üstünde, katlanın üstünde duruyor: geç yüklenmesi
      // başlığın bir an boş kalması demek olurdu.
      priority
      className={className}
    />
  );
}
