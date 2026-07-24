import type { Metadata } from "next";
import { plusJakartaSans, archivoNarrow } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "RentQR",
  description: "Herhangi bir fiziksel ürünü tek bir taramayla kiralanabilir hale getirin.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${plusJakartaSans.variable} ${archivoNarrow.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink font-display">
        {children}
      </body>
    </html>
  );
}
