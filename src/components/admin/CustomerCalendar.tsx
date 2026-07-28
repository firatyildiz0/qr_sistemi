"use client";

import { useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import { tr } from "date-fns/locale";
import "react-day-picker/style.css";
import { datesInRange } from "@/lib/bookings";
import type { CustomerBooking } from "@/lib/customers";
import type { BookingStatus } from "@/lib/types";

const parseDay = (day: string) => new Date(day + "T00:00:00");

/**
 * Every rental this customer has ever had, on one calendar, coloured by status.
 *
 * A day carrying more than one booking takes the most "live" status, so an
 * active rental is never hidden behind a completed one on the same date.
 */
const PRIORITY: BookingStatus[] = ["active", "upcoming", "completed", "cancelled"];

const LEGEND: { status: BookingStatus; label: string; className: string }[] = [
  { status: "active", label: "Aktif", className: "cal-active" },
  { status: "upcoming", label: "Yaklaşan", className: "cal-upcoming" },
  { status: "completed", label: "Teslim edildi", className: "cal-completed" },
  { status: "cancelled", label: "İptal edildi", className: "cal-cancelled" },
];

export default function CustomerCalendar({ bookings }: { bookings: CustomerBooking[] }) {
  const { modifiers, present } = useMemo(() => {
    const statusByDay = new Map<string, BookingStatus>();

    for (const booking of bookings) {
      for (const day of datesInRange(booking.startDate, booking.endDate)) {
        const current = statusByDay.get(day);
        if (
          current === undefined ||
          PRIORITY.indexOf(booking.status) < PRIORITY.indexOf(current)
        ) {
          statusByDay.set(day, booking.status);
        }
      }
    }

    const buckets: Record<BookingStatus, Date[]> = {
      active: [],
      upcoming: [],
      completed: [],
      cancelled: [],
    };
    for (const [day, status] of statusByDay) buckets[status].push(parseDay(day));

    return {
      modifiers: buckets,
      present: LEGEND.filter((item) => buckets[item.status].length > 0),
    };
  }, [bookings]);

  // Opens on the rental worth seeing first — an in-progress one, else the next
  // one coming up, else the most recent real rental. Plain "newest booking"
  // would land on a cancelled future date and show an otherwise empty month.
  const [month, setMonth] = useState(() => {
    const focus =
      bookings.find((b) => b.status === "active") ??
      [...bookings].reverse().find((b) => b.status === "upcoming") ??
      bookings.find((b) => b.status !== "cancelled") ??
      bookings[0];
    return focus ? parseDay(focus.startDate) : new Date();
  });

  return (
    <div className="rdp-theme card">
      <DayPicker
        locale={tr}
        month={month}
        onMonthChange={setMonth}
        modifiers={modifiers}
        modifiersClassNames={{
          active: "cal-active",
          upcoming: "cal-upcoming",
          completed: "cal-completed",
          cancelled: "cal-cancelled",
        }}
        numberOfMonths={1}
      />

      {present.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-muted">
          {present.map((item) => (
            <span key={item.status} className="flex items-center gap-1.5">
              <span className={`inline-block h-3 w-3 rounded-sm ${item.className}`} />
              {item.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
