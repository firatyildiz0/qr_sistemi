"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { CatalogProduct } from "@/lib/catalog";
import {
  formatDateRange,
  MAX_BOOKING_ITEMS,
  MAX_ITEM_QUANTITY,
  unitsLeftInRange,
  type DateSpan,
} from "@/lib/bookings";
import QrScanner from "@/components/scan/QrScanner";
import {
  IconMinus,
  IconPackage,
  IconPlus,
  IconScan,
  IconSearch,
  IconTrash,
  IconX,
} from "@/components/icons";

/** Sepetteki bir kalem: hangi ürün, kaç adet. */
export type PickedItem = { productId: string; quantity: number };

/** Sunucuya gönderilen biçim; `readItems` bunu bekliyor. */
export function itemsPayload(items: PickedItem[]) {
  return items.map((item) => ({
    product_id: item.productId,
    quantity: item.quantity,
  }));
}

/**
 * Seçilen tarihlerde bir üründen kaç adet kiralanabilir. Tarih seçilmemişse
 * sınırı yalnızca stok koyar.
 */
export function unitsAvailable(
  product: CatalogProduct,
  span: DateSpan | null
): number {
  if (!span) return product.stock;
  return unitsLeftInRange(
    product.availability.occupied,
    product.stock,
    span.start_date,
    span.end_date
  );
}

/**
 * Sepetin kaydedilmesini engelleyen ilk sorun, ya da her şey uygunsa null.
 * Sunucu aynı kontrolü tekrar yapıyor; buradaki sadece boşuna gidip gelmeyi
 * önlüyor ve satıcıya hangi ürünün sığmadığını anında söylüyor.
 */
export function basketError(
  products: CatalogProduct[],
  items: PickedItem[],
  span: DateSpan | null
): string | null {
  if (items.length === 0) return "Rezervasyona en az bir ürün ekleyin.";

  const byId = new Map(products.map((product) => [product.id, product]));

  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product) continue;

    const left = unitsAvailable(product, span);
    if (item.quantity > left) {
      return span
        ? `${product.name}: seçilen tarihlerde ${left} adet müsait, ${item.quantity} adet istediniz.`
        : `${product.name}: stokta ${left} adet var, ${item.quantity} adet istediniz.`;
    }
  }

  return null;
}

/**
 * Tek müşteri, tek tarih aralığı, birden çok ürün.
 *
 * Toplu alımın hepsi burada toplanıyor: taranan ürünün adedi, listeden seçilen
 * başka ürünler ve QR ile eklenenler. Müşteri bilgileri sepetin dışında bir
 * kere giriliyor — özelliğin bütün amacı satıcının aynı bilgileri ürün başına
 * yeniden yazmaması.
 */
export default function ProductPicker({
  products,
  items,
  onChange,
  span,
  /** Sepetten çıkarılamayan ürün (taranarak gelinen sayfanın ürünü). */
  anchorId,
  emptyHint = "Rezervasyona eklenecek ürünleri seçin.",
}: {
  products: CatalogProduct[];
  items: PickedItem[];
  onChange: (items: PickedItem[]) => void;
  /** Ürünlerin meşgul olacağı aralık; tarih seçilmemişse null. */
  span: DateSpan | null;
  anchorId?: string;
  emptyHint?: string;
}) {
  const [browsing, setBrowsing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const byId = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );

  const chosen = new Set(items.map((item) => item.productId));
  const full = items.length >= MAX_BOOKING_ITEMS;

  const matches = products.filter((product) => {
    if (chosen.has(product.id)) return false;
    const q = query.trim().toLocaleLowerCase("tr-TR");
    return !q || product.name.toLocaleLowerCase("tr-TR").includes(q);
  });

  /** Zaten sepetteyse adedi artırır — QR'ı iki kez okutmak da "bir tane daha". */
  function add(productId: string) {
    setNotice(null);

    const existing = items.find((item) => item.productId === productId);
    const product = byId.get(productId);

    if (existing) {
      const limit = Math.min(MAX_ITEM_QUANTITY, product?.stock ?? MAX_ITEM_QUANTITY);
      if (existing.quantity >= limit) {
        setNotice(
          `${product?.name ?? "Bu ürün"} için en fazla ${limit} adet seçebilirsiniz.`
        );
        return;
      }
      setQuantity(productId, existing.quantity + 1);
      setNotice(`${product?.name ?? "Ürün"}: 1 adet daha eklendi.`);
      return;
    }

    if (full) {
      setNotice(`Bir rezervasyonda en fazla ${MAX_BOOKING_ITEMS} farklı ürün olabilir.`);
      return;
    }

    onChange([...items, { productId, quantity: 1 }]);
    setQuery("");
    if (product) setNotice(`${product.name} eklendi.`);
  }

  function remove(productId: string) {
    setNotice(null);
    onChange(items.filter((item) => item.productId !== productId));
  }

  function setQuantity(productId: string, quantity: number) {
    onChange(
      items.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      )
    );
  }

  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="field-label mb-0 flex items-center gap-1.5">
          <IconPackage className="h-4 w-4" />
          Rezervasyondaki ürünler
        </p>
        {items.length > 0 && (
          <span className="text-xs text-ink-muted">
            {items.length} ürün · {totalUnits} adet
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card px-3 py-4 text-center text-xs text-ink-muted">
          {emptyHint}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => {
            const product = byId.get(item.productId);
            const left = product ? unitsAvailable(product, span) : 0;
            const limit = Math.min(MAX_ITEM_QUANTITY, product?.stock ?? MAX_ITEM_QUANTITY);
            const short = product ? item.quantity > left : false;

            return (
              <li
                key={item.productId}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-card py-1.5 pl-2.5 pr-1.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-ink">
                    {product?.name ?? "Bilinmeyen ürün"}
                    {item.productId === anchorId && (
                      <span className="ml-1.5 font-normal text-ink-muted">
                        (bu ürün)
                      </span>
                    )}
                  </p>
                  <p className={`text-[11px] ${short ? "text-danger" : "text-ink-muted"}`}>
                    {product
                      ? span
                        ? `bu tarihlerde ${left} / ${product.stock} adet müsait`
                        : `stokta ${product.stock} adet`
                      : "ürün bulunamadı"}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  <StepButton
                    label="Bir adet azalt"
                    disabled={item.quantity <= 1}
                    onClick={() => setQuantity(item.productId, item.quantity - 1)}
                  >
                    <IconMinus className="h-3.5 w-3.5" />
                  </StepButton>

                  <span className="w-8 text-center text-xs font-semibold tabular-nums text-ink">
                    {item.quantity}
                  </span>

                  <StepButton
                    label="Bir adet artır"
                    disabled={item.quantity >= limit}
                    onClick={() => setQuantity(item.productId, item.quantity + 1)}
                  >
                    <IconPlus className="h-3.5 w-3.5" />
                  </StepButton>

                  {item.productId !== anchorId && (
                    <StepButton
                      label={`${product?.name ?? "Ürünü"} çıkar`}
                      onClick={() => remove(item.productId)}
                      tone="danger"
                    >
                      <IconTrash className="h-3.5 w-3.5" />
                    </StepButton>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setBrowsing((open) => !open);
            setNotice(null);
          }}
          className="btn btn-secondary min-h-0 px-3 py-1.5 text-xs"
        >
          <IconPlus className="h-3.5 w-3.5" />
          Farklı ürün ekle
        </button>

        <button
          type="button"
          onClick={() => {
            setScanning(true);
            setNotice(null);
          }}
          title="QR okutarak ürün ekle"
          aria-label="QR okutarak ürün ekle"
          className="btn btn-secondary min-h-0 px-3 py-1.5 text-xs"
        >
          <IconScan className="h-3.5 w-3.5" />
          QR ile ekle
        </button>
      </div>

      {notice && <p className="mt-2 text-xs text-ink-muted">{notice}</p>}

      {browsing && (
        <div className="mt-2 rounded-md border border-border bg-card p-2">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ürün ara"
              aria-label="Ürün ara"
              className="input min-h-0 py-1.5 pl-8 text-xs"
            />
          </div>

          <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto">
            {matches.length === 0 && (
              <li className="px-1 py-3 text-center text-xs text-ink-muted">
                {chosen.size === products.length
                  ? "Bütün ürünler zaten rezervasyonda."
                  : "Eşleşen ürün yok."}
              </li>
            )}

            {matches.map((product) => {
              const left = unitsAvailable(product, span);

              return (
                <li key={product.id}>
                  <button
                    type="button"
                    onClick={() => add(product.id)}
                    disabled={left <= 0}
                    className="flex w-full items-center justify-between gap-3 rounded-md border border-border bg-surface px-2.5 py-2 text-left transition-colors hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-ink">
                        {product.name}
                      </span>
                      <span className="block text-[11px] text-ink-muted">
                        {span
                          ? left > 0
                            ? `${formatDateRange(span.start_date, span.end_date)} arası ${left} adet müsait`
                            : "bu tarihlerde müsait değil"
                          : `stokta ${product.stock} adet`}
                      </span>
                    </span>
                    <IconPlus className="h-4 w-4 shrink-0 text-accent-strong" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {scanning && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="QR okutarak ürün ekle"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-(--app-backdrop)"
            onClick={() => setScanning(false)}
            aria-hidden="true"
          />
          <div className="card relative z-10 w-full max-w-md">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">Ürün okut</h2>
              <button
                type="button"
                onClick={() => setScanning(false)}
                aria-label="Kapat"
                className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition hover:bg-surface hover:text-ink"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-3 text-sm text-ink-muted">
              Okutulan ürün rezervasyona eklenir; sayfadan ayrılmazsınız.
            </p>
            {/* `onProduct` verildiği için okutulan kod ürün sayfasına
                götürmüyor, sepete düşüyor: satıcı formu doldururken sayfadan
                ayrılırsa girdiği her şey kaybolurdu. */}
            <QrScanner
              autoStart
              onProduct={(product) => {
                add(product.id);
                setScanning(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StepButton({
  label,
  disabled = false,
  onClick,
  tone = "default",
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  tone?: "default" | "danger";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
        tone === "danger"
          ? "text-danger hover:border-danger/40"
          : "text-ink-muted hover:border-border-strong hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
