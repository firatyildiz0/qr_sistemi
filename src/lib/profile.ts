import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export type ProfileRole = "seller" | "superuser";
export type ProfileStatus = "pending" | "approved" | "rejected";

export type Profile = {
  id: string;
  username: string;
  usernameAuto: boolean;
  role: ProfileRole;
  status: ProfileStatus;
};

/** Rolüne göre girişten sonra ineceği panel. */
export function homePathFor(profile: Profile): string {
  return profile.role === "superuser" ? "/yonetim" : "/admin";
}

/**
 * Oturumu açık kullanıcının profili. Anon anahtarla okunur — `profiles_select_own`
 * politikası zaten satırı sahibiyle sınırladığı için service role gerekmiyor.
 *
 * `cache()` ile sarılı: layout hem erişim kontrolü hem kullanıcı adı penceresi
 * için istiyor, istek başına tek sorgu yeter.
 */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, username_auto, role, status")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    username: data.username,
    usernameAuto: data.username_auto,
    role: data.role as ProfileRole,
    status: data.status as ProfileStatus,
  };
});
