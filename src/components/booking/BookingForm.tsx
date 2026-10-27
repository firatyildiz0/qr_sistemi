"use client";

import { useActionState, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import "react-day-picker/style.css";
import { createBooking, type BookingFormState } from "@/app/product/[id]/actions";
import {
  computeOccupancySpan,
  daysByState,
  formatDateRange,
  nightsBetween,
  occupancySpanError,
  unavailableDays,
  unitsLeftInRange,
  type Availability,
  type DateSpan,
} from "@/lib/bookings";
import type { CatalogProduct } from "@/lib/catalog";
import {
  DELIVERY_MODE_LABEL,
  deliveryModeForCity,
  type DeliveryMode,
  type Turnaround,
} from "@/lib/turnaround";
import AddressFields from "@/components/booking/AddressFields";
import AvailabilityLegend from "@/components/booking/AvailabilityLegend";
import DeliveryPlan from "@/components/booking/DeliveryPlan";
import FormStep from "@/components/booking/FormStep";
import ProductPicker, {
  basketError,
  itemsPayload,
  type PickedItem,
} from "@/components/booking/ProductPicker";
import PriceField from "@/components/PriceField";
import { IconCheckCircle } from "@/components/icons";

const initialState: BookingFormState = { error: null };

const todayString = () => format(new Date(), "yyyy-MM-dd");

export default function BookingForm({
  productId,
  availability,
  stock,
  turnaround,
  catalog,
}: {
  productId: string;
  availability: Availability;
  stock: number;
  turnaround: Turnaround;
  /**
   * Satıcının bütün ürünleri, müsaitlikleriyle. Toplu alımda aynı rezervasyona
   * başka ürünler eklenebilsin diye burada; ziyaretçiye bu form hiç
   * gösterilmediği için katalog da yalnızca satıcıya gidiyor.
   */
  catalog: CatalogProduct[];
}) {
  const action = createBooking.bind(null, productId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [range, setRange] = useState<DateRange | undefined>();
  // Taranan ürün sepetin ilk kalemi ve çıkarılamaz; adedi değiştirilebilir.
  const [items, setItems] = useState<PickedItem[]>([
    { productId, quantity: 1 },
  ]);
  // Ad kontrollü: adım başlığındaki özet ve alttaki çubuk müşterinin girilip
  // girilmediğini ancak böyle bilebiliyor.
  const [name, setName] = useState("");
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
      setName("");
      setCity("");
      setModeOverride(null);
      setBlockedOverride(null);
      setItems([{ productId, quantity: 1 }]);
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
    ? unitsLeftInRange(availability.occupied, stock, startStr, endStr)
    : stock;

  // Sepetteki ürünler kiralama günlerini değil bloke aralığını kapatıyor,
  // müsaitlik de ona göre sayılıyor.
  const basketProblem = basketError(catalog, items, blocked);
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
  const rentalDays = startStr ? nightsBetween(startStr, endStr) + 1 : 0;
  const customerReady = name.trim().length > 0 && city.length > 0;

  // Bloke aralığının hatası zaten `DeliveryPlan`ın içinde, alanın hemen
  // altında yazıyor; çubukta ikinci kez tekrarlanmasın.
  const blocking = state.error ?? basketProblem;
  const disabled =
    pending || !startStr || outOfStock || blockedError !== null || basketProblem !== null;

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="start_date" value={startStr} />
      <input type="hidden" name="end_date" value={endStr} />
      <input type="hidden" name="items" value={JSON.stringify(itemsPayload(items))} />

      <FormStep
        index={1}
        title="Kiralama tarihleri"
        hint={
          range?.from
            ? "Bitiş gününü seçin."
            : "Başlangıç ve bitiş gününe dokunun."
        }
        summary={
          startStr && range?.to
            ? `${formatDateRange(startStr, endStr)} · ${rentalDays} gün · bu tarihlerde ${unitsLeft} / ${stock} adet müsait`
            : undefined
        }
      >
        {outOfStock && (
          <p className="mb-2 text-sm text-danger">
            Stok 0. Rezervasyon almak için önce stok adedini artırın.
          </p>
        )}
        <div className="rdp-theme rounded-lg border border-border bg-card p-2 sm:p-3">
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
      </FormStep>

      <FormStep
        index={2}
        title="Ürünler"
        summary={
          items.length > 0
            ? `${items.length} ürün · ${totalUnits} adet`
            : undefined
        }
        hint="Rezervasyona en az bir ürün ekleyin."
      >
        <ProductPicker
          products={catalog}
          items={items}
          onChange={setItems}
          span={blocked}
          anchorId={productId}
        />
      </FormStep>

      <FormStep
        index={3}
        title="Müşteri"
        hint="Ad ve il zorunlu: bloke süresi seçilen ile göre hesaplanıyor."
        summary={customerReady ? `${name.trim()} · ${city}` : undefined}
      >
        <div className="space-y-3 rounded-lg border border-border bg-surface p-3">
          <div>
            <label htmlFor="customer_name" className="field-label">
              Adı soyadı
            </label>
            <input
              id="customer_name"
              name="customer_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
              className="input"
            />
          </div>

          <div>
            <label htmlFor="customer_phone" className="field-label">
              Telefon (opsiyonel)
            </label>
            <input
              id="customer_phone"
              name="customer_phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              className="input"
            />
          </div>

          <AddressFields key={resetKey} onCityChange={setCity} />
        </div>
      </FormStep>

      <FormStep
        index={4}
        title="Teslimat ve teminat"
        hint="Ürünün kaç gün elinizde olmayacağını buradan ayarlarsınız."
        summary={
          blocked
            ? `${DELIVERY_MODE_LABEL[mode]} · ${formatDateRange(
                blocked.start_date,
                blocked.end_date
              )} bloke`
            : undefined
        }
      >
        <div className="space-y-3">
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

          {/* Kendi state'ini tuttuğu için formun kayıt sonrası sıfırlaması
              buraya ulaşmıyor; alanı yeniden kurmak temizliyor. */}
          <div className="rounded-lg border border-border bg-surface p-3">
            <PriceField
              key={resetKey}
              name="deposit_price"
              label="Teminat (opsiyonel)"
              defaultValue={null}
              hint="Siparişin tamamı için alınan depozito; iade sırasında geri verilir."
            />
          </div>
        </div>
      </FormStep>

      {state.success && (
        <p className="flex items-center gap-1.5 text-sm text-success">
          <IconCheckCircle className="h-4 w-4" /> Rezervasyon onaylandı. O zaman
          görüşürüz!
        </p>
      )}

      {/* Telefonda ekranın altına yapışıyor: özet de kaydet düğmesi de her an
          görünür, satıcı formun dibine inmek zorunda kalmıyor. */}
      <div className="action-bar -mx-4 px-4 pt-3 sm:mx-0 sm:px-0">
        {blocking && (
          <p className="mb-2 text-sm text-danger" role="alert">
            {blocking}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="min-w-0 text-xs text-ink-muted">
            {startStr && range?.to ? (
              <>
                <span className="font-semibold text-ink">
                  {formatDateRange(startStr, endStr)}
                </span>{" "}
                · {totalUnits} adet
                {customerReady && ` · ${name.trim()}`}
              </>
            ) : (
              "Takvimden kiralama tarihlerini seçin."
            )}
          </p>

          <button
            type="submit"
            disabled={disabled}
            className="btn btn-primary w-full sm:w-auto"
          >
            {pending
              ? "Rezervasyon yapılıyor…"
              : totalUnits > 1
                ? `Rezervasyon ekle (${totalUnits} adet)`
                : "Rezervasyon ekle"}
          </button>
        </div>
      </div>
    </form>
  );
}
