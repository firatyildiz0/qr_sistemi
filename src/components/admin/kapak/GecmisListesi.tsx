"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { BookingHistoryRow } from "@/components/admin/BookingHistory";
import { formatDateRange } from "@/lib/bookings";
import DurumYazisi from "@/components/admin/kapak/DurumYazisi";
import { IconTrash } from "@/components/icons";

/**
 * Ana sayfadaki rezervasyon geçmişinin satırları.
 *
 * Oluşturulma zamanı satırda yok (rezervasyonun detayında yazıyor), büyük
 * durum damgası renkli tek kelimeye indi, "Sil" satırda sürekli durmuyor —
 * "⋯" menüsünde.
 */

type Props = {
  bookings: BookingHistoryRow[];
  onDelete: (b: BookingHistoryRow) => void;
};

const gunNo = new Intl.DateTimeFormat("tr-TR", { day: "numeric", timeZone: "UTC" });
const ayKisa = new Intl.DateTimeFormat("tr-TR", { month: "short", timeZone: "UTC" });

function utc(tarih: string) {
  return new Date(`${tarih}T00:00:00Z`);
}

/**
 * Başlangıç tarihine göre, yeniden eskiye. Gelen liste oluşturulma sırasında;
 * satırda tarih öne çıkınca o sıra "22 Ağu, 22 Oca, 4 Mar" diye zıplıyordu.
 */
function baslangicaGore(bookings: BookingHistoryRow[]) {
  return [...bookings].sort((a, b) => b.startDate.localeCompare(a.startDate));
}

/**
 * Satırın "⋯" menüsü: aç ve sil. Sil satırda sürekli görünmüyor, ama iki
 * dokunuş uzakta — yanlışlıkla basılmayacak, aranınca da bulunacak kadar.
 */
function SatirMenusu({ b, onDelete }: { b: BookingHistoryRow; onDelete: (b: BookingHistoryRow) => void }) {
  const [acik, setAcik] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!acik) return;
    const kapat = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) setAcik(false);
    };
    const tus = (e: KeyboardEvent) => e.key === "Escape" && setAcik(false);
    document.addEventListener("pointerdown", kapat);
    document.addEventListener("keydown", tus);
    return () => {
      document.removeEventListener("pointerdown", kapat);
      document.removeEventListener("keydown", tus);
    };
  }, [acik]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAcik((a) => !a)}
        aria-haspopup="menu"
        aria-expanded={acik}
        aria-label={`${b.customerName} rezervasyonu için seçenekler`}
        className="flex h-9 w-9 items-center justify-center rounded-[6px] text-lg leading-none text-ink-muted transition-colors hover:bg-surface hover:text-ink"
      >
        ⋯
      </button>
      {acik && (
        <div
          role="menu"
          className="modal-panel absolute right-0 top-10 z-20 flex w-48 flex-col rounded-[6px] border border-border bg-card p-1 shadow-lg"
        >
          <Link
            role="menuitem"
            href={`/admin/bookings/${b.id}`}
            className="rounded-[6px] px-3 py-2 text-sm font-semibold text-ink hover:bg-surface"
          >
            Rezervasyonu aç
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setAcik(false);
              onDelete(b);
            }}
            className="flex items-center gap-2 rounded-[6px] px-3 py-2 text-left text-sm font-semibold text-danger hover:bg-danger-soft"
          >
            <IconTrash className="h-4 w-4" />
            Sil
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Tarih rozetli liste. Boş QR yer tutucusunun yerinde başlangıç günü duruyor:
 * görseli olmayan üründe o kutu hiçbir şey söylemiyordu, tarih ise satıcının
 * listeyi taradığı şey. Sil "⋯" menüsünde.
 */
export default function GecmisListesi({ bookings, onDelete }: Props) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {baslangicaGore(bookings).map((b, i) => (
        <li
          key={b.id}
          className="fade-slide-up card card-hover relative flex items-center gap-4 px-4 py-3"
          style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
        >
          <Link
            href={`/admin/bookings/${b.id}`}
            aria-label={`${b.customerName} rezervasyonunu aç`}
            className="absolute inset-0 rounded-[inherit]"
          />
          <span
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[6px] bg-surface leading-none"
          >
            <span className="kapak-baslik text-xl font-extrabold text-ink">{gunNo.format(utc(b.startDate))}</span>
            <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              {ayKisa.format(utc(b.startDate))}
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="m-0 truncate font-semibold text-ink">{b.customerName}</p>
            <p className="m-0 mt-0.5 truncate text-sm text-ink-muted">
              {b.productName} · {formatDateRange(b.startDate, b.endDate)}
            </p>
          </div>
          <DurumYazisi status={b.status} className="hidden sm:inline-flex sm:w-28" />
          <SatirMenusu b={b} onDelete={onDelete} />
        </li>
      ))}
    </ul>
  );
}
