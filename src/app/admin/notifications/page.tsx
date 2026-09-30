import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import BildirimListesi, { type Bildirim } from "@/components/admin/BildirimListesi";
import { BildirimAyarKarti } from "@/components/bildirim/BildirimIzni";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const [user, supabase] = await Promise.all([getCurrentUser(), createClient()]);

  // Sahiplik bildirimin kendi kolonundan geliyor; RLS de aynı koşulu arkada
  // uyguluyor. Ürün bağlantısı isteğe bağlı: talep bildirimlerinin tek bir
  // ürünü olmayabilir (toplu talep), o yüzden join `!inner` değil. Talebin
  // güncel durumu da geliyor ki satıcı bildirimden "hâlâ bekliyor mu"yu görsün.
  const { data: rows } = await supabase
    .from("notifications")
    .select(
      "id, kind, request_id, product_id, message, is_read, created_at, products(name), booking_requests(status)"
    )
    .eq("owner_id", user?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(100);

  const bildirimler: Bildirim[] = (rows ?? []).map((n) => ({
    id: n.id,
    // Bildirime tıklayan satıcı ne yapmak istiyorsa oraya gitmeli: iade
    // hatırlatmasında ürün sayfasına, rezervasyon talebinde karar ekranına.
    href:
      n.kind === "talep"
        ? "/admin/talepler"
        : n.product_id
          ? `/admin/products/${n.product_id}`
          : "/admin",
    tur: n.kind as "iade" | "talep",
    mesaj: n.message,
    okundu: n.is_read,
    tarih: n.created_at,
    urun: (n.products as unknown as { name: string } | null)?.name ?? null,
    talepDurumu:
      (n.booking_requests as unknown as { status: string } | null)?.status ?? null,
  }));

  const okunmamis = bildirimler.filter((n) => !n.okundu).length;

  return (
    <div className="flex flex-1 flex-col">
      <header className="page-header flex h-auto flex-col gap-1 border-b border-border bg-paper px-4 py-4 sm:h-20 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-8 sm:py-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">Bildirimler</h1>
          <p className="text-sm text-ink-muted">
            {okunmamis > 0
              ? `${okunmamis} okunmamış bildiriminiz var`
              : "Hepsini okudunuz"}
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 p-4 sm:p-8">
        <BildirimAyarKarti />
        <BildirimListesi bildirimler={bildirimler} />
      </div>
    </div>
  );
}
