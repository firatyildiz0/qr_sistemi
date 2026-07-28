"use client";

import { useActionState, useCallback, useState } from "react";
import type { Product } from "@/lib/types";
import type { ProductFormState } from "@/app/admin/products/actions";
import ImageUploader from "@/components/admin/ImageUploader";
import StockField from "@/components/admin/StockField";
import { formatPriceInput, parsePriceInput } from "@/lib/format";

export default function ProductForm({
  product,
  action,
  submitLabel,
}: {
  product?: Product;
  action: (state: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const [uploading, setUploading] = useState(false);
  const [price, setPrice] = useState(() =>
    product?.daily_price != null
      ? formatPriceInput(String(product.daily_price).replace(".", ","))
      : ""
  );

  // Stable identity so ImageUploader's effect doesn't re-fire every render.
  const handleBusyChange = useCallback((busy: boolean) => setUploading(busy), []);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="name" className="field-label">
          Ad
        </label>
        <input id="name" name="name" required defaultValue={product?.name} className="input" />
      </div>

      <ImageUploader
        initialImages={product?.images ?? []}
        onBusyChange={handleBusyChange}
      />

      <div>
        <label htmlFor="features" className="field-label">
          Özellikler
        </label>
        <textarea
          id="features"
          name="features"
          rows={3}
          placeholder="Her satıra bir tane, ya da virgülle ayırarak yazın"
          defaultValue={product?.features?.join("\n") ?? ""}
          className="input"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <StockField defaultValue={product?.stock ?? 1} />

        <div>
          <label htmlFor="daily_price" className="field-label">
            Günlük kiralama fiyatı (opsiyonel)
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
              ₺
            </span>
            <input
              id="daily_price"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={price}
              onChange={(e) => setPrice(formatPriceInput(e.target.value))}
              className="input pr-8"
            />
            <input type="hidden" name="daily_price" value={parsePriceInput(price)} />
          </div>
        </div>
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      <button type="submit" disabled={pending || uploading} className="btn btn-primary">
        {uploading ? "Görseller yükleniyor…" : pending ? "Kaydediliyor…" : submitLabel}
      </button>
    </form>
  );
}
