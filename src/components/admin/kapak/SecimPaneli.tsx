"use client";

import { useEffect, useState } from "react";

/**
 * GEÇİCİ — yalnızca tasarım seçimi için. Seçim yapılınca bu dosya, seçilmeyen
 * seçeneklerin CSS'i ve `data-kabuk` / `data-bugun` / `data-hareket`
 * öznitelikleri kaldırılacak.
 *
 * Yön A'nın üç ekseni canlı veriyle yan yana denensin diye ekranın köşesinde
 * küçük bir pano. Seçimler `<html>`'e öznitelik olarak yazılıyor; bütün
 * farklar CSS'te. Adres parametresiyle de verilebiliyor
 * (`/admin?kabuk=koyu&bugun=serit&hareket=canli`), bir bağlantıyla belli bir
 * birleşimi göstermek için.
 */

const EKSENLER = [
  {
    ad: "kabuk",
    baslik: "Kenar çubuğu",
    secenekler: [
      { deger: "acik", ad: "Açık ray" },
      { deger: "koyu", ad: "Koyu ray" },
      { deger: "yuzen", ad: "Yüzen ray" },
    ],
  },
  {
    ad: "bugun",
    baslik: "Bugün kartı",
    secenekler: [
      { deger: "koyu", ad: "Koyu liste" },
      { deger: "serit", ad: "7 günlük şerit" },
    ],
  },
  {
    ad: "hareket",
    baslik: "Hareket",
    secenekler: [
      { deger: "sade", ad: "Sade" },
      { deger: "canli", ad: "Canlı" },
    ],
  },
] as const;

type Secim = Record<(typeof EKSENLER)[number]["ad"], string>;

const ANAHTAR = "panel-kapak-secim";
const VARSAYILAN: Secim = { kabuk: "acik", bugun: "koyu", hareket: "canli" };

function uygula(secim: Secim) {
  const kok = document.documentElement;
  for (const [ad, deger] of Object.entries(secim)) kok.setAttribute(`data-${ad}`, deger);
}

export default function SecimPaneli() {
  const [secim, setSecim] = useState<Secim>(VARSAYILAN);
  const [acik, setAcik] = useState(true);

  // Önce kayıtlı seçim, üstüne adresteki parametreler. Sayfa değişince
  // (template yeniden kurulunca) aynı seçim yeniden okunuyor.
  useEffect(() => {
    let kayitli: Partial<Secim> = {};
    try {
      kayitli = JSON.parse(localStorage.getItem(ANAHTAR) ?? "{}");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from localStorage on mount
      setAcik(localStorage.getItem(`${ANAHTAR}-acik`) !== "0");
    } catch {}
    const adres = new URLSearchParams(window.location.search);
    const sonuc = { ...VARSAYILAN };
    for (const eksen of EKSENLER) {
      const aday = adres.get(eksen.ad) ?? kayitli[eksen.ad];
      if (eksen.secenekler.some((s) => s.deger === aday)) sonuc[eksen.ad] = aday!;
    }
    setSecim(sonuc);
    uygula(sonuc);
  }, []);

  function sec(ad: keyof Secim, deger: string) {
    const sonuc = { ...secim, [ad]: deger };
    setSecim(sonuc);
    uygula(sonuc);
    try {
      localStorage.setItem(ANAHTAR, JSON.stringify(sonuc));
    } catch {}
  }

  function ac(deger: boolean) {
    setAcik(deger);
    try {
      localStorage.setItem(`${ANAHTAR}-acik`, deger ? "1" : "0");
    } catch {}
  }

  if (!acik) {
    return (
      <button
        type="button"
        onClick={() => ac(true)}
        className="secim-paneli fixed bottom-24 left-4 z-[60] rounded-full bg-ink px-4 py-2.5 text-xs font-bold text-paper shadow-lg md:bottom-6 md:left-auto md:right-24"
      >
        Tasarım seçimi
      </button>
    );
  }

  return (
    <div
      role="region"
      aria-label="Tasarım seçimi"
      className="secim-paneli fixed inset-x-3 bottom-24 z-[60] rounded-[22px] bg-ink p-4 text-paper shadow-2xl md:inset-x-auto md:bottom-6 md:right-24 md:w-[300px]"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-paper/60">Tasarım seçimi · geçici</p>
        <button
          type="button"
          onClick={() => ac(false)}
          className="rounded-full px-2 py-1 text-xs font-bold text-paper/70 hover:text-paper"
        >
          Gizle
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {EKSENLER.map((eksen) => (
          <div key={eksen.ad} className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold">{eksen.baslik}</span>
            <div className="flex flex-wrap gap-1.5">
              {eksen.secenekler.map((s) => {
                const secili = secim[eksen.ad] === s.deger;
                return (
                  <button
                    key={s.deger}
                    type="button"
                    aria-pressed={secili}
                    onClick={() => sec(eksen.ad, s.deger)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                      secili ? "bg-accent text-white" : "bg-paper/10 text-paper/80 hover:bg-paper/20"
                    }`}
                  >
                    {s.ad}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
