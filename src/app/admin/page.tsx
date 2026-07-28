import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { displayStatus } from "@/lib/bookings";
import type { Booking } from "@/lib/types";
import QrScanner from "@/components/scan/QrScanner";
import BookingHistory, { type BookingHistoryRow } from "@/components/admin/BookingHistory";

export const metadata: Metadata = {
  title: "Ana sayfa · RentQR",
};

type BookingWithProduct = Booking & {
  products: { id: string; name: string; owner_id: string } | null;
};

export default async function AdminHomePage() {
  const [user, supabase] = await Promise.all([getCurrentUser(), createClient()]);

  // Joining through products both scopes the rows to this owner and carries the
  // product name, so the list needs a single round trip.
  const { data, error } = await supabase
    .from("bookings")
    .select("*, products!inner(id, name, owner_id)")
    .eq("products.owner_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  const bookings: BookingHistoryRow[] = ((data ?? []) as BookingWithProduct[]).map((b) => ({
    id: b.id,
    productId: b.product_id,
    productName: b.products?.name ?? "Silinmiş ürün",
    customerName: b.customer_name,
    customerPhone: b.customer_phone,
    startDate: b.start_date,
    endDate: b.end_date,
    status: displayStatus(b),
    createdAt: b.created_at,
  }));

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 flex h-auto items-center border-b border-border bg-paper px-4 py-4 sm:h-20 sm:px-8 sm:py-0">
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">Ana sayfa</h1>
      </header>

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-12 p-4 sm:p-8">
        <div className="mx-auto w-full max-w-md">
          <div className="card">
            <QrScanner />
          </div>
        </div>

        <section>
          <h2 className="mb-5 text-lg font-semibold text-ink">Rezervasyon geçmişi</h2>
          {error ? (
            <p className="text-sm text-danger">{error.message}</p>
          ) : (
            <BookingHistory bookings={bookings} />
          )}
        </section>
      </div>
    </div>
  );
}
