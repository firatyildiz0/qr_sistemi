import Link from "next/link";
import type { Metadata } from "next";
import BalonOyunu from "@/components/hata/BalonOyunu";
import { IconArrowRight } from "@/components/icons";

export const metadata: Metadata = {
  title: "Sayfa bulunamadı · RentQR",
};

/**
 * Eşleşmeyen her adres buraya düşüyor. Boş bir hata metni yerine küçük bir
 * oyun var: kullanıcı yanlış yere geldiğini zaten anlıyor, geriye onu orada
 * tutmadan eğlendirmek kalıyor. Ana sayfa bağlantısı her zaman oyunun üstünde
 * ve ilk odaklanılan öge — oyun bir teklif, çıkış yolu değil.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-2xl">
        <div className="flex flex-col items-center text-center">
          <p className="eyebrow text-accent">Sayfa bulunamadı</p>

          <h1 className="mt-3 flex items-center gap-1 text-[clamp(64px,16vw,104px)] font-bold leading-none tracking-tight text-ink">
            <span>4</span>
            <SifirQr />
            <span>4</span>
          </h1>

          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink-muted">
            Bu adres taşınmış ya da hiç var olmamış olabilir. Karekod yanlış
            okunmuş da olabilir — bir kez daha taramayı deneyin.
          </p>

          <Link href="/" className="btn btn-primary mt-7">
            Ana sayfaya dön
            <IconArrowRight className="size-4" />
          </Link>
        </div>

        <div className="mt-10">
          <BalonOyunu />
        </div>
      </div>
    </main>
  );
}

/**
 * Ortadaki sıfır: rakam yerine bir karekod. Boyutu `1em` olduğu için başlıkla
 * birlikte büyüyüp küçülüyor, `currentColor` ile de metnin rengini alıyor;
 * yalnızca modülleri vurgu renginde.
 */
function SifirQr() {
  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden
      className="size-[0.82em] translate-y-[0.03em]"
      fill="none"
    >
      <rect x="1.5" y="1.5" width="37" height="37" rx="10" stroke="currentColor" strokeWidth="3" />
      {/* Üç konum karesi, gerçek bir karekodda olduğu gibi sol üst, sağ üst ve
          sol altta. */}
      {[
        [8, 8],
        [23, 8],
        [8, 23],
      ].map(([x, y]) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width="9"
          height="9"
          rx="2.5"
          stroke="currentColor"
          strokeWidth="3"
        />
      ))}
      <g className="fill-accent">
        <rect x="23" y="23" width="4" height="4" rx="1" />
        <rect x="29" y="23" width="4" height="4" rx="1" />
        <rect x="23" y="29" width="4" height="4" rx="1" />
      </g>
    </svg>
  );
}
