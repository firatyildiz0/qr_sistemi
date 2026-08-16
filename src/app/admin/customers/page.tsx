import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { groupCustomers, matchesQuery } from "@/lib/customers";
import CustomerList from "@/components/admin/CustomerList";
import { IconSearch } from "@/components/icons";

export const metadata = { title: "Rezervasyonlar" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ q }, user, supabase] = await Promise.all([
    searchParams,
    getCurrentUser(),
    createClient(),
  ]);

  // Scoped through the product owner, the same way the notification count is:
  // one seller must never see another seller's customers. RLS allows public
  // reads on bookings, so this filter is what does the scoping here.
  const { data, error } = await supabase
    .from("bookings")
    .select("*, products!inner(name, daily_price, owner_id)")
    .eq("products.owner_id", user?.id ?? "")
    .order("start_date", { ascending: false });

  const customers = groupCustomers(data ?? []);
  const visible = q ? customers.filter((c) => matchesQuery(c, q)) : customers;

  const totalRentals = customers.reduce((sum, c) => sum + c.bookings.length, 0);
  const withActive = customers.filter((c) => c.activeCount > 0).length;

  return (
    <div className="flex flex-1 flex-col">
      <header className="page-header flex flex-col gap-3 border-b border-border bg-paper px-4 py-4 sm:h-20 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-8 sm:py-0">
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">Rezervasyonlar</h1>
        <form
          action="/admin/customers"
          className="relative flex w-full items-center rounded-md border border-border bg-card sm:w-72"
        >
          <IconSearch className="pointer-events-none absolute left-3 h-4 w-4 text-ink-muted" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="İsim, telefon veya ürün ara…"
            className="w-full bg-transparent py-2.5 pl-10 pr-3 text-base text-ink placeholder:text-ink-muted focus:outline-none sm:text-sm"
          />
        </form>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 sm:p-8">
        {error ? (
          <p className="text-sm text-danger">{error.message}</p>
        ) : (
          <>
            {customers.length > 0 && (
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                <Stat label="Müşteri" value={customers.length} />
                <Stat label="Toplam kiralama" value={totalRentals} />
                <Stat label="Şu an kirada" value={withActive} />
              </div>
            )}

            <CustomerList
              customers={visible}
              query={q ?? ""}
              hasAny={customers.length > 0}
            />
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <p className="count-up text-2xl font-bold text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-ink-muted">{label}</p>
    </div>
  );
}
