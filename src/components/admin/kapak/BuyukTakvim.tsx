"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { gunEkle, gunleriOlustur, utc, type Gun, type TakvimKiralama } from "@/components/admin/kapak/takvim";
import { Anahtar, GunListesi, gunBasligi } from "@/components/admin/kapak/TakvimParcalari";
import { IconChevronLeft, IconChevronRight, IconX } from "@/components/icons";

const ayBasligi = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric", timeZone: "UTC" });
const gunAy = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", timeZone: "UTC" });
const HAFTA_GUNLERI = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

/** Ayın ilk günü, `YYYY-MM-01`. */
function ayBasi(tarih: string) {
  return `${tarih.slice(0, 7)}-01`;
}

function ayKaydir(ay: string, adet: number) {
  const d = utc(ay);
  d.setUTCMonth(d.getUTCMonth() + adet);
  return d.toISOString().slice(0, 10);
}

/**
 * Ay ızgarası: ayın ilk gününün haftasının pazartesisinden son gününün
 * haftasının pazarına kadar. Ayın dışındaki günler soluk ama dolu — bir
 * kiralama ay sınırını aşınca yarım görünmesin.
 */
function izgara(kiralamalar: TakvimKiralama[], ay: string): Gun[] {
  const ilk = utc(ay);
  const geri = (ilk.getUTCDay() + 6) % 7;
  const baslangic = gunEkle(ay, -geri);
  const sonraki = ayKaydir(ay, 1);
  const ayinSonu = gunEkle(sonraki, -1);
  const ileri = 6 - ((utc(ayinSonu).getUTCDay() + 6) % 7);
  const adet = geri + Number(ayinSonu.slice(8, 10)) + ileri;
  return gunleriOlustur(kiralamalar, baslangic, adet);
}

/**
 * Takvimin büyütülmüş hâli: tam ekran bir ay. Her günde o gün başlayan ve
 * biten kiralamalar, arada süren kiralamaların sayısı; bir güne basınca o
 * günün tam listesi yanda (telefonda altta). Aylar arasında geçmişe ve
 * geleceğe gezinilebiliyor.
 */
export default function BuyukTakvim({
  kiralamalar,
  bugun,
  baslangic,
  onClose,
}: {
  kiralamalar: TakvimKiralama[];
  bugun: string;
  /** Kartta açık olan haftanın ilk günü: takvim o ayda ve o günde açılıyor. */
  baslangic: string;
  onClose: () => void;
}) {
  const [ay, setAy] = useState(() => ayBasi(baslangic));
  const [secili, setSecili] = useState(baslangic);
  const gunler = useMemo(() => izgara(kiralamalar, ay), [kiralamalar, ay]);
  const seciliGun = useMemo(
    () => gunler.find((g) => g.tarih === secili) ?? gunleriOlustur(kiralamalar, secili, 1)[0],
    [gunler, kiralamalar, secili],
  );

  useEffect(() => {
    const onceki = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const tus = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", tus);
    return () => {
      document.body.style.overflow = onceki;
      window.removeEventListener("keydown", tus);
    };
  }, [onClose]);

  function aySec(adet: number) {
    const yeni = ayKaydir(ay, adet);
    setAy(yeni);
    setSecili(ayBasi(bugun) === yeni ? bugun : yeni);
  }

  function bugunGit() {
    setAy(ayBasi(bugun));
    setSecili(bugun);
  }

  const ayBaslik = ayBasligi.format(utc(ay));

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Takvim" className="fixed inset-0 z-[80] flex">
      <div className="modal-backdrop absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="modal-panel relative z-10 m-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] bg-card sm:m-6">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
          <h2 className="kapak-baslik m-0 text-[26px] font-extrabold leading-none text-ink first-letter:uppercase sm:text-[34px]">
            {ayBaslik}
          </h2>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => aySec(-1)}
              aria-label="Önceki ay"
              className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-border text-ink-muted transition-colors hover:border-ink-muted hover:text-ink"
            >
              <IconChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={bugunGit}
              className="h-9 rounded-[6px] border border-border px-3 text-xs font-bold text-ink transition-colors hover:border-ink-muted"
            >
              Bugün
            </button>
            <button
              type="button"
              onClick={() => aySec(1)}
              aria-label="Sonraki ay"
              className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-border text-ink-muted transition-colors hover:border-ink-muted hover:text-ink"
            >
              <IconChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="ml-2 flex h-9 w-9 items-center justify-center rounded-[6px] bg-ink text-paper transition-opacity hover:opacity-85"
            >
              <IconX className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
          {/* AY */}
          <div className="flex min-w-0 flex-col p-3 sm:p-5 lg:flex-1 lg:overflow-y-auto">
            <div className="grid grid-cols-7 gap-1 pb-2 sm:gap-1.5">
              {HAFTA_GUNLERI.map((g) => (
                <span key={g} className="text-center text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                  {g}
                </span>
              ))}
            </div>
            <div key={ay} className="fade-slide-up grid flex-1 grid-cols-7 gap-1 sm:gap-1.5">
              {gunler.map((gun) => {
                const ayinda = gun.tarih.slice(0, 7) === ay.slice(0, 7);
                const sec = gun.tarih === secili;
                const bugunMu = gun.tarih === bugun;
                const sayi = gun.baslayan.length + gun.biten.length;
                return (
                  <button
                    key={gun.tarih}
                    type="button"
                    onClick={() => setSecili(gun.tarih)}
                    aria-pressed={sec}
                    aria-label={`${gunAy.format(utc(gun.tarih))}: ${gun.baslayan.length} başlıyor, ${gun.biten.length} bitiyor, ${gun.kirada.length} kirada`}
                    className={`flex min-h-[64px] min-w-0 flex-col gap-1 rounded-[6px] p-1.5 text-left transition-colors sm:min-h-[104px] sm:p-2 ${
                      sec ? "bg-deep text-on-deep" : ayinda ? "bg-surface text-ink hover:bg-border/60" : "bg-surface/40 text-ink-muted/60 hover:bg-surface"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-1">
                      <span
                        className={`kapak-baslik flex h-6 min-w-6 items-center justify-center rounded-[6px] px-1 text-[15px] font-extrabold leading-none ${
                          bugunMu && !sec ? "bg-accent text-white" : ""
                        }`}
                      >
                        {Number(gun.tarih.slice(8, 10))}
                      </span>
                      {gun.kirada.length > 0 && (
                        <span
                          className={`hidden rounded-[6px] px-1.5 py-0.5 text-[10px] font-bold sm:inline ${
                            sec ? "bg-on-deep/15 text-on-deep" : "bg-success/12 text-success"
                          }`}
                        >
                          {gun.kirada.length} kirada
                        </span>
                      )}
                    </span>
                    {/* Telefonda yalnızca noktalar. */}
                    <span className="flex flex-wrap gap-0.5 sm:hidden">
                      {gun.baslayan.map((k) => (
                        <span key={`b-${k.id}`} className="h-1.5 w-1.5 rounded-full bg-accent" />
                      ))}
                      {gun.biten.map((k) => (
                        <span key={`e-${k.id}`} className={`h-1.5 w-1.5 rounded-full ${sec ? "bg-on-deep/60" : "bg-ink-muted"}`} />
                      ))}
                      {gun.kirada.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-success" />}
                    </span>
                    <span className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                      {[
                        ...gun.baslayan.map((k) => ({ k, tur: "b" as const })),
                        ...gun.biten.map((k) => ({ k, tur: "e" as const })),
                      ]
                        .slice(0, 3)
                        .map(({ k, tur }) => (
                          <span key={`${tur}-${k.id}`} className="flex min-w-0 items-center gap-1 text-[11px] font-semibold">
                            <span
                              aria-hidden="true"
                              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                tur === "b" ? "bg-accent" : sec ? "bg-on-deep/60" : "bg-ink-muted"
                              }`}
                            />
                            <span className="truncate">{k.urunAdi}</span>
                          </span>
                        ))}
                      {sayi > 3 && (
                        <span className={`text-[11px] font-semibold ${sec ? "text-on-deep/70" : "text-ink-muted"}`}>
                          +{sayi - 3} daha
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-x-4">
              <Anahtar />
              <p className="m-0 mt-5 flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
                <span className="h-2 w-2 rounded-full bg-success" /> kirada (arada süren)
              </p>
            </div>
          </div>

          {/* SEÇİLİ GÜN */}
          <aside className="border-t border-border p-4 sm:p-6 lg:w-[340px] lg:shrink-0 lg:overflow-y-auto lg:border-l lg:border-t-0">
            <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-accent">{gunBasligi(seciliGun.tarih, bugun)}</p>
            <h3 className="kapak-baslik m-0 mt-1 text-[26px] font-extrabold leading-none text-ink">
              {gunAy.format(utc(seciliGun.tarih))}
            </h3>
            <div className="mt-4">
              {seciliGun.baslayan.length + seciliGun.biten.length + seciliGun.kirada.length === 0 ? (
                <p className="m-0 text-sm text-ink-muted">Bu gün başlayan, biten ya da kirada olan kiralama yok.</p>
              ) : (
                <GunListesi gun={seciliGun} kiradaDahil />
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>,
    document.body,
  );
}

