"use client";

import Link from "next/link";
import { useState, useTransition, useRef, useEffect } from "react";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/admin/notifications/actions";

export type BellNotification = {
  id: string;
  booking_id: string;
  product_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  product_name: string;
};

export default function NotificationBell({
  notifications,
}: {
  notifications: BellNotification[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative rounded-full p-2 text-neutral-600 transition hover:bg-neutral-100"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 max-w-[90vw] rounded-lg border border-neutral-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-2">
            <span className="text-sm font-medium text-neutral-900">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => startTransition(() => markAllNotificationsRead())}
                className="text-xs text-neutral-500 hover:text-neutral-900 disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          <ul className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-neutral-400">
                No notifications yet.
              </li>
            )}
            {notifications.map((n) => (
              <li key={n.id} className="border-b border-neutral-50 last:border-0">
                <Link
                  href={`/admin/products/${n.product_id}`}
                  onClick={() => {
                    setOpen(false);
                    if (!n.is_read) {
                      startTransition(() => markNotificationRead(n.id));
                    }
                  }}
                  className={`block px-4 py-3 text-sm transition hover:bg-neutral-50 ${
                    n.is_read ? "text-neutral-500" : "font-medium text-neutral-900"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.is_read && (
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-600" />
                    )}
                    <div>
                      <p>{n.message}</p>
                      <p className="mt-0.5 text-xs text-neutral-400">{n.product_name}</p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
      />
    </svg>
  );
}
