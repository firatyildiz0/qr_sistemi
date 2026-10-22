import { Bricolage_Grotesque, Manrope } from "next/font/google";

/**
 * Sedef tek bir aile üstüne kurulu: başlık, gövde ve etiket aynı yazı tipinin
 * farklı ağırlıkları. Manrope'un yuvarlak uçları ve geniş "o"su arayüzün
 * yumuşak köşeleriyle aynı dili konuşuyor; ikinci bir aile eklemek o dili
 * bölerdi. Etiketler (`--font-eyebrow`) aynı aileden ama daima 700 ve harf
 * aralığı açık kullanılıyor — ayrım aile değil, ağırlık farkı.
 */
export const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

/**
 * Yalnızca anasayfanın başlıkları. Vitrin panelin kendisi değil, onun kapağı:
 * Bricolage'ın sıkışık, mürekkep tuzaklı harfleri basılı bir etiketin sesini
 * taşıyor. Panel bu aileyi hiç yüklemiyor — değişken yalnızca anasayfanın kök
 * öğesine bağlanıyor.
 */
export const bricolage = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  variable: "--font-vitrin",
  display: "swap",
});

export const manropeEyebrow = Manrope({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-eyebrow",
  display: "swap",
});
