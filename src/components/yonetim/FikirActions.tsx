"use client";

import { useState, useTransition } from "react";
import { fikirDurumuDegistir, type FikirDurumu } from "@/app/yonetim/fikirler/actions";
import { IconCheck, IconInbox, IconUndo } from "@/components/icons";

/**
 * Bir önerinin düğmeleri. Arşivlemek silmiyor: öneri Arşiv bölümünde kalıyor,
 * tek tıkla geri alınabiliyor.
 */
export default function FikirActions({ id, durum }: { id: string; durum: FikirDurumu }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(yeni: FikirDurumu) {
    setError(null);
    startTransition(async () => {
      try {
        await fikirDurumuDegistir(id, yeni);
      } catch (e) {
        setError(e instanceof Error ? e.message : "İşlem tamamlanamadı.");
      }
    });
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex gap-2">
        {durum === "yeni" && (
          <button
            type="button"
            onClick={() => run("okundu")}
            disabled={pending}
            className="btn btn-primary h-10 min-h-10 px-4 text-sm"
          >
            <IconCheck className="h-4 w-4" />
            Okundu
          </button>
        )}
        {durum !== "arsiv" ? (
          <button
            type="button"
            onClick={() => run("arsiv")}
            disabled={pending}
            className="btn btn-ghost h-10 min-h-10 px-4 text-sm"
          >
            <IconInbox className="h-4 w-4" />
            Arşivle
          </button>
        ) : (
          <button
            type="button"
            onClick={() => run("okundu")}
            disabled={pending}
            className="btn btn-ghost h-10 min-h-10 px-4 text-sm"
          >
            <IconUndo className="h-4 w-4" />
            Geri al
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
