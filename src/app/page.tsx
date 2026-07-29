import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

// The marketing landing page is parked in `_landing/` (a private folder, so it
// is not routed) until it is ready to go public again. Until then the root is
// the seller entry point: straight to the panel when signed in, otherwise to
// the login screen.
export default async function RootPage() {
  const user = await getCurrentUser();
  redirect(user ? "/admin" : "/login");
}
