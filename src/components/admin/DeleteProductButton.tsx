"use client";

import { deleteProduct } from "@/app/admin/products/actions";

export default function DeleteProductButton({ productId }: { productId: string }) {
  return (
    <form
      action={deleteProduct.bind(null, productId)}
      onSubmit={(e) => {
        if (!confirm("Delete this product and all of its bookings? This can't be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
      >
        Delete product
      </button>
    </form>
  );
}
