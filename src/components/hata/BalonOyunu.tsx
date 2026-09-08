"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Balon, { BALON_RENKLERI } from "./Balon";
import { URUNLER } from "./urunler";
import { balonSesi, kacisSesi, urunSesi } from "@/lib/oyun/patlamaSesi";

/**
 * 404 sayfasının oyunu: balonlar yukarıdan yavaşça iniyor, patlatılan her
 * balondan kiralanabilir bir ürün çıkıyor.
 *
 * Balonların konumu React'in dışında yürüyor. Her karede `setState` çağırmak
 * dokuz balon için dokuz yeniden render demek olurdu; onun yerine konumlar bir
 * ref'teki nesnelerde tutuluyor ve doğrudan elemanın `transform`'una yazılıyor.
 * React yalnızca balon doğduğunda ya da öldüğünde yeniden render ediyor.
 */

type Durum = "hazir" | "oynuyor" | "bitti";

type BalonNesnesi = {
  id: number;
  x: number;
  y: number;
  /** px/sn. Her balonun kendi hızı var, yoksa hepsi tek bir perde gibi iner. */
  hiz: number;
  salinimGenlik: number;
  salinimHiz: number;
  faz: number;
  olcek: number;
  renk: number;
  urun: number;
  patladi: boolean;
  el: HTMLButtonElement | null;
};

type Parca = { x: number; y: number; donme: number; boy: number; ton: string };

type Patlama = {
  id: number;
  x: number;
  y: number;
  renk: number;
  urun: number;
  puan: number;
  zincir: number;
  parcalar: Parca[];
};

const CAN = 3;
const AZAMI_BALON = 9;
/** Balonun temel genişliği; her balon bunun 0.85-1.15 katı arasında doğuyor. */
const BALON_EN = 64;
const BALON_ORAN = 100 / 72;
const ZINCIR_SURESI = 1500;
const AZAMI_ZINCIR = 5;

const REKOR_ANAHTARI = "rentqr.404.rekor";
const SES_ANAHTARI = "rentqr.404.ses";

/* Rekor ve ses tercihi React'in dışında, tarayıcının deposunda yaşıyor.
   `useSyncExternalStore` ikisini de sunucuda varsayılanıyla, ilk boyamadan
   sonra gerçek değeriyle veriyor — hidrasyon uyuşuyor ve değeri okumak için bir
   efekt içinde state yazmak gerekmiyor. */
function depoOku(anahtar: string): string | null {
  try {
    return window.localStorage.getItem(anahtar);
  } catch {
    return null;
  }
}

function depoYaz(anahtar: string, deger: string) {
  try {
    window.localStorage.setItem(anahtar, deger);
  } catch {
    /* Depolama kapalı olabilir; tercih o zaman yalnızca bu oturumda yaşar. */
  }
}

const aboneler = new Set<() => void>();
function abone(bildir: () => void) {
  aboneler.add(bildir);
  return () => {
    aboneler.delete(bildir);
  };
}
function bildir() {
  for (const f of aboneler) f();
}

let rekorOnbellek: number | null = null;
function rekorOku(): number {
  if (rekorOnbellek === null) {
    const ham = Number(depoOku(REKOR_ANAHTARI));
    rekorOnbellek = Number.isFinite(ham) && ham > 0 ? ham : 0;
  }
  return rekorOnbellek;
}
function rekorYaz(puan: number) {
  if (puan <= rekorOku()) return;
  rekorOnbellek = puan;
  depoYaz(REKOR_ANAHTARI, String(puan));
  bildir();
}

let sesOnbellek: boolean | null = null;
function sesOku(): boolean {
  sesOnbellek ??= depoOku(SES_ANAHTARI) !== "kapali";
  return sesOnbellek;
}
function sesYaz(acik: boolean) {
  sesOnbellek = acik;
  depoYaz(SES_ANAHTARI, acik ? "acik" : "kapali");
  bildir();
}

function rastgele(min: number, max: number) {
  return min + Math.random() * (max - min);
}

/* Patlamanın parçaları doğduğu anda hesaplanıyor: her parça bir yöne, biraz
   farklı uzaklığa ve dönmeyle savruluyor. Rastgeleliği CSS'e bırakmak yerine
   burada üretmek, aynı patlamanın iki kez aynı görünmemesini sağlıyor. */
function parcalarUret(renk: (typeof BALON_RENKLERI)[number]): Parca[] {
  const tonlar = [renk.parlak, renk.taban, renk.taban, renk.koyu];
  return Array.from({ length: 9 }, (_, i) => {
    const aci = (i / 9) * Math.PI * 2 + rastgele(-0.3, 0.3);
    const uzaklik = rastgele(38, 74);
    return {
      x: Math.cos(aci) * uzaklik,
      y: Math.sin(aci) * uzaklik * 0.85,
      donme: rastgele(-220, 220),
      boy: rastgele(6, 12),
      ton: tonlar[i % tonlar.length],
    };
  });
}

export default function BalonOyunu() {
  const alanRef = useRef<HTMLDivElement | null>(null);
  const olcuRef = useRef({ en: 640, boy: 380 });
  const balonlarRef = useRef<BalonNesnesi[]>([]);
  const durumRef = useRef<Durum>("hazir");
  const canRef = useRef(CAN);
  const puanRef = useRef(0);
  const zincirRef = useRef(0);
  const sonPatlamaRef = useRef(0);
  const baslangicRef = useRef(0);
  const dogumRef = useRef(600);
  const sayacRef = useRef(0);
  const hareketRef = useRef(true);

  const [balonlar, setBalonlar] = useState<BalonNesnesi[]>([]);
  const [patlamalar, setPatlamalar] = useState<Patlama[]>([]);
  const [durum, setDurum] = useState<Durum>("hazir");
  const [puan, setPuan] = useState(0);
  const [can, setCan] = useState(CAN);
  const [sarsiliyor, setSarsiliyor] = useState(false);

  const rekor = useSyncExternalStore(abone, rekorOku, () => 0);
  const ses = useSyncExternalStore(abone, sesOku, () => true);

  /* Hareket tercihi: `data-motion` Ayarlar'dan anlık değişebiliyor. Kapalıyken
     balonlar salınmıyor, patlama parçaları hiç çizilmiyor. */
  useEffect(() => {
    const medya = window.matchMedia("(prefers-reduced-motion: reduce)");
    const guncelle = () => {
      hareketRef.current =
        document.documentElement.dataset.motion !== "reduced" && !medya.matches;
    };
    guncelle();
    const gozcu = new MutationObserver(guncelle);
    gozcu.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-motion"],
    });
    medya.addEventListener("change", guncelle);
    return () => {
      gozcu.disconnect();
      medya.removeEventListener("change", guncelle);
    };
  }, []);

  useEffect(() => {
    const alan = alanRef.current;
    if (!alan) return;
    const olc = () => {
      olcuRef.current = { en: alan.clientWidth, boy: alan.clientHeight };
    };
    olc();
    const gozcu = new ResizeObserver(olc);
    gozcu.observe(alan);
    return () => gozcu.disconnect();
  }, []);

  const basla = useCallback(() => {
    balonlarRef.current = [];
    setBalonlar([]);
    setPatlamalar([]);
    canRef.current = CAN;
    setCan(CAN);
    puanRef.current = 0;
    setPuan(0);
    zincirRef.current = 0;
    sonPatlamaRef.current = 0;
    baslangicRef.current = performance.now();
    dogumRef.current = 400;
    durumRef.current = "oynuyor";
    setDurum("oynuyor");
  }, []);

  const patlat = useCallback((balon: BalonNesnesi) => {
    // Fare `pointerdown` ile, klavye `click` ile geliyor; ikisi de aynı balona
    // düşerse bayrak ikinci çağrıyı eliyor.
    if (balon.patladi || durumRef.current !== "oynuyor") return;
    balon.patladi = true;

    balonlarRef.current = balonlarRef.current.filter((b) => b.id !== balon.id);
    setBalonlar(balonlarRef.current.slice());

    const simdi = performance.now();
    zincirRef.current =
      simdi - sonPatlamaRef.current < ZINCIR_SURESI
        ? Math.min(zincirRef.current + 1, AZAMI_ZINCIR)
        : 0;
    sonPatlamaRef.current = simdi;

    const kazanc = 10 * (zincirRef.current + 1);
    puanRef.current += kazanc;
    setPuan(puanRef.current);

    if (sesOku()) {
      balonSesi();
      urunSesi(zincirRef.current);
    }

    const en = BALON_EN * balon.olcek;
    const patlama: Patlama = {
      id: sayacRef.current++,
      x: balon.x,
      y: balon.y + en * BALON_ORAN * 0.34,
      renk: balon.renk,
      urun: balon.urun,
      puan: kazanc,
      zincir: zincirRef.current,
      parcalar: hareketRef.current ? parcalarUret(BALON_RENKLERI[balon.renk]) : [],
    };
    setPatlamalar((eski) => [...eski, patlama]);
    window.setTimeout(() => {
      setPatlamalar((eski) => eski.filter((p) => p.id !== patlama.id));
    }, 1200);

  }, []);

  /* Oyunun kalbi. Tek bir döngü hem bekleme ekranındaki süs balonlarını hem de
     oyunu yürütüyor; hangisinde olduğuna `durumRef` karar veriyor. */
  useEffect(() => {
    let kare = 0;
    let onceki = performance.now();

    const dogur = () => {
      const { en } = olcuRef.current;
      const olcek = rastgele(0.85, 1.15);
      const yariEn = (BALON_EN * olcek) / 2;
      const oynuyor = durumRef.current === "oynuyor";
      const seviye = oynuyor
        ? Math.min(1, (performance.now() - baslangicRef.current) / 75000)
        : 0;
      const puanHizi =
        puanRef.current >= 250 ? 1.6 : puanRef.current >= 100 ? 1.25 : 1;
      balonlarRef.current.push({
        id: sayacRef.current++,
        x: rastgele(yariEn + 10, Math.max(yariEn + 12, en - yariEn - 10)),
        y: -BALON_EN * BALON_ORAN * olcek,
        // Bekleme ekranındakiler oyundakinden yavaş: arkada süzülen bir süs,
        // oynanacak bir şey değil.
        hiz: oynuyor
          ? (rastgele(38, 50) + seviye * 30) * puanHizi
          : rastgele(28, 38),
        salinimGenlik: rastgele(8, 22),
        salinimHiz: rastgele(0.5, 1.1),
        faz: rastgele(0, Math.PI * 2),
        olcek,
        renk: Math.floor(Math.random() * BALON_RENKLERI.length),
        urun: Math.floor(Math.random() * URUNLER.length),
        patladi: false,
        el: null,
      });
      setBalonlar(balonlarRef.current.slice());
    };

    const kacir = (balon: BalonNesnesi) => {
      balonlarRef.current = balonlarRef.current.filter((b) => b.id !== balon.id);
      setBalonlar(balonlarRef.current.slice());
      if (durumRef.current !== "oynuyor") return;

      zincirRef.current = 0;
      canRef.current -= 1;
      setCan(canRef.current);
      if (sesOku()) kacisSesi();
      setSarsiliyor(true);
      window.setTimeout(() => setSarsiliyor(false), 420);

      if (canRef.current <= 0) {
        durumRef.current = "bitti";
        setDurum("bitti");
        rekorYaz(puanRef.current);
      }
    };

    const dongu = (an: number) => {
      // Sekme arkadayken tarayıcı kareleri durduruyor; dönüşteki dev sıçrama
      // balonları bir anda ekranın altına atmasın diye adım sınırlı.
      const dt = Math.min(64, an - onceki);
      onceki = an;
      const { boy } = olcuRef.current;
      const oynuyor = durumRef.current === "oynuyor";

      dogumRef.current -= dt;
      if (dogumRef.current <= 0 && balonlarRef.current.length < AZAMI_BALON) {
        dogur();
        const seviye = oynuyor
          ? Math.min(1, (an - baslangicRef.current) / 75000)
          : 0;
        dogumRef.current = oynuyor
          ? rastgele(700, 1150) - seviye * 420
          : rastgele(1400, 2200);
      }

      for (const b of balonlarRef.current) {
        b.y += (b.hiz * dt) / 1000;
        if (b.el) {
          const salinim = hareketRef.current
            ? Math.sin((an / 1000) * b.salinimHiz + b.faz) * b.salinimGenlik
            : 0;
          b.el.style.transform = `translate3d(${b.x + salinim}px, ${b.y}px, 0)`;
        }
        if (b.y > boy) kacir(b);
      }

      kare = requestAnimationFrame(dongu);
    };

    kare = requestAnimationFrame(dongu);
    return () => cancelAnimationFrame(kare);
  }, []);

  /* Sekme arkaya atılınca oyun bekleme ekranına dönsün: geri gelindiğinde oyunu
     ölmüş bulmaktansa duraklamış bulmak yeğ. */
  useEffect(() => {
    const gizlendi = () => {
      if (document.hidden && durumRef.current === "oynuyor") {
        durumRef.current = "bitti";
        setDurum("bitti");
        rekorYaz(puanRef.current);
      }
    };
    document.addEventListener("visibilitychange", gizlendi);
    return () => document.removeEventListener("visibilitychange", gizlendi);
  }, []);

  const oynuyor = durum === "oynuyor";

  return (
    <div className="w-full">
      <div className="mb-2 flex items-end justify-between gap-4 px-1">
        <p className="eyebrow text-ink-muted">Balon patlat, ürünleri topla</p>
        <p className="text-[13px] tabular-nums text-ink-muted">
          <span className="font-semibold text-ink">{String(puan).padStart(4, "0")}</span>
          <span className="mx-2 opacity-40">•</span>
          <span className="eyebrow">rekor</span> {String(rekor).padStart(4, "0")}
        </p>
      </div>

      <div
        className={`oyun-kabuk relative overflow-hidden rounded-[var(--radius-lg)] ${
          sarsiliyor ? "oyun-sarsinti" : ""
        }`}
        style={{ boxShadow: "var(--app-lift)" }}
      >
        <div
          ref={alanRef}
          className="oyun-alani relative h-[clamp(320px,52vh,440px)] w-full touch-none"
        >
          {balonlar.map((b) => (
            <button
              key={b.id}
              ref={(el) => {
                b.el = el;
              }}
              type="button"
              className="oyun-balon"
              style={{
                width: BALON_EN * b.olcek,
                marginLeft: (-BALON_EN * b.olcek) / 2,
                transform: `translate3d(${b.x}px, ${b.y}px, 0)`,
              }}
              onPointerDown={(e) => {
                e.preventDefault();
                patlat(b);
              }}
              onClick={() => patlat(b)}
              tabIndex={oynuyor ? 0 : -1}
              aria-hidden={!oynuyor}
              aria-label="Balonu patlat"
            >
              <span className="oyun-balon-ic">
                <Balon renk={BALON_RENKLERI[b.renk]} />
              </span>
            </button>
          ))}

          {patlamalar.map((p) => {
            const { Cizim, ad } = URUNLER[p.urun];
            return (
              <div key={p.id} className="oyun-patlama" style={{ left: p.x, top: p.y }}>
                <span
                  className="oyun-halka"
                  style={{ borderColor: BALON_RENKLERI[p.renk].taban }}
                />
                {p.parcalar.map((parca, i) => (
                  <span
                    key={i}
                    className="oyun-parca"
                    style={
                      {
                        background: parca.ton,
                        width: parca.boy,
                        height: parca.boy * 0.7,
                        "--px": `${parca.x}px`,
                        "--py": `${parca.y}px`,
                        "--donme": `${parca.donme}deg`,
                      } as React.CSSProperties
                    }
                  />
                ))}
                <span className="oyun-urun" title={ad}>
                  <Cizim />
                </span>
                <span className="oyun-puan">
                  +{p.puan}
                  {p.zincir > 0 && <b className="ml-1 text-accent">×{p.zincir + 1}</b>}
                </span>
              </div>
            );
          })}

          {/* Kaçış çizgisi: balonun buranın altına inmesi bir can. */}
          <div className="oyun-cizgi" aria-hidden />

          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-3">
            <div className="flex items-center gap-1.5" aria-label={`Kalan hak: ${can}`}>
              {Array.from({ length: CAN }, (_, i) => (
                <svg
                  key={i}
                  viewBox="0 0 24 24"
                  className={`oyun-can ${i < can ? "" : "oyun-can-bitti"}`}
                  aria-hidden="true"
                >
                  <path d="M20.8 8.7c0 5.2-8.8 10.3-8.8 10.3S3.2 13.9 3.2 8.7A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.5Z" />
                </svg>
              ))}
            </div>
            <button
              type="button"
              className="oyun-ses pointer-events-auto"
              onClick={() => sesYaz(!ses)}
              aria-label={ses ? "Sesi kapat" : "Sesi aç"}
              aria-pressed={ses}
            >
              <SesSimgesi acik={ses} />
            </button>
          </div>

          {!oynuyor && (
            <div className="oyun-perde absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
              {durum === "bitti" ? (
                <>
                  <p className="text-[15px] font-semibold text-ink">
                    {puan > 0 && puan >= rekor ? "Yeni rekor!" : "Balonlar kaçtı."}
                  </p>
                  <p className="-mt-1 text-[13px] text-ink-muted">
                    {puan} puan kazandın
                  </p>
                </>
              ) : (
                <p className="max-w-xs text-[13px] text-ink-muted">
                  Balonları yere değmeden patlat. İçlerinden kiralanabilir ürünler çıkıyor.
                </p>
              )}
              <button type="button" className="btn btn-primary" onClick={basla}>
                {durum === "bitti" ? "Tekrar oyna" : "Oynamaya başla"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SesSimgesi({ acik }: { acik: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-4">
      <path d="M11 5 6.5 9H3v6h3.5L11 19z" />
      {acik ? (
        <>
          <path d="M15.5 9.5a3.5 3.5 0 0 1 0 5" />
          <path d="M18.5 6.5a7.5 7.5 0 0 1 0 11" />
        </>
      ) : (
        <path d="m16 10 5 5m0-5-5 5" />
      )}
    </svg>
  );
}
