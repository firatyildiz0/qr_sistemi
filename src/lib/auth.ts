import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = { id: string; email: string | null };

/**
 * The verified identity behind the current request.
 *
 * Uses `getClaims()` rather than `getUser()`: when the Supabase project signs
 * tokens with an asymmetric key, the signature is verified locally against a
 * cached JWKS, so this costs no network round trip. (On the legacy HS256 secret
 * it falls back to `getUser()`, i.e. no worse than before.) Either way
 * `getSession()` still refreshes an expired token, so the proxy keeps working.
 *
 * Wrapped in `cache()` so a layout and the page inside it share one result per
 * request instead of each paying for its own verification.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims?.sub) return null;
  return { id: claims.sub, email: claims.email ?? null };
});
