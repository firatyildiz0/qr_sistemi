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

export function nightsBetween(startDate: string, endDate: string) {
  const start = new Date(startDate + "T00:00:00Z");
  const end = new Date(endDate + "T00:00:00Z");
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}
