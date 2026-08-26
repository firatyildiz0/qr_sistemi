import { Plus_Jakarta_Sans, Archivo_Narrow, DM_Sans } from "next/font/google";

export const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

export const archivoNarrow = Archivo_Narrow({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-eyebrow",
  display: "swap",
});

/**
 * Veyro Labs ana sayfasının yazı tipi. Panelin yazı tipinden ayrı duruyor:
 * ana sayfa kendi görsel dünyasında, geometrik ve daha yumuşak bir grotesk
 * istiyor. Yalnızca o sayfada kullanılıyor, panel Plus Jakarta ile kalıyor.
 */
export const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-labs",
  display: "swap",
});
