import Link from "next/link";
import type { Customer } from "@/lib/customers";
import { formatDateRange } from "@/lib/bookings";
import { formatPrice } from "@/lib/format";
import {
  IconCalendar,
  IconChevronRight,
  IconPackage,
  IconPhone,
  IconUsers,
} from "@/components/icons";

/**
 * Server component on purpose: the search is a plain form submission handled by
 * the page, so nothing here needs to run in the browser.
 */
export default function CustomerList({
  customers,
  query,
  hasAny,
}: {
  customers: Customer[];
  query: string;
  hasAny: boolean;
}) {
  if (customers.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-2 border-dashed py-12 text-center">
        <IconUsers className="h-7 w-7 text-ink-muted" />
        <p className="text-sm text-ink-muted">
          {hasAny
            ? `"${query}" ile eşleşen müşteri yok.`
            : "Henüz kimse rezervasyon oluşturmadı. İlk rezervasyon geldiğinde müşteri burada listelenir."}
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {customers.map((customer, i) => (
        <li key={customer.key}>
          <Link
            href={`/admin/customers/${encodeURIComponent(customer.key)}`}
            className="fade-slide-up card card-hover flex items-center gap-4"
            style={{ animationDelay: `${Math.min(i, 10) * 50}ms` }}
          >
            <span
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-base font-semibold text-accent-strong"
            >
              {customer.name.charAt(0).toLocaleUpperCase("tr-TR")}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="font-semibold text-ink">{customer.name}</p>
                {customer.counts.active > 0 && (
                  <span className="pill pill-success">{customer.counts.active} aktif</span>
                )}
                {customer.counts.upcoming > 0 && (
                  <span className="pill pill-accent">{customer.counts.upcoming} yaklaşan</span>
                )}
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
                <span className="flex items-center gap-1.5">
                  <IconPackage className="h-3.5 w-3.5" />
                  {customer.bookings.length} kiralama
                </span>
                {customer.phone && (
                  <span className="flex items-center gap-1.5">
                    <IconPhone className="h-3.5 w-3.5" />
                    {customer.phone}
                  </span>
                )}
                <span className="hidden items-center gap-1.5 sm:flex">
                  <IconCalendar className="h-3.5 w-3.5" />
                  {formatDateRange(customer.firstDate, customer.lastDate)}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              {customer.totalSpend != null && (
                <span className="hidden text-right text-sm font-semibold text-ink sm:block">
                  {formatPrice(customer.totalSpend)}
                  {customer.spendIsPartial && <span className="text-ink-muted">+</span>}
                </span>
              )}
              <IconChevronRight className="h-4 w-4 text-ink-muted" />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
