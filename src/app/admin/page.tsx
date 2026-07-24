import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Booking } from "@/lib/types";
import { displayStatus, nightsBetween } from "@/lib/bookings";
import {
  IconChart,
  IconExternal,
  IconGrid,
  IconPackage,
  IconPencil,
  IconPlus,
  IconQrCode,
  IconSearch,
} from "@/components/icons";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase
    .from("products")
    .select("id, name, description, daily_price, created_at")
    .eq("owner_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  if (q) {
    query = query.ilike("name", `%${q}%`);
  }

  const { data: products, error } = await query;
  const productIds = (products ?? []).map((p) => p.id);

  const { data: bookings } = productIds.length
    ? await supabase
        .from("bookings")
        .select("*")
        .in("product_id", productIds)
        .neq("status", "cancelled")
    : { data: [] as Booking[] };

  const bookingsByProduct = new Map<string, Booking[]>();
  for (const b of bookings ?? []) {
    const list = bookingsByProduct.get(b.product_id) ?? [];
    list.push(b);
    bookingsByProduct.set(b.product_id, list);
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const in7 = new Date();
  in7.setDate(in7.getDate() + 7);
  const in7Str = in7.toISOString().slice(0, 10);
  const monthPrefix = todayStr.slice(0, 7);

  let activeToday = 0;
  let upcomingWeek = 0;
  let revenueThisMonth = 0;
  const priceByProduct = new Map((products ?? []).map((p) => [p.id, p.daily_price]));

  for (const b of bookings ?? []) {
    const status = displayStatus(b);
    if (status === "active") activeToday += 1;
    if (status === "upcoming" && b.start_date <= in7Str) upcomingWeek += 1;
    if (b.start_date.startsWith(monthPrefix)) {
      const price = priceByProduct.get(b.product_id);
      if (price != null) revenueThisMonth += price * Math.max(1, nightsBetween(b.start_date, b.end_date));
    }
  }

  const stats = [
    { icon: IconPackage, value: (products ?? []).length.toLocaleString("tr-TR"), label: "Toplam ürün" },
    { icon: IconGrid, value: activeToday.toLocaleString("tr-TR"), label: "Bugün aktif rezervasyon" },
    { icon: IconChart, value: upcomingWeek.toLocaleString("tr-TR"), label: "Bu hafta yaklaşan" },
    {
      icon: IconChart,
      value: `$${revenueThisMonth.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}`,
      label: "Bu ayki gelir",
    },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 flex flex-col gap-3 border-b border-border bg-paper px-4 py-4 sm:h-20 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-8 sm:py-0">
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">Ürünler</h1>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <form action="/admin" className="relative flex w-full items-center rounded-md border border-border bg-card sm:w-64">
            <IconSearch className="pointer-events-none absolute left-3 h-4 w-4 text-ink-muted" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Ürün ara…"
              className="w-full bg-transparent py-2.5 pl-10 pr-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none"
            />
          </form>
          <Link href="/admin/products/new" className="btn btn-primary">
            <IconPlus className="h-4 w-4" />
            Ürün ekle
          </Link>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 p-4 sm:gap-16 sm:p-8">
        {error && <p className="text-sm text-danger">{error.message}</p>}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Envanter</h2>
          </div>

          {!error && products?.length === 0 && (
            <div className="card flex flex-col items-center gap-3 border-dashed py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface text-ink-muted">
                <IconPackage className="h-6 w-6" />
              </span>
              <p className="text-ink-muted">
                {q ? `"${q}" ile eşleşen ürün yok.` : "Henüz ürün yok."}
              </p>
              {!q && (
                <Link href="/admin/products/new" className="link-underline text-sm font-semibold text-accent-hover">
                  İlk ürününüzü ekleyin
                </Link>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {products?.map((p) => {
              const productBookings = bookingsByProduct.get(p.id) ?? [];
              const bookedToday = productBookings.some((b) => displayStatus(b) === "active");

              return (
                <div key={p.id} className="card card-hover group flex flex-col overflow-hidden p-0">
                  <div className="relative h-40 w-full border-b border-border bg-surface">
                    <div className="diagonal-stripes absolute inset-0 opacity-40" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <IconQrCode className="h-12 w-12 text-ink-muted/40" strokeWidth={1} />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center gap-3 bg-ink/40 opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
                      <Link
                        href={`/admin/products/${p.id}`}
                        title="Düzenle"
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink shadow-sm transition-colors hover:bg-accent hover:text-white"
                      >
                        <IconPencil className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/admin/products/${p.id}`}
                        title="QR kodu görüntüle"
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink shadow-sm transition-colors hover:bg-accent hover:text-white"
                      >
                        <IconQrCode className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/product/${p.id}`}
                        target="_blank"
                        title="Herkese açık sayfayı görüntüle"
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink shadow-sm transition-colors hover:bg-accent hover:text-white"
                      >
                        <IconExternal className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>

                  <Link href={`/admin/products/${p.id}`} className="flex flex-1 flex-col justify-between p-6">
                    <div>
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <h3 className="line-clamp-1 text-lg font-semibold text-ink group-hover:text-accent-hover">
                          {p.name}
                        </h3>
                        <span className={`pill shrink-0 ${bookedToday ? "pill-warning" : "pill-success"}`}>
                          {bookedToday ? "Bugün dolu" : "Müsait"}
                        </span>
                      </div>
                      {p.description && (
                        <p className="line-clamp-2 text-sm text-ink-muted">{p.description}</p>
                      )}
                    </div>
                    {p.daily_price != null && (
                      <div className="mt-6 flex items-end justify-between border-t border-border pt-4">
                        <span className="text-sm text-ink-muted">Günlük ücret</span>
                        <span className="count-up text-lg font-semibold text-accent-hover">
                          ${p.daily_price}/gün
                        </span>
                      </div>
                    )}
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
