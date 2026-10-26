import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { authKeyAndHeaders, ipFromHeaders } from "./forwarding";

/**
 * Giriş ve kayıt için Supabase istemcisi: ziyaretçinin IP'sini Supabase'e
 * iletiyor ki Auth'un hız sınırı bütün kullanıcılara değil o adrese işlesin
 * (bkz. forwarding.ts).
 *
 * Gizli anahtarla kurulabildiği için yalnızca `auth.*` çağrılarında kullan.
 * Oturum açıldıktan sonra tabloya gidecek sorgular `createClient()` ya da
 * açıkça `createAdminClient()` ile yapılmalı.
 */
export async function createAuthClient() {
  const cookieStore = await cookies();
  const { key, headers: forwarded } = authKeyAndHeaders(ipFromHeaders(await headers()));

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    global: { headers: forwarded },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}
