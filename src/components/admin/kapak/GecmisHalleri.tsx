"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { BookingHistoryRow } from "@/components/admin/BookingHistory";
import { formatDateRange } from "@/lib/bookings";
import ProductThumb from "@/components/admin/ProductThumb";
import DurumYazisi from "@/components/admin/kapak/DurumYazisi";
import { IconChevronRight, IconPhone, IconTrash } from "@/components/icons";

/**
 * GEÇİCİ — ana sayfadaki rezervasyon geçmişinin üç yeni hâli (bkz.
 * kapak/secim.ts). Seçilen `BookingHistory`'nin tek hâli olacak.
 *
 * Üçünde de ortak olan: oluşturulma zamanı satırdan çıktı (rezervasyonun
 * detayında yazıyor), büyük durum damgası renkli tek kelimeye indi, "Sil"
 * düğmesi satırda sürekli durmuyor.
 */

type Props = {
  bookings: BookingHistoryRow[];
  onDelete: (b: BookingHistoryRow) => void;
};

const gunNo = new Intl.DateTimeFormat("tr-TR", { day: "numeric", timeZone: "UTC" });
const ayKisa = new Intl.DateTimeFormat("tr-TR", { month: "short", timeZone: "UTC" });
const ayYil = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric", timeZone: "UTC" });

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
 * A · Tarih rozeti. Boş QR yer tutucusunun yerinde başlangıç günü duruyor:
 * görseli olmayan üründe o kutu hiçbir şey söylemiyordu, tarih ise satıcının
 * listeyi taradığı şey. Sil "⋯" menüsünde.
 */
export function TarihRozetliListe({ bookings, onDelete }: Props) {
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

const SAYFA = 8;

/**
 * B · Aylara göre. Satırlar başlangıç ayının altında toplanıyor; uzun bir
 * listede "bu ay ne vardı" sorusu başlıktan okunuyor. İlk sekiz satır
 * görünüyor, kalanı istenince — ana sayfa bütün geçmişi baştan dökmüyor.
 * Satırlar tek kartın içinde, çizgiyle ayrılmış; sil satırın üzerine gelince.
 */
export function AylaraGoreListe({ bookings, onDelete }: Props) {
  const [adet, setAdet] = useState(SAYFA);
  const gorunen = baslangicaGore(bookings).slice(0, adet);

  const gruplar: { ay: string; satirlar: BookingHistoryRow[] }[] = [];
  for (const b of gorunen) {
    const ay = ayYil.format(utc(b.startDate));
    const son = gruplar[gruplar.length - 1];
    if (son?.ay === ay) son.satirlar.push(b);
    else gruplar.push({ ay, satirlar: [b] });
  }

  return (
    <div className="flex flex-col gap-5">
      {gruplar.map((g) => (
        <section key={g.ay}>
          <h3 className="m-0 mb-2 flex items-baseline gap-2 px-1 text-sm font-bold text-ink first-letter:uppercase">
            {g.ay}
            <span className="text-xs font-semibold text-ink-muted">{g.satirlar.length}</span>
          </h3>
          <ul className="card m-0 list-none divide-y divide-border p-0">
            {g.satirlar.map((b) => (
              <li key={b.id} className="group relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface">
                <Link
                  href={`/admin/bookings/${b.id}`}
                  aria-label={`${b.customerName} rezervasyonunu aç`}
                  className="absolute inset-0"
                />
                <ProductThumb src={b.productImageUrl} className="h-9 w-9" sizes="36px" />
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-[15px] font-semibold text-ink">{b.customerName}</p>
                  <p className="m-0 truncate text-[13px] text-ink-muted">
                    {b.productName} · {formatDateRange(b.startDate, b.endDate)}
                  </p>
                </div>
                <DurumYazisi status={b.status} className="sm:w-28" />
                <button
                  type="button"
                  onClick={() => onDelete(b)}
                  aria-label={`${b.customerName} rezervasyonunu sil`}
                  title="Sil"
                  className="relative hidden h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-ink-muted opacity-0 transition hover:bg-danger-soft hover:text-danger focus-visible:opacity-100 group-hover:opacity-100 sm:flex"
                >
                  <IconTrash className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {bookings.length > adet && (
        <button
          type="button"
          onClick={() => setAdet((a) => a + SAYFA * 2)}
          className="btn btn-secondary self-center"
        >
          Daha fazla göster ({bookings.length - adet})
        </button>
      )}
    </div>
  );
}

function bugunAnahtari() {
  return new Date().toISOString().slice(0, 10);
}

function gunFarki(tarih: string, bugun: string) {
  return Math.round((utc(tarih).getTime() - utc(bugun).getTime()) / 86_400_000);
}

function goreli(b: BookingHistoryRow, bugun: string) {
  if (b.status === "active") {
    const kalan = gunFarki(b.endDate, bugun);
    return kalan === 0 ? "Bugün dönüyor" : kalan === 1 ? "Yarın dönüyor" : `${kalan} gün sonra dönüyor`;
  }
  const kalan = gunFarki(b.startDate, bugun);
  return kalan === 1 ? "Yarın çıkıyor" : `${kalan} gün sonra çıkıyor`;
}

/** "Önce sıradakiler"in bir bölümü: başlık, sayı ve satırlar. */
function Bolum({
  baslik,
  satirlar,
  canli,
  bugun,
  onDelete,
}: {
  baslik: string;
  satirlar: BookingHistoryRow[];
  canli: boolean;
  bugun: string;
  onDelete: (b: BookingHistoryRow) => void;
}) {
  return (
    <section>
      <h3 className="m-0 mb-2 flex items-baseline gap-2 px-1 text-sm font-bold text-ink">
        {baslik}
        <span className="text-xs font-semibold text-ink-muted">{satirlar.length}</span>
      </h3>
      <ul className="card m-0 list-none divide-y divide-border p-0">
        {satirlar.map((b) => (
          <li key={b.id} className="group relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface">
            <Link
              href={`/admin/bookings/${b.id}`}
              aria-label={`${b.customerName} rezervasyonunu aç`}
              className="absolute inset-0"
            />
            <ProductThumb src={b.productImageUrl} className="h-10 w-10" sizes="40px" />
            <div className="min-w-0 flex-1">
              <p className="m-0 truncate text-[15px] font-semibold text-ink">{b.customerName}</p>
              <p className="m-0 truncate text-[13px] text-ink-muted">
                {b.productName} · {formatDateRange(b.startDate, b.endDate)}
              </p>
            </div>
            {canli ? (
              <>
                <span
                  className={`hidden shrink-0 text-xs font-semibold sm:block ${
                    b.status === "active" ? "text-success" : "text-status-upcoming"
                  }`}
                >
                  {goreli(b, bugun)}
                </span>
                {b.customerPhone && (
                  <a
                    href={`tel:${b.customerPhone}`}
                    aria-label={`${b.customerName} kişisini ara`}
                    title={b.customerPhone}
                    className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-border text-ink-muted transition-colors hover:border-accent hover:text-accent"
                  >
                    <IconPhone className="h-4 w-4" />
                  </a>
                )}
              </>
            ) : (
              <>
                <DurumYazisi status={b.status} className="sm:w-28" />
                <button
                  type="button"
                  onClick={() => onDelete(b)}
                  aria-label={`${b.customerName} rezervasyonunu sil`}
                  title="Sil"
                  className="relative hidden h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-ink-muted opacity-0 transition hover:bg-danger-soft hover:text-danger focus-visible:opacity-100 group-hover:opacity-100 sm:flex"
                >
                  <IconTrash className="h-4 w-4" />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * C · Önce sıradakiler. Filtre şeridi yok; liste satıcının işine göre
 * bölünmüş: şu an kirada olanlar, sırada olanlar (en yakını başta) ve kapalı
 * duran geçmiş. Sıradaki ve süren kiralamalarda müşteriyi aramak tek dokunuş;
 * geçmişte bu kısayol yok, gerekmiyor.
 */
export function SiradakilerListe({ bookings, onDelete }: Props) {
  const [gecmisAcik, setGecmisAcik] = useState(false);
  const bugun = bugunAnahtari();

  const kirada = bookings.filter((b) => b.status === "active").sort((a, b) => a.endDate.localeCompare(b.endDate));
  const sirada = bookings
    .filter((b) => b.status === "upcoming")
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const gecmis = bookings.filter((b) => b.status === "completed" || b.status === "cancelled");

  return (
    <div className="flex flex-col gap-5">
      {kirada.length > 0 && <Bolum baslik="Şu an kirada" satirlar={kirada} canli bugun={bugun} onDelete={onDelete} />}
      {sirada.length > 0 && <Bolum baslik="Sırada" satirlar={sirada} canli bugun={bugun} onDelete={onDelete} />}
      {kirada.length === 0 && sirada.length === 0 && (
        <p className="card m-0 text-sm text-ink-muted">Şu an kirada ya da sırada bekleyen kiralama yok.</p>
      )}
      {gecmis.length > 0 &&
        (gecmisAcik ? (
          <Bolum baslik="Geçmiş" satirlar={gecmis} canli={false} bugun={bugun} onDelete={onDelete} />
        ) : (
          <button
            type="button"
            onClick={() => setGecmisAcik(true)}
            className="flex items-center justify-between rounded-[6px] border border-dashed border-border-strong px-4 py-3 text-sm font-semibold text-ink-muted transition-colors hover:border-ink-muted hover:text-ink"
          >
            Geçmiş kiralamaları göster ({gecmis.length})
            <IconChevronRight className="h-4 w-4" />
          </button>
        ))}
    </div>
  );
}
