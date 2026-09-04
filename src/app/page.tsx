import { redirect } from "next/navigation";
import { getProfile, homePathFor } from "@/lib/profile";

// The marketing landing page is parked in `_landing/` (a private folder, so it
// is not routed) until it is ready to go public again. Until then the root is
// the entry point: straight to the panel the account belongs to when signed
// in, otherwise to the login screen.
export default async function RootPage() {
  const profile = await getProfile();
  redirect(profile && profile.status === "approved" ? homePathFor(profile) : "/login");
}
