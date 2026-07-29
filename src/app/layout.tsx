import type { Metadata, Viewport } from "next";
import { plusJakartaSans, archivoNarrow } from "@/lib/fonts";
import { DEFAULT_PREFERENCES, PREFERENCES_SCRIPT } from "@/lib/preferences";
import "./globals.css";

export const metadata: Metadata = {
  title: "RentQR",
  description: "Herhangi bir fiziksel ürünü tek bir taramayla kiralanabilir hale getirin.",
  applicationName: "RentQR",
  // iOS ana ekrandan açıldığında tam ekran davransın ve durum çubuğu panelin
  // koyu üst çubuğuyla aynı renkte olsun. (Android'de bunu manifest hallediyor.)
  appleWebApp: {
    capable: true,
    title: "RentQR",
    statusBarStyle: "black-translucent",
  },
  // Telefon numaralarının otomatik olarak aranabilir bağlantıya çevrilmesi
  // kapalı: tarih ve tutar gibi sayılar da yakalanıp mavi bağlantı hâline
  // geliyordu, bu da arayüzü bir uygulamadan çok bir web sayfasına benzetiyor.
  // Numaraya dokunarak arama, `tel:` bağlantısının olduğu yerlerde zaten var.
  formatDetection: { telephone: false },
};

// Next zaten bu değerleri varsayılan olarak yazıyor; burada açıkça durmaları
// bu layout'un kendi <head>'ini render etmesine rağmen ölçeğin sabit kalmasını
// garanti ediyor. `userScalable` bilinçli olarak kısıtlanmadı.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Klavye açıldığında görünen alan küçülsün ki alta sabitlenmiş sekme çubuğu
  // klavyenin arkasında kalmasın.
  interactiveWidget: "resizes-content",
  // Android'de durum çubuğunun rengi. Temaya göre değişmiyor, çünkü panelin üst
  // çubuğu (--color-deep) her iki temada da koyu — tek renk ikisinde de sürekli
  // bir yüzey gibi görünüyor.
  themeColor: "#0f2a22",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The layout stays static: it renders the default preferences as attributes
    // and the inline script below corrects them from the cookie before the
    // first paint. `suppressHydrationWarning` covers exactly that rewrite —
    // it applies to this element's own attributes, not to the tree inside.
    <html
      lang="tr"
      data-theme="light"
      data-accent={DEFAULT_PREFERENCES.accent}
      data-density={DEFAULT_PREFERENCES.density}
      data-radius={DEFAULT_PREFERENCES.radius}
      data-motion="full"
      data-sidebar={DEFAULT_PREFERENCES.sidebar}
      suppressHydrationWarning
      className={`${plusJakartaSans.variable} ${archivoNarrow.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFERENCES_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-paper text-ink font-display">
        {children}
      </body>
    </html>
  );
}
