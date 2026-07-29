import { redirect } from "next/navigation";
import AuthPanel from "./AuthPanel";
import { getCurrentUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/redirects";
import AuthAside from "@/components/AuthAside";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; mode?: string }>;
}) {
  const [{ next, mode }, user] = await Promise.all([searchParams, getCurrentUser()]);

  // Already signed in — there is nothing to log into, so go to the panel.
  if (user) redirect(safeNextPath(next));

  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      <AuthAside />

      <div className="flex flex-1 items-center justify-center bg-paper px-6 py-16">
        <AuthPanel
          next={safeNextPath(next)}
          initialMode={mode === "signup" ? "signup" : "login"}
        />
      </div>
    </main>
  );
}
