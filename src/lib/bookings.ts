import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { Booking, BookingStatus } from "@/lib/types";

/** Two inclusive date ranges (YYYY-MM-DD strings) overlap. */
export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
) {
  return aStart <= bEnd && aEnd >= bStart;
}

/** The inclusive span between two YYYY-MM-DD strings, day by day. */
export function datesInRange(startDate: string, endDate: string): string[] {
  const days: string[] = [];
  const cursor = new Date(startDate + "T00:00:00Z");
  const end = new Date(endDate + "T00:00:00Z");

  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

/**
 * Availability is per day, not per product: a product with stock 2 can carry
 * two overlapping bookings on the same date. This counts how many units each
 * day already has out, which is what every availability check compares
 * against `stock`.
 *
 * Cancelled bookings must be filtered out by the caller.
 */
export type DateSpan = { start_date: string; end_date: string };

export function bookedCountByDate(bookings: DateSpan[]): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const booking of bookings) {
    for (const day of datesInRange(booking.start_date, booking.end_date)) {
      counts[day] = (counts[day] ?? 0) + 1;
    }
  }

  return counts;
}

/** Units still rentable on a given day. */
export function unitsLeftOn(
  counts: Record<string, number>,
  stock: number,
  date: string
) {
  return Math.max(0, stock - (counts[date] ?? 0));
}

/**
 * First day of the requested range with nothing left, or null when the whole
 * range fits. Callers turn the returned day into the error message.
 */
export function firstSoldOutDate(
  counts: Record<string, number>,
  stock: number,
  startDate: string,
  endDate: string
): string | null {
  if (stock <= 0) return startDate;

  return (
    datesInRange(startDate, endDate).find(
      (day) => unitsLeftOn(counts, stock, day) === 0
    ) ?? null
  );
}

const parseDay = (day: string) => new Date(day + "T00:00:00");

/** Days the calendars strike out and refuse to select: every unit is out. */
export function soldOutDays(counts: Record<string, number>, stock: number): Date[] {
  if (stock <= 0) return [];

  return Object.entries(counts)
    .filter(([, count]) => count >= stock)
    .map(([day]) => parseDay(day));
}

/** Days that are booked but still have at least one unit free. */
export function partlyBookedDays(
  counts: Record<string, number>,
  stock: number
): Date[] {
  if (stock <= 0) return [];

  return Object.entries(counts)
    .filter(([, count]) => count > 0 && count < stock)
    .map(([day]) => parseDay(day));
}

/**
 * The stored `status` column only tracks explicit cancellation; upcoming
 * vs. active vs. completed is derived from today's date so it never drifts
 * out of sync between visits.
 */
export function displayStatus(booking: Booking, today = new Date()): BookingStatus {
  if (booking.status === "cancelled") return "cancelled";

  const todayStr = today.toISOString().slice(0, 10);
  if (todayStr < booking.start_date) return "upcoming";
  if (todayStr > booking.end_date) return "completed";
  return "active";
}

/** Wording and pill styling for a derived status, shared by every screen. */
export const bookingStatusLabel: Record<BookingStatus, string> = {
  upcoming: "yaklaşan",
  active: "aktif",
  completed: "teslim edildi",
  cancelled: "iptal edildi",
};

export const bookingStatusPill: Record<BookingStatus, string> = {
  upcoming: "pill-accent",
  active: "pill-success",
  completed: "pill-muted",
  cancelled: "pill-danger",
};

export function nightsBetween(startDate: string, endDate: string) {
  const start = new Date(startDate + "T00:00:00Z");
  const end = new Date(endDate + "T00:00:00Z");
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

/** Formats two YYYY-MM-DD strings as a compact, readable range, e.g. "25 – 28 Tem 2026". */
export function formatDateRange(startDate: string, endDate: string) {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

  if (startDate === endDate) return format(start, "d MMM yyyy", { locale: tr });

  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  if (sameMonth) return `${format(start, "d", { locale: tr })} – ${format(end, "d MMM yyyy", { locale: tr })}`;
  if (sameYear) return `${format(start, "d MMM", { locale: tr })} – ${format(end, "d MMM yyyy", { locale: tr })}`;
  return `${format(start, "d MMM yyyy", { locale: tr })} – ${format(end, "d MMM yyyy", { locale: tr })}`;
}
