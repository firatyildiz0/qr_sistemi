"use client";

import { useState, useTransition } from "react";
import { reddet, yayinla } from "@/app/yonetim/yayin/actions";
import { IconBolt, IconCheck, IconX } from "@/components/icons";

type Soru = "yayin" | "red" | null;

/**
 * Bir işin karar düğmeleri: canlıya al ya da reddet.
 *
 * İkisi de iki adımlı: tek tıkla, sorulmadan karar verilmiyor. İşler
 * birbirinden bağımsız olduğu için soru da tek bir işi soruyor — yanına başka
 * bir şey takılmıyor.
 */
export default function YayinActions({
  dal,
  baslik,
}: {
  dal: string;
  baslik: string;
}) {
  const [soru, setSoru] = useState<Soru>(null);
  const [sebep, setSebep] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function gonder() {
    setError(null);
    startTransition(async () => {
      try {
        const sonuc = soru === "red" ? await reddet(dal, sebep) : await yayinla(dal);
        if (sonuc.tamam) {
          setSoru(null);
          setSebep("");
        } else {
          setError(sonuc.mesaj);
        }
      } catch {
        // Buraya ancak istek hiç ulaşmazsa düşülür; işin kendi hataları
        // `sonuc` içinde geliyor.
        setError("Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.");
      }
    });
  }

  function vazgec() {
    setSoru(null);
    setError(null);
  }

  if (soru === null) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSoru("yayin")}
            className="btn btn-secondary h-10 min-h-10 px-4 text-sm"
          >
            <IconBolt className="h-4 w-4" />
            Canlıya al
          </button>
          <button
            type="button"
            onClick={() => setSoru("red")}
            className="btn btn-ghost h-10 min-h-10 px-4 text-sm"
          >
            <IconX className="h-4 w-4" />
            Reddet
          </button>
        </div>
        {error && (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }

  const red = soru === "red";

  return (
    <div className="rounded-md border border-border bg-surface px-3 py-3">
      <p className="text-sm font-semibold text-ink">
        {red ? "Bu iş reddedilecek:" : "Bu iş canlıya alınacak:"}
      </p>
      <p className="mt-1 text-sm text-ink-muted">{baslik}</p>
      <p className="mt-2 text-xs text-ink-muted">
        {red
          ? "Canlıya alınmaz ve listeden çıkar. Silinmez — reddedilenler listesinden istediğiniz zaman geri alabilirsiniz."
          : "Diğer bekleyen işler yerinde kalır. Yayına alma birkaç dakika sürer."}
      </p>

      {red && (
        <label className="mt-3 block">
          <span className="text-xs text-ink-muted">Neden? (isteğe bağlı)</span>
          <textarea
            value={sebep}
            onChange={(e) => setSebep(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Sonradan hatırlamak için kısa bir not"
            className="input mt-1 w-full text-sm"
          />
        </label>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={gonder}
          disabled={pending}
          className={`btn h-10 min-h-10 px-4 text-sm ${red ? "btn-secondary" : "btn-primary"}`}
        >
          <IconCheck className="h-4 w-4" />
          {pending ? "Gönderiliyor…" : red ? "Evet, reddet" : "Evet, canlıya al"}
        </button>
        <button
          type="button"
          onClick={vazgec}
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
