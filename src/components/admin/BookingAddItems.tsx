"use client";

import { useActionState, useState } from "react";
import { addBookingItems, type BookingFormState } from "@/app/product/[id]/actions";
import type { CatalogProduct } from "@/lib/catalog";
import type { DateSpan } from "@/lib/bookings";
import ProductPicker, {
  basketError,
  itemsPayload,
  type PickedItem,
} from "@/components/booking/ProductPicker";
import { IconPlus } from "@/components/icons";

const initialState: BookingFormState = { error: null };

/**
 * Kayıtlı bir rezervasyona sonradan ürün ekleme kısayolu, rezervasyon
 * ekranında.
 *
 * Aynı iş ürün sayfasındaki kiralama satırında da duruyor (`BookingRow`), ama
 * oraya yalnızca ürünü bilerek gidiliyor. Telefondan çalışan satıcı
 * rezervasyona müşteri üzerinden ulaşıyor ve bu ekranda kalıyordu; "bir de şu
 * seti alayım" demek için önce doğru ürünün sayfasını bulması gerekiyordu.
 *
 * Müşteri, tarihler ve teminat mevcut kayıttan devralınıyor — form yalnızca
 * ürünleri gönderiyor.
 */
export default function BookingAddItems({
  bookingId,
  customerName,
  dateRange,
  catalog,
  span,
}: {
  bookingId: string;
  customerName: string;
  /** Okunabilir tarih aralığı; hangi günlere ekleneceği yazıyla söyleniyor. */
  dateRange: string;
  catalog: CatalogProduct[];
  /** Eklenen ürünlerin devralacağı meşguliyet aralığı. */
  span: DateSpan;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PickedItem[]>([]);
  const [state, formAction, pending] = useActionState(
    addBookingItems.bind(null, bookingId),
    initialState
  );
  const [prevState, setPrevState] = useState(state);

  if (state !== prevState) {
    setPrevState(state);
    if (state.success) {
      setOpen(false);
      setItems([]);
    }
  }

  const problem = items.length > 0 ? basketError(catalog, items, span) : null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-secondary w-full sm:w-auto"
      >
        <IconPlus className="h-4 w-4" />
        Ürün ekle
      </button>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="items" value={JSON.stringify(itemsPayload(items))} />

      <p className="mb-2 text-xs text-ink-muted">
        Eklenen ürünler {customerName} adına {dateRange} tarihleri için rezerve edilir ve o
        günleri takvimde kapatır.
      </p>

      <ProductPicker
        products={catalog}
        items={items}
        onChange={setItems}
        span={span}
        emptyHint="Bu rezervasyona eklenecek ürünleri seçin ya da QR okutun."
      />

      {state.error && <p className="mt-2 text-sm text-danger">{state.error}</p>}
      {!state.error && problem && <p className="mt-2 text-sm text-danger">{problem}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending || items.length === 0 || problem !== null}
          className="btn btn-primary min-h-0 py-2 text-xs"
        >
          {pending ? "Ekleniyor…" : "Rezervasyona ekle"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setItems([]);
          }}
          className="btn btn-secondary min-h-0 py-2 text-xs"
        >
          Vazgeç
        </button>
      </div>
    </form>
  );
}
