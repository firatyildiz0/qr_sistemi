import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import NotificationBell, {
  type BellNotification,
} from "@/components/admin/NotificationBell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: notificationRows } = await supabase
    .from("notifications")
    .select("id, booking_id, product_id, message, is_read, created_at, products(name)")
    .order("created_at", { ascending: false })
    .limit(20);

  const notifications: BellNotification[] = (notificationRows ?? []).map((n) => ({
    id: n.id,
    booking_id: n.booking_id,
    product_id: n.product_id,
    message: n.message,
    is_read: n.is_read,
    created_at: n.created_at,
    product_name: (n.products as unknown as { name: string } | null)?.name ?? "Product",
  }));

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="text-lg font-semibold text-neutral-900">
            Rental Admin
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell notifications={notifications} />
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md px-3 py-2 text-sm text-neutral-600 transition hover:bg-neutral-100"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
