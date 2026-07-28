"use client";

import { DayPicker } from "react-day-picker";
import { tr } from "date-fns/locale";
import "react-day-picker/style.css";

/** Read-only calendar that just marks the days this booking covers. */
export default function BookingCalendar({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string;
}) {
  const from = new Date(startDate + "T00:00:00");
  const to = new Date(endDate + "T00:00:00");

  return (
    <div className="rdp-theme card">
      <DayPicker
        locale={tr}
        defaultMonth={from}
        modifiers={{ rented: { from, to } }}
        modifiersClassNames={{ rented: "rdp-rented" }}
        numberOfMonths={1}
      />
      <div className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
        <span className="inline-block h-3 w-3 rounded-sm bg-accent-muted" />
        Kiralama günleri
      </div>
    </div>
  );
}
