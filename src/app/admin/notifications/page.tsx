import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import NotificationRow from "@/components/admin/NotificationRow";
import MarkAllReadButton from "@/components/admin/MarkAllReadButton";
import { IconCheckCircle } from "@/components/icons";

export default async function NotificationsPage() {
  const [user, supabase] = await Promise.all([getCurrentUser(), createClient()]);

  // Sahiplik bildirimin kendi kolonundan geliyor; RLS de aynı koşulu arkada
  // uyguluyor. Ürün bağlantısı isteğe bağlı: talep bildirimlerinin tek bir
  // ürünü olmayabilir (toplu talep), o yüzden join `!inner` değil.
  const { data: rows } = await supabase
    .from("notifications")
    .select("id, kind, request_id, product_id, message, is_read, created_at, products(name)")
    .eq("owner_id", user?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(50);

  const notifications = (rows ?? []).map((n) => ({
    id: n.id,
    // Bildirime tıklayan satıcı ne yapmak istiyorsa oraya gitmeli: iade
    // hatırlatmasında ürün sayfasına, rezervasyon talebinde karar ekranına.
    href:
      n.kind === "talep"
        ? "/admin/talepler"
        : n.product_id
          ? `/admin/products/${n.product_id}`
          : "/admin",
    kind: n.kind as "iade" | "talep",
    message: n.message,
    is_read: n.is_read,
    created_at: n.created_at,
    product_name:
      (n.products as unknown as { name: string } | null)?.name ??
      (n.kind === "talep" ? "Instagram talebi" : "Ürün"),
  }));

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="flex flex-1 flex-col">
      <header className="page-header flex h-auto flex-col gap-3 border-b border-border bg-paper px-4 py-4 sm:h-20 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-8 sm:py-0">
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">Bildirimler</h1>
        <MarkAllReadButton disabled={unreadCount === 0} />
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 p-4 sm:p-8">
        {notifications.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 border-dashed py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface text-success">
              <IconCheckCircle className="h-6 w-6" />
            </span>
            <p className="font-semibold text-ink">Her şey güncel</p>
            <p className="text-sm text-ink-muted">
              İade hatırlatmaları ve Instagram’dan gelen rezervasyon talepleri burada görünecek.
            </p>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-lg border border-border bg-card">
            {notifications.map((n, i) => (
              <NotificationRow
                key={n.id}
                id={n.id}
                href={n.href}
                kind={n.kind}
                productName={n.product_name}
                message={n.message}
                isRead={n.is_read}
                createdAt={n.created_at}
                delay={i * 40}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
