"use client";

import { useMemo, useState } from "react";
import { HAFTA_HALLERI, ORNEK_HALLERI, useSecim } from "@/components/admin/kapak/secim";
import {
  gunEkle,
  gunleriOlustur,
  ornekKiralamalar,
  utc,
  type Gun,
  type GunKiralama,
  type TakvimKiralama,
} from "@/components/admin/kapak/takvim";
import BuyukTakvim from "@/components/admin/kapak/BuyukTakvim";
import { GunListesi, IconBuyut, KiralamaBaglantisi, gunBasligi } from "@/components/admin/kapak/TakvimParcalari";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";

const gunAdi = new Intl.DateTimeFormat("tr-TR", { weekday: "short", timeZone: "UTC" });
const gunNo = new Intl.DateTimeFormat("tr-TR", { day: "numeric", timeZone: "UTC" });
const gunAy = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", timeZone: "UTC" });
const gunAyKisa = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", timeZone: "UTC" });

function bosMu(gun: Gun) {
  return gun.baslayan.length === 0 && gun.biten.length === 0;
}

/**
 * Ana sayfanın takvim kartı: yedi gün, her günde o gün başlayan ve biten
 * kiralamalar. Saat yok — rezervasyonlar gün olarak tutuluyor.
 *
 * Başlıktaki oklar haftayı kaydırıyor (geçmişe de); büyütme simgesi bütün ayı tam
 * ekranda açıyor. İkisi de yeni istek açmıyor: sayfa bütün kiralamaları
 * zaten veriyor.
 *
 * GEÇİCİ: üç hâl ve örnek veri seçim panosundan (bkz. kapak/secim.ts).
 */
export default function BugunKarti({ kiralamalar, bugun }: { kiralamalar: TakvimKiralama[]; bugun: string }) {
  const hal = useSecim("hafta", HAFTA_HALLERI, "sigan");
  const ornek = useSecim("ornek", ORNEK_HALLERI, "acik") === "acik";
  const [hafta, setHafta] = useState(0);
  const [buyuk, setBuyuk] = useState(false);

  const liste = useMemo(
    () => (ornek ? [...kiralamalar, ...ornekKiralamalar(bugun)] : kiralamalar),
    [ornek, kiralamalar, bugun],
  );
  const baslangic = gunEkle(bugun, hafta * 7);
  const gunler = useMemo(() => gunleriOlustur(liste, baslangic, 7), [liste, baslangic]);

  const baslik =
    hafta === 0
      ? "Önümüzdeki 7 gün"
      : `${gunAyKisa.format(utc(gunler[0].tarih))} – ${gunAyKisa.format(utc(gunler[6].tarih))}`;

  const ust = (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <h2 className="kapak-baslik m-0 text-[26px] font-extrabold leading-none text-ink sm:text-[32px]">{baslik}</h2>
        {ornek && (
          <span className="rounded-[6px] bg-warning/15 px-2 py-1 text-[11px] font-bold text-warning">Örnek veri</span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setHafta((h) => h - 1)}
          aria-label="Önceki hafta"
          className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-border text-ink-muted transition-colors hover:border-ink-muted hover:text-ink"
        >
          <IconChevronLeft className="h-4 w-4" />
        </button>
        {hafta !== 0 && (
          <button
            type="button"
            onClick={() => setHafta(0)}
            className="h-9 rounded-[6px] border border-border px-3 text-xs font-bold text-ink transition-colors hover:border-ink-muted"
          >
            Bugün
          </button>
        )}
        <button
          type="button"
          onClick={() => setHafta((h) => h + 1)}
          aria-label="Sonraki hafta"
          className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-border text-ink-muted transition-colors hover:border-ink-muted hover:text-ink"
        >
          <IconChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setBuyuk(true)}
          aria-label="Takvimi büyüt"
          title="Takvimi büyüt"
          className="ml-1 flex h-9 w-9 items-center justify-center rounded-[6px] border border-border text-ink-muted transition-colors hover:border-ink-muted hover:text-ink"
        >
          <IconBuyut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      <section aria-label="Takvim" className="kapak-kart rounded-[28px] bg-card p-5 sm:p-7">
        {ust}
        {/* Hafta değişince içerik yeniden giriyor: aynı yerde başka günler. */}
        <div key={baslangic} className="fade-slide-up">
          {hal === "ajanda" ? (
            <Ajanda gunler={gunler} bugun={bugun} />
          ) : hal === "secili" ? (
            <GunSecici gunler={gunler} bugun={bugun} />
          ) : (
            <SiganSerit gunler={gunler} bugun={bugun} />
          )}
        </div>
      </section>
      {buyuk && (
        <BuyukTakvim kiralamalar={liste} bugun={bugun} baslangic={baslangic} onClose={() => setBuyuk(false)} />
      )}
    </>
  );
}

function Oge({ k, tur, koyu }: { k: GunKiralama; tur: "baslar" | "biter"; koyu: boolean }) {
  return (
    <KiralamaBaglantisi
      k={k}
      title={`${k.urunAdi} · ${k.musteri} · ${tur === "baslar" ? "başlıyor" : "bitiyor"}`}
      className={`flex min-w-0 items-center gap-1.5 rounded-[6px] px-1.5 py-1 text-[12px] font-semibold transition-colors ${
        koyu ? "hover:bg-on-deep/10" : "hover:bg-card"
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-2 w-2 shrink-0 rounded-full ${tur === "baslar" ? "bg-accent" : koyu ? "bg-on-deep/50" : "bg-ink-muted"}`}
      />
      <span className="sr-only">{tur === "baslar" ? "Başlıyor:" : "Bitiyor:"}</span>
      <span className="truncate">{k.urunAdi}</span>
    </KiralamaBaglantisi>
  );
}

/**
 * A · Sığan şerit. Yedi gün yan yana ve hepsi ekrana sığıyor: kaydırma çubuğu
 * yok. Boş gün kutu olarak yer kaplamıyor, yalnızca soluk bir çizgi. Telefonda
 * yedi sütun yalnızca gün ve noktalardan ibaret; adlar altında, gün gün.
 */
function SiganSerit({ gunler, bugun }: { gunler: Gun[]; bugun: string }) {
  const doluGunler = gunler.filter((g) => !bosMu(g));
  return (
    <>
      <ol className="m-0 grid list-none grid-cols-7 gap-1.5 p-0 sm:gap-2">
        {gunler.map((gun, i) => {
          const koyu = gun.tarih === bugun;
          return (
            <li
              key={gun.tarih}
              className={`kapak-satir flex min-w-0 flex-col gap-2 rounded-[6px] p-2 sm:p-3 ${
                koyu ? "bg-deep text-on-deep" : "bg-surface text-ink"
              }`}
              style={{ "--i": i } as React.CSSProperties}
            >
              <div className="flex flex-col items-center gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider sm:text-xs ${koyu ? "text-on-deep/70" : "text-ink-muted"}`}
                >
                  {koyu ? "Bugün" : gunAdi.format(utc(gun.tarih))}
                </span>
                <span className="kapak-baslik text-xl font-extrabold leading-none sm:text-[22px]">
                  {gunNo.format(utc(gun.tarih))}
                </span>
              </div>
              {/* Telefonda yalnızca noktalar. */}
              <div className="flex min-h-1.5 flex-wrap justify-center gap-1 sm:hidden">
                {gun.baslayan.map((k) => (
                  <span key={`b-${k.id}`} title={`${k.urunAdi} · başlıyor`} className="h-1.5 w-1.5 rounded-full bg-accent" />
                ))}
                {gun.biten.map((k) => (
                  <span
                    key={`e-${k.id}`}
                    title={`${k.urunAdi} · bitiyor`}
                    className={`h-1.5 w-1.5 rounded-full ${koyu ? "bg-on-deep/50" : "bg-ink-muted"}`}
                  />
                ))}
              </div>
              <div className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                {bosMu(gun) ? (
                  <span className={`px-1.5 text-xs ${koyu ? "text-on-deep/45" : "text-ink-muted/60"}`}>—</span>
                ) : (
                  <>
                    {gun.baslayan.slice(0, 3).map((k) => (
                      <Oge key={`b-${k.id}`} k={k} tur="baslar" koyu={koyu} />
                    ))}
                    {gun.biten.slice(0, 3).map((k) => (
                      <Oge key={`e-${k.id}`} k={k} tur="biter" koyu={koyu} />
                    ))}
                    {gun.baslayan.length + gun.biten.length > 6 && (
                      <span className={`px-1.5 text-xs font-semibold ${koyu ? "text-on-deep/60" : "text-ink-muted"}`}>
                        +{gun.baslayan.length + gun.biten.length - 6} daha
                      </span>
                    )}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {/* Telefonda adlar şeridin altında; yalnızca dolu günler. */}
      {doluGunler.length > 0 && (
        <div className="mt-4 flex flex-col gap-3 sm:hidden">
          {doluGunler.map((g) => (
            <div key={g.tarih}>
              <p className="m-0 text-xs font-bold uppercase tracking-wider text-ink-muted">{gunBasligi(g.tarih, bugun)}</p>
              <GunListesi gun={g} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/**
 * B · Ajanda. Boş gün hiç çizilmiyor; yalnızca bir şey olan günler, alt alta.
 * Hafta boşsa tek satır.
 */
function Ajanda({ gunler, bugun }: { gunler: Gun[]; bugun: string }) {
  const doluGunler = gunler.filter((g) => !bosMu(g));

  if (doluGunler.length === 0) {
    return (
      <p className="m-0 text-[15px] text-ink-muted">
        <span className="font-semibold text-ink">Bu 7 gün boş.</span> Başlayan ya da biten kiralama yok.
      </p>
    );
  }

  return (
    <ol className="m-0 flex list-none flex-col gap-1 p-0">
      {doluGunler.map((g, sira) => (
        <li
          key={g.tarih}
          className="kapak-satir grid grid-cols-[72px_1fr] gap-4 border-t border-border pt-3 first:border-0 first:pt-0 sm:grid-cols-[110px_1fr]"
          style={{ "--i": sira } as React.CSSProperties}
        >
          <div className="pt-2">
            <p className={`m-0 text-sm font-bold ${g.tarih === bugun ? "text-accent" : "text-ink"}`}>
              {gunBasligi(g.tarih, bugun)}
            </p>
            <p className="m-0 text-xs text-ink-muted">{gunAy.format(utc(g.tarih))}</p>
          </div>
          <GunListesi gun={g} />
        </li>
      ))}
    </ol>
  );
}

/**
 * C · Gün seçici. Üstte yedi küçük gün düğmesi, noktalar o günün işini
 * gösteriyor; birine basınca o günün listesi altta açılıyor. Haftanın ilk günü
 * seçili başlıyor.
 */
function GunSecici({ gunler, bugun }: { gunler: Gun[]; bugun: string }) {
  const [secili, setSecili] = useState(0);
  const gun = gunler[secili];

  return (
    <>
      <div role="tablist" aria-label="Gün" className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {gunler.map((g, i) => {
          const sec = i === secili;
          return (
            <button
              key={g.tarih}
              type="button"
              role="tab"
              aria-selected={sec}
              onClick={() => setSecili(i)}
              className={`flex flex-col items-center gap-1 rounded-[6px] px-1 py-2.5 transition-colors ${
                sec ? "bg-deep text-on-deep" : "bg-surface text-ink hover:bg-border/60"
              }`}
            >
              <span
                className={`text-[10px] font-bold uppercase tracking-wider sm:text-xs ${sec ? "text-on-deep/70" : "text-ink-muted"}`}
              >
                {g.tarih === bugun ? "Bugün" : gunAdi.format(utc(g.tarih))}
              </span>
              <span className="kapak-baslik text-xl font-extrabold leading-none sm:text-2xl">
                {gunNo.format(utc(g.tarih))}
              </span>
              <span className="flex h-1.5 gap-1">
                {g.baslayan.length > 0 && (
                  <span title={`${g.baslayan.length} kiralama başlıyor`} className="h-1.5 w-1.5 rounded-full bg-accent" />
                )}
                {g.biten.length > 0 && (
                  <span
                    title={`${g.biten.length} kiralama bitiyor`}
                    className={`h-1.5 w-1.5 rounded-full ${sec ? "bg-on-deep/60" : "bg-ink-muted"}`}
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" key={gun.tarih} className="fade-slide-up mt-5">
        <p className="m-0 mb-1 text-sm font-semibold text-ink">
          {gunBasligi(gun.tarih, bugun)}, {gunAy.format(utc(gun.tarih))}
        </p>
        {bosMu(gun) ? (
          <p className="m-0 py-2 text-sm text-ink-muted">Bu gün başlayan ya da biten kiralama yok.</p>
        ) : (
          <GunListesi gun={gun} />
        )}
      </div>
    </>
  );
}
