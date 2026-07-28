"use client";

import { useState } from "react";
import { deleteProduct } from "@/app/admin/products/actions";
import ConfirmDialog from "@/components/ConfirmDialog";
import { IconTrash } from "@/components/icons";

export default function DeleteProductButton({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-danger-ghost w-full">
        <IconTrash className="h-4 w-4" />
        Ürünü sil
      </button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => deleteProduct(productId)}
        title="Ürünü sil"
        message={
          <>
            Bu ürün ve ona ait <strong className="font-semibold text-ink">tüm rezervasyonlar</strong> kalıcı
            olarak silinecek. Bu işlem geri alınamaz.
          </>
        }
        confirmLabel="Evet, sil"
        pendingLabel="Siliniyor…"
        icon={<IconTrash className="h-5 w-5" />}
        tone="danger"
      />
    </>
  );
}
