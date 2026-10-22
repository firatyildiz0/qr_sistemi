import { Bricolage_Grotesque } from "next/font/google";

/**
 * Panelin büyük başlıkları. Anasayfadaki vitrinle aynı aile: panel o sayfanın
 * devamı gibi açılsın diye. Gövde metni Manrope'ta kalıyor — tablolar, formlar
 * ve listeler okunaklılık istiyor, karakter değil.
 *
 * `lib/fonts.ts`'e değil buraya yazıldı: anasayfa işi aynı aileyi kendi dalında
 * ekliyor ve iki dal birbirini beklemeden yayına çıkabilsin. İkisi de canlıya
 * girdiğinde tek tanıma indirilebilir.
 */
export const kapakBaslik = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  variable: "--font-kapak",
  display: "swap",
});
