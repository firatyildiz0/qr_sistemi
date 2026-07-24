import type { Booking } from "@/lib/types";
import { displayStatus } from "@/lib/bookings";
import BookingRow from "@/components/booking/BookingRow";
import { IconCalendar } from "@/components/icons";

export default function BookingList({
  bookings,
  productId,
}: {
  bookings: Booking[];
  productId: string;
}) {
  if (bookings.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-2 border-dashed py-10 text-center">
        <IconCalendar className="h-6 w-6 text-ink-muted" />
        <p className="text-sm text-ink-muted">Henüz rezervasyon yok.</p>
      </div>
    );
  }

  const sorted = [...bookings].sort((a, b) => (a.start_date < b.start_date ? 1 : -1));

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((b, i) => (
        <BookingRow
          key={b.id}
          booking={b}
          status={displayStatus(b)}
          productId={productId}
          delay={i * 60}
          otherBookedRanges={sorted
            .filter((other) => other.id !== b.id && other.status !== "cancelled")
            .map((other) => ({
              from: new Date(other.start_date + "T00:00:00"),
              to: new Date(other.end_date + "T00:00:00"),
            }))}
        />
      ))}
    </div>
  );
}
