"use client";

import { useEffect, useState } from "react";

/**
 * GEÇİCİ — yalnızca tasarım seçimi için. Seçim yapılınca bu dosya ve seçilmeyen
 * hâller kaldırılacak.
 *
 * Seçimler `<html>`'e öznitelik olarak yazılıyor (`data-gecmis`,
 * `data-hafta`); bileşenler `useSecim` ile okuyor. Adres parametresiyle de
 * verilebiliyor (`/admin?gecmis=aylar&hafta=ajanda`), bir bağlantıyla belli
 * bir birleşimi göstermek için.
 */

const EKSENLER = [
  {
    ad: "hafta",
    baslik: "Önümüzdeki 7 gün",
    secenekler: [
      { deger: "sigan", ad: "A · Sığan şerit" },
      { deger: "ajanda", ad: "B · Ajanda" },
      { deger: "secili", ad: "C · Gün seçici" },
    ],
  },
  {
    ad: "gecmis",
    baslik: "Rezervasyon geçmişi",
    secenekler: [
      { deger: "tarih", ad: "A · Tarih rozeti" },
      { deger: "aylar", ad: "B · Aylara göre" },
      { deger: "sirada", ad: "C · Önce sıradakiler" },
    ],
  },
] as const;

type Secim = Record<(typeof EKSENLER)[number]["ad"], string>;

const ANAHTAR = "panel-kapak-secim-3";
const VARSAYILAN: Secim = { hafta: "sigan", gecmis: "tarih" };

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

  // Sol altta, kenar çubuğunun hemen yanında: sağ alttaki "Ürün bul"
  // düğmesinin üstüne binmesin.
  const konum = "fixed z-[60] bottom-24 md:bottom-6 md:left-[17rem]";

  if (!acik) {
    return (
      <button
        type="button"
        onClick={() => ac(true)}
        className={`${konum} left-4 rounded-full bg-ink px-4 py-2.5 text-xs font-bold text-paper shadow-lg`}
      >
        Tasarım seçimi
      </button>
    );
  }

  return (
    <div
      role="region"
      aria-label="Tasarım seçimi"
      className={`${konum} inset-x-3 max-h-[70vh] overflow-y-auto rounded-[22px] bg-ink p-4 text-paper shadow-2xl md:right-auto md:w-[320px]`}
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
      <p className="m-0 mt-3 text-[11px] leading-snug text-paper/55">
        İkisi de panelin ana sayfasında.
      </p>
    </div>
  );
}
