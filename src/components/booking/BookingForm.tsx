"use client";

import { useActionState, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import "react-day-picker/style.css";
import { createBooking, type BookingFormState } from "@/app/product/[id]/actions";
import {
  datesInRange,
  formatDateRange,
  partlyBookedDays,
  soldOutDays,
  unitsLeftOn,
} from "@/lib/bookings";
import AddressFields from "@/components/booking/AddressFields";
import { IconCheckCircle } from "@/components/icons";

const initialState: BookingFormState = { error: null };

export default function BookingForm({
  productId,
  bookedCounts,
  stock,
}: {
  productId: string;
  bookedCounts: Record<string, number>;
  stock: number;
}) {
  const action = createBooking.bind(null, productId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [range, setRange] = useState<DateRange | undefined>();
  // İl/ilçe kontrollü seçim olduğu için formun kendi sıfırlaması onlara
  // ulaşmaz; başarılı kayıttan sonra alanı yeniden kurmak temizler.
  const [resetKey, setResetKey] = useState(0);
  const [prevState, setPrevState] = useState(state);

  if (state !== prevState) {
    setPrevState(state);
    if (state.success) {
      setRange(undefined);
      setResetKey((k) => k + 1);
    }
  }

  const startStr = range?.from ? format(range.from, "yyyy-MM-dd") : "";
  const endStr = range?.to ? format(range.to, "yyyy-MM-dd") : startStr;

  // Only days where the last unit is out are unselectable; a day that still
  // has stock left stays open even though it already carries a booking.
  const soldOut = soldOutDays(bookedCounts, stock);
  const partly = partlyBookedDays(bookedCounts, stock);
  const outOfStock = stock <= 0;

  // The tightest day in the selection decides how many units are really free.
  const unitsLeft = startStr
    ? Math.min(
        ...datesInRange(startStr, endStr).map((day) =>
          unitsLeftOn(bookedCounts, stock, day)
        )
      )
    : stock;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="start_date" value={startStr} />
      <input type="hidden" name="end_date" value={endStr} />

      <div>
        {outOfStock && (
          <p className="mb-2 text-sm text-danger">
            Stok 0. Rezervasyon almak için önce stok adedini artırın.
          </p>
        )}
        <div className="rdp-theme rounded-lg border border-border bg-card p-3">
          <DayPicker
            mode="range"
            locale={tr}
            excludeDisabled
            selected={range}
            onSelect={setRange}
            disabled={
              outOfStock
                ? true
                : [{ before: new Date(new Date().setHours(0, 0, 0, 0)) }, ...soldOut]
            }
            modifiers={{ booked: soldOut, partly }}
            modifiersClassNames={{ booked: "rdp-booked", partly: "rdp-partly" }}
            numberOfMonths={1}
          />
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-ink-muted">
            <span className="flex items-center gap-1.5">
              <span className="diagonal-stripes inline-block h-3 w-3 rounded-sm border border-border" /> Dolu
            </span>
            {stock > 1 && (
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-sm border border-border bg-partial-soft" /> Kısmen dolu
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm border border-border" /> Müsait
            </span>
          </div>
        </div>
        {startStr && (
          <p className="mt-2 count-up text-sm font-medium text-ink">
            {formatDateRange(startStr, endStr)}
            <span className="ml-2 font-normal text-ink-muted">
              bu tarihlerde {unitsLeft} / {stock} adet müsait
            </span>
          </p>
        )}
      </div>

      <div>
        <label htmlFor="customer_name" className="field-label">
          Adınız
        </label>
        <input id="customer_name" name="customer_name" required className="input" />
      </div>

      <div>
        <label htmlFor="customer_phone" className="field-label">
          Telefon (opsiyonel)
        </label>
        <input id="customer_phone" name="customer_phone" type="tel" className="input" />
      </div>

      <AddressFields key={resetKey} />

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.success && (
        <p className="flex items-center gap-1.5 text-sm text-success">
          <IconCheckCircle className="h-4 w-4" /> Rezervasyon onaylandı. O zaman görüşürüz!
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !startStr || outOfStock}
        className="btn btn-primary w-full sm:w-auto"
      >
        {pending ? "Rezervasyon yapılıyor…" : "Rezervasyon ekle"}
      </button>
    </form>
  );
}
