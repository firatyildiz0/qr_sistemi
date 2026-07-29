"use client";

import { useActionState, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import "react-day-picker/style.css";
import type { Booking, BookingStatus } from "@/lib/types";
import {
  bookingStatusLabel,
  bookingStatusPill,
  computeOccupancySpan,
  datesInRange,
  daysByState,
  formatDateRange,
  occupancySpan,
  occupancySpanError,
  sameSpan,
  unavailableDays,
  unitsLeftOn,
  type Availability,
  type DateSpan,
} from "@/lib/bookings";
import {
  addBookingItems,
  deleteBooking,
  editBooking,
  type BookingFormState,
} from "@/app/product/[id]/actions";
import type { CatalogProduct, GroupMember } from "@/lib/catalog";
import {
  DELIVERY_MODE_LABEL,
  deliveryModeForCity,
  type DeliveryMode,
  type Turnaround,
} from "@/lib/turnaround";
import { formatAddress, formatRegion } from "@/lib/turkiye";
import AddressFields from "@/components/booking/AddressFields";
import AvailabilityLegend from "@/components/booking/AvailabilityLegend";
import DeliveryPlan from "@/components/booking/DeliveryPlan";
import ProductPicker, {
  basketError,
  itemsPayload,
  type PickedItem,
} from "@/components/booking/ProductPicker";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  IconCalendar,
  IconMapPin,
  IconPackage,
  IconPencil,
  IconPhone,
  IconPlus,
  IconTrash,
  IconTruck,
} from "@/components/icons";

const initialState: BookingFormState = { error: null };

const toDate = (day: string) => new Date(day + "T00:00:00");
const todayString = () => format(new Date(), "yyyy-MM-dd");

export default function BookingRow({
  booking,
  unitIds,
  status,
  productId,
  otherAvailability,
  stock,
  turnaround,
  catalog,
  groupMembers,
  delay = 0,
}: {
  booking: Booking;
  /**
   * Bu kartın kapsadığı satırlar. Aynı üründen birkaç adet alındığında her adet
   * kendi satırında duruyor ama listede tek kalem görünüyor; düzenleme ve silme
   * de o yüzden satırların hepsine birden uygulanıyor.
   */
  unitIds: string[];
  status: BookingStatus;
  productId: string;
  /** Availability from every *other* booking on this product. */
  otherAvailability: Availability;
  stock: number;
  turnaround: Turnaround;
  /** Satıcının bütün ürünleri: rezervasyona sonradan ürün eklemek için. */
  catalog: CatalogProduct[];
  /** Bu rezervasyon toplu bir alımın parçasıysa grubun tamamı. */
  groupMembers?: GroupMember[];
  delay?: number;
}) {
  /**
   * Kayıtlı aralık, ayarlardaki sürelerden hesaplanana eşit değilse satıcı onu
   * elle girmiş demektir — düzenlemeye o tarihlerle açılmalı, yoksa forma
   * girer girmez sessizce otomatik hesaba dönerdi.
   */
  function storedOverride(): DateSpan | null {
    if (!booking.blocked_start || !booking.blocked_end) return null;
    const stored = {
      start_date: booking.blocked_start,
      end_date: booking.blocked_end,
    };
    const auto = computeOccupancySpan(
      booking.start_date,
      booking.end_date,
      booking.delivery_mode ?? deliveryModeForCity(booking.customer_city),
      turnaround
    );
    return sameSpan(stored, auto) ? null : stored;
  }

  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  // Kayıtlı rezervasyona sonradan eklenen ürünler. Müşteri bilgileri ve
  // tarihler mevcut kayıttan devralındığı için sepetten başka alan yok.
  const [adding, setAdding] = useState(false);
  const [extra, setExtra] = useState<PickedItem[]>([]);
  const [addState, addFormAction, addPending] = useActionState(
    addBookingItems.bind(null, booking.id),
    initialState
  );
  const [prevAddState, setPrevAddState] = useState(addState);

  if (addState !== prevAddState) {
    setPrevAddState(addState);
    if (addState.success) {
      setAdding(false);
      setExtra([]);
    }
  }

  const units = unitIds.length;
  const editAction = editBooking.bind(null, productId, unitIds);
  const [state, formAction, pending] = useActionState(editAction, initialState);
  const [range, setRange] = useState<DateRange | undefined>({
    from: toDate(booking.start_date),
    to: toDate(booking.end_date),
  });
  // Controlled so the calendar opens on the month the booking actually falls
  // in — a booking in August must not open on today's month.
  const [month, setMonth] = useState(toDate(booking.start_date));
  const [city, setCity] = useState(booking.customer_city ?? "");
  const [modeOverride, setModeOverride] = useState<DeliveryMode | null>(
    booking.delivery_mode
  );
  const [blockedOverride, setBlockedOverride] = useState<DateSpan | null>(storedOverride);
  const [prevState, setPrevState] = useState(state);

  // Saved successfully — collapse back to the summary row, which the
  // revalidated server data has already refreshed.
  if (state !== prevState) {
    setPrevState(state);
    if (state.success) setEditing(false);
  }

  const canModify = status !== "cancelled" && status !== "completed";
  // Satırda tam adres yer bulamayıp üç noktaya dönüşüyordu; il/ilçe hem sığıyor
  // hem de tanımaya yetiyor. İl seçilmemiş eski kayıtlarda açık adrese düşer.
  const region = formatRegion(booking) ?? booking.customer_address?.trim() ?? null;
  const startStr = range?.from ? format(range.from, "yyyy-MM-dd") : booking.start_date;
  const endStr = range?.to ? format(range.to, "yyyy-MM-dd") : startStr;

  // Only days where every other booking has taken the last unit are closed;
  // past days stay open because an active booking already starts in the past.
  const days = daysByState(otherAvailability, stock);
  const unavailable = unavailableDays(otherAvailability, stock);

  const mode: DeliveryMode = modeOverride ?? deliveryModeForCity(city);
  const rental = { start_date: startStr, end_date: endStr };
  const blocked =
    blockedOverride ?? computeOccupancySpan(startStr, endStr, mode, turnaround);
  const blockedError = occupancySpanError(blocked, startStr, endStr);
  const shipsLate = blocked.start_date <= todayString();

  function selectRange(next: DateRange | undefined) {
    setRange(next);
    setBlockedOverride(null);
  }

  function selectMode(next: DeliveryMode) {
    setModeOverride(next);
    setBlockedOverride(null);
  }

  const unitsLeft = Math.min(
    ...datesInRange(startStr, endStr).map((day) =>
      unitsLeftOn(otherAvailability.occupied, stock, day)
    )
  );
  // Çok adetli bir kalem taşınıyorsa yeni tarihlerde bir ünite boş olması
  // yetmez, adedin tamamı sığmalı. Sunucu zaten reddediyor; burada kaydetmeden
  // önce söylenmesi için. Kiralama günleri bloke aralığının içinde kaldığı için
  // bu sayı sunucununkinden gevşek — yanlışlıkla kaydı engellemez.
  const unitsShort = range?.to != null && unitsLeft < units;

  // Sonradan eklenen ürünler bu rezervasyonun meşguliyet aralığını devralıyor,
  // müsaitlikleri de ona göre ölçülüyor.
  const bookedSpan = occupancySpan(booking, turnaround);
  const extraProblem = extra.length > 0 ? basketError(catalog, extra, bookedSpan) : null;
  // Toplu alımın kaç kalemi olduğu: tek satırlık rezervasyonda rozet çıkmasın.
  const groupUnits = (groupMembers ?? []).reduce(
    (sum, member) => sum + member.quantity,
    0
  );

  function openEditor() {
    // Always reopen on the booking's own dates, month and delivery choice,
    // even if a previous edit was abandoned halfway through.
    setRange({ from: toDate(booking.start_date), to: toDate(booking.end_date) });
    setMonth(toDate(booking.start_date));
    setCity(booking.customer_city ?? "");
    setModeOverride(booking.delivery_mode);
    setBlockedOverride(storedOverride());
    setEditing(true);
  }

  if (editing) {
    return (
      <div className="card">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="start_date" value={startStr} />
          <input type="hidden" name="end_date" value={endStr} />

          <div>
            <label className="field-label">Kiralama tarihleri</label>
            <div className="rdp-theme inline-block rounded-lg border border-border bg-surface p-3">
              <DayPicker
                mode="range"
                locale={tr}
                month={month}
                onMonthChange={setMonth}
                selected={range}
                onSelect={selectRange}
                // Without this, clicking a day while a complete range is
                // selected only trims that range — so the dates look stuck.
                // With it, the click starts a fresh range from that day.
                resetOnSelect
                excludeDisabled
                disabled={unavailable}
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
            <p className="count-up mt-2 text-sm font-medium text-ink">
              {formatDateRange(startStr, endStr)}
              <span className={`ml-2 font-normal ${unitsShort ? "text-danger" : "text-ink-muted"}`}>
                {range?.to
                  ? `bu tarihlerde ${unitsLeft} / ${stock} adet müsait${
                      units > 1 ? ` — ${units} adet gerekiyor` : ""
                    }`
                  : "bitiş tarihini seçin"}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <input
              name="customer_name"
              defaultValue={booking.customer_name}
              required
              placeholder="Müşteri adı"
              className="input flex-1"
            />
            <input
              name="customer_phone"
              defaultValue={booking.customer_phone ?? ""}
              placeholder="Telefon"
              className="input flex-1"
            />
          </div>

          <AddressFields
            defaultCity={booking.customer_city}
            defaultDistrict={booking.customer_district}
            defaultAddress={booking.customer_address}
            showLabels={false}
            onCityChange={setCity}
          />

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
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending || blockedError !== null || unitsShort}
              className="btn btn-primary min-h-0 py-2 text-xs"
            >
              {pending ? "Kaydediliyor…" : "Değişiklikleri kaydet"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="btn btn-secondary min-h-0 py-2 text-xs"
            >
              Vazgeç
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="fade-slide-up card" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-ink">{booking.customer_name}</p>
          <span className={`pill ${bookingStatusPill[status]}`}>{bookingStatusLabel[status]}</span>
          {/* Adet burada ayrıca yazmıyor: çok adetli her kalemin bir grubu var,
              dolayısıyla aşağıdaki "toplu · N adet" satırı zaten çıkıyor ve
              hangi üründen kaç adet alındığını da söylüyor. */}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
          <span className="count-up flex items-center gap-1.5">
            <IconCalendar className="h-3.5 w-3.5" />
            {formatDateRange(booking.start_date, booking.end_date)}
          </span>
          {booking.customer_phone && (
            <span className="flex items-center gap-1.5">
              <IconPhone className="h-3.5 w-3.5" />
              {booking.customer_phone}
            </span>
          )}
          {region && (
            <span className="flex min-w-0 items-center gap-1.5" title={formatAddress(booking) ?? undefined}>
              <IconMapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{region}</span>
            </span>
          )}
          {/* Kiralama tarihleri ürünün ne kadar süre meşgul olduğunu
              anlatmıyor; takvimdeki kapalı günlerin karşılığı bu aralık. */}
          {booking.delivery_mode && booking.blocked_start && booking.blocked_end && (
            <span
              className="flex items-center gap-1.5"
              title={`Ürün ${formatDateRange(
                booking.blocked_start,
                booking.blocked_end
              )} arasında elinizde değil.`}
            >
              <IconTruck className="h-3.5 w-3.5 shrink-0" />
              {DELIVERY_MODE_LABEL[booking.delivery_mode]} ·{" "}
              {formatDateRange(booking.blocked_start, booking.blocked_end)} bloke
            </span>
          )}
        </div>

        {/* Toplu alım: müşterinin aynı anda kiraladığı öbür ürünler başka
            ürünlerin sayfalarında duruyor, o yüzden siparişin tamamı burada
            özetleniyor. */}
        {groupUnits > 1 && (
          <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-ink-muted">
            <IconPackage className="h-3.5 w-3.5 shrink-0" />
            <span className="pill pill-muted">toplu · {groupUnits} adet</span>
            <span className="min-w-0">
              {groupMembers!
                .map((member) =>
                  member.quantity > 1
                    ? `${member.name} ×${member.quantity}`
                    : member.name
                )
                .join(", ")}
            </span>
          </p>
        )}
      </div>

      {/* Silme, düzenlemenin aksine bitmiş ve iptal edilmiş kayıtlarda da açık:
          listeden temizlemek istenen kayıtlar zaten çoğunlukla onlar. */}
      <div className="flex shrink-0 flex-wrap gap-2 self-start sm:self-center">
        {canModify && (
          <>
            <button type="button" onClick={openEditor} className="btn btn-secondary min-h-0 px-3 py-1.5 text-xs">
              <IconPencil className="h-3.5 w-3.5" />
              Düzenle
            </button>
            <button
              type="button"
              onClick={() => setAdding((open) => !open)}
              className="btn btn-secondary min-h-0 px-3 py-1.5 text-xs"
            >
              <IconPlus className="h-3.5 w-3.5" />
              Ürün ekle
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="btn btn-danger-ghost min-h-0 px-3 py-1.5 text-xs"
        >
          <IconTrash className="h-3.5 w-3.5" />
          Sil
        </button>

        <ConfirmDialog
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          // Sunucudan dönen hata burada atılıyor: doğrudan sunucuda atılan
          // hatanın mesajını React production'da maskeliyor, satıcı da
          // sebebi göremiyordu.
          onConfirm={async () => {
            const { error } = await deleteBooking(productId, unitIds);
            if (error) throw new Error(error);
          }}
          title="Rezervasyonu sil"
          message={
            <>
              <strong className="font-semibold text-ink">{booking.customer_name}</strong> adına{" "}
              {formatDateRange(booking.start_date, booking.end_date)} tarihleri için oluşturulan
              {units > 1 ? ` ${units} adetlik rezervasyonun tamamı` : " rezervasyon"} kalıcı olarak
              silinecek ve bu günler yeniden müsait olacak. Bu işlem geri alınamaz.
            </>
          }
          confirmLabel="Evet, sil"
          pendingLabel="Siliniyor…"
          cancelLabel="Vazgeç"
          tone="danger"
        />
      </div>
      </div>

      {/* Aynı müşteri, aynı tarihler: eklenen ürün mevcut kaydın bilgilerini
          devralıyor, satıcı yalnızca ürünü seçiyor. */}
      {adding && canModify && (
        <form action={addFormAction} className="mt-4 border-t border-border pt-4">
          <input
            type="hidden"
            name="items"
            value={JSON.stringify(itemsPayload(extra))}
          />

          <p className="mb-2 text-xs text-ink-muted">
            Eklenen ürünler {booking.customer_name} adına{" "}
            {formatDateRange(booking.start_date, booking.end_date)} tarihleri için
            rezerve edilir ve o günleri takvimde kapatır.
          </p>

          <ProductPicker
            products={catalog}
            items={extra}
            onChange={setExtra}
            span={bookedSpan}
            emptyHint="Bu rezervasyona eklenecek ürünleri seçin ya da QR okutun."
          />

          {addState.error && (
            <p className="mt-2 text-sm text-danger">{addState.error}</p>
          )}
          {!addState.error && extraProblem && (
            <p className="mt-2 text-sm text-danger">{extraProblem}</p>
          )}

          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={addPending || extra.length === 0 || extraProblem !== null}
              className="btn btn-primary min-h-0 py-2 text-xs"
            >
              {addPending ? "Ekleniyor…" : "Rezervasyona ekle"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setExtra([]);
              }}
              className="btn btn-secondary min-h-0 py-2 text-xs"
            >
              Vazgeç
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
