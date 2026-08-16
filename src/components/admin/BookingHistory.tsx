"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { BookingStatus } from "@/lib/types";
import { bookingStatusLabel, bookingStatusPill, formatDateRange } from "@/lib/bookings";
import { deleteBooking } from "@/app/product/[id]/actions";
import ConfirmDialog from "@/components/ConfirmDialog";
import PhoneActions from "@/components/admin/PhoneActions";
import ProductThumb from "@/components/admin/ProductThumb";
import { IconCalendar, IconChevronRight, IconTrash } from "@/components/icons";

export type BookingHistoryRow = {
  id: string;
  productId: string;
  productName: string;
  productImageUrl: string | null;
  customerName: string;
  customerPhone: string | null;
  startDate: string;
  endDate: string;
  status: BookingStatus;
  createdAt: string;
};

type Filter = "all" | BookingStatus;

const filters: { key: Filter; label: string }[] = [
  { key: "all", label: "Tümü" },
  { key: "active", label: "Aktif" },
  { key: "upcoming", label: "Yaklaşan" },
  { key: "completed", label: "Teslim edildi" },
  { key: "cancelled", label: "İptal edildi" },
];

// Pinned to a fixed zone so the server render and the browser agree — the
// server runs in UTC, the visitor does not.
const createdFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

export default function BookingHistory({ bookings }: { bookings: BookingHistoryRow[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  // Tek bir onay penceresi bütün satırlara yetiyor: aynı anda yalnızca biri
  // silinebilir, o yüzden açık olan satırı tutmak satır başına state'ten basit.
  const [pendingDelete, setPendingDelete] = useState<BookingHistoryRow | null>(null);

  const counts = useMemo(() => {
    const map: Record<Filter, number> = {
      all: bookings.length,
      active: 0,
      upcoming: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const b of bookings) map[b.status] += 1;
    return map;
  }, [bookings]);

  const visible =
    filter === "all" ? bookings : bookings.filter((b) => b.status === filter);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => {
          const selected = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={selected}
              className={`btn min-h-0 px-3.5 py-2 text-xs ${
                selected ? "btn-primary" : "btn-secondary"
              }`}
            >
              {f.label}
              <span className={selected ? "text-white/70" : "text-ink-muted"}>
                {counts[f.key]}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 border-dashed py-10 text-center">
          <IconCalendar className="h-6 w-6 text-ink-muted" />
          <p className="text-sm text-ink-muted">
            {bookings.length === 0
              ? "Henüz rezervasyon oluşturulmadı."
              : "Bu filtreye uyan rezervasyon yok."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((b, i) => (
            // Satırın tamamı hâlâ bir bağlantı, ama sil düğmesi onun içine
            // giremez: bağlantı kartı kaplayan bir katman olarak duruyor, düğme
            // de onun üstünde kalıyor.
            <div
              key={b.id}
              className="fade-slide-up card card-hover relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              style={{ animationDelay: `${Math.min(i, 10) * 50}ms` }}
            >
              <Link
                href={`/admin/bookings/${b.id}`}
                aria-label={`${b.customerName} rezervasyonunu aç`}
                className="absolute inset-0 rounded-[inherit]"
              />

              {/* Görsel adın önünde: satır listede gözle taranıyor, ürünü
                  okumadan tanımak sırayı hızlandırıyor. */}
              <div className="flex min-w-0 items-start gap-3">
                <ProductThumb src={b.productImageUrl} />

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">{b.customerName}</p>
                    <span className={`pill ${bookingStatusPill[b.status]}`}>
                      {bookingStatusLabel[b.status]}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
                    <span className="truncate">{b.productName}</span>
                    <span className="flex items-center gap-1.5">
                      <IconCalendar className="h-3.5 w-3.5" />
                      {formatDateRange(b.startDate, b.endDate)}
                    </span>
                    {b.customerPhone && (
                      <PhoneActions phone={b.customerPhone} name={b.customerName} />
                    )}
                  </div>
                </div>
              </div>

              {/* pointer-events: üstteki katman tıklamayı yutmasın diye kolon
                  geçirgen, yalnızca düğme tıklanabilir. */}
              <div className="pointer-events-none relative flex shrink-0 flex-wrap items-center gap-3 self-start text-xs text-ink-muted sm:self-center">
                <span>{createdFormat.format(new Date(b.createdAt))} tarihinde oluşturuldu</span>
                <button
                  type="button"
                  onClick={() => setPendingDelete(b)}
                  className="btn btn-danger-ghost pointer-events-auto min-h-0 px-3 py-1.5 text-xs"
                >
                  <IconTrash className="h-3.5 w-3.5" />
                  Sil
                </button>
                <IconChevronRight className="h-4 w-4" />
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          const { error } = await deleteBooking(pendingDelete.productId, [
            pendingDelete.id,
          ]);
          if (error) throw new Error(error);
        }}
        title="Rezervasyonu sil"
        message={
          pendingDelete && (
            <>
              <strong className="font-semibold text-ink">{pendingDelete.customerName}</strong>{" "}
              adına {pendingDelete.productName} için{" "}
              {formatDateRange(pendingDelete.startDate, pendingDelete.endDate)} tarihlerinde
              oluşturulan rezervasyon kalıcı olarak silinecek ve bu günler yeniden müsait
              olacak. Bu işlem geri alınamaz.
            </>
          )
        }
        confirmLabel="Evet, sil"
        pendingLabel="Siliniyor…"
        cancelLabel="Vazgeç"
        tone="danger"
      />
    </div>
  );
}
