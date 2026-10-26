"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  IconCheck,
  IconDownload,
  IconGrid,
  IconList,
  IconPackage,
  IconPencil,
  IconQrCode,
  IconX,
} from "@/components/icons";
import { formatPrice } from "@/lib/format";

export type ProductCardData = {
  id: string;
  name: string;
  description: string | null;
  dailyPrice: number | null;
  stock: number;
  imageUrl: string | null;
  bookedToday: boolean;
};

/** Cover image when the product has one, QR placeholder when it doesn't. */
function Thumb({
  product: p,
  sizes,
  iconClass,
}: {
  product: ProductCardData;
  sizes: string;
  iconClass: string;
}) {
  if (p.imageUrl) {
    // Contained rather than cropped, so a card shows the same framing the
    // seller uploaded.
    return (
      <Image src={p.imageUrl} alt="" fill sizes={sizes} className="object-contain p-1.5" />
    );
  }
  return (
    <>
      <div className="diagonal-stripes absolute inset-0 opacity-40" />
      <div className="absolute inset-0 flex items-center justify-center">
        <IconQrCode className={`${iconClass} text-ink-muted/40`} strokeWidth={1} />
      </div>
    </>
  );
}

function StockPill({ stock }: { stock: number }) {
  return (
    <span className={`pill ${stock > 0 ? "pill-muted" : "pill-danger"}`}>
      {stock > 0 ? `${stock} adet` : "Stok yok"}
    </span>
  );
}

/** Toplu etiket PDF'inde bir A4'e düşen etiket (bkz. productQrSheetPdf). */
const LABELS_PER_PAGE = 12;

const VIEW_KEY = "admin-product-view";

/** Seçim modunda kartın üstüne binen, tıklamayı seçime çeviren katman. */
function SelectOverlay({
  name,
  selected,
  onToggle,
}: {
  name: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      // Mobil kartlarda katman bağlantının içinde; seçim, ürün sayfasını açmasın.
      onClick={(e) => {
        e.preventDefault();
        onToggle();
      }}
      aria-pressed={selected}
      aria-label={`${name} — ${selected ? "seçimi kaldır" : "seç"}`}
      className={`absolute inset-0 z-10 rounded-[inherit] transition-colors ${
        selected ? "bg-accent/10 ring-2 ring-inset ring-accent" : "hover:bg-ink/5"
      }`}
    >
      <span
        className={`absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors ${
          selected ? "border-accent bg-accent text-white" : "border-border bg-card"
        }`}
      >
        {selected && <IconCheck className="h-4 w-4" strokeWidth={3} />}
      </span>
    </button>
  );
}

type Selection = { selected: boolean; onToggle: () => void } | null;

export default function ProductGrid({
  products,
  emptyMessage,
  emptyAction,
}: {
  products: ProductCardData[];
  emptyMessage: string;
  emptyAction?: { href: string; label: string };
}) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = window.localStorage.getItem(VIEW_KEY);
    if (stored === "list" || stored === "grid") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from localStorage on mount
      setView(stored);
    }
  }, []);

  function selectView(next: "grid" | "list") {
    setView(next);
    window.localStorage.setItem(VIEW_KEY, next);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function stopSelecting() {
    setSelecting(false);
    setSelected(new Set());
  }

  const selection = (id: string): Selection =>
    selecting ? { selected: selected.has(id), onToggle: () => toggle(id) } : null;
  const allSelected = products.length > 0 && products.every((p) => selected.has(p.id));
  // Etiketler ekrandaki sırayla basılsın diye kimlikler listenin sırasıyla.
  const selectedIds = products.filter((p) => selected.has(p.id)).map((p) => p.id);

  if (products.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-3 border-dashed py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface text-ink-muted">
          <IconPackage className="h-6 w-6" />
        </span>
        <p className="text-ink-muted">{emptyMessage}</p>
        {emptyAction && (
          <Link href={emptyAction.href} className="link-underline text-sm font-semibold text-accent-hover">
            {emptyAction.label}
          </Link>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2 sm:mb-5">
        {selecting ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setSelected(allSelected ? new Set() : new Set(products.map((p) => p.id)))
              }
              className="btn btn-secondary h-8 px-3 text-sm"
            >
              {allSelected ? "Seçimi temizle" : "Tümünü seç"}
            </button>
            <button type="button" onClick={stopSelecting} className="btn btn-ghost h-8 px-3 text-sm">
              <IconX className="h-4 w-4" />
              Vazgeç
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setSelecting(true)}
            className="btn btn-secondary h-8 px-3 text-sm"
          >
            <IconQrCode className="h-4 w-4" />
            Toplu QR indir
          </button>
        )}
        <div className="flex items-center gap-1 sm:hidden">
        <button
          type="button"
          onClick={() => selectView("grid")}
          aria-label="Izgara görünümü"
          aria-pressed={view === "grid"}
          className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
            view === "grid"
              ? "border-accent bg-accent-soft text-accent-hover"
              : "border-border bg-card text-ink-muted"
          }`}
        >
          <IconGrid className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => selectView("list")}
          aria-label="Liste görünümü"
          aria-pressed={view === "list"}
          className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
            view === "list"
              ? "border-accent bg-accent-soft text-accent-hover"
              : "border-border bg-card text-ink-muted"
          }`}
        >
          <IconList className="h-4 w-4" />
        </button>
        </div>
      </div>

      {/* Mobile */}
      <div className={`sm:hidden ${view === "list" ? "flex flex-col gap-3" : "grid grid-cols-2 gap-3"}`}>
        {products.map((p) =>
          view === "list" ? (
            <ProductListRow key={p.id} product={p} selection={selection(p.id)} />
          ) : (
            <ProductCompactCard key={p.id} product={p} selection={selection(p.id)} />
          )
        )}
      </div>

      {/* Desktop / tablet */}
      <div className="hidden sm:grid sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((p) => (
          <ProductFullCard key={p.id} product={p} selection={selection(p.id)} />
        ))}
      </div>

      {selecting && (
        <div className="sticky bottom-24 z-20 mt-6 md:bottom-6">
          <div className="card mx-auto flex max-w-xl items-center justify-between gap-3 p-3 pl-4 shadow-lg">
            <p className="text-sm text-ink">
              {selectedIds.length > 0 ? (
                <>
                  <span className="font-semibold">{selectedIds.length} ürün</span>{" "}
                  <span className="text-ink-muted">
                    · {Math.ceil(selectedIds.length / LABELS_PER_PAGE)} A4 sayfa
                  </span>
                </>
              ) : (
                <span className="text-ink-muted">Etiketini basacağınız ürünleri seçin</span>
              )}
            </p>
            {selectedIds.length > 0 ? (
              <a
                href={`/api/products/qr-etiketleri?ids=${selectedIds.join(",")}`}
                download
                className="btn btn-primary shrink-0"
              >
                <IconDownload className="h-4 w-4" />
                PDF indir
              </a>
            ) : (
              <button type="button" disabled className="btn btn-primary shrink-0">
                <IconDownload className="h-4 w-4" />
                PDF indir
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProductListRow({
  product: p,
  selection,
}: {
  product: ProductCardData;
  selection: Selection;
}) {
  return (
    <Link
      href={`/admin/products/${p.id}`}
      className="card card-hover relative flex items-center gap-3 p-3"
    >
      {selection && <SelectOverlay name={p.name} {...selection} />}
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-border bg-surface">
        <Thumb product={p} sizes="56px" iconClass="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-sm font-semibold text-ink">{p.name}</h3>
          <span className={`pill shrink-0 ${p.bookedToday ? "pill-warning" : "pill-success"}`}>
            {p.bookedToday ? "Dolu" : "Müsait"}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          {p.dailyPrice != null && (
            <span className="text-xs text-ink-muted">{formatPrice(p.dailyPrice)}/gün</span>
          )}
          <StockPill stock={p.stock} />
        </div>
      </div>
    </Link>
  );
}

function ProductCompactCard({
  product: p,
  selection,
}: {
  product: ProductCardData;
  selection: Selection;
}) {
  return (
    <Link
      href={`/admin/products/${p.id}`}
      className="card card-hover relative flex flex-col overflow-hidden p-0"
    >
      {selection && <SelectOverlay name={p.name} {...selection} />}
      <div className="relative h-24 w-full overflow-hidden border-b border-border bg-surface">
        <Thumb product={p} sizes="50vw" iconClass="h-8 w-8" />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex items-start justify-between gap-1.5">
          <h3 className="line-clamp-1 text-sm font-semibold text-ink">{p.name}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`pill w-fit ${p.bookedToday ? "pill-warning" : "pill-success"}`}>
            {p.bookedToday ? "Dolu" : "Müsait"}
          </span>
          <StockPill stock={p.stock} />
        </div>
        {p.dailyPrice != null && (
          <span className="mt-1 text-sm font-semibold text-accent-hover">{formatPrice(p.dailyPrice)}/gün</span>
        )}
      </div>
    </Link>
  );
}

function ProductFullCard({
  product: p,
  selection,
}: {
  product: ProductCardData;
  selection: Selection;
}) {
  return (
    <div className="card card-hover group relative flex flex-col overflow-hidden p-0">
      {selection && <SelectOverlay name={p.name} {...selection} />}
      {/* Four across leaves little width, so the status moves onto the image
          instead of competing with the title for the same row. */}
      <div className="relative aspect-4/3 w-full overflow-hidden border-b border-border bg-surface">
        <Thumb product={p} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw" iconClass="h-10 w-10" />
        <span className={`pill absolute left-3 top-3 ${p.bookedToday ? "pill-warning" : "pill-success"}`}>
          {p.bookedToday ? "Bugün dolu" : "Müsait"}
        </span>
        <Link
          href={`/admin/products/${p.id}`}
          title="Düzenle"
          aria-label="Düzenle"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-card text-ink opacity-0 shadow-sm transition-all duration-200 hover:bg-accent hover:text-white focus-visible:opacity-100 group-hover:opacity-100"
        >
          <IconPencil className="h-4 w-4" />
        </Link>
      </div>

      <Link href={`/admin/products/${p.id}`} className="flex flex-1 flex-col justify-between gap-3 p-4">
        <div>
          <h3 className="line-clamp-1 text-base font-semibold text-ink group-hover:text-accent-hover">
            {p.name}
          </h3>
          {p.description && (
            <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{p.description}</p>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
          <StockPill stock={p.stock} />
          {p.dailyPrice != null && (
            <span className="count-up text-base font-semibold text-accent-hover">
              {formatPrice(p.dailyPrice)}/gün
            </span>
          )}
        </div>
      </Link>
    </div>
  );
}
