import Link from "next/link";
import { SATICI, YASAL_SAYFALAR } from "@/lib/yasal";

/**
 * Herkese açık sayfaların altbilgisi.
 *
 * Ödeme kuruluşu (iyzico) üye işyerinden yasal sayfalara bağlantıları, SSL
 * ibaresini ve "iyzico ile Öde" + Visa/MasterCard logo bandını sitenin her
 * herkese açık sayfasında görmek istiyor. Logo bandı iyzico'nun resmî
 * paketinden; açık temada renkli, koyu temada beyaz sürüm gösterilir.
 */

const linkSinifi =
  "rounded-full px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-accent-soft hover:text-accent-hover";

export default function SiteFooter({
  ekLinkler,
  className = "",
}: {
  ekLinkler?: React.ReactNode;
  className?: string;
}) {
  return (
    <footer className={`border-t border-border px-6 py-12 ${className}`}>
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8">
        <div className="flex w-full flex-col items-center gap-6 md:flex-row md:justify-between">
          <span className="text-lg font-extrabold tracking-tight text-ink">{SATICI.urun}</span>
          <nav aria-label="Kurumsal" className="flex flex-wrap justify-center gap-1">
            {ekLinkler}
            {YASAL_SAYFALAR.map((sayfa) => (
              <Link key={sayfa.href} href={sayfa.href} className={linkSinifi}>
                {sayfa.ad}
              </Link>
            ))}
            <Link href="/hakkimizda#iletisim" className={linkSinifi}>
              İletişim
            </Link>
          </nav>
        </div>

        <div className="flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- statik SVG, optimizasyon gerekmez */}
          <img
            src="/odeme/logo-bandi-renkli.svg"
            alt="iyzico ile Öde, Mastercard, Visa, American Express, Troy"
            width={429}
            height={32}
            className="logo-tema-acik h-6 w-auto max-w-full sm:h-8"
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- statik SVG, optimizasyon gerekmez */}
          <img
            src="/odeme/logo-bandi-beyaz.svg"
            alt="iyzico ile Öde, Mastercard, Visa, American Express, Troy"
            width={456}
            height={32}
            className="logo-tema-koyu h-6 w-auto max-w-full sm:h-8"
          />
          <p className="flex max-w-md items-start justify-center gap-1.5 text-center text-xs text-ink-muted">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="mt-px h-3.5 w-3.5 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            Bu site 256-bit SSL sertifikası ile korunmaktadır. Kart bilgileriniz iyzico altyapısında
            işlenir, sitemizde saklanmaz.
          </p>
        </div>

        <p className="text-center text-sm text-ink-muted">
          © {new Date().getFullYear()} {SATICI.marka} — {SATICI.urun}
        </p>
      </div>
    </footer>
  );
}
