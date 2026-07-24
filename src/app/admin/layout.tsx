import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import AdminShell from "@/components/admin/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const [{ data: userData }, { count: unreadCount }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("is_read", false),
  ]);

  const email = userData.user?.email ?? "Giriş yapıldı";
  const initial = email.charAt(0).toUpperCase();

  return (
    <AdminShell email={email} initial={initial} unreadCount={unreadCount ?? 0} signOutAction={signOut}>
      {children}
    </AdminShell>
  );
}
