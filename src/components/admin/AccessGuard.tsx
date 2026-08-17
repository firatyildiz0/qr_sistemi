import { redirect } from "next/navigation";
import { getProfile, homePathFor, type ProfileRole } from "@/lib/profile";
import { getSubscription } from "@/lib/subscription";

/**
 * Panelin kapısı: onaylanmamış hesabı giriş ekranına, yanlış paneldeki
 * kullanıcıyı kendi paneline, abonesi olmayan satıcıyı ödeme ekranına yollar.
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

  // Abonelik yalnızca satıcı panelinin şartı: `/yonetim` paneli ücretli değil
  // (bkz. `can_write`, 0025).
  //
  // Bu yalnızca yönlendirme. Aboneliği bitmiş biri buradan geçse bile
  // veritabanındaki yazma politikaları onu durduruyor — ekran kilitli, veri de
  // kilitli, ikisi ayrı katmanda.
  if (expect === "seller") {
    const subscription = await getSubscription();
    // Satır hiç yoksa da erişim yok: 0025 çalıştırılmamış ya da abonelik
    // henüz açılmamış demek. Fail-closed.
    if (!subscription?.active) redirect("/abonelik");
  }

  return null;
}
