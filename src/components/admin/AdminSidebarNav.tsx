"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isActive } from "@/components/admin/nav";

export default function AdminSidebarNav({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname();

  return (
    <nav className="mt-8 flex flex-col gap-2 px-4">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item, pathname);
        const badge = item.unread ? unreadCount : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            // `title` is what names the item once the rail is collapsed and the
            // label is hidden.
            title={item.label}
            // Seçili öğe vurgu renkli, yumuşak gölgeli bir hap: rayın üstünde
            // duran tek yükseltilmiş yüzey o olduğu için göz nerede olduğunu
            // renkten önce yükseklikten buluyor.
            className={`sidebar-item relative flex items-center gap-3 rounded-full px-4 py-3 transition-[background-color,color,box-shadow,transform] duration-200 active:scale-[0.97] ${
              active
                ? "bg-accent text-white shadow-[0_10px_20px_-12px_var(--color-accent)]"
                : "text-ink-muted hover:bg-accent-soft hover:text-accent-hover"
            }`}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span className="sidebar-label text-sm font-semibold">{item.label}</span>
            {!!badge && (
              <span
                className={`sidebar-badge ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  active ? "bg-white/20 text-white" : "bg-accent text-white"
                }`}
              >
                {badge > 9 ? "9+" : badge}
              </span>
            )}
            <NavPendingIndicator hasBadge={!!badge} />
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
      className={`nav-spinner h-3.5 w-3.5 shrink-0 rounded-full border-2 border-transparent border-t-current ${
        hasBadge ? "ml-1.5" : "ml-auto"
      }`}
    />
  );
}
