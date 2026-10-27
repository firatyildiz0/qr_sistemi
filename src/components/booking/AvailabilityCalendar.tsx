"use client";

import { DayPicker } from "react-day-picker";
import { tr } from "date-fns/locale";
import "react-day-picker/style.css";
import { daysByState, type Availability } from "@/lib/bookings";
import AvailabilityLegend from "@/components/booking/AvailabilityLegend";

/**
 * A day only counts as "dolu" once every unit in stock is out: with stock 2
 * the first booking on a date leaves the day rentable, just partly taken.
 *
 * Kapalı günler kiralama günlerinden fazladır: ürün kına gününden önce yola
 * çıkıp düğünden sonra dönüp temizlendiği için o günler de elde değildir.
 * Takvim ikisini ayrı renklendirir, `Availability` de ikisini ayrı taşır.
 */
export default function AvailabilityCalendar({
  availability,
  stock,
}: {
  availability: Availability;
  stock: number;
}) {
  const days = daysByState(availability, stock);

  return (
    <div className="rdp-theme card p-4 sm:p-6">
      {stock <= 0 && (
        <p className="mb-3 text-sm text-danger">Bu ürün şu anda stokta yok.</p>
      )}
      <DayPicker
        locale={tr}
        modifiers={{
          booked: days.full,
          blocked: days.blocked,
          partly: days.partly,
          blockedPartly: days["partly-blocked"],
        }}
        modifiersClassNames={{
          booked: "rdp-booked",
          blocked: "rdp-blocked",
          partly: "rdp-partly",
          blockedPartly: "rdp-blocked-partly",
        }}
        numberOfMonths={1}
      />
      <AvailabilityLegend stock={stock} />
    </div>
  );
}
