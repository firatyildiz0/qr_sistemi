"use client";

import { useMemo, useState } from "react";
import {
  gunEkle,
  gunleriOlustur,
  utc,
  type Gun,
  type TakvimKiralama,
} from "@/components/admin/kapak/takvim";
import BuyukTakvim from "@/components/admin/kapak/BuyukTakvim";
import { GunListesi, IconBuyut, gunBasligi } from "@/components/admin/kapak/TakvimParcalari";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";

const gunAdi = new Intl.DateTimeFormat("tr-TR", { weekday: "short", timeZone: "UTC" });
const gunNo = new Intl.DateTimeFormat("tr-TR", { day: "numeric", timeZone: "UTC" });
const gunAy = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", timeZone: "UTC" });
const gunAyKisa = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", timeZone: "UTC" });

function bosMu(gun: Gun) {
  return gun.baslayan.length === 0 && gun.biten.length === 0;
}

/**
 * Ana sayfanın takvim kartı. Üstte yedi küçük gün düğmesi; işaret o günde
 * çıkan (kiralaması başlayan) ya da dönen (kiralaması biten) ürün olduğunu
 * gösteriyor. Bir güne basınca o günün listesi altta açılıyor, satıra basınca
 * rezervasyon. Saat yok — rezervasyonlar gün olarak tutuluyor.
 *
 * Başlıktaki oklar haftayı kaydırıyor (geçmişe de); büyütme simgesi bütün ayı
 * tam ekranda açıyor. İkisi de yeni istek açmıyor: sayfa bütün kiralamaları
 * zaten veriyor.
 */
export default function BugunKarti({ kiralamalar, bugun }: { kiralamalar: TakvimKiralama[]; bugun: string }) {
  const [hafta, setHafta] = useState(0);
  const [buyuk, setBuyuk] = useState(false);

  const baslangic = gunEkle(bugun, hafta * 7);
  const gunler = useMemo(() => gunleriOlustur(kiralamalar, baslangic, 7), [kiralamalar, baslangic]);

  const baslik =
    hafta === 0
      ? "Önümüzdeki 7 gün"
      : `${gunAyKisa.format(utc(gunler[0].tarih))} – ${gunAyKisa.format(utc(gunler[6].tarih))}`;

  const ust = (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h2 className="kapak-baslik m-0 whitespace-nowrap text-[22px] font-extrabold leading-none text-ink sm:text-[32px]">
        {baslik}
      </h2>
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
          <GunSecici gunler={gunler} bugun={bugun} />
        </div>
      </section>
      {buyuk && (
        <BuyukTakvim kiralamalar={kiralamalar} bugun={bugun} baslangic={baslangic} onClose={() => setBuyuk(false)} />
      )}
    </>
  );
}

/** Yedi gün düğmesi ve seçili günün listesi. Haftanın ilk günü seçili başlıyor. */
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
                sec ? "bg-ink text-paper" : "bg-surface text-ink hover:bg-border/60"
              }`}
            >
              <span
                className={`text-[9px] font-bold uppercase sm:text-xs sm:tracking-wider ${sec ? "text-paper/70" : "text-ink-muted"}`}
              >
                {g.tarih === bugun ? "Bugün" : gunAdi.format(utc(g.tarih))}
              </span>
              <span className="kapak-baslik text-xl font-extrabold leading-none sm:text-2xl">
                {gunNo.format(utc(g.tarih))}
              </span>
              {/* Tek işaret: bu günde çıkış ya da dönüş var. Ne olduğu altta. */}
              <span className="flex h-1.5">
                {!bosMu(g) && <span className={`h-1.5 w-1.5 rounded-full ${sec ? "bg-paper" : "bg-accent"}`} />}
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
          <p className="m-0 py-2 text-sm text-ink-muted">Bu gün çıkış ya da dönüş yok.</p>
        ) : (
          <GunListesi gun={gun} />
        )}
      </div>
    </>
  );
}
