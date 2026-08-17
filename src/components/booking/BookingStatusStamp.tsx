import type { SVGProps } from "react";
import type { BookingStatus } from "@/lib/types";
import { bookingStatusLabel, bookingStatusTone } from "@/lib/bookings";

/**
 * Durumun ikonu. Dördü de aynı çemberin içinde: renk körlüğünde ayıran şey
 * çemberin içindeki şekil oluyor — bekleyen akrep, süren dolu nokta, biten
 * onay, iptal çarpı. Aynı gövdeyi paylaşmaları listenin ritmini bozmuyor.
 */
function StatusIcon({
  status,
  ...props
}: { status: BookingStatus } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      {status === "upcoming" && <path d="M12 7v5l3 2" />}
      {status === "active" && (
        <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" />
      )}
      {status === "completed" && <path d="m8 12.5 2.7 2.7L16 9.8" />}
      {status === "cancelled" && <path d="m9 9 6 6M15 9l-6 6" />}
    </svg>
  );
}

/**
 * Rezervasyon listelerinde durumun gösterimi: satırın sağ kenarında, ikon ve
 * büyük harflerle kendi kutusunda. Hepsi aynı genişlikte olduğu için liste
 * boyunca tek bir sütun oluşturuyor; satıcı durumları tek tek satırların
 * içinde aramak yerine o sütunu takip ediyor.
 */
export default function BookingStatusStamp({ status }: { status: BookingStatus }) {
  return (
    <span className={`status-stamp ${bookingStatusTone[status]}`}>
      <StatusIcon status={status} className="h-[19px] w-[19px]" />
      <span>{bookingStatusLabel[status]}</span>
    </span>
  );
}
