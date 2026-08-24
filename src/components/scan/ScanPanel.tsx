"use client";

import { useState } from "react";
import QrScanner from "@/components/scan/QrScanner";
import ImageScanner from "@/components/scan/ImageScanner";
import { IconImage, IconQrCode } from "@/components/icons";

type Mode = "qr" | "image";

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

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Arama yöntemi"
        className="grid grid-cols-2 gap-1 rounded-lg bg-surface p-1"
      >
        <Tab
          active={mode === "qr"}
          onClick={() => setMode("qr")}
          icon={<IconQrCode className="h-4 w-4" />}
          label="QR kod"
        />
        <Tab
          active={mode === "image"}
          onClick={() => setMode("image")}
          icon={<IconImage className="h-4 w-4" />}
          label="Görsel"
        />
      </div>

      {mode === "qr" ? (
        <QrScanner autoStart={autoStart} onResolved={onResolved} onProduct={onProduct} />
      ) : (
        <ImageScanner autoStart onResolved={onResolved} onProduct={onProduct} />
      )}
    </div>
  );
}

function Tab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
        active ? "bg-card text-ink shadow-sm" : "text-ink-muted hover:text-ink"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
