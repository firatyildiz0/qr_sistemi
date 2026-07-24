import { Plus_Jakarta_Sans, Archivo_Narrow } from "next/font/google";

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
