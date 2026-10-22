"use client";

import { useState } from "react";
import { gunEkle, utc } from "@/components/admin/kapak/takvim";

export type Aralik = { bas: string; son: string };

type Kisayol = { ad: string; aralik: Aralik };

function haftaBasi(tarih: string) {
  return gunEkle(tarih, -((utc(tarih).getUTCDay() + 6) % 7));
}

function ayBasi(tarih: string) {
  return `${tarih.slice(0, 7)}-01`;
}

function aySonu(ay: string) {
  const d = utc(ay);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return gunEkle(d.toISOString().slice(0, 10), -1);
}

function oncekiAy(ay: string) {
  const d = utc(ay);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Büyük takvimin "Tarih seç" penceresi: tek bir güne ya da bir tarih
 * aralığına git.
 *
 * Tarih kutuları tarayıcının kendi seçicisi: telefonda işletim sisteminin
 * tekerleği ya da takvimi açılıyor, klavyeyle yazmak da mümkün — kendi
 * çizdiğimiz bir seçiciden daha tanıdık. En sık istenenler kısayol olarak
 * üstte; kısayola basmak doğrudan uyguluyor, ikinci bir onay istemiyor.
 */
export default function TarihSecici({
  bugun,
  baslangicDegeri,
  onTek,
  onAralik,
  onClose,
}: {
  bugun: string;
  /** Pencere açılırken kutularda duracak tarih: takvimde seçili olan. */
  baslangicDegeri: Aralik;
  onTek: (tarih: string) => void;
  onAralik: (aralik: Aralik) => void;
  onClose: () => void;
}) {
  const [kip, setKip] = useState<"tek" | "aralik">(
    baslangicDegeri.bas === baslangicDegeri.son ? "tek" : "aralik",
  );
  const [tek, setTek] = useState(baslangicDegeri.bas);
  const [bas, setBas] = useState(baslangicDegeri.bas);
  const [son, setSon] = useState(baslangicDegeri.son);

  const buHafta = haftaBasi(bugun);
  const buAy = ayBasi(bugun);
  const gecenAy = oncekiAy(buAy);

  const tekKisayollar = [
    { ad: "Bugün", tarih: bugun },
    { ad: "Yarın", tarih: gunEkle(bugun, 1) },
    { ad: "Dün", tarih: gunEkle(bugun, -1) },
  ];
  const aralikKisayollar: Kisayol[] = [
    { ad: "Bu hafta", aralik: { bas: buHafta, son: gunEkle(buHafta, 6) } },
    { ad: "Gelecek hafta", aralik: { bas: gunEkle(buHafta, 7), son: gunEkle(buHafta, 13) } },
    { ad: "Bu ay", aralik: { bas: buAy, son: aySonu(buAy) } },
    { ad: "Geçen ay", aralik: { bas: gecenAy, son: aySonu(gecenAy) } },
    { ad: "Son 30 gün", aralik: { bas: gunEkle(bugun, -29), son: bugun } },
    { ad: "Önümüzdeki 30 gün", aralik: { bas: bugun, son: gunEkle(bugun, 29) } },
  ];

  const hata =
    kip === "tek"
      ? !tek
        ? "Bir tarih seçin."
        : null
      : !bas || !son
        ? "Başlangıç ve bitiş tarihini seçin."
        : son < bas
          ? "Bitiş tarihi başlangıçtan önce olamaz."
          : null;

  function uygula(e: React.FormEvent) {
    e.preventDefault();
    if (hata) return;
    if (kip === "tek") onTek(tek);
    else if (bas === son) onTek(bas);
    else onAralik({ bas, son });
  }

  const kisayolSinifi =
    "rounded-[6px] border border-border bg-card px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-ink-muted";

  return (
    <form
      onSubmit={uygula}
      role="dialog"
      aria-label="Tarih seç"
      className="modal-panel fixed inset-x-2 bottom-2 z-30 flex flex-col gap-4 rounded-[14px] border border-border bg-card p-4 shadow-2xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-12 sm:w-[360px]"
    >
      {/* Kip seçimi: iki eşit parça. */}
      <div role="tablist" aria-label="Seçim türü" className="grid grid-cols-2 gap-1 rounded-[8px] bg-surface p-1">
        {(
          [
            ["tek", "Tek gün"],
            ["aralik", "Tarih aralığı"],
          ] as const
        ).map(([deger, ad]) => (
          <button
            key={deger}
            type="button"
            role="tab"
            aria-selected={kip === deger}
            onClick={() => setKip(deger)}
            className={`rounded-[6px] py-2 text-sm font-semibold transition-colors ${
              kip === deger ? "bg-card text-ink shadow-sm" : "text-ink-muted hover:text-ink"
            }`}
          >
            {ad}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {kip === "tek"
          ? tekKisayollar.map((k) => (
              <button key={k.ad} type="button" onClick={() => onTek(k.tarih)} className={kisayolSinifi}>
                {k.ad}
              </button>
            ))
          : aralikKisayollar.map((k) => (
              <button key={k.ad} type="button" onClick={() => onAralik(k.aralik)} className={kisayolSinifi}>
                {k.ad}
              </button>
            ))}
      </div>

      {kip === "tek" ? (
        <label className="flex flex-col gap-1.5">
          <span className="field-label m-0">Tarih</span>
          <input type="date" value={tek} onChange={(e) => setTek(e.target.value)} className="input" />
        </label>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="field-label m-0">Başlangıç</span>
            <input
              type="date"
              value={bas}
              onChange={(e) => {
                setBas(e.target.value);
                // Bitiş başlangıçtan önce kalmasın: kullanıcı başlangıcı ileri
                // aldıysa bitiş de onunla birlikte gelsin.
                if (son && e.target.value > son) setSon(e.target.value);
              }}
              className="input px-3"
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="field-label m-0">Bitiş</span>
            <input
              type="date"
              value={son}
              min={bas || undefined}
              onChange={(e) => setSon(e.target.value)}
              className="input px-3"
            />
          </label>
        </div>
      )}

      {hata && (bas || son || tek) && <p className="m-0 text-xs font-semibold text-danger">{hata}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn btn-ghost min-h-0 px-4 py-2.5">
          Vazgeç
        </button>
        <button type="submit" disabled={!!hata} className="btn btn-primary min-h-0 px-5 py-2.5">
          Göster
        </button>
      </div>
    </form>
  );
}
