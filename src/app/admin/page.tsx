import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">Products</h1>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <form className="flex" action="/admin">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search products…"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none sm:w-56"
            />
          </form>
          <Link
            href="/admin/products/new"
            className="rounded-md bg-neutral-900 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-neutral-700"
          >
            Add product
          </Link>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error.message}</p>}

      {!error && products?.length === 0 && (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-12 text-center">
          <p className="text-neutral-500">
            {q ? `No products match "${q}".` : "No products yet."}
          </p>
          {!q && (
            <Link
              href="/admin/products/new"
              className="mt-3 inline-block text-sm font-medium text-neutral-900 underline"
            >
              Add your first product
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products?.map((p) => (
          <Link
            key={p.id}
            href={`/admin/products/${p.id}`}
            className="group overflow-hidden rounded-lg border border-neutral-200 bg-white p-4 transition hover:shadow-md"
          >
            <h2 className="font-medium text-neutral-900 group-hover:underline">
              {p.name}
            </h2>
            {p.description && (
              <p className="mt-1 line-clamp-2 text-sm text-neutral-500">
                {p.description}
              </p>
            )}
            {p.daily_price != null && (
              <p className="mt-2 text-sm font-medium text-neutral-700">
                {p.daily_price} / day
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
