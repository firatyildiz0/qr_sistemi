import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { PREFERENCES_COOKIE, parsePreferences } from "@/lib/preferences";
import { getTurnaround } from "@/lib/settings";
import SettingsPanel from "@/components/admin/SettingsPanel";

export const metadata = { title: "Ayarlar" };

export default async function SettingsPage() {
  // Reading the preferences here rather than in the client is what keeps the
  // form free of a hydration mismatch: the server renders the same values the
  // pre-hydration script already applied to <html>.
  const [cookieStore, user, turnaround] = await Promise.all([
    cookies(),
    getCurrentUser(),
    getTurnaround(),
  ]);
  const preferences = parsePreferences(cookieStore.get(PREFERENCES_COOKIE)?.value);

  return (
    <div className="flex flex-1 flex-col">
      <header className="page-header flex h-auto items-center border-b border-border bg-paper px-4 py-4 sm:h-20 sm:px-8 sm:py-0">
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">Ayarlar</h1>
      </header>

      <div className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-8">
        <SettingsPanel
          initial={preferences}
          turnaround={turnaround}
          email={user?.email ?? "—"}
        />
      </div>
    </div>
  );
}
