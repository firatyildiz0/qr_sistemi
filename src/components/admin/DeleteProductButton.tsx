"use client";

import { deleteProduct } from "@/app/admin/products/actions";
import { IconTrash } from "@/components/icons";

export default function DeleteProductButton({ productId }: { productId: string }) {
  return (
    <form
      action={deleteProduct.bind(null, productId)}
      onSubmit={(e) => {
        if (!confirm("Bu ürün ve tüm rezervasyonları silinsin mi? Bu işlem geri alınamaz.")) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="btn btn-danger-ghost w-full">
        <IconTrash className="h-4 w-4" />
        Ürünü sil
      </button>
    </form>
  );
}
