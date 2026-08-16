import type { SVGProps } from "react";
import {
  IconBell,
  IconCalendar,
  IconChart,
  IconGrid,
  IconHome,
  IconLifebuoy,
  IconSettings,
} from "@/components/icons";

export type NavItem = {
  href: string;
  label: string;
  /**
   * Mobil sekme çubuğundaki ad. Sekmeye ekranın beşte biri düşüyor, uzun bir ad
   * oraya sığmıyor; verilmezse `label` kullanılır.
   */
  shortLabel?: string;
  icon: (props: SVGProps<SVGSVGElement>) => React.ReactElement;
  /** Only the exact path counts as active — otherwise every /admin/* would light up "Ana sayfa". */
  exact?: boolean;
  /** Sits in the mobile tab bar. The rest live in the "Menü" sheet. */
  primary?: boolean;
  /** Reads the unread notification count instead of a static badge. */
  unread?: boolean;
};

/**
 * Tek kaynak: hem masaüstü kenar çubuğu hem mobil sekme çubuğu bu listeden
 * besleniyor, böylece bir sayfa eklendiğinde iki yerde birden unutulmuyor.
 *
 * /admin panelin ana sayfası ve QR okuyucuyu da barındırıyor, o yüzden
 * tarayıcının ayrı bir girdisi yok — mobilde sekme çubuğunun ortasındaki
 * düğme, masaüstünde sağ alttaki buton onu açıyor.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Ana sayfa", icon: IconHome, exact: true, primary: true },
  { href: "/admin/products", label: "Ürünler", icon: IconGrid, primary: true },
  // Ekran müşteri profilleri değil rezervasyonlar için açılıyor: satıcı buraya
  // "kim bu kişi" diye değil "bu kiralama ne durumda" diye geliyor. Ad ve simge
  // de o yüzden takvime bakıyor.
  {
    href: "/admin/customers",
    label: "Rezervasyonlar",
    shortLabel: "Rezervasyon",
    icon: IconCalendar,
    primary: true,
  },
  { href: "/admin/dashboard", label: "İstatistik", icon: IconChart },
  { href: "/admin/notifications", label: "Bildirimler", icon: IconBell, unread: true },
  { href: "/admin/support", label: "Destek", icon: IconLifebuoy },
  { href: "/admin/settings", label: "Ayarlar", icon: IconSettings },
];

export function isActive(item: NavItem, pathname: string): boolean {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}
