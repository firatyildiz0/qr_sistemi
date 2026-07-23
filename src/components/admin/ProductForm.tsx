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
        <label htmlFor="name" className="block text-sm font-medium text-neutral-700">
          Name
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={product?.name}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-base focus:border-neutral-900 focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-neutral-700"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={product?.description ?? ""}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-base focus:border-neutral-900 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="features" className="block text-sm font-medium text-neutral-700">
          Features
        </label>
        <textarea
          id="features"
          name="features"
          rows={3}
          placeholder="One per line, or comma-separated"
          defaultValue={product?.features?.join("\n") ?? ""}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-base focus:border-neutral-900 focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="daily_price"
          className="block text-sm font-medium text-neutral-700"
        >
          Daily rental price (optional)
        </label>
        <input
          id="daily_price"
          name="daily_price"
          type="number"
          min="0"
          step="0.01"
          defaultValue={product?.daily_price ?? undefined}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-base focus:border-neutral-900 focus:outline-none"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-60"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
