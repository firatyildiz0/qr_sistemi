import { redirect } from "next/navigation";
import { getProfile, homePathFor, type ProfileRole } from "@/lib/profile";

/**
 * Panelin kapısı: onaylanmamış hesabı giriş ekranına, yanlış paneldeki
 * kullanıcıyı kendi paneline yollar.
 *
 * Hiçbir şey çizmiyor, çünkü layout'un içinde `Suspense` arkasında duruyor —
 * layout'un kendisi `await` etseydi `loading.tsx` hiç görünmezdi. Yönlendirme
 * gövde akmaya başladıktan sonra düşerse Next bunu istemci tarafında
 * tamamlar; veriyi koruyan asıl katman zaten RLS, burası yalnızca kullanıcıyı
 * doğru yere koyuyor.
 */
export default async function AccessGuard({ expect }: { expect: ProfileRole }) {
  const profile = await getProfile();

  if (!profile || profile.status !== "approved") redirect("/login");
  if (profile.role !== expect) redirect(homePathFor(profile));

  return null;
}
