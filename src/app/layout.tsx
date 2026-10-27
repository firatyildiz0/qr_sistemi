import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { manrope, manropeEyebrow } from "@/lib/fonts";
import { DEFAULT_PREFERENCES, PREFERENCES_SCRIPT } from "@/lib/preferences";
import "./globals.css";

export const metadata: Metadata = {
  // Sayfaların `canonical` ve Open Graph adresleri göreli yazılıyor; tam
  // adrese bu kökle çevriliyor.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
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
  // Android'de durum çubuğunun rengi. Sedef'te panelin üst çubuğu artık koyu
  // değil, sayfanın kendi zemininin buzlu cam hâli; durum çubuğu da o zeminle
  // aynı renkte olsun ki ekranın tepesinde ayrı bir şerit görünmesin. Koyu tema
  // seçildiğinde tarayıcı bunu kendi karartıyor.
  themeColor: "#f3eeed",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Next kendi script etiketlerine nonce'u otomatik ekliyor, ama aşağıdaki ham
  // `<script>` onun ürettiği bir etiket değil — nonce'u elle almazsa CSP onu
  // engeller ve tercihler uygulanmadan önce sayfa yanlış temayla boyanır.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

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
      className={`${manrope.variable} ${manropeEyebrow.variable} h-full antialiased`}
    >
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: PREFERENCES_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-paper text-ink font-display">
        {children}
        {/* Preprod ve iş önizlemelerinde: canlıyla karıştırılmasın diye her
            ekranda. Tıklamaları engellemiyor. */}
        {process.env.PREPROD_KILIDI === "1" && (
          <div
            aria-hidden
            className="pointer-events-none fixed left-1/2 top-0 z-[100] -translate-x-1/2 rounded-b-md bg-warning px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-ink shadow"
          >
            Preprod · test ortamı
          </div>
        )}
      </body>
    </html>
  );
}
