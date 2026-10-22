"use client";

import { useEffect, useRef, useState } from "react";

export type Bolum = { id: string; ad: string };

/** Bir satırın yüksekliği; imleç bu adımlarla kayıyor. */
const SATIR = 40;

/**
 * Sağ kenarda duran bölüm imleci.
 *
 * Dikey bir ray, raydaki her nokta bir bölüm; kırmızı imleç o an okunan
 * bölümün hizasına kayıyor. Noktaya basınca sayfa o bölüme kayıyor —
 * yumuşaklığı CSS veriyor (`html:has(.vitrin)` kuralı), hareket kapalıysa
 * kayma da anında oluyor, burada ayrıca kontrol gerekmiyor.
 *
 * Hangi bölümde olunduğu kaydırma konumundan hesaplanıyor: üst çubuğun hemen
 * altındaki çizgiyi (ekranın dörtte biri, en az 160px) geçmiş son bölüm.
 * Çizgi daha aşağıda olsaydı, kısa ekranda bir bölüme gidildiğinde altındaki
 * de çizgiyi geçip imleci kendine çekiyordu. Sayfanın dibine gelindiyse son bölüm, çünkü kısa
 * son bölüm o çizgiye hiç ulaşamayabilir. Bir noktaya basıldığında kayma
 * bitene kadar imleç hedefte bekliyor; aradan geçen bölümlerde titremesin.
 *
 * Telefonda yok: orada ekranın kenarı başparmağın kaydırdığı yer ve alt
 * eylem çubuğu zaten duruyor.
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
    <nav
      aria-label="Sayfa bölümleri"
      className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 lg:block xl:right-8"
    >
      <ol className="relative m-0 list-none p-0">
        {/* Ray */}
        <span
          aria-hidden
          className="absolute right-[11px] top-[20px] w-0.5 rounded-full bg-border-strong"
          style={{ height: (bolumler.length - 1) * SATIR }}
        />
        {/* İmleç */}
        <span
          aria-hidden
          className="absolute right-[8px] top-[8px] h-6 w-2 rounded-full bg-accent shadow-[0_0_0_4px_var(--color-paper)] transition-transform duration-500 ease-[var(--ease-spring)] motion-reduce:transition-none"
          style={{ transform: `translateY(${etkin * SATIR}px)` }}
        />
        {bolumler.map((bolum, i) => {
          const secili = i === etkin;
          return (
            <li key={bolum.id} style={{ height: SATIR }}>
              <button
                type="button"
                onClick={() => git(i)}
                aria-current={secili ? "location" : undefined}
                className="group flex h-full w-full items-center justify-end gap-3 rounded-full pl-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <span
                  className={`pointer-events-none whitespace-nowrap rounded-full bg-card px-3 py-1.5 text-[13px] font-bold shadow-[var(--app-lift)] transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 ${
                    secili ? "text-accent opacity-0" : "translate-x-1 text-ink-muted opacity-0"
                  }`}
                >
                  {bolum.ad}
                </span>
                <span className="relative flex h-6 w-6 items-center justify-center">
                  <span
                    className={`h-2 w-2 rounded-full transition-colors ${
                      secili ? "bg-transparent" : "bg-ink-muted/50 group-hover:bg-ink"
                    }`}
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
