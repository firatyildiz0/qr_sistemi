import type { MetadataRoute } from "next";

/**
 * Uygulamanın telefona kurulabilmesini sağlayan tanım. `display: standalone`
 * olduğu için ana ekrandan açıldığında adres çubuğu ve tarayıcı sekmeleri
 * görünmüyor — panel tam ekran, yerli bir uygulama gibi açılıyor.
 *
 * `start_url` panelin kendisi: simgeye dokunan satıcı tanıtım sayfasına değil,
 * doğrudan işine gidiyor.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RentQR — Kiralama paneli",
    short_name: "RentQR",
    description: "Herhangi bir fiziksel ürünü tek bir taramayla kiralanabilir hale getirin.",
    start_url: "/admin",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "tr",
    dir: "ltr",
    background_color: "#edf2f0",
    theme_color: "#edf2f0",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Maskeleme yapan başlatıcılar simgenin kenarlarını kırpar; ayrı dosya
      // gerekiyor: rozet güvenli alana sığacak kadar küçük duruyor ve çevresi
      // manifest'in arka plan rengiyle dolu.
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    // Simgeye uzun basınca çıkan kısayollar — telefonun kendi menüsünden
    // panelin iki ana işine doğrudan giriş.
    shortcuts: [
      { name: "QR okut", short_name: "QR okut", url: "/admin" },
      { name: "Ürünler", short_name: "Ürünler", url: "/admin/products" },
    ],
  };
}
