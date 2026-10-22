"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Secim } from "./vitrin/secenekler";

export type Bolum = { id: string; ad: string };

type Olcu = {
  /** Okunan bölümün sırası. */
  etkin: number;
  /** Her bölümün sayfadaki yeri ve boyu, sayfa boyuna oranla (mini harita). */
  bloklar: { ust: number; boy: number }[];
  /** Ekranda görünen kısım, aynı oranla. */
  pencere: { ust: number; boy: number };
};

/**
 * Hangi bölümün okunduğunu ve sayfanın ne kadarının kaydırıldığını izliyor.
 *
 * Okunan bölüm: üst çubuğun hemen altındaki çizgiyi (ekranın dörtte biri, en az
 * 160px) geçmiş son bölüm. Sayfanın dibine gelindiyse son bölüm, çünkü kısa son
 * bölüm o çizgiye hiç ulaşamayabilir. Bir bölüme gidilirken kayma bitene kadar
 * imleç hedefte bekliyor; aradan geçen bölümlerde titremesin. Yumuşak kaymayı
 * CSS veriyor (`html:has(.vitrin)`), hareket kapalıysa kayma anında oluyor.
 */
function useBolumIzleyici(bolumler: Bolum[]) {
  const [olcu, setOlcu] = useState<Olcu>({ etkin: 0, bloklar: [], pencere: { ust: 0, boy: 0 } });
  const hedef = useRef<number | null>(null);

  useEffect(() => {
    let kare = 0;

    function hesapla() {
      kare = 0;
      const sayfa = document.documentElement.scrollHeight;
      const ekran = window.innerHeight;
      const dip = ekran + window.scrollY >= sayfa - 4;
      const cizgi = Math.max(160, ekran * 0.25);

      let sira = 0;
      const bloklar = bolumler.map((bolum, i) => {
        const el = document.getElementById(bolum.id);
        if (!el) return { ust: 0, boy: 0 };
        const kutu = el.getBoundingClientRect();
        if (kutu.top <= cizgi) sira = i;
        return { ust: (kutu.top + window.scrollY) / sayfa, boy: kutu.height / sayfa };
      });

      setOlcu({
        etkin: hedef.current ?? (dip ? bolumler.length - 1 : sira),
        bloklar,
        pencere: { ust: window.scrollY / sayfa, boy: ekran / sayfa },
      });
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

  const git = useCallback(
    (sira: number) => {
      const bolum = bolumler[sira];
      const el = bolum && document.getElementById(bolum.id);
      if (!el) return;
      hedef.current = sira;
      setOlcu((o) => ({ ...o, etkin: sira }));
      el.scrollIntoView({ block: "start" });
      history.replaceState(null, "", `${location.search}#${bolum.id}`);
      // `scrollend` desteklemeyen tarayıcılar ve hiç kaymayan tıklamalar için.
      window.setTimeout(() => {
        if (hedef.current === sira) hedef.current = null;
      }, 1200);
    },
    [bolumler],
  );

  return { ...olcu, git };
}

/**
 * Sağ kenarda duran bölüm imleci; dört aday var (bkz. vitrin/secenekler.ts).
 * Telefonda hiçbiri yok: orada ekranın kenarı başparmağın kaydırdığı yer.
 */
export default function BolumImleci({ bolumler, tur }: { bolumler: Bolum[]; tur: Secim["imlec"] }) {
  const izleyici = useBolumIzleyici(bolumler);
  if (tur === "I2") return <EtiketSekmeleri bolumler={bolumler} {...izleyici} />;
  if (tur === "I3") return <SayacListe bolumler={bolumler} {...izleyici} />;
  if (tur === "I4") return <MiniHarita bolumler={bolumler} {...izleyici} />;
  return <Cetvel bolumler={bolumler} {...izleyici} />;
}

type Gorunum = Olcu & { bolumler: Bolum[]; git: (sira: number) => void };

const odak = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** I1: bölüm adları hep görünür; okunan kısım kırmızıya boyanır. */
function Cetvel({ bolumler, etkin, git }: Gorunum) {
  return (
    <nav aria-label="Sayfa bölümleri" className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 lg:block xl:right-8">
      <ol className="m-0 flex list-none flex-col items-end p-0">
        {bolumler.map((bolum, i) => {
          const secili = i === etkin;
          const okundu = i <= etkin;
          return (
            <li key={bolum.id} className="flex flex-col items-end">
              {i > 0 && (
                <>
                  <span aria-hidden className={`my-[5px] h-0.5 w-2.5 transition-colors ${okundu ? "bg-accent" : "bg-border-strong"}`} />
                  <span aria-hidden className={`my-[5px] h-0.5 w-2.5 transition-colors ${okundu ? "bg-accent" : "bg-border-strong"}`} />
                </>
              )}
              <button
                type="button"
                onClick={() => git(i)}
                aria-current={secili ? "location" : undefined}
                className={`flex h-9 items-center gap-3 rounded-full pl-3 transition-all ${odak} ${
                  secili ? "text-[15px] font-extrabold text-ink" : "text-[13px] font-semibold text-ink-muted hover:text-ink"
                }`}
              >
                {bolum.ad}
                <span
                  aria-hidden
                  className={`rounded-full transition-all duration-300 ${
                    secili ? "h-[3px] w-10 bg-accent" : `h-0.5 w-6 ${okundu ? "bg-accent" : "bg-border-strong"}`
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** I2: ekranın kenarından çıkan etiketler; okunan bölüm adıyla dışarı uzanır. */
function EtiketSekmeleri({ bolumler, etkin, git }: Gorunum) {
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
                className={`group flex items-center overflow-hidden rounded-l-[14px] shadow-[0_6px_14px_-10px_var(--app-shadow)] transition-all duration-300 ${odak} ${
                  secili ? "h-12 bg-accent pl-3.5 pr-5 text-white" : "h-10 bg-card pl-2.5 pr-2.5 text-ink-muted hover:pr-4"
                }`}
              >
                <span
                  aria-hidden
                  className={`h-2 w-2 shrink-0 rounded-full ${secili ? "bg-white" : "border border-border-strong bg-paper"}`}
                />
                <span
                  className={`whitespace-nowrap font-bold transition-all duration-300 ${
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

/** I3: küçük bir hap; oklarla bölüm değişir, ortasına basınca liste açılır. */
function SayacListe({ bolumler, etkin, git }: Gorunum) {
  const [acik, setAcik] = useState(false);
  const kutu = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!acik) return;
    function disari(e: PointerEvent) {
      if (kutu.current && !kutu.current.contains(e.target as Node)) setAcik(false);
    }
    document.addEventListener("pointerdown", disari);
    return () => document.removeEventListener("pointerdown", disari);
  }, [acik]);

  const ok = `flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-on-deep transition-colors hover:bg-white/20 disabled:opacity-30 ${odak}`;

  return (
    <nav
      ref={kutu}
      aria-label="Sayfa bölümleri"
      className="fixed bottom-6 right-6 z-40 hidden flex-col items-end gap-2 lg:flex"
    >
      {acik && (
        <ol className="m-0 flex w-56 list-none flex-col gap-0.5 rounded-[22px] bg-deep p-2 text-sm font-semibold text-on-deep/80 shadow-[0_24px_40px_-20px_var(--app-shadow)]">
          {bolumler.map((bolum, i) => (
            <li key={bolum.id}>
              <button
                type="button"
                onClick={() => {
                  git(i);
                  setAcik(false);
                }}
                aria-current={i === etkin ? "location" : undefined}
                className={`flex w-full gap-2.5 rounded-[14px] px-3 py-2.5 text-left transition-colors ${odak} ${
                  i === etkin ? "bg-white/10 text-white" : "hover:bg-white/5"
                }`}
              >
                <span className={`tabular-nums ${i === etkin ? "text-[#ff8a82]" : "text-on-deep/45"}`}>{i + 1}</span>
                {bolum.ad}
              </button>
            </li>
          ))}
        </ol>
      )}
      <div className="flex items-center gap-1 rounded-full bg-deep p-1.5 text-on-deep shadow-[0_18px_30px_-16px_var(--app-shadow)]">
        <button type="button" aria-label="Önceki bölüm" disabled={etkin === 0} onClick={() => git(etkin - 1)} className={ok}>
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 15l6-6 6 6" />
          </svg>
        </button>
        <button
          type="button"
          aria-expanded={acik}
          onClick={() => setAcik((a) => !a)}
          className={`whitespace-nowrap rounded-full px-3 py-2 text-[13px] font-bold ${odak}`}
        >
          <span className="tabular-nums text-[#ff8a82]">
            {etkin + 1}/{bolumler.length}
          </span>{" "}
          {bolumler[etkin]?.ad}
        </button>
        <button
          type="button"
          aria-label="Sonraki bölüm"
          disabled={etkin === bolumler.length - 1}
          onClick={() => git(etkin + 1)}
          className={ok}
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>
    </nav>
  );
}

/** I4: sayfanın küçük planı; kırmızı çerçeve ekranda görünen kısım. */
function MiniHarita({ bolumler, etkin, git, bloklar, pencere }: Gorunum) {
  const BOY = 260;
  return (
    <nav
      aria-label="Sayfa bölümleri"
      className="group fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 items-center gap-3 lg:flex xl:right-8"
    >
      <span className="rounded-full bg-card px-3 py-1.5 text-[13px] font-extrabold text-accent shadow-[var(--app-lift)]">
        {bolumler[etkin]?.ad}
      </span>
      <div className="relative w-14 rounded-[14px] bg-card p-1.5 shadow-[var(--app-lift)]" style={{ height: BOY + 12 }}>
        {bolumler.map((bolum, i) => {
          const blok = bloklar[i];
          if (!blok) return null;
          return (
            <button
              key={bolum.id}
              type="button"
              aria-label={bolum.ad}
              aria-current={i === etkin ? "location" : undefined}
              onClick={() => git(i)}
              className={`absolute inset-x-1.5 rounded-md transition-colors ${odak} ${
                i === etkin ? "bg-accent-soft" : "bg-paper hover:bg-border"
              }`}
              style={{ top: 6 + blok.ust * BOY, height: Math.max(8, blok.boy * BOY - 3) }}
            />
          );
        })}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-1 rounded-[9px] border-2 border-accent"
          style={{ top: 6 + pencere.ust * BOY, height: Math.max(12, pencere.boy * BOY) }}
        />
      </div>
    </nav>
  );
}
