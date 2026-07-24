"use client";

import { useActionState, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { format } from "date-fns";
import "react-day-picker/style.css";
import type { Booking, BookingStatus } from "@/lib/types";
import { formatDateRange } from "@/lib/bookings";
import { cancelBooking, editBooking, type BookingFormState } from "@/app/product/[id]/actions";
import { IconCalendar, IconPencil, IconPhone, IconX } from "@/components/icons";

const statusPill: Record<BookingStatus, string> = {
  upcoming: "pill-accent",
  active: "pill-success",
  completed: "pill-muted",
  cancelled: "pill-danger",
};

const statusLabel: Record<BookingStatus, string> = {
  upcoming: "yaklaşan",
  active: "aktif",
  completed: "tamamlandı",
  cancelled: "iptal edildi",
};

const initialState: BookingFormState = { error: null };

export default function BookingRow({
  booking,
  status,
  productId,
  otherBookedRanges,
  delay = 0,
}: {
  booking: Booking;
  status: BookingStatus;
  productId: string;
  otherBookedRanges: { from: Date; to: Date }[];
  delay?: number;
}) {
  const [editing, setEditing] = useState(false);
  const editAction = editBooking.bind(null, productId, booking.id);
  const [state, formAction, pending] = useActionState(editAction, initialState);
  const [range, setRange] = useState<DateRange | undefined>({
    from: new Date(booking.start_date + "T00:00:00"),
    to: new Date(booking.end_date + "T00:00:00"),
  });

  const canModify = status !== "cancelled" && status !== "completed";
  const startStr = range?.from ? format(range.from, "yyyy-MM-dd") : booking.start_date;
  const endStr = range?.to ? format(range.to, "yyyy-MM-dd") : startStr;

  if (editing) {
    return (
      <div className="card">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="start_date" value={startStr} />
          <input type="hidden" name="end_date" value={endStr} />
          <div className="rdp-theme inline-block rounded-lg border border-border bg-surface p-3">
            <DayPicker
              mode="range"
              selected={range}
              onSelect={setRange}
              disabled={otherBookedRanges}
              numberOfMonths={1}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <input
              name="customer_name"
              defaultValue={booking.customer_name}
              required
              placeholder="Müşteri adı"
              className="input flex-1"
            />
            <input
              name="customer_phone"
              defaultValue={booking.customer_phone ?? ""}
              placeholder="Telefon"
              className="input flex-1"
            />
          </div>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="btn btn-primary min-h-0 py-2 text-xs">
              {pending ? "Kaydediliyor…" : "Değişiklikleri kaydet"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="btn btn-secondary min-h-0 py-2 text-xs"
            >
              Vazgeç
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div
      className="fade-slide-up card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-ink">{booking.customer_name}</p>
          <span className={`pill ${statusPill[status]}`}>{statusLabel[status]}</span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
          <span className="count-up flex items-center gap-1.5">
            <IconCalendar className="h-3.5 w-3.5" />
            {formatDateRange(booking.start_date, booking.end_date)}
          </span>
          {booking.customer_phone && (
            <span className="flex items-center gap-1.5">
              <IconPhone className="h-3.5 w-3.5" />
              {booking.customer_phone}
            </span>
          )}
        </div>
      </div>

      {canModify && (
        <div className="flex shrink-0 gap-2 self-start sm:self-center">
          <button type="button" onClick={() => setEditing(true)} className="btn btn-secondary min-h-0 px-3 py-1.5 text-xs">
            <IconPencil className="h-3.5 w-3.5" />
            Düzenle
          </button>
          <form
            action={cancelBooking.bind(null, productId, booking.id)}
            onSubmit={(e) => {
              if (!confirm("Bu rezervasyon iptal edilsin mi?")) e.preventDefault();
            }}
          >
            <button type="submit" className="btn btn-danger-ghost min-h-0 px-3 py-1.5 text-xs">
              <IconX className="h-3.5 w-3.5" />
              İptal et
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
