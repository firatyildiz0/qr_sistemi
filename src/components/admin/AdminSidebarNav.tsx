"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBell, IconGrid } from "@/components/icons";

export default function AdminSidebarNav({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname();

  const items = [
    { href: "/admin", label: "Ürünler", icon: IconGrid, exact: true },
    { href: "/admin/notifications", label: "Bildirimler", icon: IconBell, badge: unreadCount },
  ];

  return (
    <nav className="mt-8 flex flex-col gap-2 px-4">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex items-center gap-3 rounded-md px-4 py-3 transition-colors duration-150 ${
              active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
            }`}
          >
            {active && (
              <span className="absolute bottom-0 left-0 top-0 w-1 rounded-l bg-accent" />
            )}
            <item.icon className="h-5 w-5" />
            <span className="text-sm font-semibold">{item.label}</span>
            {!!item.badge && (
              <span className="ml-auto rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">
                {item.badge > 9 ? "9+" : item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
