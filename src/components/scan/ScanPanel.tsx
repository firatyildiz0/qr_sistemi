"use client";

import { useState } from "react";
import QrScanner from "@/components/scan/QrScanner";
import ImageScanner from "@/components/scan/ImageScanner";
import { IconImage, IconQrCode } from "@/components/icons";

type Mode = "qr" | "image";

/**
 * Görselden arama şimdilik kapalı.
 *
 * Tanıma çalışıyor ama katalog fotoğraflarıyla karşılaştırmaya dayandığı için
 * birbirine benzeyen ürünlerde (aynı modelin iki bedeni, yan yana duran iki
 * siyah çanta) yanılabiliyor; sahada denenmeden satıcının önüne açık
 * konulmuyor. Sekme yine de görünüyor ve "Yakında" diyor: özelliğin yolda
 * olduğunu satıcının bilmesi, sonradan sürprizle karşılaşmasından iyi.
 *
 * Açmak için tek yapılması gereken bunu `true` yapmak — altındaki bütün kod
 * (imza çıkarma, eşleştirme, aday listesi) yerinde duruyor.
 */
const GORSEL_ARAMA_ACIK = false;

/**
 * Ürünü kamerayla bulmanın iki yolu, tek yüzeyde.
 *
 * Ürün sayfasına iki kapı var: etiketteki QR kodu okutmak ve ürünün kendisini
 * kameraya göstermek. İkisi de aynı ekrana çıktığı için satıcıya iki ayrı
 * "tarayıcı" olarak sunulmuyorlar — aynı tarayıcının iki sekmesiler. Hangisi
 * elverişliyse o kullanılır: etiket duruyorsa QR daha hızlı ve kesin, etiket
 * düşmüşse ya da ürün kutusunun içindeyse görsel tek yol.
 *
 * Sekme değiştirmek karşı taraftaki bileşeni söküyor; kamerayı serbest bırakan
 * şey de bu. İki tarayıcı aynı anda ayakta kalsaydı ikisi de aynı kameraya
 * talip olurdu.
 */
export default function ScanPanel({
  autoStart = false,
  onResolved,
  onProduct,
}: {
  autoStart?: boolean;
  onResolved?: () => void;
  onProduct?: (product: { id: string; name: string }) => void;
}) {
  const [mode, setMode] = useState<Mode>("qr");
  const showingImage = GORSEL_ARAMA_ACIK && mode === "image";

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Arama yöntemi"
        className="grid grid-cols-2 gap-1 rounded-lg bg-surface p-1"
      >
        <Tab
          active={!showingImage}
          onClick={() => setMode("qr")}
          icon={<IconQrCode className="h-4 w-4" />}
          label="QR kod"
        />
        <Tab
          active={showingImage}
          onClick={() => setMode("image")}
          icon={<IconImage className="h-4 w-4" />}
          label="Görsel"
          soon={!GORSEL_ARAMA_ACIK}
        />
      </div>

      {showingImage ? (
        <ImageScanner autoStart onResolved={onResolved} onProduct={onProduct} />
      ) : (
        <QrScanner autoStart={autoStart} onResolved={onResolved} onProduct={onProduct} />
      )}
    </div>
  );
}

function Tab({
  active,
  onClick,
  icon,
  label,
  soon = false,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  /** Sekme görünür ama seçilemez: hazırlanıyor. */
  soon?: boolean;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-disabled={soon || undefined}
      disabled={soon}
      onClick={onClick}
      title={soon ? `${label} ile arama yakında` : undefined}
      className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
        soon
          ? "cursor-not-allowed text-ink-muted/60"
          : active
            ? "bg-card text-ink shadow-sm"
            : "text-ink-muted hover:text-ink"
      }`}
    >
      {icon}
      {label}
      {soon && (
        <span className="rounded-full bg-border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">
          Yakında
        </span>
      )}
    </button>
  );
}
