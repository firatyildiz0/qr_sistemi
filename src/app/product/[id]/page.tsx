import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Booking } from "@/lib/types";
import AvailabilityCalendar from "@/components/booking/AvailabilityCalendar";
import BookingForm from "@/components/booking/BookingForm";
import BookingList from "@/components/booking/BookingList";
import { IconQrCode, IconTag } from "@/components/icons";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    {
      data: { user },
    },
    { data: product },
    { data: bookings },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("products").select("*").eq("id", id).single(),
    supabase
      .from("bookings")
      .select("*")
      .eq("product_id", id)
      .order("start_date", { ascending: true }),
  ]);

  if (!product) notFound();

  const isOwner = user?.id === product.owner_id;

  const activeBookings = (bookings ?? []).filter(
    (b: Booking) => b.status !== "cancelled"
  );
  const bookedRanges = activeBookings.map((b) => ({
    from: new Date(b.start_date + "T00:00:00"),
    to: new Date(b.end_date + "T00:00:00"),
  }));

  return (
    <main className="min-h-screen bg-paper">
      <div className="relative flex h-48 items-center justify-center overflow-hidden border-b border-border bg-surface sm:h-56">
        <div className="diagonal-stripes absolute inset-0 opacity-40" />
        <div className="pill pill-accent absolute left-4 top-4">
          <IconQrCode className="h-3.5 w-3.5" /> QR ile tarandı
        </div>
        <IconQrCode className="h-20 w-20 text-ink-muted/30" strokeWidth={1} />
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-[28px] font-bold text-ink">{product.name}</h1>
            {product.daily_price != null && (
              <span className="pill pill-accent shrink-0 text-sm!">
                ${product.daily_price}/gün
              </span>
            )}
          </div>
          {product.description && (
            <p className="mt-3 text-ink-muted">{product.description}</p>
          )}
          {product.features && product.features.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {product.features.map((f: string) => (
                <li key={f} className="pill pill-muted">
                  <IconTag className="h-3 w-3" />
                  {f}
                </li>
              ))}
            </ul>
          )}
        </div>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-ink">
            {isOwner ? "Yeni rezervasyon" : "Müsaitlik"}
          </h2>
          {isOwner ? (
            <BookingForm productId={id} bookedRanges={bookedRanges} />
          ) : (
            <AvailabilityCalendar bookedRanges={bookedRanges} />
          )}
        </section>

        {isOwner && (
          <section className="mt-10">
            <h2 className="mb-3 text-lg font-semibold text-ink">Kiralamalar</h2>
            <BookingList bookings={bookings ?? []} productId={id} />
          </section>
        )}
      </div>
    </main>
  );
}
