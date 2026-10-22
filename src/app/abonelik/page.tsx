import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { MONTHLY_PRICE_TRY, getSubscription } from "@/lib/subscription";
import { iyzicoConfig, planFor } from "@/lib/iyzico";
import AbonelikEkrani from "./AbonelikEkrani";

export const metadata = { title: "Abonelik" };

/**
 * Ödeme / abonelik ekranı.
 *
 * `/admin` altında **değil**, bilinçli olarak: panelin layout'undaki
 * `AccessGuard` abonesi olmayanı buraya yolluyor, bu sayfa da orada olsaydı
 * yönlendirme kendi kendine düşen bir döngüye girerdi. Ayrıca burada kenar
 * çubuğu ve sekmeler görünmüyor — ekranın tek bir işi var.
 *
 * Burası yalnızca kimin, hangi planla ödeyeceğini çözüyor; çizim
 * `AbonelikEkrani`'nda.
 */
export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string }>;
}) {
  const [{ durum }, profile, subscription, headerList] = await Promise.all([
    searchParams,
    getProfile(),
    getSubscription(),
    headers(),
  ]);

  // Onaysız hesabın burada işi yok: abonelik onaydan sonra başlıyor.
  if (!profile || profile.status !== "approved") redirect("/login");
  // Aboneliği çalışan biri buraya kendi isteğiyle gelmiş olabilir — ekranı
  // görsün, ama ödeme formu yerine durumunu görsün.
  const config = iyzicoConfig();
  // Test hesabı farklı bir plandan, farklı tutar öder (bkz. `planFor`);
  // ekrandaki tutar karttan çekilecek olanla aynı olsun.
  const plan = config ? planFor(config, profile.username) : null;

  // Superuser'dan ücret beklenmiyor (bkz. `can_write`), ekran ona boş görünür.
  // Test listesindeyse istisna: ödeme akışını canlıda kendi hesabıyla
  // deneyebilsin. Aldığı abonelik erişimini değiştirmiyor, zaten muaf.
  if (profile.role === "superuser" && !plan?.test) redirect("/yonetim");

  return (
    <AbonelikEkrani
      durum={durum}
      subscription={subscription}
      price={plan?.priceTry ?? MONTHLY_PRICE_TRY}
      test={plan?.test ?? false}
      configured={config !== null}
      nonce={headerList.get("x-nonce") ?? undefined}
    />
  );
}
