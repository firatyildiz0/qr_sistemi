"use client";

import { useActionState, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import "react-day-picker/style.css";
import type { Booking, BookingStatus } from "@/lib/types";
import {
  bookingStatusLabel,
  bookingStatusPill,
  datesInRange,
  formatDateRange,
  partlyBookedDays,
  soldOutDays,
  unitsLeftOn,
} from "@/lib/bookings";
import { cancelBooking, editBooking, type BookingFormState } from "@/app/product/[id]/actions";
import { formatAddress, formatRegion } from "@/lib/turkiye";
import AddressFields from "@/components/booking/AddressFields";
import ConfirmDialog from "@/components/ConfirmDialog";
import { IconCalendar, IconMapPin, IconPencil, IconPhone, IconX } from "@/components/icons";

const initialState: BookingFormState = { error: null };

const toDate = (day: string) => new Date(day + "T00:00:00");

export default function BookingRow({
  booking,
  status,
  productId,
  otherBookedCounts,
  stock,
  delay = 0,
}: {
  booking: Booking;
  status: BookingStatus;
  productId: string;
  /** Days-to-units-out for every *other* booking on this product. */
  otherBookedCounts: Record<string, number>;
  stock: number;
  delay?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const editAction = editBooking.bind(null, productId, booking.id);
  const [state, formAction, pending] = useActionState(editAction, initialState);
  const [range, setRange] = useState<DateRange | undefined>({
    from: toDate(booking.start_date),
    to: toDate(booking.end_date),
  });
  // Controlled so the calendar opens on the month the booking actually falls
  // in — a booking in August must not open on today's month.
  const [month, setMonth] = useState(toDate(booking.start_date));
  const [prevState, setPrevState] = useState(state);

  // Saved successfully — collapse back to the summary row, which the
  // revalidated server data has already refreshed.
  if (state !== prevState) {
    setPrevState(state);
    if (state.success) setEditing(false);
  }

  const canModify = status !== "cancelled" && status !== "completed";
  // Satırda tam adres yer bulamayıp üç noktaya dönüşüyordu; il/ilçe hem sığıyor
  // hem de tanımaya yetiyor. İl seçilmemiş eski kayıtlarda açık adrese düşer.
  const region = formatRegion(booking) ?? booking.customer_address?.trim() ?? null;
  const startStr = range?.from ? format(range.from, "yyyy-MM-dd") : booking.start_date;
  const endStr = range?.to ? format(range.to, "yyyy-MM-dd") : startStr;

  // Only days where every other booking has taken the last unit are closed;
  // past days stay open because an active booking already starts in the past.
  const soldOut = soldOutDays(otherBookedCounts, stock);
  const partly = partlyBookedDays(otherBookedCounts, stock);

  const unitsLeft = Math.min(
    ...datesInRange(startStr, endStr).map((day) =>
      unitsLeftOn(otherBookedCounts, stock, day)
    )
  );

  function openEditor() {
    // Always reopen on the booking's own dates and month, even if a previous
    // edit was abandoned halfway through.
    setRange({ from: toDate(booking.start_date), to: toDate(booking.end_date) });
    setMonth(toDate(booking.start_date));
    setEditing(true);
  }

  if (editing) {
    return (
      <div className="card">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="start_date" value={startStr} />
          <input type="hidden" name="end_date" value={endStr} />

          <div>
            <label className="field-label">Kiralama tarihleri</label>
            <div className="rdp-theme inline-block rounded-lg border border-border bg-surface p-3">
              <DayPicker
                mode="range"
                locale={tr}
                month={month}
                onMonthChange={setMonth}
                selected={range}
                onSelect={setRange}
                // Without this, clicking a day while a complete range is
                // selected only trims that range — so the dates look stuck.
                // With it, the click starts a fresh range from that day.
                resetOnSelect
                excludeDisabled
                disabled={soldOut}
                modifiers={{ booked: soldOut, partly }}
                modifiersClassNames={{ booked: "rdp-booked", partly: "rdp-partly" }}
                numberOfMonths={1}
              />
            </div>
            <p className="count-up mt-2 text-sm font-medium text-ink">
              {formatDateRange(startStr, endStr)}
              <span className="ml-2 font-normal text-ink-muted">
                {range?.to
                  ? `bu tarihlerde ${unitsLeft} / ${stock} adet müsait`
                  : "bitiş tarihini seçin"}
              </span>
            </p>
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

          <AddressFields
            defaultCity={booking.customer_city}
            defaultDistrict={booking.customer_district}
            defaultAddress={booking.customer_address}
            showLabels={false}
          />
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
          <span className={`pill ${bookingStatusPill[status]}`}>{bookingStatusLabel[status]}</span>
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
          {region && (
            <span className="flex min-w-0 items-center gap-1.5" title={formatAddress(booking) ?? undefined}>
              <IconMapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{region}</span>
            </span>
          )}
        </div>
      </div>

      {canModify && (
        <div className="flex shrink-0 gap-2 self-start sm:self-center">
          <button type="button" onClick={openEditor} className="btn btn-secondary min-h-0 px-3 py-1.5 text-xs">
            <IconPencil className="h-3.5 w-3.5" />
            Düzenle
          </button>
          <button
            type="button"
            onClick={() => setCancelOpen(true)}
            className="btn btn-danger-ghost min-h-0 px-3 py-1.5 text-xs"
          >
            <IconX className="h-3.5 w-3.5" />
            İptal et
          </button>

          <ConfirmDialog
            open={cancelOpen}
            onClose={() => setCancelOpen(false)}
            onConfirm={() => cancelBooking(productId, booking.id)}
            title="Rezervasyonu iptal et"
            message={
              <>
                <strong className="font-semibold text-ink">{booking.customer_name}</strong> adına{" "}
                {formatDateRange(booking.start_date, booking.end_date)} tarihleri için oluşturulan rezervasyon
                iptal edilecek ve bu günler yeniden müsait olacak.
              </>
            }
            confirmLabel="Evet, iptal et"
            pendingLabel="İptal ediliyor…"
            cancelLabel="Vazgeç"
            tone="danger"
          />
        </div>
      )}
    </div>
  );
}
