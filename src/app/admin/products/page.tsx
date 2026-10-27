import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import ProductGrid from "@/components/admin/ProductGrid";
import ProductSearch from "@/components/admin/ProductSearch";
import { IconPlus, IconUpload } from "@/components/icons";

/**
 * Ada ya da barkod numarasına göre arama.
 *
 * Satıcı elindeki etiketin numarasını da yazabiliyor: raftaki ürünü adıyla
 * değil numarasıyla tanıyor olabilir. Numaranın bir parçası da yetiyor, ad
 * aramasında olduğu gibi.
 *
 * Sorgu metni tırnak içine alınıp kaçırılıyor: bu filtrede virgül koşulları,
 * parantez de gruplamayı ayırıyor, aramaya yazılan bir virgül tırnaksız
 * geçseydi filtreyi bozardı.
 */
function searchFilter(q: string): string {
  const term = `%${q}%`.replace(/[\\"]/g, (c) => `\\${c}`);
  return `name.ilike."${term}",barcode.ilike."${term}"`;
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ q }, user, supabase] = await Promise.all([
    searchParams,
    getCurrentUser(),
    createClient(),
  ]);

  const ownerId = user?.id ?? "";

  let productsQuery = supabase
    .from("products")
    .select("id, name, description, daily_price, stock, images, created_at")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (q) {
    productsQuery = productsQuery.or(searchFilter(q));
  }

  // Joining through products lets this run alongside the products query instead
  // of waiting on it for a list of ids — one round trip instead of two.
  //
  // Only today's rentals are needed, and only which product they belong to:
  // the same date window `displayStatus` calls "active". Fetching the owner's
  // whole booking history here grew with every rental and was all discarded.
  const today = new Date().toISOString().slice(0, 10);
  const bookingsQuery = supabase
    .from("bookings")
    .select("product_id, products!inner(owner_id)")
    .eq("products.owner_id", ownerId)
    .neq("status", "cancelled")
    .lte("start_date", today)
    .gte("end_date", today);

  const [{ data: products, error }, { data: activeBookings }] = await Promise.all([
    productsQuery,
    bookingsQuery,
  ]);

  const bookedToday = new Set((activeBookings ?? []).map((b) => b.product_id));

  return (
    <div className="flex flex-1 flex-col">
      <header className="page-header flex flex-col gap-3 border-b border-border bg-paper px-4 py-4 sm:h-20 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-8 sm:py-0">
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">Ürünler</h1>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <ProductSearch query={q ?? ""} />
          <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
          <Link href="/admin/products/excel" className="btn btn-secondary">
            <IconUpload className="h-4 w-4" />
            Excel ile ekle
          </Link>
          <Link href="/admin/products/new" className="btn btn-primary">
            <IconPlus className="h-4 w-4" />
            Ürün ekle
          </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 p-4 sm:gap-16 sm:p-8">
        {error && <p className="text-sm text-danger">{error.message}</p>}

        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Envanter</h2>
          </div>

          {!error && (
            <ProductGrid
              products={(products ?? []).map((p) => ({
                id: p.id,
                name: p.name,
                description: p.description,
                dailyPrice: p.daily_price,
                stock: p.stock,
                imageUrl: p.images?.[0] ?? null,
                bookedToday: bookedToday.has(p.id),
              }))}
              emptyMessage={q ? `"${q}" ile eşleşen ürün yok.` : "Henüz ürün yok."}
              emptyAction={!q ? { href: "/admin/products/new", label: "İlk ürününüzü ekleyin" } : undefined}
            />
          )}
        </section>
      </div>
    </div>
  );
}
