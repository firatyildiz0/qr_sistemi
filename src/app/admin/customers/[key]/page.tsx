import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { groupCustomers } from "@/lib/customers";
import { formatPrice } from "@/lib/format";
import CustomerCalendar from "@/components/admin/CustomerCalendar";
import CustomerRentals from "@/components/admin/CustomerRentals";
import { IconChevronRight, IconPhone, IconWhatsApp } from "@/components/icons";

const dayFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Istanbul",
});

const formatDay = (day: string) => dayFormat.format(new Date(day + "T00:00:00Z"));

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const customer = await loadCustomer(key);
  return { title: customer?.name ?? "Müşteri" };
}

// `cache()` so generateMetadata and the page itself share one query per
// request instead of each running the whole grouping again.
const loadCustomer = cache(async (key: string) => {
  const [user, supabase] = await Promise.all([getCurrentUser(), createClient()]);

  const { data } = await supabase
    .from("bookings")
    .select("*, products!inner(name, daily_price, owner_id, images)")
    .eq("products.owner_id", user?.id ?? "")
    .order("start_date", { ascending: false });

  // Customers are derived, so there is nothing to look up by id: regroup the
  // owner's bookings and pick the matching key.
  return groupCustomers(data ?? []).find((c) => c.key === key) ?? null;
});

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const customer = await loadCustomer(key);

  if (!customer) notFound();

  const phoneDigits = customer.phone?.replace(/\D/g, "") ?? "";
  const waNumber = phoneDigits.length === 10 ? `90${phoneDigits}` : phoneDigits;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
      <div className="mb-6 flex items-center gap-1.5 text-sm text-ink-muted">
        <Link href="/admin/customers" className="link-underline text-ink-muted hover:text-accent-hover">
          Müşteriler
        </Link>
        <IconChevronRight className="h-3.5 w-3.5" />
        <span className="text-ink">{customer.name}</span>
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-4">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xl font-semibold text-accent-strong"
        >
          {customer.name.charAt(0).toLocaleUpperCase("tr-TR")}
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-ink sm:text-[28px]">{customer.name}</h1>
          {customer.phone ? (
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
              <a
                href={`tel:${customer.phone}`}
                className="flex items-center gap-1.5 text-ink-muted hover:text-accent-hover"
              >
                <IconPhone className="h-3.5 w-3.5" />
                {customer.phone}
              </a>
              {waNumber && (
                <a
                  href={`https://wa.me/${waNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-ink-muted hover:text-accent-hover"
                >
                  <IconWhatsApp className="h-3.5 w-3.5" />
                  WhatsApp
                </a>
              )}
            </div>
          ) : (
            <p className="mt-1 text-sm text-ink-muted">Telefon numarası bırakılmamış</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-8">
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <Stat label="Kiralama" value={String(customer.bookings.length)} />
          <Stat label="Toplam gün" value={String(customer.totalDays)} />
          <Stat
            label="Toplam tutar"
            value={
              customer.totalSpend != null
                ? `${formatPrice(customer.totalSpend)}${customer.spendIsPartial ? "+" : ""}`
                : "—"
            }
          />
          <Stat label="İlk kiralama" value={formatDay(customer.firstDate)} />
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-ink">Takvim</h2>
          <CustomerCalendar bookings={customer.bookings} />
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-ink">
            Kiraladığı ürünler
            <span className="ml-2 text-sm font-normal text-ink-muted">
              {formatDay(customer.firstDate)} – {formatDay(customer.lastDate)}
            </span>
          </h2>
          <CustomerRentals bookings={customer.bookings} />
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="count-up text-lg font-bold text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-ink-muted">{label}</p>
    </div>
  );
}
