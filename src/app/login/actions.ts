"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: string | null };

/**
 * `next` arrives from a query string, so it decides where a *successfully
 * authenticated* seller lands — exactly the redirect an attacker wants to own.
 *
 * A leading "/" is not enough to prove the target is ours: "//evil.com" and
 * "/\evil.com" are protocol-relative absolute URLs that browsers resolve to
 * another origin. Requiring a single "/" followed by something that is neither
 * a slash nor a backslash keeps the redirect inside this app.
 */
function safeNextPath(next: string): string {
  return /^\/(?![/\\])/.test(next) ? next : "/admin";
}

export async function signIn(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!email || !password) {
    return { error: "E-posta ve şifre gereklidir." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "E-posta veya şifre hatalı." };
  }

  redirect(safeNextPath(next));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
