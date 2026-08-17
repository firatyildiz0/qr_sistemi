"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { IconAlertTriangle } from "@/components/icons";
import { cancel } from "./actions";

const DATE = new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" });

/**
 * Aboneliği iptal eder.
 *
 * Onay penceresi geri dönüşü olmayan bir işlem için değil — iptal sonrası
 * yeniden abone olunabiliyor — ama kullanıcı "iptal" derken erişimini o anda
 * kaybedeceğini sanıyor olabilir. Pencere tam olarak bunu düzeltiyor:
 * ödediği dönemin sonuna kadar hiçbir şey değişmiyor.
 */
export default function CancelButton({ periodEnd }: { periodEnd: string | null }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const until = periodEnd ? DATE.format(new Date(periodEnd)) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-danger-ghost w-full"
      >
        Aboneliği iptal et
      </button>

      <ConfirmDialog
        open={open}
        title="Abonelik iptal edilsin mi?"
        message={
          <>
            Aylık yenileme durur, kartınızdan bir daha tahsilat yapılmaz.
            {until
              ? ` Panele erişiminiz ${until} tarihine kadar sürer — ödediğiniz dönemin sonuna kadar hiçbir şey değişmez.`
              : " Ödediğiniz dönemin sonuna kadar panele erişiminiz sürer."}{" "}
            Dilediğiniz zaman yeniden abone olabilirsiniz; verileriniz silinmiyor.
          </>
        }
        confirmLabel="Aboneliği iptal et"
        pendingLabel="İptal ediliyor…"
        cancelLabel="Vazgeç"
        icon={<IconAlertTriangle className="h-5 w-5" aria-hidden />}
        onConfirm={async () => {
          const { error } = await cancel();
          // Hata mesajı ConfirmDialog'un kendi hata alanında görünsün.
          if (error) throw new Error(error);
          router.refresh();
        }}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
