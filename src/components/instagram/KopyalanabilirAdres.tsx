"use client";

import { useState } from "react";
import { IconCheck, IconCopy } from "@/components/icons";

/**
 * Webhook adresi Meta paneline elle yazılacak kadar kısa değil ve tek harflik
 * bir yazım hatası entegrasyonun hiç çalışmaması demek. O yüzden kopyalanıyor,
 * okunmuyor.
 */
export default function KopyalanabilirAdres({ adres }: { adres: string }) {
  const [kopyalandi, setKopyalandi] = useState(false);

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-surface p-2">
      <code className="min-w-0 flex-1 truncate text-xs text-ink">{adres}</code>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(adres);
            setKopyalandi(true);
            setTimeout(() => setKopyalandi(false), 2000);
          } catch {
            // Pano izni yoksa metin zaten ekranda seçilebilir duruyor.
          }
        }}
        className="icon-btn shrink-0"
        aria-label="Adresi kopyala"
      >
        {kopyalandi ? (
          <IconCheck className="h-4 w-4 text-success" />
        ) : (
          <IconCopy className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
