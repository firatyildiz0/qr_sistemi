import SiteFooter from "@/components/SiteFooter";
import VitrinMenu from "@/components/marketing/VitrinMenu";
import { getCurrentUser } from "@/lib/auth";
import { getProfile, homePathFor } from "@/lib/profile";
import { bricolage } from "@/lib/fonts";

/**
 * Blog sayfalarının iskeleti: yasal sayfalarla aynı menü ve altbilgi (bkz.
 * `YasalSayfa`), menü düğmesi de aynı kurala uyuyor.
 */
export default async function BlogKabugu({ children }: { children: React.ReactNode }) {
  const [user, profile] = await Promise.all([getCurrentUser(), getProfile()]);
  const onayli = profile?.status === "approved";

  return (
    <div className={`vitrin ${bricolage.variable} relative flex flex-1 flex-col`}>
      <VitrinMenu
        girisGoster={!user}
        ctaHref={onayli ? homePathFor(profile) : "/login"}
        ctaLabel={onayli ? "Panele git" : "Hemen başla"}
        bolumler={false}
      />
      {children}
      <SiteFooter />
    </div>
  );
}
