import { Archivo, Manrope } from "next/font/google";

/**
 * Sedef tek bir aile üstüne kurulu: başlık, gövde ve etiket aynı yazı tipinin
 * farklı ağırlıkları. Manrope'un yuvarlak uçları ve geniş "o"su arayüzün
 * yumuşak köşeleriyle aynı dili konuşuyor; ikinci bir aile eklemek o dili
 * bölerdi. Etiketler (`--font-eyebrow`) aynı aileden ama daima 700 ve harf
 * aralığı açık kullanılıyor — ayrım aile değil, ağırlık farkı.
 *
 * Vitrinin afiş başlıkları bunun tek istisnası: Manrope 800'e kadar çıksa da
 * genişleyemiyor, oysa vitrindeki dev büyük harf başlıklar ancak geniş bir
 * gövdeyle taşıyor. Archivo'nun genişlik ekseni (`wdth`) tam olarak bunu
 * veriyor ve yalnızca `/veyro-labs` başlıklarında kullanılıyor — panel hâlâ
 * tek aile.
 */
export const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

export const manropeEyebrow = Manrope({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-eyebrow",
  display: "swap",
});

export const archivo = Archivo({
  subsets: ["latin"],
  // Değişken yazı tipi: ağırlık yerine eksenler veriliyor. `wdth` olmadan
  // `font-stretch` sessizce yok sayılır ve başlıklar dar kalır.
  axes: ["wdth"],
  variable: "--font-poster",
  display: "swap",
});
