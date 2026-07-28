"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CustomerBooking } from "@/lib/customers";
import type { BookingStatus } from "@/lib/types";
import { bookingStatusLabel, bookingStatusPill, formatDateRange } from "@/lib/bookings";
import { formatPrice } from "@/lib/format";
import { IconCalendar, IconChevronRight, IconPackage } from "@/components/icons";

type Filter = "all" | BookingStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Tümü" },
  { key: "active", label: "Aktif" },
  { key: "upcoming", label: "Yaklaşan" },
  { key: "completed", label: "Teslim edildi" },
  { key: "cancelled", label: "İptal edildi" },
];

export default function CustomerRentals({ bookings }: { bookings: CustomerBooking[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    const map: Record<Filter, number> = {
      all: bookings.length,
      upcoming: 0,
      active: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const b of bookings) map[b.status] += 1;
    return map;
  }, [bookings]);

  const visible = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const selected = filter === f.key;
          // A filter that would show nothing is not worth a click.
          if (f.key !== "all" && counts[f.key] === 0) return null;
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
              <span className={selected ? "text-white/70" : "text-ink-muted"}>
                {counts[f.key]}
              </span>
            </button>
          );
        })}
      </div>

      <ul className="flex flex-col gap-3">
        {visible.map((booking, i) => (
          <li key={booking.id}>
            <Link
              href={`/admin/bookings/${booking.id}`}
              className="fade-slide-up card card-hover flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              style={{ animationDelay: `${Math.min(i, 10) * 50}ms` }}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="flex items-center gap-1.5 font-semibold text-ink">
                    <IconPackage className="h-4 w-4 text-ink-muted" />
                    {booking.productName}
                  </p>
                  <span className={`pill ${bookingStatusPill[booking.status]}`}>
                    {bookingStatusLabel[booking.status]}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
                  <span className="flex items-center gap-1.5">
                    <IconCalendar className="h-3.5 w-3.5" />
                    {formatDateRange(booking.startDate, booking.endDate)}
                  </span>
                  <span>{booking.days} gün</span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3 self-start sm:self-center">
                {booking.total != null && (
                  <span className="text-sm font-semibold text-ink">
                    {formatPrice(booking.total)}
                  </span>
                )}
                <IconChevronRight className="h-4 w-4 text-ink-muted" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
