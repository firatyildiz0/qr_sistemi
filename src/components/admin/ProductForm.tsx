"use client";

import { useActionState } from "react";
import type { Product } from "@/lib/types";
import type { ProductFormState } from "@/app/admin/products/actions";

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

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="name" className="field-label">
          Ad
        </label>
        <input id="name" name="name" required defaultValue={product?.name} className="input" />
      </div>

      <div>
        <label htmlFor="description" className="field-label">
          Açıklama
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={product?.description ?? ""}
          className="input"
        />
      </div>

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

      <div>
        <label htmlFor="daily_price" className="field-label">
          Günlük kiralama fiyatı (opsiyonel)
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
            $
          </span>
          <input
            id="daily_price"
            name="daily_price"
            type="number"
            min="0"
            step="0.01"
            defaultValue={product?.daily_price ?? undefined}
            className="input pl-7"
          />
        </div>
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Kaydediliyor…" : submitLabel}
      </button>
    </form>
  );
}
