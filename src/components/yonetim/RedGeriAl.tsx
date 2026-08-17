"use client";

import { useState, useTransition } from "react";
import { geriAl } from "@/app/yonetim/yayin/actions";
import { IconUndo } from "@/components/icons";

/**
 * Reddedilmiş bir işi bekleyenler listesine geri alır.
 *
 * Burada onay sorusu yok: geri almak bir şeyi canlıya çıkarmıyor, yalnızca işi
 * yeniden karar bekler hale getiriyor — yanlışlıkla basılırsa aynı yerden
 * tekrar reddedilebilir.
 */
export default function RedGeriAl({ dal }: { dal: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function gonder() {
    setError(null);
    startTransition(async () => {
      try {
        const sonuc = await geriAl(dal);
        if (!sonuc.tamam) setError(sonuc.mesaj);
      } catch {
        setError("Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={gonder}
        disabled={pending}
        className="btn btn-ghost h-9 min-h-9 self-start px-3 text-xs"
      >
        <IconUndo className="h-4 w-4" />
        {pending ? "Alınıyor…" : "Geri al"}
      </button>
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
