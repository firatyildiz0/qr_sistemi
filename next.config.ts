import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * Tarayıcının kendi korumalarını açan başlıklar. Hiçbiri uygulamanın davranışını
 * değiştirmiyor; yalnızca saldırganın elini bağlıyorlar.
 *
 * Asıl `Content-Security-Policy` burada değil `proxy.ts` içinde: nonce istek
 * başına üretilmek zorunda, bu dosya ise derleme sırasında bir kez okunuyor.
 * Buradakiler istekten bağımsız, sabit başlıklar.
 */
const securityHeaders = [
  // Panel bir iframe'e gömülüp tıklama hırsızlığına (clickjacking) alet
  // edilmesin. CSP'nin `frame-ancestors` direktifi proxy'de zaten var; bu
  // başlık onu anlamayan eski tarayıcılar için ve proxy'nin kapsamadığı
  // yollar (API uçları) için duruyor.
  { key: "X-Frame-Options", value: "DENY" },

  // Yüklenen ürün görselini tarayıcı "aslında script'miş" diye yorumlamasın.
  { key: "X-Content-Type-Options", value: "nosniff" },

  // Ürün sayfasından dışarı tıklandığında karşı tarafa tam URL gitmesin: QR
  // bağlantısı ürün kimliğini taşıyor.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  // Kamera QR okuyucu için gerekli, gerisi kapalı.
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), payment=()",
  },

  // Bir kez HTTPS ile girildikten sonra tarayıcı bir daha http denemesin —
  // araya girme (MITM) saldırısının en kolay yolunu kapatır.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Hangi sürümün çalıştığını söylemek, o sürüme ait açıkları aramayı
  // kolaylaştırmaktan başka bir işe yaramıyor.
  poweredByHeader: false,
  images: {
    // Product images live in the public `product-images` storage bucket.
    remotePatterns: supabaseUrl
      ? [new URL(`${supabaseUrl}/storage/v1/object/public/product-images/**`)]
      : [],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

/**
 * Sentry sarmalayıcısı yalnızca DSN tanımlıysa devrede.
 *
 * Sarmalayıcı derleme sırasında kaynak haritası yükleme adımı ekliyor; kurulum
 * yapılmamışken bu adım her derlemede uyarı basar ve `npm run build`'i
 * yavaşlatır. Kurulmadığı sürece yapılandırma olduğu gibi kalıyor.
 */
export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,

      // Kaynak haritaları yüklendikten sonra sunucudan siliniyor: yüklenmiş
      // hâlde kalırlarsa herkes derlenmiş kodun okunabilir kaynağını indirebilir.
      sourcemaps: { deleteSourcemapsAfterUpload: true },

      // Reklam engelleyiciler Sentry'nin adresini kesiyor; istekler kendi
      // alan adımız üzerinden geçsin.
      tunnelRoute: "/monitoring",

      silent: true,
    })
  : nextConfig;
