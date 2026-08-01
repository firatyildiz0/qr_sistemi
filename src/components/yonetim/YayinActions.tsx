"use client";

import { useState, useTransition } from "react";
import { yayinla } from "@/app/yonetim/yayin/actions";
import { IconBolt, IconCheck, IconX } from "@/components/icons";

/**
 * Canlıya alma düğmesi.
 *
 * Onay iki adımlı: tek tıkla geri alınamaz bir iş yapılmıyor, ve ikinci adımda
 * tam olarak nelerin gideceği yazıyor — sıralı yapı yüzünden bu genellikle
 * tıklanan satırdan fazlası oluyor.
 */
export default function YayinActions({
  sha,
  adet,
  basliklar,
}: {
  sha: string;
  adet: number;
  basliklar: string[];
}) {
  const [soruluyor, setSoruluyor] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function gonder() {
    setError(null);
    startTransition(async () => {
      try {
        const sonuc = await yayinla(sha);
        if (sonuc.tamam) setSoruluyor(false);
        else setError(sonuc.mesaj);
      } catch {
        // Buraya ancak istek hiç ulaşmazsa düşülür; işin kendi hataları
        // `sonuc` içinde geliyor.
        setError("Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.");
      }
    });
  }

  if (!soruluyor) {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setSoruluyor(true)}
          className="btn btn-secondary h-10 min-h-10 self-start px-4 text-sm"
        >
          <IconBolt className="h-4 w-4" />
          {adet === 1 ? "Canlıya al" : `Buraya kadar canlıya al (${adet})`}
        </button>
        {error && (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-surface px-3 py-3">
      <p className="text-sm font-semibold text-ink">
        {adet === 1
          ? "Bu değişiklik canlıya alınacak:"
          : `Bu ${adet} değişiklik canlıya alınacak:`}
      </p>
      <ul className="mt-2 space-y-1 text-sm text-ink-muted">
        {basliklar.map((b, i) => (
          <li key={i}>• {b}</li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-ink-muted">
        Yayına alma birkaç dakika sürer.
      </p>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={gonder}
          disabled={pending}
          className="btn btn-primary h-10 min-h-10 px-4 text-sm"
        >
          <IconCheck className="h-4 w-4" />
          {pending ? "Gönderiliyor…" : "Evet, canlıya al"}
        </button>
        <button
          type="button"
          onClick={() => {
            setSoruluyor(false);
            setError(null);
          }}
          disabled={pending}
          className="btn btn-ghost h-10 min-h-10 px-4 text-sm"
        >
          <IconX className="h-4 w-4" />
          Vazgeç
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
