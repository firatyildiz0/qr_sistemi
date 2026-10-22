import type { BookingStatus } from "@/lib/types";
import { bookingStatusLabel, bookingStatusTone } from "@/lib/bookings";

/**
 * Sade listelerin durum gösterimi: büyük damga yerine renkli bir nokta ve tek
 * kelime. Renk `tone-*` sınıflarının `--status` değişkeninden, yani damgayla
 * aynı renk anahtarı.
 */
export default function DurumYazisi({ status, className = "" }: { status: BookingStatus; className?: string }) {
  return (
    <span
      className={`${bookingStatusTone[status]} inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[color:var(--status)] ${className}`}
    >
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[color:var(--status)]" />
      <span className="first-letter:uppercase">{bookingStatusLabel[status]}</span>
    </span>
  );
}
