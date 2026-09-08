"use client";

import { useState, useTransition } from "react";
import { baglantiyiKes } from "@/app/admin/instagram/actions";

/**
 * Bağlantıyı kesme, iki adımda: bir tıklama kesmiyor, önce ne olacağını
 * söylüyor. Bağlantı kesildiğinde gelen mesajlar cevapsız kalıyor ve bunu
 * yanlışlıkla yapmak, satıcının haberi olmadan müşteri kaybetmesi demek.
 */
export default function BaglantiyiKesButonu() {
  const [isPending, startTransition] = useTransition();
  const [onaySoruluyor, setOnaySoruluyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  if (!onaySoruluyor) {
    return (
      <button
        type="button"
        onClick={() => setOnaySoruluyor(true)}
        className="btn btn-danger-ghost w-full sm:w-auto"
      >
        Bağlantıyı kes
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <p className="notice-warning text-sm">
        Bağlantıyı keserseniz Instagram’dan gelen mesajlara otomatik cevap verilmez ve yeni
        rezervasyon talebi alınmaz. Mevcut talepleriniz ve rezervasyonlarınız durur.
      </p>

      {hata && <p className="text-sm font-medium text-danger">{hata}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const sonuc = await baglantiyiKes();
              if (sonuc.hata) setHata(sonuc.hata);
              else setOnaySoruluyor(false);
            })
          }
          className="btn btn-danger"
        >
          Evet, bağlantıyı kes
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => setOnaySoruluyor(false)}
          className="btn btn-ghost"
        >
          Vazgeç
        </button>
      </div>
    </div>
  );
}
