import type { Booking } from "@/lib/types";
import { displayStatus } from "@/lib/bookings";
import BookingRow from "@/components/booking/BookingRow";

export default function BookingList({
  bookings,
  productId,
}: {
  bookings: Booking[];
  productId: string;
}) {
  if (bookings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
        No bookings yet.
      </div>
    );
  }

  const sorted = [...bookings].sort((a, b) => (a.start_date < b.start_date ? 1 : -1));

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table className="w-full min-w-[640px] text-left">
        <thead>
          <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-400">
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Phone</th>
            <th className="px-4 py-3 font-medium">Start</th>
            <th className="px-4 py-3 font-medium">End</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((b) => (
            <BookingRow
              key={b.id}
              booking={b}
              status={displayStatus(b)}
              productId={productId}
              otherBookedRanges={sorted
                .filter((other) => other.id !== b.id && other.status !== "cancelled")
                .map((other) => ({
                  from: new Date(other.start_date + "T00:00:00"),
                  to: new Date(other.end_date + "T00:00:00"),
                }))}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
