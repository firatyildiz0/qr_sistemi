import { displayStatus, nightsBetween } from "@/lib/bookings";
import type { Booking, BookingStatus } from "@/lib/types";

/**
 * Customers are derived, not stored.
 *
 * There is no customers table: someone who scans a QR code books without an
 * account, leaving only a name and an optional phone number on the booking. So
 * "a customer" is every booking that shares an identity, grouped here.
 */

export type CustomerBooking = {
  id: string;
  productId: string;
  productName: string;
  dailyPrice: number | null;
  startDate: string;
  endDate: string;
  status: BookingStatus;
  createdAt: string;
  days: number;
  total: number | null;
};

export type Customer = {
  key: string;
  name: string;
  phone: string | null;
  bookings: CustomerBooking[];
  /** Excludes cancelled bookings — those neither earn money nor occupy days. */
  totalDays: number;
  /** Null when no rented product had a price, so "0 ₺" never stands in for "unknown". */
  totalSpend: number | null;
  /** True when some booking's product had no price, so the total is a floor. */
  spendIsPartial: boolean;
  counts: Record<BookingStatus, number>;
  activeCount: number;
  firstDate: string;
  lastDate: string;
};

/** Digits only, and the national trunk zero / +90 country code dropped. */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function normalizeName(name: string) {
  return (
    name
      .trim()
      // Slashes would split the key across path segments once it is in a URL.
      .replace(/[\\/]+/g, " ")
      .replace(/\s+/g, " ")
      // Turkish locale matters: "İ" lowercases to "i" only with the tr rules.
      .toLocaleLowerCase("tr-TR")
  );
}

/**
 * Identity for grouping, and the URL segment of the detail page.
 *
 * The phone number is the stable identifier — the same person may write their
 * name differently each time ("ahmet yılmaz" / "Ahmet Yilmaz"). Only bookings
 * with no phone at all fall back to the name, which is why two different people
 * who share a name and left no phone will merge; without an account there is
 * nothing else to tell them apart.
 *
 * Deliberately *not* percent-encoded: callers encode it when building an href
 * and Next decodes it back out of the route param, so an encoded key here
 * would arrive double-decoded and never match.
 */
export function customerKey(booking: {
  customer_name: string;
  customer_phone: string | null;
}): string {
  const phone = normalizePhone(booking.customer_phone);
  return phone ? `p-${phone}` : `n-${normalizeName(booking.customer_name)}`;
}

type BookingWithProduct = Booking & {
  products: { name: string; daily_price: number | null } | null;
};

/**
 * Groups the owner's bookings into customers, most recently active first.
 * `today` is injected so the derived statuses match whatever the caller renders.
 */
export function groupCustomers(
  rows: BookingWithProduct[],
  today = new Date(),
): Customer[] {
  const byKey = new Map<string, Customer>();

  for (const row of rows) {
    const key = customerKey(row);
    const status = displayStatus(row, today);
    const days = nightsBetween(row.start_date, row.end_date) + 1;
    const price = row.products?.daily_price ?? null;

    const booking: CustomerBooking = {
      id: row.id,
      productId: row.product_id,
      productName: row.products?.name ?? "Silinmiş ürün",
      dailyPrice: price,
      startDate: row.start_date,
      endDate: row.end_date,
      status,
      createdAt: row.created_at,
      days,
      total: price != null ? price * days : null,
    };

    let customer = byKey.get(key);
    if (!customer) {
      customer = {
        key,
        name: row.customer_name.trim(),
        phone: row.customer_phone,
        bookings: [],
        totalDays: 0,
        totalSpend: null,
        spendIsPartial: false,
        counts: { upcoming: 0, active: 0, completed: 0, cancelled: 0 },
        activeCount: 0,
        firstDate: row.start_date,
        lastDate: row.end_date,
      };
      byKey.set(key, customer);
    }

    customer.bookings.push(booking);
    customer.counts[status] += 1;

    if (status !== "cancelled") {
      customer.totalDays += days;
      if (booking.total != null) {
        customer.totalSpend = (customer.totalSpend ?? 0) + booking.total;
      } else {
        customer.spendIsPartial = true;
      }
    }

    if (row.start_date < customer.firstDate) customer.firstDate = row.start_date;
    if (row.end_date > customer.lastDate) customer.lastDate = row.end_date;
  }

  for (const customer of byKey.values()) {
    // Newest first, and the most recent spelling of the name wins as the label.
    customer.bookings.sort((a, b) => b.startDate.localeCompare(a.startDate));
    customer.activeCount = customer.counts.active + customer.counts.upcoming;

    const latest = customer.bookings.reduce((newest, b) =>
      b.createdAt > newest.createdAt ? b : newest,
    );
    const source = rows.find((r) => r.id === latest.id);
    if (source) {
      customer.name = source.customer_name.trim();
      customer.phone = source.customer_phone;
    }
  }

  return [...byKey.values()].sort((a, b) => b.lastDate.localeCompare(a.lastDate));
}

/** Case- and format-insensitive match over name and phone. */
export function matchesQuery(customer: Customer, query: string) {
  const q = query.trim();
  if (!q) return true;

  if (normalizeName(customer.name).includes(normalizeName(q))) return true;

  const digits = q.replace(/\D/g, "");
  if (digits) {
    const phone = normalizePhone(customer.phone);
    // The stored number has its trunk zero and country code stripped, so a
    // query typed as "0532 274" has to be stripped the same way to match.
    const candidates = new Set([digits]);
    const withoutZero = digits.replace(/^0+/, "");
    if (withoutZero) candidates.add(withoutZero);
    if (digits.length > 10 && digits.startsWith("90")) candidates.add(digits.slice(2));

    if (phone && [...candidates].some((c) => c && phone.includes(c))) return true;
  }

  return customer.bookings.some((b) =>
    normalizeName(b.productName).includes(normalizeName(q)),
  );
}
