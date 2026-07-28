"use client";

import { DayPicker } from "react-day-picker";
import { tr } from "date-fns/locale";
import "react-day-picker/style.css";
import { partlyBookedDays, soldOutDays } from "@/lib/bookings";

/**
 * A day only counts as "dolu" once every unit in stock is out: with stock 2
 * the first booking on a date leaves the day rentable, just partly taken.
 */
export default function AvailabilityCalendar({
  bookedCounts,
  stock,
}: {
  bookedCounts: Record<string, number>;
  stock: number;
}) {
  const soldOut = soldOutDays(bookedCounts, stock);
  const partly = partlyBookedDays(bookedCounts, stock);

  return (
    <div className="rdp-theme card">
      {stock <= 0 && (
        <p className="mb-3 text-sm text-danger">Bu ürün şu anda stokta yok.</p>
      )}
      <DayPicker
        locale={tr}
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
  );
}
