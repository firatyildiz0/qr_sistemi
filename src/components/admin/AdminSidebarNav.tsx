"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import {
  IconBell,
  IconChart,
  IconGrid,
  IconHome,
  IconLifebuoy,
  IconSettings,
  IconUsers,
} from "@/components/icons";

export default function AdminSidebarNav({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname();

  const items = [
    // /admin is the panel home and holds the QR scanner, so the scanner needs
    // no entry of its own.
    { href: "/admin", label: "Ana sayfa", icon: IconHome, exact: true },
    { href: "/admin/products", label: "Ürünler", icon: IconGrid },
    { href: "/admin/customers", label: "Müşteriler", icon: IconUsers },
    { href: "/admin/dashboard", label: "İstatistik", icon: IconChart },
    { href: "/admin/notifications", label: "Bildirimler", icon: IconBell, badge: unreadCount },
    { href: "/admin/support", label: "Destek", icon: IconLifebuoy },
    { href: "/admin/settings", label: "Ayarlar", icon: IconSettings },
  ];

  return (
    <nav className="mt-8 flex flex-col gap-2 px-4">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            // `title` is what names the item once the rail is collapsed and the
            // label is hidden.
            title={item.label}
            className={`sidebar-item relative flex items-center gap-3 rounded-md px-4 py-3 transition-colors duration-150 ${
              active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
            }`}
          >
            {active && (
              <span className="absolute bottom-0 left-0 top-0 w-1 rounded-l bg-accent" />
            )}
            <item.icon className="h-5 w-5 shrink-0" />
            <span className="sidebar-label text-sm font-semibold">{item.label}</span>
            {!!item.badge && (
              <span className="sidebar-badge ml-auto rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">
                {item.badge > 9 ? "9+" : item.badge}
              </span>
            )}
            <NavPendingIndicator hasBadge={!!item.badge} />
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Shows a spinner while this link's navigation is in flight. Covers the case
 * `loading.tsx` can't: on a slow network the prefetched fallback may not have
 * arrived yet, so without this the click would look ignored.
 */
function NavPendingIndicator({ hasBadge }: { hasBadge: boolean }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;

  return (
    <span
      aria-hidden="true"
      className={`nav-spinner h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white/30 border-t-white ${
        hasBadge ? "ml-1.5" : "ml-auto"
      }`}
    />
  );
}
