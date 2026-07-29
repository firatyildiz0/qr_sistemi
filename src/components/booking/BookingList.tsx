import type { Booking } from "@/lib/types";
import { availabilityOf, displayStatus } from "@/lib/bookings";
import type { CatalogProduct, GroupMember } from "@/lib/catalog";
import type { Turnaround } from "@/lib/turnaround";
import BookingRow from "@/components/booking/BookingRow";
import { IconCalendar } from "@/components/icons";

export default function BookingList({
  bookings,
  productId,
  stock,
  turnaround,
  catalog,
  groups,
}: {
  bookings: Booking[];
  productId: string;
  stock: number;
  turnaround: Turnaround;
  /** Satıcının ürünleri: satırdan toplu rezervasyona ürün eklemek için. */
  catalog: CatalogProduct[];
  /** Toplu rezervasyonların içeriği, grup kimliğine göre. */
  groups: Record<string, GroupMember[]>;
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
  const active = sorted.filter((b) => b.status !== "cancelled");

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((b, i) => (
        <BookingRow
          key={b.id}
          booking={b}
          status={displayStatus(b)}
          productId={productId}
          stock={stock}
          turnaround={turnaround}
          catalog={catalog}
          groupMembers={b.group_id ? groups[b.group_id] : undefined}
          delay={i * 60}
          // The row being edited must not count itself as competition for its
          // own dates, otherwise its current days look sold out.
          otherAvailability={availabilityOf(
            active.filter((other) => other.id !== b.id),
            turnaround
          )}
        />
      ))}
    </div>
  );
}
