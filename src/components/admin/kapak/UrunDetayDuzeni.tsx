"use client";

import { useState } from "react";
import { useDuzen } from "@/components/admin/kapak/duzen";

/**
 * GEÇİCİ — ürün detayının üç hâli (bkz. kapak/duzen.ts). Parçalar sunucuda
 * çiziliyor, burada yalnızca diziliyor.
 *
 * - mevcut: form ve QR yan yana, altında takvim ile kiralamalar — tek uzun sayfa
 * - sade: üç sekme; satıcı aynı anda tek bir işe bakıyor
 * - kompakt: tek ekran; formun yanında QR ve kiralamalar, rezervasyon formu
 *   istenince açılan bir bölümde
 *
 * Sekmeler gizlenirken sökülmüyor (`hidden`): yarım kalmış bir form sekme
 * değişince kaybolmasın.
 */
export default function UrunDetayDuzeni({
  bilgiler,
  qr,
  takvim,
  kiralamalar,
}: {
  bilgiler: React.ReactNode;
  qr: React.ReactNode;
  takvim: React.ReactNode;
  kiralamalar: React.ReactNode;
}) {
  const duzen = useDuzen();
  const [sekme, setSekme] = useState<"bilgiler" | "takvim" | "kiralamalar">("bilgiler");

  if (duzen === "sade") {
    const sekmeler = [
      { ad: "bilgiler", baslik: "Bilgiler" },
      { ad: "takvim", baslik: "Takvim ve rezervasyon" },
      { ad: "kiralamalar", baslik: "Kiralamalar" },
    ] as const;
    return (
      <div className="flex flex-col gap-6">
        <div role="tablist" aria-label="Ürün" className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border [scrollbar-width:none]">
          {sekmeler.map((s) => {
            const secili = sekme === s.ad;
            return (
              <button
                key={s.ad}
                type="button"
                role="tab"
                aria-selected={secili}
                onClick={() => setSekme(s.ad)}
                className={`relative shrink-0 px-4 pb-3 pt-1 text-sm font-semibold transition-colors ${
                  secili ? "text-ink" : "text-ink-muted hover:text-ink"
                }`}
              >
                {s.baslik}
                {secili && <span className="tab-pill absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-accent" />}
              </button>
            );
          })}
        </div>

        <div role="tabpanel" hidden={sekme !== "bilgiler"} className="fade-slide-up">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_280px]">
            <div className="card">{bilgiler}</div>
            <div className="space-y-6">{qr}</div>
          </div>
        </div>
        <div role="tabpanel" hidden={sekme !== "takvim"} className="fade-slide-up mx-auto w-full max-w-xl">
          {takvim}
        </div>
        <div role="tabpanel" hidden={sekme !== "kiralamalar"} className="fade-slide-up mx-auto w-full max-w-2xl">
          {kiralamalar}
        </div>
      </div>
    );
  }

  if (duzen === "kompakt") {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="card">{bilgiler}</div>
          <div className="flex flex-col gap-6">
            {qr}
            <div>
              <h2 className="field-label">Kiralamalar</h2>
              {kiralamalar}
            </div>
          </div>
        </div>
        <details className="card group">
          <summary className="flex cursor-pointer list-none items-center justify-between text-[15px] font-semibold text-ink">
            Takvim ve rezervasyon ekle
            <span aria-hidden="true" className="text-ink-muted transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <div className="mt-5 max-w-xl">{takvim}</div>
        </details>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_300px]">
        <div className="card">{bilgiler}</div>
        <div className="space-y-6">{qr}</div>
      </div>

      <section className="mt-16">
        <h2 className="mb-6 text-lg font-semibold text-ink">Müsaitlik</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>{takvim}</div>
          <div>
            <h3 className="field-label">Kiralamalar</h3>
            {kiralamalar}
          </div>
        </div>
      </section>
    </>
  );
}
