import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Booking } from "@/lib/types";
import AvailabilityCalendar from "@/components/booking/AvailabilityCalendar";
import BookingForm from "@/components/booking/BookingForm";
import BookingList from "@/components/booking/BookingList";

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
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-neutral-900">{product.name}</h1>
        {product.daily_price != null && (
          <p className="mt-1 text-neutral-700">{product.daily_price} / day</p>
        )}
        {product.description && (
          <p className="mt-3 text-neutral-600">{product.description}</p>
        )}
        {product.features && product.features.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {product.features.map((f: string) => (
              <li
                key={f}
                className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600"
              >
                {f}
              </li>
            ))}
          </ul>
        )}
      </div>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-neutral-900">Availability</h2>
        {isOwner ? (
          <BookingForm productId={id} bookedRanges={bookedRanges} />
        ) : (
          <AvailabilityCalendar bookedRanges={bookedRanges} />
        )}
      </section>

      {isOwner && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-neutral-900">Rentals</h2>
          <BookingList bookings={bookings ?? []} productId={id} />
        </section>
      )}
    </main>
  );
}
