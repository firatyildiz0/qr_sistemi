import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import { greetingFor } from "@/lib/greeting";
import { signOut } from "@/app/login/actions";
import AdminShell, { type Identity } from "@/components/admin/AdminShell";
import UsernamePrompt from "@/components/admin/UsernamePrompt";
import AccessGuard from "@/components/admin/AccessGuard";
import PresenceBeacon from "@/components/PresenceBeacon";

async function loadIdentity(): Promise<Identity> {
  const [user, profile] = await Promise.all([getCurrentUser(), getProfile()]);
  const email = user?.email ?? "Giriş yapıldı";
  // Kullanıcı adı yoksa e-postanın yerel kısmı: selamlamada "@..." görünmesin.
  const name = profile?.username ?? email.split("@")[0];
  return {
    email,
    initial: email.charAt(0).toUpperCase(),
    name,
    greeting: greetingFor(),
    // Yönetim paneline dönüş bağlantısı yalnızca superuser'a çizilsin diye.
    // Kimliğin içinde geliyor çünkü kabuk zaten onu bekliyor; ayrı bir profil
    // sorgusu açmaya gerek yok.
    isSuperuser: profile?.role === "superuser",
  };
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
    <>
      <AdminShell
        identityPromise={loadIdentity()}
        unreadCountPromise={loadUnreadCount()}
        signOutAction={signOut}
      >
        {children}
      </AdminShell>

      {/* Aynı gerekçeyle beklenmiyor: profil sorgusu panelin boyanmasını
          geciktirmesin, ikisi de arkadan gelsin. `getProfile` istek başına
          önbellekli, yani iki bileşen tek sorguyu paylaşıyor. */}
      <Suspense fallback={null}>
        <AccessGuard expect="seller" />
      </Suspense>
      <Suspense fallback={null}>
        <UsernamePrompt profilePromise={getProfile()} />
      </Suspense>

      {/* Panel açık kaldığı sürece "buradayım" diyor; yönetim panelindeki anlık
          kullanıcı sayacı bunu sayıyor. Layout'ta duruyor ki sayfa değiştirmek
          sayacı sıfırlamasın. */}
      <PresenceBeacon kind="panel" />
    </>
  );
}
