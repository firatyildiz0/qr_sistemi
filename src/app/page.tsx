import type { Metadata } from "next";
import { getProfile, homePathFor } from "@/lib/profile";
import VeyroLabs from "@/components/labs/VeyroLabs";

export const metadata: Metadata = {
  title: "Veyro Labs — Hizmetlerimiz",
  description:
    "Veyro'nun geliştirdiği hizmetlerin tamamı: QR ile kiralama, rezervasyon takvimi, envanter, etiketler ve iade hatırlatmaları.",
};

/**
 * Sitenin ana sayfası: hizmet vitrini.
 *
 * Oturum açık olsa da buraya geliyor — panele girmek isteyen için üst çubuktaki
 * düğme rolüne göre doğru panele bakıyor. Onay bekleyen ya da reddedilen bir
 * hesap panele giremeyeceği için giriş ekranına yönlendiriliyor; kararı
 * `homePathFor` değil buradaki durum kontrolü veriyor.
 */
export default async function RootPage() {
  const profile = await getProfile();
  const onayli = profile?.status === "approved";

  return <VeyroLabs panelHref={onayli ? homePathFor(profile) : "/login"} oturumAcik={Boolean(onayli)} />;
}
