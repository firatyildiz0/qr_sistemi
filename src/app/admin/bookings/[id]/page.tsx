import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import {
  bookingStatusLabel,
  bookingStatusPill,
  displayStatus,
  formatDateRange,
  nightsBetween,
} from "@/lib/bookings";
import { formatPrice } from "@/lib/format";
import type { Booking, Product } from "@/lib/types";
import BookingCalendar from "@/components/booking/BookingCalendar";
import { formatAddress } from "@/lib/turkiye";
import {
  IconCalendar,
  IconChevronRight,
  IconMapPin,
  IconPhone,
  IconTag,
} from "@/components/icons";

type BookingWithProduct = Booking & { products: Product | null };

const createdFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, user, supabase] = await Promise.all([
    params,
    getCurrentUser(),
    createClient(),
  ]);

  const { data } = await supabase
    .from("bookings")
    .select("*, products(*)")
    .eq("id", id)
    .single();

  const booking = data as BookingWithProduct | null;
  const product = booking?.products ?? null;

  if (!booking || !product || product.owner_id !== user?.id) notFound();

  const status = displayStatus(booking);
  const address = formatAddress(booking);
  const days = nightsBetween(booking.start_date, booking.end_date) + 1;
  const total = product.daily_price != null ? product.daily_price * days : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
      <div className="mb-6 flex items-center gap-1.5 text-sm text-ink-muted">
        <Link href="/admin" className="link-underline text-ink-muted hover:text-accent-hover">
          Rezervasyon geçmişi
        </Link>
        <IconChevronRight className="h-3.5 w-3.5" />
        <span className="text-ink">{booking.customer_name}</span>
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-ink sm:text-[28px]">{booking.customer_name}</h1>
        <span className={`pill ${bookingStatusPill[status]}`}>{bookingStatusLabel[status]}</span>
      </div>

      <div className="flex flex-col gap-6">
        <section className="card">
          <h2 className="mb-4 text-lg font-semibold text-ink">Müşteri bilgileri</h2>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="field-label">Ad soyad</dt>
              <dd className="text-ink">{booking.customer_name}</dd>
            </div>
            <div>
              <dt className="field-label">Telefon</dt>
              <dd className="flex items-center gap-1.5 text-ink">
                {booking.customer_phone ? (
                  <>
                    <IconPhone className="h-3.5 w-3.5 text-ink-muted" />
                    {booking.customer_phone}
                  </>
                ) : (
                  <span className="text-ink-muted">—</span>
                )}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="field-label">Adres</dt>
              <dd className="flex items-start gap-1.5 text-ink">
                {address ? (
                  <>
                    <IconMapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-muted" />
                    <span className="whitespace-pre-line">{address}</span>
                  </>
                ) : (
                  <span className="text-ink-muted">—</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="field-label">Kiralama tarihleri</dt>
              <dd className="flex items-center gap-1.5 text-ink">
                <IconCalendar className="h-3.5 w-3.5 text-ink-muted" />
                {formatDateRange(booking.start_date, booking.end_date)}
                <span className="text-ink-muted">({days} gün)</span>
              </dd>
            </div>
            <div>
              <dt className="field-label">Oluşturulma</dt>
              <dd className="text-ink">{createdFormat.format(new Date(booking.created_at))}</dd>
            </div>
          </dl>
        </section>

        <section className="card">
          <h2 className="mb-4 text-lg font-semibold text-ink">Kiralanan ürün</h2>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h3 className="text-lg font-semibold text-ink">{product.name}</h3>
            {product.daily_price != null && (
              <span className="pill pill-accent shrink-0">
                {formatPrice(product.daily_price)}/gün
              </span>
            )}
          </div>

          {product.description && (
            <p className="mt-3 text-sm text-ink-muted">{product.description}</p>
          )}

          {product.features && product.features.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {product.features.map((f) => (
                <li key={f} className="pill pill-muted">
                  <IconTag className="h-3 w-3" />
                  {f}
                </li>
              ))}
            </ul>
          )}

          {total != null && (
            <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
              <span className="text-sm text-ink-muted">
                {days} gün × {formatPrice(product.daily_price!)}
              </span>
              <span className="text-lg font-semibold text-ink">{formatPrice(total)}</span>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-ink">Takvim</h2>
          <BookingCalendar startDate={booking.start_date} endDate={booking.end_date} />
        </section>
      </div>
    </div>
  );
}
