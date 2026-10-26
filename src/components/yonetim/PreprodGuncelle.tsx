"use client";

import { useState, useTransition } from "react";
import {
  preprodGuncelle,
  type PreprodGuncellemeSonucu,
} from "@/app/yonetim/yayin/actions";
import { IconRefresh } from "@/components/icons";

/**
 * Preprod'u canlı + bekleyen işler olarak yeniden kurar.
 *
 * Onay sorusu yok: preprod canlıya dokunmuyor, her basışta baştan kuruluyor;
 * yanlışlıkla basılırsa olan tek şey preprod'un bir kez daha kurulması.
 */
export default function PreprodGuncelle() {
  const [pending, startTransition] = useTransition();
  const [sonuc, setSonuc] = useState<PreprodGuncellemeSonucu | null>(null);

  function gonder() {
    setSonuc(null);
    startTransition(async () => {
      try {
        setSonuc(await preprodGuncelle());
      } catch {
        setSonuc({
          tamam: false,
          mesaj: "Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.",
        });
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={gonder}
        disabled={pending}
        className="btn btn-secondary self-start"
      >
        <IconRefresh className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
        {pending ? "Kuruluyor…" : "Preprod'u güncelle"}
      </button>

      {sonuc && !sonuc.tamam && (
        <p role="alert" className="text-sm text-danger">
          {sonuc.mesaj}
        </p>
      )}
      {sonuc?.tamam && (
        <div role="status" className="text-sm text-ink">
          <p>
            {sonuc.eklenen.length} iş preprod&apos;a alındı. Vercel yeni hali birkaç dakika içinde
            yayına alır.
          </p>
          {sonuc.cakisan.length > 0 && (
            <p className="mt-1 text-danger">
              Çakıştığı için alınamayanlar: {sonuc.cakisan.join(", ")}. Bu işler canlıyla ya da
              listede kendilerinden önce gelen bir işle aynı satırlara dokunuyor; bana söyleyin,
              güncel hale getireyim.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
