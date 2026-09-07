import Image from "next/image";
import logo from "@/assets/rentqr-logo.png";

/**
 * Marka işareti. İki hâli var:
 *
 * - `mark`: yalnız rozet. Adın sığmayacağı dar yerler için (favicon ölçüsü,
 *   daralmış kenar çubuğu).
 * - `lockup`: rozet solda, "RentQR" yanında. Rozetin içindeki yazı 36 pikselde
 *   okunmuyordu; adın yana çıkması onu her ölçüde okunur yapıyor.
 *
 * Yatay hâlde adı `<span>` taşıyor, görsel değil: yazı her ekranda net çıkıyor,
 * koyu zeminde rengi değişebiliyor ve ekran okuyucu adı bir kez okuyor — bu
 * yüzden orada rozetin `alt`'ı bilerek boş.
 *
 * Ölçüyü kullanan yer veriyor: `className` rozetin ölçüsü (görsel kare, yani
 * hem yüksekliği hem genişliği vermeli), `sizes` da onunla birlikte değişmeli —
 * tarayıcı indireceği kopyanın çözünürlüğünü oradan seçiyor. Adın puntosu ayrı
 * duruyor (`wordmarkClassName`), çünkü rozetle aynı oranda büyümesi gereken tek
 * şey değil: üst çubukta ada rozetten daha küçük bir punto yakışıyor.
 */
export default function Logo({
  className = "h-9 w-9",
  sizes = "36px",
  variant = "mark",
  tone = "brand",
  wordmarkClassName = "text-[1.375rem]",
}: {
  className?: string;
  sizes?: string;
  variant?: "mark" | "lockup";
  /** `on-dark`: koyu zeminde (kenar çubuğu, üst çubuk) ad beyaz yazılır —
   *  markanın kırmızısı orada 3:1 kontrastın altına düşüyor. */
  tone?: "brand" | "on-dark";
  wordmarkClassName?: string;
}) {
  const badge = (
    <Image
      src={logo}
      alt={variant === "lockup" ? "" : "RentQR"}
      sizes={sizes}
      // Her sayfanın en üstünde, katlanın üstünde duruyor: geç yüklenmesi
      // başlığın bir an boş kalması demek olurdu.
      priority
      className={className}
    />
  );

  if (variant === "mark") return badge;

  return (
    <span className="inline-flex items-center gap-2.5">
      {badge}
      <span
        className={`font-display leading-none font-extrabold tracking-[-0.03em] ${
          tone === "on-dark" ? "text-on-deep" : "text-brand"
        } ${wordmarkClassName}`}
      >
        RentQR
      </span>
    </span>
  );
}
