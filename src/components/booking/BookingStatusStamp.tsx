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
 * Rezervasyon listelerinde durumun gösterimi. İki biçimi var, ikisi de aynı
 * rengi ve ikonu taşıyor:
 *
 * - `stamp`: masaüstünde satırın sağ kenarında, sabit genişlikte bir kutu.
 *   Hepsi aynı hizada durduğu için liste boyunca tek bir sütun oluşuyor ve
 *   satıcı durumu her satırın içinde ayrıca aramıyor.
 * - `chip`: telefonda müşteri adının hizasında, tek satırlık çip. Dar ekranda
 *   kart zaten alt alta diziliyor, yani hizalanacak sütun yok; kutu orada
 *   durumu kartın en altına itiyordu.
 *
 * Çağıran taraf ikisini birden basıp `className` ile hangisinin görüneceğini
 * seçiyor (`sm:hidden` / `hidden sm:flex`). Gizli olan `display: none` olduğu
 * için ekran okuyucu da durumu iki kez okumuyor.
 */
export default function BookingStatusStamp({
  status,
  variant = "stamp",
  className = "",
}: {
  status: BookingStatus;
  variant?: "stamp" | "chip";
  className?: string;
}) {
  const chip = variant === "chip";

  return (
    <span
      className={`${chip ? "status-chip" : "status-stamp"} ${bookingStatusTone[status]} ${className}`}
    >
      <StatusIcon status={status} className={chip ? "h-3.5 w-3.5" : "h-[19px] w-[19px]"} />
      <span>{bookingStatusLabel[status]}</span>
    </span>
  );
}
