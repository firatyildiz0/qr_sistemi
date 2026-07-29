import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import type { Booking } from "@/lib/types";
import { displayStatus } from "@/lib/bookings";
import { IconChart, IconGrid, IconPackage } from "@/components/icons";
import BookingsTrendChart, { type TrendPoint } from "@/components/admin/BookingsTrendChart";

const TREND_DAYS = 30;

/** Local YYYY-MM-DD, matching how booking dates are stored. */
function toDayKey(date: Date) {
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

export default async function AdminDashboardPage() {
  const [user, supabase] = await Promise.all([getCurrentUser(), createClient()]);

  const ownerId = user?.id ?? "";

  // Joining through products keeps this independent of the count query, so both
  // run in one round trip.
  const [{ count: productCount, error }, { data: ownerBookings }] = await Promise.all([
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", ownerId),
    supabase
      .from("bookings")
      .select("*, products!inner(owner_id)")
      .eq("products.owner_id", ownerId)
      .neq("status", "cancelled"),
  ]);

  const bookings = (ownerBookings ?? []) as Booking[];

  const in7 = new Date();
  in7.setDate(in7.getDate() + 7);
  const in7Str = in7.toISOString().slice(0, 10);

  let activeToday = 0;
  let upcomingWeek = 0;

  for (const b of bookings) {
    const status = displayStatus(b);
    if (status === "active") activeToday += 1;
    if (status === "upcoming" && b.start_date <= in7Str) upcomingWeek += 1;
  }

  // Son 30 günün her günü için o gün süresi devam eden rezervasyon sayısı.
  const trend: TrendPoint[] = [];
  for (let offset = TREND_DAYS - 1; offset >= 0; offset -= 1) {
    const day = new Date();
    day.setDate(day.getDate() - offset);
    const key = toDayKey(day);
    let value = 0;
    for (const b of bookings) {
      if (b.start_date <= key && key <= b.end_date) value += 1;
    }
    trend.push({ date: key, value });
  }

  const stats = [
    { icon: IconPackage, value: (productCount ?? 0).toLocaleString("tr-TR"), label: "Toplam ürün" },
    { icon: IconGrid, value: activeToday.toLocaleString("tr-TR"), label: "Bugün aktif rezervasyon" },
    { icon: IconChart, value: upcomingWeek.toLocaleString("tr-TR"), label: "Bu hafta yaklaşan" },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <header className="page-header flex flex-col gap-3 border-b border-border bg-paper px-4 py-4 sm:h-20 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-8 sm:py-0">
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">İstatistik</h1>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 p-4 sm:gap-16 sm:p-8">
        {error && <p className="text-sm text-danger">{error.message}</p>}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="card card-hover flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface text-accent-hover">
                <s.icon className="h-5 w-5" />
              </span>
              <div>
                <div className="text-[28px] font-bold leading-tight text-ink count-up">{s.value}</div>
                <div className="mt-1 text-sm text-ink-muted">{s.label}</div>
              </div>
            </div>
          ))}
        </section>

        <section>
          <BookingsTrendChart points={trend} unitLabel="aktif rezervasyon" />
        </section>
      </div>
    </div>
  );
}
