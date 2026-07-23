"use client";

import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

export default function AvailabilityCalendar({
  bookedRanges,
}: {
  bookedRanges: { from: Date; to: Date }[];
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3">
      <DayPicker
        modifiers={{ booked: bookedRanges }}
        modifiersClassNames={{ booked: "rdp-booked" }}
        numberOfMonths={1}
      />
      <div className="mt-3 flex items-center gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-red-200" /> Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border border-neutral-300" /> Free
        </span>
      </div>
      <style>{`.rdp-booked { background-color: #fecaca; color: #7f1d1d; }`}</style>
    </div>
  );
}
