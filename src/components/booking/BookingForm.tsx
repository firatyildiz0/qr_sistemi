"use client";

import { useActionState, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import "react-day-picker/style.css";
import { createBooking, type BookingFormState } from "@/app/product/[id]/actions";
import {
  computeOccupancySpan,
  datesInRange,
  daysByState,
  formatDateRange,
  occupancySpanError,
  unavailableDays,
  unitsLeftOn,
  type Availability,
  type DateSpan,
} from "@/lib/bookings";
import { deliveryModeForCity, type DeliveryMode, type Turnaround } from "@/lib/turnaround";
import AddressFields from "@/components/booking/AddressFields";
import AvailabilityLegend from "@/components/booking/AvailabilityLegend";
import DeliveryPlan from "@/components/booking/DeliveryPlan";
import { IconCheckCircle } from "@/components/icons";

const initialState: BookingFormState = { error: null };

const todayString = () => format(new Date(), "yyyy-MM-dd");

export default function BookingForm({
  productId,
  availability,
  stock,
  turnaround,
}: {
  productId: string;
  availability: Availability;
  stock: number;
  turnaround: Turnaround;
}) {
  const action = createBooking.bind(null, productId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [range, setRange] = useState<DateRange | undefined>();
  const [city, setCity] = useState("");
  // null = ilden türetilen varsayılan geçerli. Satıcı elle seçtiği anda
  // dolar ve il değişse bile seçim korunur.
  const [modeOverride, setModeOverride] = useState<DeliveryMode | null>(null);
  // null = meşguliyet aralığı ayarlardaki sürelerden hesaplanıyor. Satıcı
  // tarihleri elle girdiği anda dolar; kiralama tarihleri ya da teslimat şekli
  // değişirse temizlenir, çünkü o aralık artık başka bir kiralamaya aitti.
  const [blockedOverride, setBlockedOverride] = useState<DateSpan | null>(null);
  // İl/ilçe kontrollü seçim olduğu için formun kendi sıfırlaması onlara
  // ulaşmaz; başarılı kayıttan sonra alanı yeniden kurmak temizler.
  const [resetKey, setResetKey] = useState(0);
  const [prevState, setPrevState] = useState(state);

  if (state !== prevState) {
    setPrevState(state);
    if (state.success) {
      setRange(undefined);
      setCity("");
      setModeOverride(null);
      setBlockedOverride(null);
      setResetKey((k) => k + 1);
    }
  }

  function selectRange(next: DateRange | undefined) {
    setRange(next);
    setBlockedOverride(null);
  }

  function selectMode(next: DeliveryMode) {
    setModeOverride(next);
    setBlockedOverride(null);
  }

  const startStr = range?.from ? format(range.from, "yyyy-MM-dd") : "";
  const endStr = range?.to ? format(range.to, "yyyy-MM-dd") : startStr;

  // Ürünün elde olmadığı her gün seçilemez — sebebi kiralama da olabilir,
  // kargo/temizlik de. Renkler ikisini ayırır, seçilebilirlik ayırmaz.
  const days = daysByState(availability, stock);
  const unavailable = unavailableDays(availability, stock);
  const outOfStock = stock <= 0;

  const mode: DeliveryMode = modeOverride ?? deliveryModeForCity(city);
  const rental = startStr ? { start_date: startStr, end_date: endStr } : null;
  const blocked = rental
    ? blockedOverride ?? computeOccupancySpan(startStr, endStr, mode, turnaround)
    : null;
  // Elle girilen aralık kiralama günlerini kapsamak zorunda; sunucu da aynı
  // kontrolü yapıyor, buradaki sadece boşuna gidip gelmeyi önlüyor.
  const blockedError =
    rental && blocked ? occupancySpanError(blocked, startStr, endStr) : null;
  // Ürünün çıkması gereken gün geçmişte kaldıysa kayıt engellenmez, uyarılır:
  // satıcı elden verebilir ya da hızlı kargo bulabilir.
  const shipsLate = blocked ? blocked.start_date <= todayString() : false;

  // The tightest day in the selection decides how many units are really free.
  const unitsLeft = startStr
    ? Math.min(
        ...datesInRange(startStr, endStr).map((day) =>
          unitsLeftOn(availability.occupied, stock, day)
        )
      )
    : stock;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="start_date" value={startStr} />
      <input type="hidden" name="end_date" value={endStr} />

      <div>
        {outOfStock && (
          <p className="mb-2 text-sm text-danger">
            Stok 0. Rezervasyon almak için önce stok adedini artırın.
          </p>
        )}
        <div className="rdp-theme rounded-lg border border-border bg-card p-3">
          <DayPicker
            mode="range"
            locale={tr}
            excludeDisabled
            selected={range}
            onSelect={selectRange}
            disabled={
              outOfStock
                ? true
                : [{ before: new Date(new Date().setHours(0, 0, 0, 0)) }, ...unavailable]
            }
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
        {startStr && (
          <p className="mt-2 count-up text-sm font-medium text-ink">
            {formatDateRange(startStr, endStr)}
            <span className="ml-2 font-normal text-ink-muted">
              bu tarihlerde {unitsLeft} / {stock} adet müsait
            </span>
          </p>
        )}
      </div>

      <div>
        <label htmlFor="customer_name" className="field-label">
          Adınız
        </label>
        <input id="customer_name" name="customer_name" required className="input" />
      </div>

      <div>
        <label htmlFor="customer_phone" className="field-label">
          Telefon (opsiyonel)
        </label>
        <input id="customer_phone" name="customer_phone" type="tel" className="input" />
      </div>

      <AddressFields key={resetKey} onCityChange={setCity} />

      <DeliveryPlan
        city={city}
        mode={mode}
        onModeChange={selectMode}
        rental={rental}
        blocked={blocked}
        manual={blockedOverride !== null}
        onBlockedChange={setBlockedOverride}
        error={blockedError}
        turnaround={turnaround}
        shipsLate={shipsLate}
      />

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.success && (
        <p className="flex items-center gap-1.5 text-sm text-success">
          <IconCheckCircle className="h-4 w-4" /> Rezervasyon onaylandı. O zaman görüşürüz!
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !startStr || outOfStock || blockedError !== null}
        className="btn btn-primary w-full sm:w-auto"
      >
        {pending ? "Rezervasyon yapılıyor…" : "Rezervasyon ekle"}
      </button>
    </form>
  );
}
