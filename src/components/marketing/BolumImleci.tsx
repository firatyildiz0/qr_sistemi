"use client";

import { useEffect, useRef, useState } from "react";

export type Bolum = { id: string; ad: string };

/**
 * Sağ kenardaki bölüm imleci: ekranın kenarından çıkan etiketler.
 *
 * Her bölüm kenara yapışık küçük bir etiket; okunan bölümün etiketi kırmızıya
 * dönüp adıyla dışarı uzanıyor, üstüne gelinen ya da klavyeyle odaklanılan
 * etiket de adını gösteriyor. Etikete basınca sayfa o bölüme kayıyor —
 * yumuşaklığı CSS veriyor (`html:has(.vitrin)`), hareket kapalıysa anında.
 *
 * Okunan bölüm: üst çubuğun hemen altındaki çizgiyi (ekranın dörtte biri, en
 * az 160px) geçmiş son bölüm. Çizgi daha aşağıda olsaydı, kısa ekranda bir
 * bölüme gidildiğinde altındaki de çizgiyi geçip imleci kendine çekiyordu.
 * Sayfanın dibine gelindiyse son bölüm, çünkü kısa son bölüm o çizgiye hiç
 * ulaşamayabilir. Bir etikete basıldığında kayma bitene kadar imleç hedefte
 * bekliyor; aradan geçen bölümlerde titremesin.
 *
 * Telefonda yok: orada ekranın kenarı başparmağın kaydırdığı yer.
 */
export default function BolumImleci({ bolumler }: { bolumler: Bolum[] }) {
  const [etkin, setEtkin] = useState(0);
  const hedef = useRef<number | null>(null);

  useEffect(() => {
    let kare = 0;

    function hesapla() {
      kare = 0;
      if (hedef.current !== null) return;
      const dip = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (dip) {
        setEtkin(bolumler.length - 1);
        return;
      }
      const cizgi = Math.max(160, window.innerHeight * 0.25);
      let sira = 0;
      bolumler.forEach((bolum, i) => {
        const el = document.getElementById(bolum.id);
        if (el && el.getBoundingClientRect().top <= cizgi) sira = i;
      });
      setEtkin(sira);
    }

    function kaydirildi() {
      if (!kare) kare = requestAnimationFrame(hesapla);
    }

    function kaymaBitti() {
      if (hedef.current === null) return;
      hedef.current = null;
      hesapla();
    }

    hesapla();
    window.addEventListener("scroll", kaydirildi, { passive: true });
    window.addEventListener("resize", kaydirildi);
    window.addEventListener("scrollend", kaymaBitti);
    return () => {
      cancelAnimationFrame(kare);
      window.removeEventListener("scroll", kaydirildi);
      window.removeEventListener("resize", kaydirildi);
      window.removeEventListener("scrollend", kaymaBitti);
    };
  }, [bolumler]);

  function git(sira: number) {
    const el = document.getElementById(bolumler[sira].id);
    if (!el) return;
    hedef.current = sira;
    setEtkin(sira);
    el.scrollIntoView({ block: "start" });
    history.replaceState(null, "", `#${bolumler[sira].id}`);
    // `scrollend` desteklemeyen tarayıcılar ve hiç kaymayan tıklamalar için
    // (zaten o bölümdeyse) kilit kendiliğinden açılıyor.
    window.setTimeout(() => {
      if (hedef.current === sira) hedef.current = null;
    }, 1200);
  }

  return (
    <nav aria-label="Sayfa bölümleri" className="fixed right-0 top-1/2 z-40 hidden -translate-y-1/2 lg:block">
      <ol className="m-0 flex list-none flex-col items-end gap-2 p-0">
        {bolumler.map((bolum, i) => {
          const secili = i === etkin;
          return (
            <li key={bolum.id}>
              <button
                type="button"
                onClick={() => git(i)}
                aria-current={secili ? "location" : undefined}
                aria-label={bolum.ad}
                className={`group flex items-center overflow-hidden rounded-l-[14px] shadow-[0_6px_14px_-10px_var(--app-shadow)] transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none ${
                  secili ? "h-12 bg-accent pl-3.5 pr-5 text-white" : "h-10 bg-card pl-2.5 pr-2.5 text-ink-muted hover:pr-4"
                }`}
              >
                <span
                  aria-hidden
                  className={`h-2 w-2 shrink-0 rounded-full ${secili ? "bg-white" : "border border-border-strong bg-paper"}`}
                />
                <span
                  className={`whitespace-nowrap font-bold transition-all duration-300 motion-reduce:transition-none ${
                    secili
                      ? "ml-2.5 max-w-40 text-[15px]"
                      : "ml-0 max-w-0 text-[13px] opacity-0 group-hover:ml-2 group-hover:max-w-40 group-hover:opacity-100 group-focus-visible:ml-2 group-focus-visible:max-w-40 group-focus-visible:opacity-100"
                  }`}
                >
                  {bolum.ad}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
