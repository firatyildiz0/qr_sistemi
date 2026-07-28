import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import AdminShell, { type Identity } from "@/components/admin/AdminShell";

async function loadIdentity(): Promise<Identity> {
  const user = await getCurrentUser();
  const email = user?.email ?? "Giriş yapıldı";
  return { email, initial: email.charAt(0).toUpperCase() };
}

async function loadUnreadCount(): Promise<number> {
  const [user, supabase] = await Promise.all([getCurrentUser(), createClient()]);
  if (!user) return 0;

  // Scoped through the product owner so one seller never sees another's count.
  // RLS enforces this too; filtering here keeps the query from scanning rows it
  // would only discard.
  const { count } = await supabase
    .from("notifications")
    .select("id, products!inner(owner_id)", { count: "exact", head: true })
    .eq("products.owner_id", user.id)
    .eq("is_read", false);
  return count ?? 0;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Deliberately not `async` and nothing is awaited here. A layout that awaits
  // runtime data blocks the whole route: `loading.tsx` cannot show a fallback
  // until the layout itself has finished. Starting both requests and handing
  // the promises to AdminShell lets the sidebar paint immediately and the
  // identity/badge stream in behind their own Suspense boundaries.
  return (
    <AdminShell
      identityPromise={loadIdentity()}
      unreadCountPromise={loadUnreadCount()}
      signOutAction={signOut}
    >
      {children}
    </AdminShell>
  );
}
