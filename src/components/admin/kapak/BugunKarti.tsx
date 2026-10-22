"use client";

import Link from "next/link";
import { useState } from "react";
import { HAFTA_HALLERI, useSecim } from "@/components/admin/kapak/secim";

export type GunKiralama = {
  id: string;
  urunAdi: string;
  musteri: string;
};

export type Gun = {
  /** YYYY-MM-DD */
  tarih: string;
  baslayan: GunKiralama[];
  biten: GunKiralama[];
};

const gunAdi = new Intl.DateTimeFormat("tr-TR", { weekday: "short", timeZone: "UTC" });
const gunAdiUzun = new Intl.DateTimeFormat("tr-TR", { weekday: "long", timeZone: "UTC" });
const gunNo = new Intl.DateTimeFormat("tr-TR", { day: "numeric", timeZone: "UTC" });
const gunAy = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", timeZone: "UTC" });

/** `YYYY-MM-DD`'yi saat dilimine takılmadan biçimlemek için gece yarısı UTC. */
function utc(tarih: string) {
  return new Date(`${tarih}T00:00:00Z`);
}

function gunBasligi(gun: Gun, i: number) {
  if (i === 0) return "Bugün";
  if (i === 1) return "Yarın";
  const ad = gunAdiUzun.format(utc(gun.tarih));
  return ad.charAt(0).toLocaleUpperCase("tr-TR") + ad.slice(1);
}

function bosMu(gun: Gun) {
  return gun.baslayan.length === 0 && gun.biten.length === 0;
}

/**
 * Önümüzdeki 7 gün: her günde o gün başlayan ve biten kiralamalar. Saat yok —
 * rezervasyonlar gün olarak tutuluyor.
 *
 * GEÇİCİ: üç hâl seçim panosundan (bkz. kapak/secim.ts). Seçilen kalacak.
 */
export default function BugunKarti({ gunler }: { gunler: Gun[] }) {
  const hal = useSecim("hafta", HAFTA_HALLERI, "sigan");
  if (hal === "ajanda") return <Ajanda gunler={gunler} />;
  if (hal === "secili") return <GunSecici gunler={gunler} />;
  return <SiganSerit gunler={gunler} />;
}

function Kart({ sag, children }: { sag?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-label="Önümüzdeki 7 gün" className="kapak-kart rounded-[28px] bg-card p-5 sm:p-7">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="kapak-baslik m-0 text-[26px] font-extrabold leading-none text-ink sm:text-[32px]">
          Önümüzdeki 7 gün
        </h2>
        {sag}
      </div>
      {children}
    </section>
  );
}

function Anahtar() {
  return (
    <p className="m-0 flex items-center gap-4 text-xs font-semibold text-ink-muted">
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-accent" /> başlıyor
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-ink-muted" /> bitiyor
      </span>
    </p>
  );
}

function Oge({ k, tur, koyu }: { k: GunKiralama; tur: "baslar" | "biter"; koyu: boolean }) {
  return (
    <Link
      href={`/admin/bookings/${k.id}`}
      title={`${k.urunAdi} · ${k.musteri} · ${tur === "baslar" ? "başlıyor" : "bitiyor"}`}
      className={`flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-[12px] font-semibold transition-colors ${
        koyu ? "hover:bg-on-deep/10" : "hover:bg-card"
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-2 w-2 shrink-0 rounded-full ${tur === "baslar" ? "bg-accent" : koyu ? "bg-on-deep/50" : "bg-ink-muted"}`}
      />
      <span className="sr-only">{tur === "baslar" ? "Başlıyor:" : "Bitiyor:"}</span>
      <span className="truncate">{k.urunAdi}</span>
    </Link>
  );
}

/** Bir günün kiralamaları, satır satır: ürün, müşteri, ne olduğu. */
function GunListesi({ gun }: { gun: Gun }) {
  const satirlar = [
    ...gun.baslayan.map((k) => ({ k, tur: "baslar" as const })),
    ...gun.biten.map((k) => ({ k, tur: "biter" as const })),
  ];
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {satirlar.map(({ k, tur }) => (
        <li key={`${tur}-${k.id}`}>
          <Link
            href={`/admin/bookings/${k.id}`}
            className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-surface"
          >
            <span
              aria-hidden="true"
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${tur === "baslar" ? "bg-accent" : "bg-ink-muted"}`}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-ink">{k.urunAdi}</span>
              <span className="block truncate text-[13px] text-ink-muted">{k.musteri}</span>
            </span>
            <span className={`shrink-0 text-xs font-semibold ${tur === "baslar" ? "text-accent" : "text-ink-muted"}`}>
              {tur === "baslar" ? "Başlıyor" : "Bitiyor"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * A · Sığan şerit. Yedi gün yan yana ve hepsi ekrana sığıyor: kaydırma çubuğu
 * yok. Boş gün kutu olarak yer kaplamıyor, yalnızca soluk bir çizgi. Telefonda
 * yedi sütun yalnızca gün ve noktalardan ibaret; adlar altında, gün gün.
 */
function SiganSerit({ gunler }: { gunler: Gun[] }) {
  const doluGunler = gunler.map((g, i) => ({ g, i })).filter(({ g }) => !bosMu(g));
  return (
    <Kart sag={<Anahtar />}>
      <ol className="m-0 grid list-none grid-cols-7 gap-1.5 p-0 sm:gap-2">
        {gunler.map((gun, i) => {
          const bugun = i === 0;
          return (
            <li
              key={gun.tarih}
              className={`kapak-satir flex min-w-0 flex-col gap-2 rounded-md p-2 sm:p-3 ${
                bugun ? "bg-deep text-on-deep" : "bg-surface text-ink"
              }`}
              style={{ "--i": i } as React.CSSProperties}
            >
              <div className="flex flex-col items-center gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider sm:text-xs ${bugun ? "text-on-deep/70" : "text-ink-muted"}`}
                >
                  {bugun ? "Bugün" : gunAdi.format(utc(gun.tarih))}
                </span>
                <span className="kapak-baslik text-xl font-extrabold leading-none sm:text-[22px]">
                  {gunNo.format(utc(gun.tarih))}
                </span>
              </div>
              {/* Telefonda yalnızca noktalar. */}
              <div className="flex min-h-1.5 flex-wrap justify-center gap-1 sm:hidden">
                {gun.baslayan.map((k) => (
                  <span key={`b-${k.id}`} className="h-1.5 w-1.5 rounded-full bg-accent" />
                ))}
                {gun.biten.map((k) => (
                  <span key={`e-${k.id}`} className={`h-1.5 w-1.5 rounded-full ${bugun ? "bg-on-deep/50" : "bg-ink-muted"}`} />
                ))}
              </div>
              <div className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                {bosMu(gun) ? (
                  <span className={`px-1.5 text-xs ${bugun ? "text-on-deep/45" : "text-ink-muted/60"}`}>—</span>
                ) : (
                  <>
                    {gun.baslayan.slice(0, 3).map((k) => (
                      <Oge key={`b-${k.id}`} k={k} tur="baslar" koyu={bugun} />
                    ))}
                    {gun.biten.slice(0, 3).map((k) => (
                      <Oge key={`e-${k.id}`} k={k} tur="biter" koyu={bugun} />
                    ))}
                    {gun.baslayan.length + gun.biten.length > 6 && (
                      <span className={`px-1.5 text-xs font-semibold ${bugun ? "text-on-deep/60" : "text-ink-muted"}`}>
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
          {doluGunler.map(({ g, i }) => (
            <div key={g.tarih}>
              <p className="m-0 text-xs font-bold uppercase tracking-wider text-ink-muted">{gunBasligi(g, i)}</p>
              <GunListesi gun={g} />
            </div>
          ))}
        </div>
      )}
    </Kart>
  );
}

/**
 * B · Ajanda. Boş gün hiç çizilmiyor; yalnızca bir şey olan günler, alt alta.
 * Hafta boşsa kart tek satıra iniyor — koca bir boş tablo göstermenin anlamı
 * yok.
 */
function Ajanda({ gunler }: { gunler: Gun[] }) {
  const doluGunler = gunler.map((g, i) => ({ g, i })).filter(({ g }) => !bosMu(g));

  if (doluGunler.length === 0) {
    return (
      <section
        aria-label="Önümüzdeki 7 gün"
        className="kapak-kart flex items-center gap-4 rounded-[28px] bg-card px-5 py-5 sm:px-7"
      >
        <span aria-hidden="true" className="kapak-baslik text-[32px] font-extrabold leading-none text-ink-muted/40">
          7
        </span>
        <p className="m-0 text-[15px] text-ink-muted">
          <span className="font-semibold text-ink">Önümüzdeki 7 gün boş.</span> Başlayan ya da biten kiralama yok.
        </p>
      </section>
    );
  }

  return (
    <Kart sag={<Anahtar />}>
      <ol className="m-0 flex list-none flex-col gap-1 p-0">
        {doluGunler.map(({ g, i }, sira) => (
          <li
            key={g.tarih}
            className="kapak-satir grid grid-cols-[72px_1fr] gap-4 border-t border-border pt-3 first:border-0 first:pt-0 sm:grid-cols-[110px_1fr]"
            style={{ "--i": sira } as React.CSSProperties}
          >
            <div className="pt-2">
              <p className={`m-0 text-sm font-bold ${i === 0 ? "text-accent" : "text-ink"}`}>{gunBasligi(g, i)}</p>
              <p className="m-0 text-xs text-ink-muted">{gunAy.format(utc(g.tarih))}</p>
            </div>
            <GunListesi gun={g} />
          </li>
        ))}
      </ol>
    </Kart>
  );
}

/**
 * C · Gün seçici. Üstte yedi küçük gün düğmesi, noktalar o günün işini
 * gösteriyor; birine basınca o günün listesi altta açılıyor. Bugün seçili
 * başlıyor.
 */
function GunSecici({ gunler }: { gunler: Gun[] }) {
  const [secili, setSecili] = useState(0);
  const gun = gunler[secili];

  return (
    <Kart sag={<Anahtar />}>
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
              className={`flex flex-col items-center gap-1 rounded-md px-1 py-2.5 transition-colors ${
                sec ? "bg-deep text-on-deep" : "bg-surface text-ink hover:bg-border/60"
              }`}
            >
              <span
                className={`text-[10px] font-bold uppercase tracking-wider sm:text-xs ${sec ? "text-on-deep/70" : "text-ink-muted"}`}
              >
                {i === 0 ? "Bugün" : gunAdi.format(utc(g.tarih))}
              </span>
              <span className="kapak-baslik text-xl font-extrabold leading-none sm:text-2xl">
                {gunNo.format(utc(g.tarih))}
              </span>
              <span className="flex h-1.5 gap-1">
                {g.baslayan.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                {g.biten.length > 0 && (
                  <span className={`h-1.5 w-1.5 rounded-full ${sec ? "bg-on-deep/60" : "bg-ink-muted"}`} />
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" key={gun.tarih} className="fade-slide-up mt-5">
        <p className="m-0 mb-1 text-sm font-semibold text-ink">
          {gunBasligi(gun, secili)}, {gunAy.format(utc(gun.tarih))}
        </p>
        {bosMu(gun) ? (
          <p className="m-0 py-2 text-sm text-ink-muted">Bu gün başlayan ya da biten kiralama yok.</p>
        ) : (
          <GunListesi gun={gun} />
        )}
      </div>
    </Kart>
  );
}
