"use client";

import { DayPicker } from "react-day-picker";
import { tr } from "date-fns/locale";
import "react-day-picker/style.css";

export default function AvailabilityCalendar({
  bookedRanges,
}: {
  bookedRanges: { from: Date; to: Date }[];
}) {
  return (
    <div className="rdp-theme card">
      <DayPicker
        locale={tr}
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
  );
}
