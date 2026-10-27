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
import PhoneActions from "@/components/admin/PhoneActions";
import ConfirmDialog from "@/components/ConfirmDialog";
import PriceField from "@/components/PriceField";
import { formatPrice } from "@/lib/format";
import {
  IconCalendar,
  IconMapPin,
  IconPackage,
  IconPencil,
  IconPlus,
  IconShield,
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
  // Sipariş birden çok ürün mü içeriyor. İki anlatım aynı anda çıkmasın diye
  // ayırt ediliyor: tek üründen çok adet alınmışsa adet başlıktaki rozette,
  // farklı ürünler varsa siparişin tamamı aşağıdaki özet satırında anlatılıyor.
  const mixedOrder = (groupMembers ?? []).length > 1;

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
      <div className="card p-4 sm:p-6">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="start_date" value={startStr} />
          <input type="hidden" name="end_date" value={endStr} />

          {/* Telefonda düzenleme kartı ekranı baştan sona kaplıyor; hangi
              rezervasyonun açık olduğu başlık olmadan görünmüyordu. */}
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <IconPencil className="h-4 w-4 shrink-0 text-ink-muted" />
            <p className="min-w-0 truncate text-sm font-semibold text-ink">
              {booking.customer_name}
              {units > 1 && (
                <span className="font-normal text-ink-muted"> · {units} adet</span>
              )}
            </p>
          </div>

          <div>
            <label className="field-label">Kiralama tarihleri</label>
            <div className="rdp-theme rounded-lg border border-border bg-surface p-2 sm:p-3">
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
              <span
                className={`block font-normal sm:ml-2 sm:inline ${
                  unitsShort ? "text-danger" : "text-ink-muted"
                }`}
              >
                {range?.to
                  ? `bu tarihlerde ${unitsLeft} / ${stock} adet müsait${
                      units > 1 ? ` — ${units} adet gerekiyor` : ""
                    }`
                  : "bitiş tarihini seçin"}
              </span>
            </p>
          </div>

          {/* `flex-1` iki alanı 320px'lik ekranda bile aynı satıra sıkıştırıp
              ikisini de okunmaz hale getiriyordu; telefonda alt alta. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={`${booking.id}-name`} className="field-label">
                Müşteri adı
              </label>
              <input
                id={`${booking.id}-name`}
                name="customer_name"
                defaultValue={booking.customer_name}
                autoComplete="name"
                required
                placeholder="Müşteri adı"
                className="input"
              />
            </div>
            <div>
              <label htmlFor={`${booking.id}-phone`} className="field-label">
                Telefon
              </label>
              <input
                id={`${booking.id}-phone`}
                name="customer_phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                defaultValue={booking.customer_phone ?? ""}
                placeholder="Telefon"
                className="input"
              />
            </div>
          </div>

          <AddressFields
            defaultCity={booking.customer_city}
            defaultDistrict={booking.customer_district}
            defaultAddress={booking.customer_address}
            onCityChange={setCity}
          />

          {/* Teminat siparişin tamamına ait: bu kalem toplu alımın parçasıysa
              buradaki değişiklik grubun bütün satırlarına yazılır. */}
          <PriceField
            name="deposit_price"
            label="Teminat (opsiyonel)"
            defaultValue={booking.deposit_price}
            hint={
              mixedOrder
                ? "Siparişin tamamı için geçerli — diğer ürünlere de işlenir."
                : undefined
            }
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

          {state.error && (
            <p className="text-sm text-danger" role="alert">
              {state.error}
            </p>
          )}

          {/* Düzenleme kartının altına yapışıyor: form telefonda bir ekrandan
              uzun, "kaydet" düğmesi de en dipte kalıyordu. */}
          <div className="action-bar -mx-4 flex gap-2 px-4 pt-3 sm:mx-0 sm:px-0">
            <button
              type="submit"
              disabled={pending || blockedError !== null || unitsShort}
              className="btn btn-primary flex-1 text-xs sm:min-h-0 sm:flex-none sm:py-2"
            >
              {pending ? "Kaydediliyor…" : "Değişiklikleri kaydet"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="btn btn-secondary flex-1 text-xs sm:min-h-0 sm:flex-none sm:py-2"
            >
              Vazgeç
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    // Telefonda tek sütun, masaüstünde "bilgi solda / düğmeler sağda" ızgarası.
    // Sıralama ikisinde farklı: telefonda siparişin içeriği düğmelerin üstünde
    // kalmalı (`order`), masaüstünde ise düğmelerin altındaki tam genişlikte
    // satırda — üç kalem sol sütuna sıkışınca üç ayrı satıra dağılıyordu.
    <div
      className="fade-slide-up card flex flex-col gap-3 p-4 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-x-4 sm:gap-y-0 sm:p-6"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="order-1 min-w-0 sm:col-start-1 sm:row-start-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-ink">{booking.customer_name}</p>
          <span className={`pill ${bookingStatusPill[status]}`}>{bookingStatusLabel[status]}</span>
          {/* Tek üründen çok adet: siparişte anlatacak başka bir şey yok,
              adet burada duruyor. Farklı ürünler varsa aşağıdaki özet
              satırı devralıyor. */}
          {units > 1 && !mixedOrder && (
            <span className="pill pill-muted">{units} adet</span>
          )}
        </div>
        {/* Telefonda her bilgi kendi satırında. Tek bir sarma satırına
            dizilince tarih, telefon, adres ve bloke aralığı iç içe geçmiş bir
            metin yığınına dönüşüyor, hangisinin nerede bittiği anlaşılmıyordu. */}
        <div className="mt-2 grid gap-1.5 text-sm text-ink-muted sm:mt-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
          <span className="count-up flex items-center gap-1.5">
            <IconCalendar className="h-3.5 w-3.5 shrink-0" />
            {formatDateRange(booking.start_date, booking.end_date)}
          </span>
          {booking.customer_phone && (
            <PhoneActions
              phone={booking.customer_phone}
              name={booking.customer_name}
            />
          )}
          {region && (
            <span className="flex min-w-0 items-center gap-1.5" title={formatAddress(booking) ?? undefined}>
              <IconMapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{region}</span>
            </span>
          )}
          {/* Teminat siparişin tamamı için tek tutar — grubun her satırında
              aynısı duruyor, o yüzden kartta olduğu gibi gösteriliyor. */}
          {booking.deposit_price != null && (
            <span
              className="flex items-center gap-1.5"
              title="Bu sipariş için alınan teminat."
            >
              <IconShield className="h-3.5 w-3.5 shrink-0" />
              {formatPrice(booking.deposit_price)} teminat
            </span>
          )}
          {/* Kiralama tarihleri ürünün ne kadar süre meşgul olduğunu
              anlatmıyor; takvimdeki kapalı günlerin karşılığı bu aralık. */}
          {booking.delivery_mode && booking.blocked_start && booking.blocked_end && (
            <span
              className="flex min-w-0 items-center gap-1.5"
              title={`Ürün ${formatDateRange(
                booking.blocked_start,
                booking.blocked_end
              )} arasında elinizde değil.`}
            >
              <IconTruck className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {DELIVERY_MODE_LABEL[booking.delivery_mode]} ·{" "}
                {formatDateRange(booking.blocked_start, booking.blocked_end)} bloke
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Silme, düzenlemenin aksine bitmiş ve iptal edilmiş kayıtlarda da açık:
          listeden temizlemek istenen kayıtlar zaten çoğunlukla onlar.

          Telefonda düğmeler kartın en altında, çizgiyle ayrılmış tam genişlikte
          bir şerit halinde duruyor: 28px yüksekliğindeki üç küçük düğme yan
          yana hem zor basılıyor hem de kartın metnine karışıyordu. */}
      <div className="order-4 flex shrink-0 gap-2 border-t border-border pt-3 sm:col-start-2 sm:row-start-1 sm:flex-wrap sm:border-0 sm:pt-0">
        {canModify && (
          <>
            <button
              type="button"
              onClick={openEditor}
              className="btn btn-secondary flex-1 px-3 text-xs sm:min-h-0 sm:flex-none sm:py-1.5"
            >
              <IconPencil className="h-3.5 w-3.5" />
              Düzenle
            </button>
            <button
              type="button"
              onClick={() => setAdding((open) => !open)}
              aria-expanded={adding}
              className="btn btn-secondary flex-1 px-3 text-xs sm:min-h-0 sm:flex-none sm:py-1.5"
            >
              <IconPlus className="h-3.5 w-3.5" />
              Ürün ekle
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="btn btn-danger-ghost flex-1 px-3 text-xs sm:min-h-0 sm:flex-none sm:py-1.5"
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

      {/* Toplu alım: müşterinin aynı anda kiraladığı öbür ürünler başka
          ürünlerin sayfalarında duruyor, o yüzden siparişin tamamı burada
          özetleniyor.

          Satır düğmelerin yanında değil, kartın tam genişliğinde duruyor:
          sol sütuna sıkışınca üç kalem üç satıra dağılıyordu, oysa kartın
          bütününde çoğu sipariş tek satıra sığıyor. */}
      {mixedOrder && (
        <p className="order-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-ink-muted sm:col-span-2 sm:row-start-2 sm:mt-3">
          <IconPackage className="h-3.5 w-3.5 shrink-0" />
          <span className="pill pill-muted">toplu · {groupUnits} adet</span>
          {/* Adet her ürünün başında ve hep aynı biçimde: tek adetlik ürünü
              çıplak isim olarak bırakmak listeyi düzensiz gösteriyordu.
              Her kalem ayrı bir esnek öğe ve kendi içinde bölünmüyor —
              satır sonu kalemin ortasından değil, kalemler arasından geçiyor.
              Ayraç kalemin sonunda duruyor ki alt satır adetle başlasın. */}
          {groupMembers!.map((member, index) => (
            <span key={member.productId} className="max-w-full truncate">
              <span className="font-semibold tabular-nums text-ink">
                {member.quantity} ×
              </span>{" "}
              {member.name}
              {index < groupMembers!.length - 1 && " ·"}
            </span>
          ))}
        </p>
      )}

      {/* Aynı müşteri, aynı tarihler: eklenen ürün mevcut kaydın bilgilerini
          devralıyor, satıcı yalnızca ürünü seçiyor. */}
      {adding && canModify && (
        <form
          action={addFormAction}
          className="order-5 border-t border-border pt-4 sm:col-span-2 sm:row-start-3 sm:mt-4"
        >
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
              className="btn btn-primary flex-1 text-xs sm:min-h-0 sm:flex-none sm:py-2"
            >
              {addPending ? "Ekleniyor…" : "Rezervasyona ekle"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setExtra([]);
              }}
              className="btn btn-secondary flex-1 text-xs sm:min-h-0 sm:flex-none sm:py-2"
            >
              Vazgeç
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
