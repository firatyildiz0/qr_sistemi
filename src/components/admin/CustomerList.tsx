"use client";

import { useState } from "react";
import Link from "next/link";
import type { Customer } from "@/lib/customers";
import { deleteCustomers } from "@/app/admin/customers/actions";
import { formatDateRange } from "@/lib/bookings";
import { formatPrice } from "@/lib/format";
import ConfirmDialog from "@/components/ConfirmDialog";
import ProductThumb from "@/components/admin/ProductThumb";
import PhoneActions from "@/components/admin/PhoneActions";
import {
  IconCalendar,
  IconCheck,
  IconChevronRight,
  IconPackage,
  IconPhone,
  IconTrash,
  IconUsers,
} from "@/components/icons";
import { useDuzen } from "@/components/admin/kapak/duzen";

export default function CustomerList({
  customers,
  query,
  hasAny,
}: {
  customers: Customer[];
  query: string;
  hasAny: boolean;
}) {
  const [selecting, setSelecting] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  // The customers queued for deletion; non-null is what opens the dialog.
  const [pending, setPending] = useState<Customer[] | null>(null);
  const duzen = useDuzen();
  const sade = duzen !== "mevcut";
  const kompakt = duzen === "kompakt";

  // Derived from what is on screen rather than read straight out of the set:
  // a search can hide a row that was ticked earlier, and a hidden row must
  // never be swept up by "seçilenleri sil".
  const selected = customers.filter((c) => selectedKeys.has(c.key));
  const allSelected = customers.length > 0 && selected.length === customers.length;

  function toggle(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }

  function toggleAll() {
    setSelectedKeys(allSelected ? new Set() : new Set(customers.map((c) => c.key)));
  }

  function stopSelecting() {
    setSelecting(false);
    setSelectedKeys(new Set());
  }

  async function confirmDelete() {
    if (!pending) return;
    await deleteCustomers(pending.map((c) => c.key));
    // Only the rows that actually went away leave the selection, so a partial
    // search-then-delete keeps the rest of the ticks intact.
    const gone = new Set(pending.map((c) => c.key));
    setSelectedKeys((prev) => new Set([...prev].filter((k) => !gone.has(k))));
    setSelecting(false);
  }

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

  const pendingRentals = pending?.reduce((sum, c) => sum + c.bookings.length, 0) ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        {selecting ? (
          <button type="button" onClick={toggleAll} className="btn btn-ghost h-9 min-h-0 px-2 text-sm">
            <Checkbox checked={allSelected} />
            {allSelected ? "Seçimi kaldır" : "Tümünü seç"}
          </button>
        ) : (
          <p className="text-sm text-ink-muted">
            {customers.length} müşteri
          </p>
        )}

        <button
          type="button"
          onClick={() => (selecting ? stopSelecting() : setSelecting(true))}
          className="btn btn-secondary h-9 min-h-0 px-3 text-sm"
        >
          {selecting ? "Vazgeç" : "Seç"}
        </button>
      </div>

      <ul className={`flex flex-col ${kompakt ? "card divide-y divide-border p-0" : sade ? "gap-2" : "gap-3"}`}>
        {customers.map((customer, i) => {
          const isSelected = selectedKeys.has(customer.key);

          return (
            <li key={customer.key}>
              {/* Satırın tamamı hâlâ tek bir hedef, ama sil düğmesi ve arama
                  kısayolları onun içine giremez: bağlantı kartı kaplayan bir
                  katman olarak duruyor, düğmeler de onun üstünde kalıyor. */}
              <div
                className={`fade-slide-up relative flex items-center gap-3 ${
                  kompakt
                    ? `px-4 py-3 transition-colors ${isSelected ? "bg-accent-soft" : "hover:bg-surface"}`
                    : `card ${sade ? "px-4 py-3.5" : ""} ${isSelected ? "border-accent bg-accent-soft" : "card-hover"}`
                }`}
                style={{ animationDelay: `${Math.min(i, 10) * 50}ms` }}
              >
                {selecting && <Checkbox checked={isSelected} />}

                {selecting ? (
                  // In selection mode the whole row toggles instead of
                  // navigating — a checkbox alone is a small target on a phone.
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    aria-label={`${customer.name} müşterisini seç`}
                    onClick={() => toggle(customer.key)}
                    className="absolute inset-0 rounded-[inherit]"
                  />
                ) : (
                  <Link
                    href={`/admin/customers/${encodeURIComponent(customer.key)}`}
                    aria-label={`${customer.name} müşterisini aç`}
                    className="absolute inset-0 rounded-[inherit]"
                  />
                )}

                <div className="flex min-w-0 flex-1 items-center gap-4">
                  {/* Seçim sırasında dokunuş satırı işaretlemeli; kısayollar
                      araya girmesin diye numara düz yazıya dönüyor. */}
                  {sade ? (
                    <SadeSatir customer={customer} kompakt={kompakt} />
                  ) : (
                    <CustomerRow customer={customer} phoneActions={!selecting} />
                  )}
                </div>

                {!selecting && !sade && (
                  <>
                    <IconChevronRight className="h-4 w-4 shrink-0 text-ink-muted" />
                    <button
                      type="button"
                      onClick={() => setPending([customer])}
                      aria-label={`${customer.name} müşterisini sil`}
                      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger"
                    >
                      <IconTrash className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {selecting && selected.length > 0 && (
        // The scan button floats at bottom-right on small screens, so the bar
        // keeps its content clear of that corner.
        <div className="sticky bottom-4 z-20 flex items-center gap-3 rounded-lg border border-border bg-card p-3 pr-28 shadow-lg sm:pr-3">
          <p className="min-w-0 flex-1 truncate text-sm text-ink">
            <strong className="font-semibold">{selected.length}</strong> müşteri seçildi
          </p>
          <button
            type="button"
            onClick={() => setPending(selected)}
            className="btn btn-danger h-9 min-h-0 px-3 text-sm"
          >
            <IconTrash className="h-4 w-4" />
            Sil
          </button>
        </div>
      )}

      <ConfirmDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={confirmDelete}
        title={
          pending && pending.length > 1 ? `${pending.length} müşteriyi sil` : "Müşteriyi sil"
        }
        message={
          <>
            {pending && pending.length === 1 ? (
              <>
                <strong className="font-semibold text-ink">{pending[0].name}</strong> ve bu kişiye ait{" "}
              </>
            ) : (
              <>Seçilen {pending?.length ?? 0} müşteri ve onlara ait </>
            )}
            <strong className="font-semibold text-ink">{pendingRentals} kiralama kaydı</strong> kalıcı
            olarak silinecek. Bu işlem geri alınamaz.
          </>
        }
        confirmLabel="Evet, sil"
        pendingLabel="Siliniyor…"
        icon={<IconTrash className="h-5 w-5" />}
        tone="danger"
      />
    </div>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
        checked ? "border-accent bg-accent text-white" : "border-border-strong bg-card"
      }`}
    >
      {checked && <IconCheck className="h-3.5 w-3.5" />}
    </span>
  );
}

function CustomerRow({
  customer,
  /** Numaranın yanında arama ve WhatsApp kısayolları çıksın mı. */
  phoneActions,
}: {
  customer: Customer;
  phoneActions: boolean;
}) {
  // Kiralamalar en yeni başlangıç tarihi başta olacak şekilde sıralı geliyor.
  const latest = customer.bookings[0];
  const otherProducts = new Set(customer.bookings.map((b) => b.productId)).size - 1;

  return (
    <>
      {/* Görsel adın önünde, panelin diğer rezervasyon listelerinde olduğu
          gibi: satıcı satırı gözle tarıyor ve kiralamayı adından önce ürünün
          resminden tanıyor. Bir kişinin birden çok ürünü olabiliyor; en yeni
          kiralamanın ürünü öne geliyor, kalan ürün sayısı köşedeki rozete
          dönüşüyor. */}
      <span className="relative shrink-0">
        <ProductThumb src={latest?.imageUrl ?? null} />
        {otherProducts > 0 && (
          <span
            aria-hidden="true"
            className="absolute -bottom-1 -right-1 rounded-full border border-card bg-accent px-1 text-[10px] font-semibold leading-4 text-white"
          >
            +{otherProducts}
          </span>
        )}
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
          {customer.phone &&
            (phoneActions ? (
              <PhoneActions phone={customer.phone} name={customer.name} />
            ) : (
              <span className="flex items-center gap-1.5">
                <IconPhone className="h-3.5 w-3.5" />
                {customer.phone}
              </span>
            ))}
          <span className="hidden items-center gap-1.5 sm:flex">
            <IconCalendar className="h-3.5 w-3.5" />
            {formatDateRange(customer.firstDate, customer.lastDate)}
          </span>
        </div>
      </div>

      {customer.totalSpend != null && (
        <span className="hidden shrink-0 text-right text-sm font-semibold text-ink sm:block">
          {formatPrice(customer.totalSpend)}
          {customer.spendIsPartial && <span className="text-ink-muted">+</span>}
        </span>
      )}
    </>
  );
}

/**
 * GEÇİCİ karşılaştırma hâlleri (bkz. kapak/duzen.ts).
 *
 * Satırda kim, kaç kiralama, ne zamandan ne zamana ve toplam tutar kalıyor.
 * Arama kısayolları müşterinin sayfasında; silmek için "Seç" var — satır
 * başına çöp kutusu bu ekranı en çok kalabalıklaştıran şeydi.
 */
function SadeSatir({ customer, kompakt }: { customer: Customer; kompakt: boolean }) {
  const latest = customer.bookings[0];
  const durum =
    customer.counts.active > 0
      ? { metin: `${customer.counts.active} aktif`, renk: "text-success", nokta: "bg-success" }
      : customer.counts.upcoming > 0
        ? { metin: `${customer.counts.upcoming} yaklaşan`, renk: "text-status-upcoming", nokta: "bg-status-upcoming" }
        : null;
  const tutar =
    customer.totalSpend != null ? `${formatPrice(customer.totalSpend)}${customer.spendIsPartial ? "+" : ""}` : null;

  if (kompakt) {
    return (
      <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_7rem_6rem]">
        <p className="m-0 truncate text-sm font-semibold text-ink">{customer.name}</p>
        <p className="m-0 hidden truncate text-sm tabular-nums text-ink-muted sm:block">
          {formatDateRange(customer.firstDate, customer.lastDate)}
        </p>
        <span className={`text-xs font-semibold ${durum?.renk ?? "text-ink-muted"}`}>
          {durum?.metin ?? `${customer.bookings.length} kiralama`}
        </span>
        <span className="hidden text-right text-sm font-semibold tabular-nums text-ink sm:block">{tutar}</span>
      </div>
    );
  }

  return (
    <>
      <ProductThumb src={latest?.imageUrl ?? null} className="h-10 w-10" sizes="40px" />
      <div className="min-w-0 flex-1">
        <p className="m-0 truncate font-semibold text-ink">{customer.name}</p>
        <p className="m-0 mt-0.5 truncate text-sm text-ink-muted">
          {customer.bookings.length} kiralama · {formatDateRange(customer.firstDate, customer.lastDate)}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {tutar && <span className="text-sm font-semibold tabular-nums text-ink">{tutar}</span>}
        {durum && (
          <span className={`flex items-center gap-1.5 text-xs font-semibold ${durum.renk}`}>
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${durum.nokta}`} />
            {durum.metin}
          </span>
        )}
      </div>
    </>
  );
}
