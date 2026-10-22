import { redirect } from "next/navigation";
import { getProfile, homePathFor, type ProfileRole } from "@/lib/profile";
import { getSubscription } from "@/lib/subscription";
import { iyzicoConfig } from "@/lib/iyzico";

/**
 * Panelin kapısı: onaylanmamış hesabı giriş ekranına, yanlış paneldeki
 * kullanıcıyı kendi paneline, abonesi olmayan satıcıyı ödeme ekranına yollar.
 *
 * Kapı tek yönlü: superuser satıcı panelini de açabiliyor (orada kendi
 * ürünlerini yönetiyor — RLS hepsini `owner_id`'sine bağlı tuttuğu için
 * başkasının verisi görünmüyor), ama satıcı yönetim paneline giremiyor.
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
  if (profile.role !== expect && profile.role !== "superuser") {
    redirect(homePathFor(profile));
  }

  // Abonelik yalnızca satıcı panelinin şartı: `/yonetim` paneli ücretli değil
  // (bkz. `can_write`, 0032).
  //
  // Bu yalnızca yönlendirme. Aboneliği bitmiş biri buradan geçse bile
  // veritabanındaki yazma politikaları onu durduruyor — ekran kilitli, veri de
  // kilitli, ikisi ayrı katmanda.
  //
  // Superuser muaf — `can_write()` ile aynı kural. Yoksa yönetici kendi satıcı
  // panelini açmaya çalıştığında ödeme ekranına düşer, o da onu `/yonetim`'e
  // geri yollardı.
  //
  // iyzico anahtarları tanımlı değilken kapı kapalı değil, açık: ödeme
  // alınamayan bir sistemde satıcıyı ödeme ekranına kilitlemek paneli herkese
  // kapatmak olurdu. iyzico abonelik modülünü açmadan önce paket sayfasının
  // canlıda olmasını istiyor; bu sıra ancak böyle güvenli.
  if (expect === "seller" && profile.role !== "superuser" && iyzicoConfig()) {
    const subscription = await getSubscription();
    // Satır hiç yoksa da erişim yok: 0032 çalıştırılmamış ya da abonelik
    // henüz açılmamış demek. Fail-closed.
    if (!subscription?.active) redirect("/abonelik");
  }

  return null;
}
