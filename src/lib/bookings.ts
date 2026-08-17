import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { Booking, BookingStatus } from "@/lib/types";
import {
  deliveryModeForCity,
  tailDays,
  MAX_TURNAROUND_DAYS,
  type DeliveryMode,
  type Turnaround,
} from "@/lib/turnaround";

/** Two inclusive date ranges (YYYY-MM-DD strings) overlap. */
export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
) {
  return aStart <= bEnd && aEnd >= bStart;
}

/** Shifts a YYYY-MM-DD string by whole days, staying in UTC to dodge DST. */
export function addDays(day: string, amount: number): string {
  const date = new Date(day + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

/** The inclusive span between two YYYY-MM-DD strings, day by day. */
export function datesInRange(startDate: string, endDate: string): string[] {
  const days: string[] = [];
  const cursor = new Date(startDate + "T00:00:00Z");
  const end = new Date(endDate + "T00:00:00Z");

  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

/**
 * Availability is per day, not per product: a product with stock 2 can carry
 * two overlapping bookings on the same date. This counts how many units each
 * day already has out, which is what every availability check compares
 * against `stock`.
 *
 * Cancelled bookings must be filtered out by the caller.
 */
export type DateSpan = { start_date: string; end_date: string };

export function bookedCountByDate(bookings: DateSpan[]): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const booking of bookings) {
    for (const day of datesInRange(booking.start_date, booking.end_date)) {
      counts[day] = (counts[day] ?? 0) + 1;
    }
  }

  return counts;
}

/** Units still rentable on a given day. */
export function unitsLeftOn(
  counts: Record<string, number>,
  stock: number,
  date: string
) {
  return Math.max(0, stock - (counts[date] ?? 0));
}

/**
 * Toplu rezervasyonun sınırları: kaç farklı ürün, ve tek üründen kaç adet.
 * Sepet arayüzü ve sunucu doğrulaması aynı sayıya baksın diye burada.
 */
export const MAX_BOOKING_ITEMS = 25;
export const MAX_ITEM_QUANTITY = 20;

/** Aralığın en dar gününde kalan ünite sayısı — kaç adet kiralanabileceği. */
export function unitsLeftInRange(
  counts: Record<string, number>,
  stock: number,
  startDate: string,
  endDate: string
): number {
  return Math.min(
    ...datesInRange(startDate, endDate).map((day) =>
      unitsLeftOn(counts, stock, day)
    )
  );
}

/**
 * First day of the requested range with nothing left, or null when the whole
 * range fits. Callers turn the returned day into the error message.
 *
 * `needed` aynı üründen kaç adet istendiğidir: toplu rezervasyonda üç adet
 * isteyen satıcı için, o gün iki ünite boş kalmış olması da yetmez.
 */
export function firstSoldOutDate(
  counts: Record<string, number>,
  stock: number,
  startDate: string,
  endDate: string,
  needed = 1
): string | null {
  if (stock < needed) return startDate;

  return (
    datesInRange(startDate, endDate).find(
      (day) => unitsLeftOn(counts, stock, day) < needed
    ) ?? null
  );
}

// ---------------------------------------------------------------------------
// Meşguliyet aralığı
// ---------------------------------------------------------------------------
// Ürün kiralama günlerinden daha uzun süre elde değildir: kına gününden önce
// yola çıkar, düğünden sonra geri gelip temizlenir. Müsaitliği belirleyen de
// budur, kiralama aralığı değil. Aşağıdaki fonksiyonlar bir rezervasyonu bu
// geniş aralığa çevirir; hesap `rental_settings`ten gelen sürelere dayanır.

/** Meşguliyet hesabı için bir rezervasyondan gereken en az bilgi. */
export type BookingOccupancy = {
  start_date: string;
  end_date: string;
  delivery_mode?: DeliveryMode | null;
  blocked_start?: string | null;
  blocked_end?: string | null;
  customer_city?: string | null;
};

/** Verilen kiralama aralığının ürünü gerçekte kapattığı gün aralığı. */
export function computeOccupancySpan(
  startDate: string,
  endDate: string,
  mode: DeliveryMode,
  turnaround: Turnaround
): DateSpan {
  const settings = turnaround[mode];

  return {
    start_date: addDays(startDate, -settings.outbound),
    end_date: addDays(endDate, tailDays(settings)),
  };
}

/** İki aralık aynı günleri mi kapatıyor. */
export function sameSpan(a: DateSpan, b: DateSpan): boolean {
  return a.start_date === b.start_date && a.end_date === b.end_date;
}

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Satıcı meşguliyet aralığını elle de girebilir: kargo firması yavaşladığında,
 * ürün müşteriye elden ulaştırıldığında ya da temizlik bir gün uzadığında
 * hesaplanan aralık tutmuyor. Elle girilen aralık kaydedilmeden önce buradan
 * geçer — hem formda hem sunucu action'ında, ikisi aynı cümleyi göstersin diye.
 *
 * Aralık kiralama günlerini *içermek* zorunda: ürün müşterideyken elde
 * olamayacağı için daha dar bir aralık takvimi yalan söylerdi (veritabanındaki
 * `bookings_blocked_range` kısıtı da aynı şeyi söylüyor).
 *
 * Dönen değer kullanıcıya gösterilecek hata, ya da aralık geçerliyse null.
 */
export function occupancySpanError(
  span: DateSpan,
  startDate: string,
  endDate: string
): string | null {
  if (!DAY_PATTERN.test(span.start_date) || !DAY_PATTERN.test(span.end_date)) {
    return "Bloke tarihleri geçersiz.";
  }
  if (span.start_date > startDate) {
    return "Ürünün elinizden çıktığı tarih kiralama başlangıcından sonra olamaz.";
  }
  if (span.end_date < endDate) {
    return "Ürünün tekrar hazır olduğu tarih kiralama bitişinden önce olamaz.";
  }
  if (nightsBetween(span.start_date, startDate) > MAX_TURNAROUND_DAYS) {
    return `Ürün kiralamadan en fazla ${MAX_TURNAROUND_DAYS} gün önce elinizden çıkabilir.`;
  }
  if (nightsBetween(endDate, span.end_date) > MAX_TURNAROUND_DAYS) {
    return `Ürün kiralama bittikten en fazla ${MAX_TURNAROUND_DAYS} gün sonra hazır olabilir.`;
  }
  return null;
}

/**
 * Kayıtlı rezervasyonun meşguliyet aralığı. Aralık kayıt anında hesaplanıp
 * `blocked_start`/`blocked_end` kolonlarına yazılır; bu kolonlardan önce
 * oluşmuş rezervasyonlar için güncel ayarlardan yeniden hesaplanır.
 */
export function occupancySpan(
  booking: BookingOccupancy,
  turnaround: Turnaround
): DateSpan {
  if (booking.blocked_start && booking.blocked_end) {
    return { start_date: booking.blocked_start, end_date: booking.blocked_end };
  }

  return computeOccupancySpan(
    booking.start_date,
    booking.end_date,
    booking.delivery_mode ?? deliveryModeForCity(booking.customer_city),
    turnaround
  );
}

/**
 * Takvimlerin ihtiyaç duyduğu iki ayrı sayım. `occupied` müsaitliği belirler;
 * `rented` yalnızca bir günün neden kapalı olduğunu ayırt etmeye yarar —
 * müşteride mi, yoksa kargoda/temizlikte mi.
 */
export type Availability = {
  /** Gün başına, o gün fiilen kiralanmış ünite sayısı. */
  rented: Record<string, number>;
  /** Gün başına, o gün elde olmayan ünite sayısı (kargo ve hazırlık dahil). */
  occupied: Record<string, number>;
};

export function availabilityOf(
  bookings: BookingOccupancy[],
  turnaround: Turnaround
): Availability {
  return {
    rented: bookedCountByDate(bookings),
    occupied: bookedCountByDate(
      bookings.map((booking) => occupancySpan(booking, turnaround))
    ),
  };
}

export const EMPTY_AVAILABILITY: Availability = { rented: {}, occupied: {} };

const parseDay = (day: string) => new Date(day + "T00:00:00");

/**
 * Bir günün dört durumundan biri. `full` ve `blocked` seçilemez; ikisinin
 * ayrı olmasının sebebi, satıcının "burada rezervasyon yok, neden kapalı?"
 * sorusuna takvimin kendisinin cevap verebilmesi.
 */
export type DayState = "full" | "blocked" | "partly" | "partly-blocked" | "free";

export function dayState(
  availability: Availability,
  stock: number,
  date: string
): DayState {
  const occupied = availability.occupied[date] ?? 0;
  if (occupied === 0) return "free";

  // "blocked", günün *tamamen* kargo/temizlik yüzünden kapalı olduğu anlamına
  // gelir. O gün tek bir ünite bile kiradaysa gün "dolu"dur — stok 2'de biri
  // müşteride biri yoldayken günü "kargoda" diye etiketlemek yanıltıcı olurdu.
  const rented = availability.rented[date] ?? 0;

  if (occupied >= stock) return rented > 0 ? "full" : "blocked";
  return rented > 0 ? "partly" : "partly-blocked";
}

/** Takvim modifier'ları: her durum için o duruma düşen günler. */
export function daysByState(
  availability: Availability,
  stock: number
): Record<Exclude<DayState, "free">, Date[]> {
  const days: Record<Exclude<DayState, "free">, Date[]> = {
    full: [],
    blocked: [],
    partly: [],
    "partly-blocked": [],
  };

  if (stock <= 0) return days;

  for (const date of Object.keys(availability.occupied)) {
    const state = dayState(availability, stock, date);
    if (state !== "free") days[state].push(parseDay(date));
  }

  return days;
}

/** Seçilemeyen günler: son ünite de dışarıda, sebebi ne olursa olsun. */
export function unavailableDays(
  availability: Availability,
  stock: number
): Date[] {
  const days = daysByState(availability, stock);
  return [...days.full, ...days.blocked];
}

// ---------------------------------------------------------------------------
// Adetlerin tek satırda toplanması
// ---------------------------------------------------------------------------
// Aynı üründen dört adet alan müşteri veritabanında dört satır bırakıyor: stok
// da müsaitlik de ünite başına sayıldığı için satırlar öyle duruyor. Ama satıcı
// için bu dört ayrı rezervasyon değil, tek siparişin bir kalemi — listede dört
// özdeş kart göstermek dört ayrı müşteri varmış izlenimi veriyordu.

/** Listede tek kart: temsilci kayıt ve onun kapsadığı bütün satırlar. */
export type BookingUnits = { booking: Booking; ids: string[] };

/**
 * Aynı gruba, aynı ürüne ve aynı tarihlere ait satırları tek kalemde toplar.
 *
 * Anahtara tarihler de giriyor: grubun bir satırı sonradan ayrı tarihlere
 * çekilmişse (tek satır düzenlenebiliyor) o artık ayrı bir kalemdir, birlikte
 * gösterilmesi yalan olurdu. Grubu olmayan kayıtlar hep tek başına durur.
 */
export function groupBookingUnits(bookings: Booking[]): BookingUnits[] {
  const rows: BookingUnits[] = [];
  const byKey = new Map<string, BookingUnits>();

  for (const booking of bookings) {
    if (!booking.group_id) {
      rows.push({ booking, ids: [booking.id] });
      continue;
    }

    const key = [
      booking.group_id,
      booking.product_id,
      booking.start_date,
      booking.end_date,
      booking.blocked_start,
      booking.blocked_end,
      booking.delivery_mode,
      booking.status,
    ].join("|");

    const existing = byKey.get(key);

    if (existing) {
      existing.ids.push(booking.id);
    } else {
      const row = { booking, ids: [booking.id] };
      byKey.set(key, row);
      rows.push(row);
    }
  }

  return rows;
}

/**
 * The stored `status` column only tracks explicit cancellation; upcoming
 * vs. active vs. completed is derived from today's date so it never drifts
 * out of sync between visits.
 */
export function displayStatus(booking: Booking, today = new Date()): BookingStatus {
  if (booking.status === "cancelled") return "cancelled";

  const todayStr = today.toISOString().slice(0, 10);
  if (todayStr < booking.start_date) return "upcoming";
  if (todayStr > booking.end_date) return "completed";
  return "active";
}

/** Wording and pill styling for a derived status, shared by every screen. */
export const bookingStatusLabel: Record<BookingStatus, string> = {
  upcoming: "yaklaşan",
  active: "aktif",
  completed: "teslim edildi",
  cancelled: "iptal edildi",
};

/**
 * Durumun rengini taşıyan sınıf. Renkler vurgu renginden bağımsız (bkz.
 * globals.css): "yaklaşan" her satıcıda turuncu, "iptal edildi" her satıcıda
 * kırmızı — satıcı listeyi okumadan tarıyor ve durum bir tercih değil, bir
 * işaret. Damga da rozet de aynı sınıfı giyiyor.
 */
export const bookingStatusTone: Record<BookingStatus, string> = {
  upcoming: "tone-upcoming",
  active: "tone-active",
  completed: "tone-completed",
  cancelled: "tone-cancelled",
};

/**
 * Satır içi rozet. Listelerde durum artık sağdaki damgada (bkz.
 * `BookingStatusStamp`); rozet, damgaya yer olmayan yerlerde kalıyor —
 * ürün sayfasındaki kiralama kartı ve rezervasyon detayının başlığı.
 */
export const bookingStatusPill: Record<BookingStatus, string> = {
  upcoming: "pill-status tone-upcoming",
  active: "pill-status tone-active",
  completed: "pill-status tone-completed",
  cancelled: "pill-status tone-cancelled",
};

export function nightsBetween(startDate: string, endDate: string) {
  const start = new Date(startDate + "T00:00:00Z");
  const end = new Date(endDate + "T00:00:00Z");
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

/** Formats two YYYY-MM-DD strings as a compact, readable range, e.g. "25 – 28 Tem 2026". */
export function formatDateRange(startDate: string, endDate: string) {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

  if (startDate === endDate) return format(start, "d MMM yyyy", { locale: tr });

  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  if (sameMonth) return `${format(start, "d", { locale: tr })} – ${format(end, "d MMM yyyy", { locale: tr })}`;
  if (sameYear) return `${format(start, "d MMM", { locale: tr })} – ${format(end, "d MMM yyyy", { locale: tr })}`;
  return `${format(start, "d MMM yyyy", { locale: tr })} – ${format(end, "d MMM yyyy", { locale: tr })}`;
}
