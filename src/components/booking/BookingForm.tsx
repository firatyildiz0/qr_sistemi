"use client";

import { useActionState, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import "react-day-picker/style.css";
import { createBooking, type BookingFormState } from "@/app/product/[id]/actions";
import { formatDateRange } from "@/lib/bookings";
import { IconCheckCircle } from "@/components/icons";

const initialState: BookingFormState = { error: null };

export default function BookingForm({
  productId,
  bookedRanges,
}: {
  productId: string;
  bookedRanges: { from: Date; to: Date }[];
}) {
  const action = createBooking.bind(null, productId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [range, setRange] = useState<DateRange | undefined>();
  const [prevState, setPrevState] = useState(state);

  if (state !== prevState) {
    setPrevState(state);
    if (state.success) setRange(undefined);
  }

  const startStr = range?.from ? format(range.from, "yyyy-MM-dd") : "";
  const endStr = range?.to ? format(range.to, "yyyy-MM-dd") : startStr;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="start_date" value={startStr} />
      <input type="hidden" name="end_date" value={endStr} />

      <div>
        <label className="field-label">Kiralama tarihleri</label>
        <div className="rdp-theme rounded-lg border border-border bg-card p-3">
          <DayPicker
            mode="range"
            locale={tr}
            excludeDisabled
            selected={range}
            onSelect={setRange}
            disabled={[{ before: new Date(new Date().setHours(0, 0, 0, 0)) }, ...bookedRanges]}
            modifiers={{ booked: bookedRanges }}
            modifiersClassNames={{ booked: "rdp-booked" }}
            numberOfMonths={1}
          />
          <div className="mt-3 flex items-center gap-4 text-xs text-ink-muted">
            <span className="flex items-center gap-1.5">
              <span className="diagonal-stripes inline-block h-3 w-3 rounded-sm border border-border" /> Dolu
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm border border-border" /> Müsait
            </span>
          </div>
          <style>{`.rdp-booked { background-color: #ffe3d4; color: #852400; text-decoration: line-through; }`}</style>
        </div>
        {startStr && (
          <p className="mt-2 count-up text-sm font-medium text-ink">
            {formatDateRange(startStr, endStr)}
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

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.success && (
        <p className="flex items-center gap-1.5 text-sm text-success">
          <IconCheckCircle className="h-4 w-4" /> Rezervasyon onaylandı. O zaman görüşürüz!
        </p>
      )}

      <button type="submit" disabled={pending || !startStr} className="btn btn-primary w-full sm:w-auto">
        {pending ? "Rezervasyon yapılıyor…" : "Rezervasyon ekle"}
      </button>
    </form>
  );
}
