"use client";

import { useMemo, useState } from "react";
import type { BookingStatus } from "@/lib/types";
import { formatDateRange } from "@/lib/bookings";
import { deleteBooking } from "@/app/product/[id]/actions";
import ConfirmDialog from "@/components/ConfirmDialog";
import { IconCalendar } from "@/components/icons";
import GecmisListesi from "@/components/admin/kapak/GecmisListesi";

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

// Sayının rengi filtre şeridini aynı zamanda bir renk anahtarına çeviriyor:
// satırlardaki turuncunun "yaklaşan", kırmızının "iptal" olduğu buradan okunuyor.
const filters: { key: Filter; label: string; countClass: string }[] = [
  { key: "all", label: "Tümü", countClass: "text-ink-muted" },
  { key: "active", label: "Aktif", countClass: "text-success" },
  { key: "upcoming", label: "Yaklaşan", countClass: "text-status-upcoming" },
  { key: "completed", label: "Teslim edildi", countClass: "text-ink-muted" },
  { key: "cancelled", label: "İptal edildi", countClass: "text-danger" },
];

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
              <span className={`font-semibold ${selected ? "text-white/70" : f.countClass}`}>
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
        <GecmisListesi bookings={visible} onDelete={setPendingDelete} />
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
